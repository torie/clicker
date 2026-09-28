import * as G from './game.js';
import { createSoundtrack, loopSeconds } from './audio/soundtrack.js';
import { SONGS } from './audio/songs.js';
import { catSvg, skinGlow } from './skins.js';

const SAVE_KEY = 'clicker.save.v1';
const MUSIC_KEY = 'clicker.music';
const TICK_MS = 100;

const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } }
};

// ---------- state ----------

if (location.hash === '#reset') {
  store.del(SAVE_KEY);
  history.replaceState(null, '', location.pathname + location.search);
}

let state = G.newGame();
let welcome = null;
try {
  const raw = store.get(SAVE_KEY);
  if (raw) {
    state = G.deserialize(JSON.parse(raw));
    welcome = G.applyOffline(state, (Date.now() - state.savedAt) / 1000);
  }
} catch { state = G.newGame(); }

function save() {
  state.savedAt = Date.now();
  store.set(SAVE_KEY, JSON.stringify(G.serialize(state)));
}

const ui = { view: 'main', cur: 0, taps: 0, flash: '', flashUntil: 0, catTimer: 0, lessonQueue: [], playIdx: -1, playLeft: 0 };

// ---------- small DOM helpers ----------

/** Writes a DOM property only when the value changed, so the 10 Hz render stays cheap. */
function set(el, prop, value) {
  const cache = el._c || (el._c = {});
  if (cache[prop] === value) return;
  cache[prop] = value;
  if (prop === 'text') el.textContent = value;
  else if (prop === 'class') el.setAttribute('class', value); // works for SVG elements too
  else if (prop === 'hidden') el.hidden = value;
  else if (prop === 'disabled') el.disabled = value;
  else if (prop.startsWith('--')) el.style.setProperty(prop, value);
  else if (prop.startsWith('aria-')) el.setAttribute(prop, value);
  else el.style[prop] = value;
}

function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

function bar(fraction, n = 8) {
  const k = Math.round(Math.min(1, Math.max(0, fraction)) * n);
  return '▓'.repeat(k) + '░'.repeat(n - k);
}

/** A shop row: a button with name/price on top and description/progress below. */
function makeRow(onClick) {
  const el = h('button', 'row');
  const l1 = h('span', 'line'), l2 = h('span', 'line');
  const r = { el, nm: h('span', 'nm'), price: h('span', 'price'), ds: h('span', 'ds'), bar: h('span', 'bar') };
  l1.append(r.nm, r.price);
  l2.append(r.ds, r.bar);
  el.append(l1, l2);
  el.addEventListener('click', onClick);
  return r;
}

function setRow(r, v) {
  set(r.el, 'class', 'row ' + v.cls);
  set(r.el, 'disabled', !!v.disabled);
  set(r.nm, 'text', v.nm);
  set(r.price, 'text', v.price);
  set(r.ds, 'text', v.ds);
  set(r.bar, 'text', v.bar);
}

function flash(id) {
  ui.flash = id;
  ui.flashUntil = performance.now() + 500;
}
const flashCls = (id) => (ui.flash === id && performance.now() < ui.flashUntil ? ' flash' : '');

function pop(stage, text, cls = '') {
  const el = h('span', 'pop ' + cls, text);
  el.style.left = `calc(50% + ${Math.round(Math.random() * 100 - 50)}px)`;
  el.addEventListener('animationend', () => el.remove());
  const pops = stage.querySelectorAll('.pop');
  if (pops.length > 14) pops[0].remove();
  stage.appendChild(el);
}

// ---------- music ----------

const music = createSoundtrack(SONGS[state.track]);
let musicWanted = store.get(MUSIC_KEY) === 'on';
let preview = null; // {id, timer} while a jukebox track is being previewed
function setMusic(on) {
  stopPreview();
  musicWanted = on;
  store.set(MUSIC_KEY, on ? 'on' : 'off');
  music.setSong(SONGS[state.track]);
  if (on) music.start(); else music.stop();
  $('music').setAttribute('aria-pressed', String(on));
  $('music').setAttribute('aria-label', on ? 'Music on' : 'Music off');
}
$('music').setAttribute('aria-pressed', String(musicWanted));
$('music').addEventListener('click', () => setMusic(!musicWanted));

const PREVIEW_MS = 20000;
function startPreview(id) {
  stopPreview();
  music.setSong(SONGS[id]);
  music.start();
  preview = { id, timer: setTimeout(() => { stopPreview(); render(); }, PREVIEW_MS) };
}
/** Ends a preview and goes back to what the player had before: their own track, or silence. */
function stopPreview() {
  if (!preview) return;
  clearTimeout(preview.timer);
  preview = null;
  music.setSong(SONGS[state.track]);
  if (musicWanted) music.start(); else music.stop();
}
// Browsers only allow audio after a gesture: resume the player's saved preference on the first tap.
document.addEventListener('pointerdown', () => { if (musicWanted && !music.playing) music.start(); }, { once: true });

// ---------- main screen ----------

const big = $('big'), stage = $('stage');
function doTap() {
  const r = G.tap(state);
  ui.taps++;
  pop(stage, '+' + G.fmt(r.gain), r.lucky ? 'lucky' : '');
  big.classList.add('pressed');
  setTimeout(() => big.classList.remove('pressed'), 70);
  render();
}
// pointerdown (not click) so rapid multi-finger tapping registers every touch.
big.addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); doTap(); } });
big.addEventListener('click', (e) => { if (e.detail === 0) doTap(); }); // keyboard

const upgRows = G.UPGRADES.map((u) => {
  const r = makeRow(() => { if (G.buyUpgrade(state, u.id)) { flash(u.id); render(); } });
  $('upg-rows').appendChild(r.el);
  return r;
});

const facRows = [];
function syncFactoryRows() {
  while (facRows.length < state.facs.length) {
    const i = facRows.length;
    const r = makeRow(() => openFactory(i));
    $('fac-rows').appendChild(r.el);
    facRows.push(r);
  }
}

$('build-next').addEventListener('click', () => {
  const i = G.buildFactory(state);
  if (i >= 0) openFactory(i);
});

$('adopt').addEventListener('click', () => {
  if (!G.adoptCat(state)) return;
  save();
  showBoot();
  render();
});

function renderMain() {
  const s = state;
  set($('best'), 'text', G.fmt(s.best));
  set($('rate'), 'text', '+' + G.fmt(G.perSec(s)) + '/s');
  set($('pts'), 'text', G.fmt(s.pts));
  set($('pts'), 'class', 'num ' + (ui.taps ? (ui.taps % 2 ? 'bA' : 'bB') : ''));
  set($('per-click'), 'text', '+' + G.fmt(G.perClick(s)));
  set($('cat'), 'hidden', !s.cat);
  if (s.cat && $('cat')._skin !== s.skin) {
    $('cat')._skin = s.skin;
    $('cat-art').innerHTML = catSvg(s.skin);
    $('cat').style.setProperty('--cat-glow', skinGlow(s.skin));
  }
  set(big, 'class', 'big' + (s.cat ? ' catpress' : ''));
  const crew = G.crewOn(s), focus = G.catFocus(s);
  set($('cat').querySelector('.tag'), 'text', crew ? 'CAT ' + Math.round(focus * 100) + '%' : 'CAT ×50/s');
  set($('open-crew'), 'hidden', !crew);
  set($('crew-alert'), 'hidden', !crew);
  if (crew) {
    const needy = s.crew.filter((k) => G.needsCare(s, k)), low = s.crew.filter((k) => !G.needsCare(s, k) && lowNeed(k));
    set($('crew-badge'), 'hidden', !needy.length);
    set($('crew-badge'), 'text', String(needy.length));
    set($('open-crew'), 'class', 'icon-btn crew-btn' + (needy.length ? ' alarm' : ''));
    set($('crew-alert'), 'class', 'crew-alert' + (needy.length ? '' : ' calm'));
    set($('crew-alert-text'), 'text', needy.length
      ? needy[0].name.toUpperCase() + ' IS ' + careWord(needy[0]) + (needy.length > 1 ? ' +' + (needy.length - 1) + ' MORE' : '') + ' · THE CAT IS HELPING'
      : low.length ? low[0].name.toUpperCase() + ' WILL NEED YOU SOON' : crewOk(s.crew.filter((k) => G.isWorking(s, k)).length));
  }

  // Stretch goal: goal 1 is bought (adopt the cat); goal 2 opens the store as soon as it's reached,
  // and the meter moves on to goal 3. The store lives in the header so progress stays visible.
  const goal = G.currentGoal(s), reached = s.pts >= goal.at, done = G.finalGoalReached(s);
  const frac = Math.min(1, s.pts / goal.at), need = Math.max(0, goal.at - s.pts), inc = G.income(s);
  set($('goal'), 'hidden', done || (reached && s.goalIdx === 0));
  set($('adopt'), 'hidden', !(reached && s.goalIdx === 0));
  set($('goal-done'), 'hidden', !done);
  set($('open-store'), 'hidden', !s.storeOpen);
  set($('goal-title'), 'text', 'GOAL ' + (s.goalIdx + 1) + ' · ' + goal.at.toLocaleString('en-US'));
  set($('goal-pct'), 'text', (Math.floor(frac * 1000) / 10).toFixed(1) + '%');
  set($('goal-fill'), 'width', (frac * 100).toFixed(2) + '%');
  set($('goal-left'), 'text', G.fmt(need) + ' TO GO');
  set($('goal-eta'), 'text', G.fmtEta(inc ? need / inc : Infinity));
  set($('goal-teaser'), 'text', goal.teaser);

  // Buildings
  syncFactoryRows();
  s.facs.forEach((f, i) => {
    const c = G.siloCap(f), full = f.store >= c;
    setRow(facRows[i], {
      cls: 'fbtn' + (full ? ' full' : ''),
      nm: '▸ Enter factory #' + (i + 1), price: '+' + G.fmt(G.factoryRate(f)) + '/s',
      ds: f.kitOn ? 'RUN BY ' + G.kittenAt(s, i).name.toUpperCase() + ' · ×' + G.KITTEN_BOOST
        : G.kittenAt(s, i) ? G.kittenAt(s, i).name.toUpperCase() + ' NEEDS CARE · FACTORY IDLE'
        : full ? 'SILO FULL · GO COLLECT!' : 'STORED ' + G.fmt(f.store) + ' / ' + G.fmt(c),
      bar: bar(f.store / c)
    });
  });
  const n = s.facs.length, nextCost = G.nextFactoryCost(s);
  set($('build-next'), 'hidden', n >= G.MAX_FACTORIES);
  if (n < G.MAX_FACTORIES) {
    set($('build-next'), 'class', 'row ' + (s.pts >= nextCost ? 'ok' : 'no'));
    set($('build-name'), 'text', '[BUILD] Click factory #' + (n + 1));
    set($('build-cost'), 'text', G.fmt(nextCost));
    set($('build-desc'), 'text', n === 0 ? 'Makes clicks. Go inside to collect them.'
      : '×' + Math.pow(G.TIER_OUT, n) + ' output of factory #1, own lines and silo.');
    set($('build-bar'), 'text', bar(s.pts / nextCost));
  }

  // Upgrades
  G.UPGRADES.forEach((u, i) => {
    const hidden = G.upgradeHidden(s, u), maxed = G.upgradeMaxed(s, u), c = G.upgradeCost(s, u), k = s.own[u.id];
    setRow(upgRows[i], {
      cls: hidden ? 'locked' : maxed ? 'maxed' : (s.pts >= c ? 'ok' : 'no') + flashCls(u.id),
      disabled: hidden || maxed,
      nm: '[' + (u.max ? k + '/' + u.max : k) + '] ' + (hidden ? '████████ ???' : u.name),
      price: maxed ? 'MAX' : G.fmt(c),
      ds: hidden ? 'UNLOCKS AT ' + G.fmt(u.base / 2) + ' EARNED' : u.desc,
      bar: maxed ? '' : bar(s.pts / c)
    });
  });
}

// ---------- factory screen ----------

const KITTEN_SVG = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><g fill="currentColor"><rect x="3" y="3" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/><rect x="3" y="5" width="10" height="6"/><rect x="4" y="11" width="8" height="4"/><rect x="12" y="12" width="3" height="2"/></g><g fill="#0A140D"><rect x="5" y="7" width="2" height="2"/><rect x="9" y="7" width="2" height="2"/></g></svg>';

const bays = [0, 1, 2, 3].map(() => {
  const el = h('div', 'bay');
  const kit = h('span', 'kit');
  kit.innerHTML = KITTEN_SVG;
  const press = h('span', 'press'), belt = h('span', 'belt');
  const toks = [0, 1, 2, 3].map(() => belt.appendChild(h('span', 'tok')));
  const empty = h('span', null, 'EMPTY BAY · ADD A LINE');
  el.append(kit, press, belt, empty);
  $('bays').appendChild(el);
  return { el, kit, press, belt, toks, empty };
});

const slots = [0, 1, 2, 3, 4].map((i) => {
  const el = h('button', 'slot');
  el.addEventListener('click', () => {
    if (i < state.facs.length) { ui.cur = i; render(); }
    else if (i === state.facs.length) { const n = G.buildFactory(state); if (n >= 0) { ui.cur = n; render(); } }
  });
  $('slots').appendChild(el);
  return el;
});

const extRows = G.EXTENSIONS.map((e) => {
  const r = makeRow(() => { if (G.buyExtension(state, ui.cur, e.id)) { flash(e.id); render(); } });
  $('ext-rows').appendChild(r.el);
  return r;
});

$('collect').addEventListener('click', () => {
  const f = state.facs[ui.cur];
  const full = f && G.isFull(f);
  const g = G.collect(state, ui.cur);
  if (g) pop($('collect-stage'), '+' + G.fmt(g), full ? 'lucky' : '');
  render();
});

function openFactory(i) {
  ui.cur = i;
  ui.view = 'factory';
  render();
  $('back').focus({ preventScroll: true });
}
$('back').addEventListener('click', () => { ui.view = 'main'; render(); });

function renderSlot(el, i) {
  const s = state, f = s.facs[i];
  if (f) {
    const c = G.siloCap(f), full = f.store >= c;
    set(el, 'class', 'slot' + (i === ui.cur ? ' cur' : '') + (full ? ' full' : ''));
    set(el, 'disabled', false);
    set(el, 'aria-label', 'Factory ' + (i + 1) + (full ? ', silo full' : ''));
    const html = '<span>#' + (i + 1) + '</span><span class="gauge"><span></span></span>';
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
    set(el.querySelector('.gauge span'), 'height', Math.round(Math.min(1, f.store / c) * 100) + '%');
  } else if (i === s.facs.length) {
    const cost = G.FACTORY_COST[i];
    set(el, 'class', 'slot buildable' + (s.pts >= cost ? '' : ' no'));
    set(el, 'disabled', false);
    set(el, 'aria-label', 'Build factory ' + (i + 1) + ' for ' + G.fmt(cost));
    const html = '<span class="vt">+ ' + G.fmt(cost) + '</span>';
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
  } else {
    set(el, 'class', 'slot locked');
    set(el, 'disabled', true);
    set(el, 'aria-label', 'Factory ' + (i + 1) + ', not available yet');
    const html = '<span>#' + (i + 1) + '</span>';
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
  }
}

function renderFactory() {
  const s = state, f = s.facs[ui.cur];
  if (!f) { ui.view = 'main'; return; }
  const c = G.siloCap(f), full = f.store >= c, pct = Math.round(Math.min(1, f.store / c) * 100);
  set($('fac-title'), 'text', 'FACTORY #' + (ui.cur + 1));
  set($('fac-pts'), 'text', G.fmt(s.pts));
  slots.forEach(renderSlot);

  // Belt speed follows turbo presses and kittens; tokens are spread evenly along the belt.
  const d = 3 / Math.pow(2, f.turbo) / (f.kitOn ? 2 : 1); // a working kitten visibly speeds the belts up
  set($('hall'), 'class', 'hall' + (full ? ' paused' : ''));
  set($('hall').parentElement, 'class', 'plant' + (full ? ' paused' : ''));
  set($('hall'), '--belt', d + 's');
  set($('hall'), '--press', (d / 4).toFixed(3) + 's');
  bays.forEach((b, i) => {
    const on = i < f.lines;
    set(b.el, 'class', 'bay' + (on ? '' : ' empty'));
    set(b.kit, 'hidden', !(i === 0 && f.kitOn)); // the factory's kitten sits at the first belt while it works
    set(b.press, 'hidden', !on);
    set(b.belt, 'hidden', !on);
    set(b.empty, 'hidden', on);
    b.toks.forEach((t, k) => set(t, 'animationDelay', '-' + (k * d / 4).toFixed(3) + 's'));
  });
  set($('silo'), 'class', 'silo' + (full ? ' full' : ''));
  set($('silo-label'), 'text', full ? 'FULL' : 'SILO');
  set($('silo-level'), 'height', pct + '%');
  set($('silo-pct'), 'text', pct + '%');
  set($('fac-rate'), 'text', '+' + G.fmt(G.factoryRate(f)) + '/s');
  set($('fac-store'), 'text', G.fmt(f.store) + ' / ' + G.fmt(c));
  const crewKitten = f.kitOn && G.kittenAt(s, ui.cur);
  set($('collect'), 'text', crewKitten ? crewKitten.name.toUpperCase() + ' SHIPS IT ALL' : 'COLLECT +' + G.fmt(f.store));
  set($('collect'), 'class', 'collect' + (full ? ' full' : ''));
  set($('collect'), 'disabled', f.store < 1);

  G.EXTENSIONS.forEach((e, i) => {
    const locked = G.extensionLocked(s, e), maxed = G.extensionMaxed(f, e), cost = G.extensionCost(e, f);
    setRow(extRows[i], {
      cls: (locked ? 'locked' : maxed ? 'maxed' : s.pts >= cost ? 'ok' : 'no') + (e.needsCat ? ' kitten' : '') + flashCls(e.id),
      disabled: locked || maxed,
      nm: '[' + f[e.id] + '/' + e.max + '] ' + (locked ? '████████ ???' : e.name),
      price: maxed ? 'MAX' : G.fmt(cost),
      ds: locked ? 'UNLOCKS WITH GOAL 1' : e.desc,
      bar: locked || maxed ? '' : bar(s.pts / cost)
    });
  });
}

// ---------- kitten crew (from 10,000,000) ----------

const LESSONS = {
  food: { title: 'FOOD', text: 'Kittens can now run your factories. A working kitten makes its factory ' + G.KITTEN_BOOST + '× faster, ships everything straight to you and empties the silo, so you stop collecting. Your first kitten is free; hire one for each factory. Working makes kittens hungry: a hungry kitten stops, and the cat leaves the button to look after it. Feed them before their food runs out.' },
  sleep: { title: 'SLEEP', text: 'Kittens get sleepy too. Send a sleepy kitten to bed: it naps for ' + G.NAP_SECONDS + ' seconds and wakes up rested. A napping kitten doesn\'t work, but it worries the cat far less than an exhausted one.' },
  fun: { title: 'PLAY', text: 'Kittens get bored. Play with them: catch the yarn ball five times. A bored kitten sulks and stops working.' }
};
const CARE_WORD = { food: 'HUNGRY', sleep: 'SLEEPY', fun: 'BORED' };
const KITTEN_COLORS = ['#FFD479', '#FF9F43', '#F2F7F3', '#B7A58C', '#FFB3C7', '#9CFFB5', '#C8A27A', '#8FB8FF'];
const lowNeed = (k) => G.activeNeeds(state).some((n) => k[n.id] < G.LOW_NEED);
const careWord = (k) => { const n = G.activeNeeds(state).find((x) => k[x.id] <= 0); return n ? CARE_WORD[n.id] : 'OK'; };
const kittenColor = (i) => KITTEN_COLORS[i % KITTEN_COLORS.length];
const crewOk = (n) => 'CREW OK · ' + n + (n === 1 ? ' KITTEN' : ' KITTENS') + ' WORKING';

function openCrew() {
  ui.view = 'crew';
  render();
  $('crew-back').focus({ preventScroll: true });
}
$('open-crew').addEventListener('click', openCrew);
$('crew-alert').addEventListener('click', openCrew);
$('crew-back').addEventListener('click', () => { ui.view = 'main'; render(); });

const kittenRows = [];
function syncKittenRows() {
  while (kittenRows.length < state.crew.length) {
    const i = kittenRows.length;
    const el = h('div', 'kitten');
    const art = h('span', 'art');
    art.innerHTML = KITTEN_SVG;
    art.style.color = kittenColor(i);
    const body = h('div', 'body');
    const top = h('div', 'top-line'), name = h('span', 'kname'), status = h('span', 'status');
    top.append(name, status);
    const job = h('span', 'job');
    const needs = {};
    const needBox = h('div', 'needs');
    for (const n of G.NEEDS) {
      const row = h('div', 'need'), fill = h('span');
      const meter = h('span', 'meter');
      meter.appendChild(fill);
      row.append(h('span', null, n.name.toUpperCase()), meter);
      needBox.appendChild(row);
      needs[n.id] = { row, fill };
    }
    const actions = h('div', 'care-actions');
    const feed = h('button', 'care'), nap = h('button', 'care', 'NAP'), play = h('button', 'care', 'PLAY');
    feed.addEventListener('click', () => { if (G.feedKitten(state, i)) { flash('kitten-' + i); save(); render(); } });
    nap.addEventListener('click', () => { if (G.napKitten(state, i)) { save(); render(); } });
    play.addEventListener('click', () => openPlay(i));
    actions.append(feed, nap, play);
    body.append(top, job, needBox, actions);
    el.append(art, body);
    $('kitten-rows').appendChild(el);
    kittenRows.push({ el, name, status, job, needs, feed, nap, play });
  }
}

function renderCrew() {
  const s = state;
  if (!G.crewOn(s)) { ui.view = 'main'; return; }
  set($('crew-pts'), 'text', G.fmt(s.pts));
  // Lesson card: the latest lesson, and when the next one arrives
  const learned = s.lessons, latest = G.NEEDS[Math.max(0, learned - 1)], next = G.NEEDS[learned];
  set($('lesson-step'), 'text', 'LESSON ' + Math.max(1, learned) + ' OF ' + G.NEEDS.length);
  set($('lesson-title'), 'text', LESSONS[latest.id].title);
  set($('lesson-text'), 'text', LESSONS[latest.id].text);
  set($('lesson-next'), 'text', next ? 'NEXT LESSON AT ' + G.fmt(next.unlockAt) + ': ' + LESSONS[next.id].title
    : 'ALL LESSONS LEARNED · KEEP THE CREW HAPPY ON THE WAY TO ' + G.fmt(G.GOALS[G.GOALS.length - 1].at));
  // Cat focus
  const focus = G.catFocus(s);
  set($('focus-pct'), 'text', Math.round(focus * 100) + '%');
  set($('focus-fill'), 'width', (focus * 100).toFixed(1) + '%');
  set($('focus-fill').parentElement.parentElement, 'class', 'focus' + (focus < 0.5 ? ' low' : ''));
  set($('focus-text'), 'text', 'THE CAT CLICKS +' + G.fmt(G.catRate(s)) + '/s OF +' + G.fmt(G.CAT_CPS * G.perClick(s)) + '/s. CONTENT KITTENS KEEP IT AT THE BUTTON.');
  // Feed all
  const hungry = s.crew.filter((k) => !G.napping(k) && k.food < 0.7);
  const allCost = hungry.length * G.FEED_COST;
  set($('feed-all'), 'hidden', s.lessons < 1 || hungry.length < 2);
  set($('feed-all'), 'text', 'FEED ALL ' + hungry.length + ' · ' + G.fmt(allCost));
  set($('feed-all'), 'disabled', s.pts < allCost);
  // Hiring: one kitten per factory
  syncHireRows();
  s.facs.forEach((f, i) => {
    const r = hireRows[i], has = !!G.kittenAt(s, i), cost = G.hireCost(i);
    set(r.el, 'hidden', has);
    if (!has) setRow(r, { cls: s.pts >= cost ? 'ok' : 'no', nm: 'Hire for factory #' + (i + 1), price: G.fmt(cost),
      ds: 'RUNS IT ×' + G.KITTEN_BOOST + ' FASTER AND EMPTIES ITS SILO', bar: bar(s.pts / cost) });
  });
  set($('hire-title'), 'hidden', s.facs.every((f, i) => G.kittenAt(s, i)));
  // Kittens
  syncKittenRows();
  s.crew.forEach((k, i) => {
    const r = kittenRows[i], care = G.needsCare(s, k), nap = G.napping(k);
    set(r.el, 'class', 'kitten ' + (nap ? 'nap' : care ? 'care' : 'working') + flashCls('kitten-' + i));
    set(r.name, 'text', k.name);
    set(r.status, 'text', nap ? 'NAPPING · ' + Math.ceil(k.nap) + 's' : care ? careWord(k) + ' · NOT WORKING' : 'WORKING');
    set(r.job, 'text', 'RUNS FACTORY #' + (k.fac + 1) + ' · ×' + G.KITTEN_BOOST);
    for (const n of G.NEEDS) {
      const active = s.lessons > G.NEEDS.indexOf(n), v = k[n.id], row = r.needs[n.id];
      set(row.row, 'hidden', !active);
      set(row.row, 'class', 'need' + (v < G.LOW_NEED ? ' low' : '') + (v <= 0 ? ' empty' : ''));
      set(row.fill, 'width', (v * 100).toFixed(1) + '%');
    }
    set(r.feed, 'hidden', s.lessons < 1);
    set(r.feed, 'text', 'FEED · ' + G.fmt(G.FEED_COST));
    set(r.feed, 'disabled', nap || k.food >= 1 || s.pts < G.FEED_COST);
    set(r.feed, 'class', 'care' + (k.food < G.LOW_NEED && !nap ? ' urgent' : ''));
    set(r.nap, 'hidden', s.lessons < 2);
    set(r.nap, 'disabled', nap || k.sleep >= 1);
    set(r.nap, 'class', 'care' + (k.sleep < G.LOW_NEED && !nap ? ' urgent' : ''));
    set(r.play, 'hidden', s.lessons < 3);
    set(r.play, 'disabled', nap || k.fun >= 0.98);
    set(r.play, 'class', 'care' + (k.fun < G.LOW_NEED && !nap ? ' urgent' : ''));
  });
}

const hireRows = [];
function syncHireRows() {
  while (hireRows.length < state.facs.length) {
    const i = hireRows.length;
    const r = makeRow(() => { if (G.hireKitten(state, i)) { flash('kitten-' + (state.crew.length - 1)); save(); render(); } });
    $('hire-rows').appendChild(r.el);
    hireRows.push(r);
  }
}

$('feed-all').addEventListener('click', () => {
  let fed = 0;
  state.crew.forEach((k, i) => { if (k.food < 0.7 && G.feedKitten(state, i)) { flash('kitten-' + i); fed++; } });
  if (fed) { save(); render(); }
});

// Play: catch the yarn ball a few times.
const PLAY_CATCHES = 5;
function moveYarn() {
  const yard = $('yard'), yarn = $('yarn');
  const w = Math.max(0, yard.clientWidth - 56), hgt = Math.max(0, yard.clientHeight - 56);
  yarn.style.left = Math.round(Math.random() * w) + 'px';
  yarn.style.top = Math.round(Math.random() * hgt) + 'px';
}
function openPlay(i) {
  ui.playIdx = i;
  ui.playLeft = PLAY_CATCHES;
  $('play-title').textContent = 'PLAY WITH ' + state.crew[i].name.toUpperCase();
  $('play-left').textContent = String(PLAY_CATCHES);
  $('play').hidden = false;
  moveYarn();
  $('yarn').focus({ preventScroll: true });
}
function closePlay() {
  const i = ui.playIdx;
  ui.playIdx = -1;
  $('play').hidden = true;
  const row = kittenRows[i];
  if (row) row.play.focus({ preventScroll: true });
  render();
}
$('yarn').addEventListener('click', () => {
  ui.playLeft--;
  $('play-left').textContent = String(ui.playLeft);
  if (ui.playLeft > 0) { moveYarn(); return; }
  if (G.playKitten(state, ui.playIdx)) { flash('kitten-' + ui.playIdx); save(); }
  closePlay();
});
$('play-stop').addEventListener('click', closePlay);

// A short card for each new lesson, shown once nothing else is on screen.
function maybeShowLesson() {
  if (!ui.lessonQueue.length || !$('lesson').hidden || !$('boot').hidden || !$('confirm').hidden || !$('play').hidden) return;
  const id = ui.lessonQueue.shift(), need = G.NEEDS.find((n) => n.id === id), idx = G.NEEDS.indexOf(need);
  $('lesson-art').innerHTML = KITTEN_SVG;
  $('lesson-art').style.color = kittenColor(idx);
  $('lesson-dlg-step').textContent = 'KITTEN CARE · LESSON ' + (idx + 1) + ' OF ' + G.NEEDS.length;
  $('lesson-dlg-title').textContent = LESSONS[id].title;
  $('lesson-dlg-text').textContent = LESSONS[id].text;
  $('lesson').hidden = false;
  $('lesson-go').focus({ preventScroll: true });
}
$('lesson-go').addEventListener('click', () => { $('lesson').hidden = true; openCrew(); });
$('lesson-later').addEventListener('click', () => { $('lesson').hidden = true; render(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('play').hidden) closePlay();
  else if (!$('lesson').hidden) { $('lesson').hidden = true; render(); }
});

// ---------- store (cosmetics, opens at 10,000,000) ----------

function openStore() {
  ui.view = 'store';
  render();
  $('store-back').focus({ preventScroll: true });
}
$('open-store').addEventListener('click', openStore);
$('store-back').addEventListener('click', () => { closeConfirm(); stopPreview(); ui.view = 'main'; render(); });

const skinCards = G.SKINS.map((k) => {
  const el = h('button', 'skin');
  el.innerHTML = catSvg(k.id);
  el.style.setProperty('--glow-c', skinGlow(k.id));
  const name = h('span', 'skin-name', k.name), st = h('span', 'skin-state');
  el.append(name, st);
  el.addEventListener('click', () => {
    if (state.skins.includes(k.id)) { G.equipSkin(state, k.id); render(); }
    else openConfirm('skin', k.id, el);
  });
  $('skin-grid').appendChild(el);
  return { el, st };
});

const trackRows = G.TRACKS.map((tr) => {
  const wrap = h('div', 'track');
  const r = makeRow(() => {
    if (state.tracks.includes(tr.id)) {
      G.selectTrack(state, tr.id);
      setMusic(true); // choosing a track means you want to hear it
      render();
    } else openConfirm('track', tr.id, r.el);
  });
  const pv = h('button', 'preview', '▶');
  pv.addEventListener('click', () => {
    if (preview && preview.id === tr.id) stopPreview(); else startPreview(tr.id);
    render();
  });
  wrap.append(r.el, pv);
  $('track-rows').appendChild(wrap);
  return { r, pv };
});

// Buying always goes through a confirmation sheet, so tapping around the store never spends points by accident.
let confirming = null; // {kind: 'skin' | 'track', item, returnFocus}

function openConfirm(kind, id, returnFocus) {
  const item = (kind === 'skin' ? G.SKINS : G.TRACKS).find((x) => x.id === id);
  confirming = { kind, item, returnFocus };
  const art = $('confirm-art');
  if (kind === 'skin') {
    art.innerHTML = catSvg(id);
    art.style.setProperty('--glow-c', skinGlow(id));
    $('confirm-desc').textContent = 'A new look for your cat. Just for fun: it clicks the same.';
  } else {
    const song = SONGS[id];
    art.innerHTML = '<span class="vt">♪</span>';
    $('confirm-desc').textContent = song.mood + ' · ' + song.bpm + ' BPM. Plays in place of the current track.';
  }
  $('confirm-title').textContent = 'BUY ' + item.name.toUpperCase() + '?';
  $('confirm-price').textContent = G.fmt(item.price);
  $('confirm-preview').hidden = kind !== 'track';
  $('confirm').hidden = false;
  renderConfirm();
  const buy = $('confirm-buy');
  (buy.disabled ? $('confirm-cancel') : buy).focus({ preventScroll: true });
}

function closeConfirm() {
  if (!confirming) return;
  const back = confirming.returnFocus;
  if (preview && confirming.kind === 'track' && preview.id === confirming.item.id) stopPreview();
  confirming = null;
  $('confirm').hidden = true;
  if (back) back.focus({ preventScroll: true });
  render();
}

function confirmBuy() {
  if (!confirming) return;
  const { kind, item } = confirming;
  if (kind === 'skin' && G.buySkin(state, item.id)) {
    G.equipSkin(state, item.id);
    flash('skin-' + item.id);
  } else if (kind === 'track' && G.buyTrack(state, item.id)) {
    G.selectTrack(state, item.id);
    flash('track-' + item.id);
  } else return;
  save();
  closeConfirm();
  if (kind === 'track') setMusic(true); // play the track you just bought
}

function renderConfirm() {
  if (!confirming) return;
  const price = confirming.item.price, can = state.pts >= price;
  set($('confirm-have'), 'text', can ? 'YOU HAVE ' + G.fmt(state.pts) : 'NEED ' + G.fmt(price - state.pts) + ' MORE');
  set($('confirm-buy'), 'disabled', !can);
  set($('confirm-buy'), 'text', can ? 'BUY FOR ' + G.fmt(price) : 'NOT ENOUGH');
  const previewing = !!preview && confirming.kind === 'track' && preview.id === confirming.item.id;
  set($('confirm-preview'), 'text', previewing ? '■ STOP PREVIEW' : '▶ PREVIEW 20s');
  set($('confirm-preview'), 'aria-pressed', String(previewing));
}

$('confirm-buy').addEventListener('click', confirmBuy);
$('confirm-cancel').addEventListener('click', closeConfirm);
$('confirm').addEventListener('click', (e) => { if (e.target === $('confirm')) closeConfirm(); });
$('confirm-preview').addEventListener('click', () => {
  const id = confirming && confirming.item.id;
  if (preview && preview.id === id) stopPreview(); else startPreview(id);
  render();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && confirming) closeConfirm(); });

function renderStore() {
  const s = state;
  set($('store-pts'), 'text', G.fmt(s.pts));
  renderConfirm();
  G.SKINS.forEach((k, i) => {
    const c = skinCards[i], owned = s.skins.includes(k.id), wearing = s.skin === k.id;
    set(c.el, 'class', 'skin ' + (wearing ? 'wearing' : owned ? 'owned' : s.pts >= k.price ? 'ok' : 'no') + flashCls('skin-' + k.id));
    set(c.st, 'text', wearing ? 'WEARING' : owned ? 'WEAR' : G.fmt(k.price));
    set(c.el, 'aria-label', k.name + (wearing ? ', wearing' : owned ? ', owned, tap to wear' : ', costs ' + G.fmt(k.price)));
  });
  G.TRACKS.forEach((tr, i) => {
    const { r, pv } = trackRows[i], song = SONGS[tr.id];
    const owned = s.tracks.includes(tr.id), playing = owned && s.track === tr.id && musicWanted && !preview;
    const secs = Math.round(loopSeconds(song));
    setRow(r, {
      cls: (playing ? 'playing' : owned ? 'owned' : s.pts >= tr.price ? 'ok' : 'no') + flashCls('track-' + tr.id),
      nm: tr.name,
      price: playing ? 'PLAYING' : owned ? (s.track === tr.id ? 'SELECTED' : 'PLAY') : G.fmt(tr.price),
      ds: song.mood.toUpperCase() + ' · ' + song.bpm + ' BPM · ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + ' LOOP',
      bar: owned ? '' : bar(s.pts / tr.price)
    });
    const previewing = !!preview && preview.id === tr.id;
    set(pv, 'text', previewing ? '■' : '▶');
    set(pv, 'aria-pressed', String(previewing));
    set(pv, 'aria-label', (previewing ? 'Stop preview of ' : 'Preview ') + tr.name);
  });
}

// ---------- overlays ----------

const CAT_SVG = catSvg('classic', '#050705');

/** Shown once, the moment the player reaches 10,000,000. */
function showStoreUnlock() {
  const boot = $('boot');
  boot.innerHTML =
    '<span class="ln" style="animation-delay:.2s">&gt; 10,000,000 POINTS REACHED</span>' +
    '<span class="ln" style="animation-delay:.9s">&gt; UNPACKING CRATES... OK</span>' +
    '<span class="ln bigcat" style="animation-delay:1.5s">' + catSvg('royal', '#050705') + '</span>' +
    '<span class="ln title" style="animation-delay:2.1s">STORE OPEN</span>' +
    '<span class="ln" style="animation-delay:2.7s">&gt; CAT SKINS: ' + (G.SKINS.length - 1) + ' NEW LOOKS</span>' +
    '<span class="ln" style="animation-delay:3.2s">&gt; JUKEBOX: ' + (G.TRACKS.length - 1) + ' NEW TRACKS</span>' +
    '<span class="ln" style="animation-delay:3.7s">&gt; FIND IT ANY TIME: THE BAG, TOP RIGHT</span>' +
    '<span class="ln" style="animation-delay:3.9s">&gt; ALSO NEW: HIRE KITTENS TO RUN YOUR FACTORIES (THE PAW, TOP RIGHT)</span>' +
    '<span class="ln next" style="animation-delay:4.1s">&gt; NEXT GOAL: 100,000,000</span>' +
    '<button class="collect ln" id="boot-continue" style="animation-delay:4.7s">VISIT THE STORE</button>' +
    '<button class="later ln" id="boot-later" style="animation-delay:4.7s">LATER</button>';
  boot.hidden = false;
  $('boot-continue').addEventListener('click', () => { boot.hidden = true; openStore(); });
  $('boot-later').addEventListener('click', () => { boot.hidden = true; ui.view = 'main'; render(); big.focus({ preventScroll: true }); });
}

function showBoot() {
  const boot = $('boot');
  boot.innerHTML =
    '<span class="ln" style="animation-delay:.2s">&gt; 1,000,000 POINTS COMMITTED</span>' +
    '<span class="ln" style="animation-delay:.9s">&gt; SCANNING FOR CATS... 1 FOUND</span>' +
    '<span class="ln bigcat" style="animation-delay:1.6s">' + CAT_SVG + '</span>' +
    '<span class="ln title" style="animation-delay:2.2s">CAT ADOPTED</span>' +
    '<span class="ln" style="animation-delay:2.8s">&gt; IT NOW CLICKS FOR YOU 50×/SEC</span>' +
    '<span class="ln" style="animation-delay:3.4s">&gt; KITTENS CAN NOW WORK IN YOUR FACTORIES</span>' +
    '<span class="ln next" style="animation-delay:4s">&gt; NEXT GOAL: 10,000,000</span>' +
    '<button class="collect ln" id="boot-continue" style="animation-delay:4.6s">CONTINUE</button>';
  boot.hidden = false;
  $('boot-continue').addEventListener('click', () => {
    boot.hidden = true;
    ui.view = 'main';
    render();
    big.focus({ preventScroll: true });
  });
}

function showToast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { t.hidden = true; }, 4500);
}

// ---------- loop ----------

function render() {
  set($('screen-main'), 'hidden', ui.view !== 'main');
  set($('screen-factory'), 'hidden', ui.view !== 'factory');
  set($('screen-store'), 'hidden', ui.view !== 'store');
  set($('screen-crew'), 'hidden', ui.view !== 'crew');
  if (G.checkStoreUnlock(state)) { save(); showStoreUnlock(); ui.lessonQueue.push(G.NEEDS[0].id); }
  for (const n of G.checkLessons(state)) ui.lessonQueue.push(n.id);
  maybeShowLesson();
  if (ui.view === 'crew') renderCrew();
  if (ui.view === 'factory') renderFactory();
  if (ui.view === 'store') renderStore();
  if (ui.view === 'main') renderMain();
}

let last = performance.now();
setInterval(() => {
  const now = performance.now(), dt = (now - last) / 1000;
  last = now;
  G.step(state, Math.min(dt, G.MAX_OFFLINE_SECONDS));
  if (state.cat && ui.view === 'main' && !document.hidden) {
    ui.catTimer += dt;
    if (ui.catTimer >= 0.5) {
      ui.catTimer %= 0.5;
      pop(stage, '+' + G.fmt(G.catRate(state) / 2), 'cat');
    }
  }
  render();
}, TICK_MS);

setInterval(save, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

render();
if (welcome && (welcome.points >= 1 || welcome.stored >= 1)) {
  const parts = [];
  if (welcome.points >= 1) parts.push('+' + G.fmt(welcome.points) + ' EARNED');
  if (welcome.stored >= 1) parts.push('+' + G.fmt(welcome.stored) + ' IN YOUR SILOS');
  showToast('WELCOME BACK · ' + parts.join(' · '));
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
}
