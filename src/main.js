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

// Play-testing on localhost: #preset=precat loads test/presets/precat.json, a save written by
// `node scripts/balance-sim.mjs --save-at <points> --save-to test/presets/<name>.json`, so a test can
// start right before a milestone.
const preset = ['localhost', '127.0.0.1'].includes(location.hostname) && /^#preset=([\w-]+)$/.exec(location.hash);
if (preset) {
  try {
    const data = await fetch('test/presets/' + preset[1] + '.json', { cache: 'no-store' }).then((r) => r.json());
    data.savedAt = Date.now(); // no offline progress
    store.set(SAVE_KEY, JSON.stringify(data));
  } catch { /* unknown preset: keep the current save */ }
  history.replaceState(null, '', location.pathname + location.search);
}

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

const ui = { view: 'main', cur: 0, taps: 0, flash: '', flashUntil: 0, catTimer: 0, introDue: false, moveIdx: -1, playLeft: 0 };

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
  if (on) { music.start(); G.markFeat(state, 'music'); } else music.stop();
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
  if (new Date().getHours() < 5) G.markFeat(state, 'night');
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
  // During a golden yarn frenzy the rate spot shows the frenzy instead (the header has no room for both).
  set($('rate'), 'text', s.frenzy > 0 ? 'YARN ×' + G.FRENZY_MULT + ' · ' + Math.ceil(s.frenzy) + 's' : '+' + G.fmt(G.generating(s)) + '/s');
  set($('rate'), 'class', s.frenzy > 0 ? 'frenzy' : '');
  set($('pts'), 'text', G.fmt(s.pts));
  set($('pts'), 'class', 'num ' + (ui.taps ? (ui.taps % 2 ? 'bA' : 'bB') : ''));
  set($('per-click'), 'text', '+' + G.fmt(G.tapGain(s)));
  set($('cat'), 'hidden', !s.cat);
  if (s.cat && $('cat')._skin !== s.skin) {
    $('cat')._skin = s.skin;
    $('cat-art').innerHTML = catSvg(s.skin);
    $('cat').style.setProperty('--cat-glow', skinGlow(s.skin));
  }
  set(big, 'class', 'big' + (s.cat ? ' catpress' : ''));
  const crew = G.crewOn(s);
  set($('cat').querySelector('.tag'), 'text', 'CAT ×' + Math.round(G.catClicks(s)) + '/s');
  set($('open-crew'), 'hidden', !crew);
  set($('crew-alert'), 'hidden', !crew);
  if (crew) {
    const ready = G.careReady(s, today());
    set($('crew-badge'), 'hidden', !ready);
    set($('crew-badge'), 'text', '!');
    set($('crew-alert'), 'class', 'crew-alert' + (ready || G.happy(s) ? ' ready' : ' calm'));
    set($('crew-alert-text'), 'text', ready ? 'CARE TIME IS READY · FACTORIES ×' + G.HAPPY_MULT + ' FOR AN HOUR'
      : G.happy(s) ? 'HAPPY CREW · FACTORIES ×' + G.HAPPY_MULT + ' · ' + minutesLeft(s) + ' LEFT'
      : 'CREW OK · ' + s.crew.length + (s.crew.length === 1 ? ' KITTEN' : ' KITTENS') + ' WORKING');
  }

  // The level meter: level 1 is bought (adopt the cat); later levels arrive as soon as they're reached
  // and the meter moves on. The store lives in the header so progress stays visible.
  const goal = G.currentGoal(s), reached = s.pts >= goal.at, done = G.finalGoalReached(s);
  const frac = Math.min(1, s.pts / goal.at), need = Math.max(0, goal.at - s.pts), inc = G.income(s);
  set($('goal'), 'hidden', done || (reached && s.goalIdx === 0));
  set($('adopt'), 'hidden', !(reached && s.goalIdx === 0));
  set($('goal-done'), 'hidden', !done);
  set($('open-store'), 'hidden', !s.storeOpen);
  set($('store-badge'), 'hidden', !s.storeOpen || !s.fresh.length);
  set($('store-badge'), 'text', s.fresh.length > 99 ? '99' : String(s.fresh.length));
  set($('goal-title'), 'text', 'LEVEL ' + (Math.min(s.goalIdx, G.GOALS.length - 1) + 1) + ' · ' + goal.at.toLocaleString('en-US'));
  if (done) set($('done-title'), 'text', G.GOALS[G.GOALS.length - 1].at.toLocaleString('en-US') + ' REACHED');
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
      ds: f.kitOn ? 'RUN BY ' + G.kittenAt(s, i).name.toUpperCase() + ' · ' + fmtBoost(f.boost)
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
      : '×' + (Math.round(Math.pow(G.TIER_OUT, n) * 10) / 10) + ' output of factory #1, own lines and silo.');
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

// An underling: the kitten shape with a yellow hard hat.
const SUB_SVG = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><g fill="currentColor"><rect x="3" y="5" width="10" height="6"/><rect x="4" y="11" width="8" height="4"/><rect x="12" y="12" width="3" height="2"/></g><g fill="#FFE66B"><rect x="4" y="1" width="8" height="3"/><rect x="2" y="4" width="12" height="1"/></g><g fill="#0A140D"><rect x="5" y="7" width="2" height="2"/><rect x="9" y="7" width="2" height="2"/></g></svg>';
const SUB_COLORS = ['#FFD479', '#FF9F43', '#F2F7F3', '#B7A58C', '#FFB3C7', '#C8A27A'];
const subColor = (u) => SUB_COLORS[[...u.name].reduce((a, c) => a + c.charCodeAt(0), 0) % SUB_COLORS.length];

const bays = [0, 1, 2, 3].map(() => {
  const el = h('div', 'bay');
  const kit = h('span', 'kit');
  kit.innerHTML = SUB_SVG;
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

// The manager card: when a kitten runs this factory it takes the collect button's place.
$('mgr-move').addEventListener('click', () => openMove(state.crew.indexOf(G.kittenAt(state, ui.cur))));
$('mgr-promote').addEventListener('click', () => promote(state.crew.indexOf(G.kittenAt(state, ui.cur))));
$('mgr-art').addEventListener('click', () => openCrew());
const mgrHire = makeRow(() => hire(ui.cur));
$('mgr-hire-box').appendChild(mgrHire.el);

function renderManager() {
  const s = state, k = G.kittenAt(s, ui.cur), idx = s.crew.indexOf(k);
  set($('manager'), 'hidden', !k);
  set($('mgr-hire-box'), 'hidden', !G.crewOn(s) || !!k);
  if (!k) {
    if (G.crewOn(s)) setRow(mgrHire, hireRow(ui.cur));
    return;
  }
  if ($('mgr-art')._k !== idx) {
    $('mgr-art')._k = idx;
    $('mgr-art').innerHTML = KITTEN_SVG;
    $('mgr-art').style.color = kittenColor(idx);
  }
  set($('manager'), 'class', 'manager' + (G.happy(s) ? ' happy' : ''));
  set($('mgr-title'), 'text', k.name.toUpperCase() + ' · LV ' + G.kittenLevel(k) + ' RUNS THIS FACTORY');
  set($('mgr-boost'), 'text', fmtBoost(G.kittenBoost(s, k, ui.cur)));
  set($('mgr-desc'), 'text', 'Ships everything · nothing to collect · ' + (k.fav === ui.cur ? '♥ its favourite' : 'loves #' + (k.fav + 1)));
  set($('mgr-trait'), 'text', traitLine(k));
  set($('mgr-xp'), 'text', xpLine(k));
  setPromote($('mgr-promote'), k);
}

function renderFactory() {
  const s = state, f = s.facs[ui.cur];
  if (!f) { ui.view = 'main'; return; }
  const c = G.siloCap(f), full = f.store >= c, pct = Math.round(Math.min(1, f.store / c) * 100);
  const k = G.kittenAt(s, ui.cur), run = !!(k && f.kitOn); // run: a kitten is running the whole factory right now
  set($('fac-title'), 'text', 'FACTORY #' + (ui.cur + 1));
  // With a kitten in charge the manager card takes room, so the whole screen scrolls as one page.
  set($('screen-factory'), 'class', 'screen' + (k ? ' crewed' : ''));
  set($('fac-pts'), 'text', G.fmt(s.pts));
  slots.forEach(renderSlot);

  // Belt speed follows turbo presses and the kitten; tokens are spread evenly along the belt.
  const d = 3 / Math.pow(2, Math.min(f.turbo, 3)) / (run ? 2 : 1); // past 3 presses the belts can't visibly go faster
  const stalled = full && !run;
  set($('hall'), 'class', 'hall' + (stalled ? ' paused' : '') + (run ? ' crewed' : ''));
  set($('hall').parentElement, 'class', 'plant' + (stalled ? ' paused' : ''));
  set($('hall'), '--belt', d + 's');
  set($('hall'), '--press', (d / 4).toFixed(3) + 's');
  set($('hall-tag'), 'hidden', !run);
  if (run) set($('hall-tag'), 'text', 'RUN BY ' + k.name.toUpperCase() + ' · ' + fmtBoost(f.boost));
  bays.forEach((b, i) => {
    const on = i < f.lines;
    set(b.el, 'class', 'bay' + (on ? '' : ' empty'));
    // The lead kitten is on the manager card; its underlings work at the belts.
    const u = k && run && (k.subs || [])[i];
    set(b.kit, 'hidden', !u);
    if (u) { set(b.kit, 'color', subColor(u)); set(b.kit, 'aria-label', u.name); }
    set(b.press, 'hidden', !on);
    set(b.belt, 'hidden', !on);
    set(b.empty, 'hidden', on);
    b.toks.forEach((t, j) => set(t, 'animationDelay', '-' + (j * d / 4).toFixed(3) + 's'));
  });
  // Run by a kitten, the silo becomes a chute that ships straight out.
  set($('silo'), 'class', 'silo' + (run ? ' auto' : full ? ' full' : ''));
  set($('silo-label'), 'text', run ? 'AUTO' : full ? 'FULL' : 'SILO');
  set($('silo-level'), 'height', pct + '%');
  set($('silo-pct'), 'text', run ? 'SHIP' : pct + '%');
  set($('fac-rate'), 'text', '+' + G.fmt(G.factoryRate(f)) + '/s');
  set($('fac-store-label'), 'text', run ? 'SHIPS' : 'STORED');
  set($('fac-store'), 'text', run ? 'EVERYTHING' : G.fmt(f.store) + ' / ' + G.fmt(c));
  renderManager();
  set($('collect-stage'), 'hidden', run);
  set($('collect'), 'text', 'COLLECT +' + G.fmt(f.store));
  set($('collect'), 'class', 'collect' + (full ? ' full' : ''));
  set($('collect'), 'disabled', f.store < 1);

  set($('ext-note'), 'hidden', !k);
  if (k) set($('ext-note'), 'text', 'MORE LINES AND TURBO PRESSES MAKE ' + k.name.toUpperCase() + ' RUN EVEN FASTER');
  G.EXTENSIONS.forEach((e, i) => {
    const locked = G.extensionLocked(s, e), maxed = G.extensionMaxed(f, e), cost = G.extensionCost(e, f);
    // Nothing is stored while a kitten ships it all, so the silo and dock don't help (except a Packer's dock).
    const moot = run && (e.id === 'silo' || (e.id === 'dock' && k.trait !== 'pack'));
    setRow(extRows[i], {
      cls: (locked ? 'locked' : maxed ? 'maxed' : s.pts >= cost && !moot ? 'ok' : 'no') + flashCls(e.id),
      disabled: locked || maxed,
      nm: '[' + f[e.id] + '/' + e.max + '] ' + (locked ? '████████ ???' : e.name),
      price: maxed ? 'MAX' : G.fmt(cost),
      ds: locked ? 'UNLOCKS WITH LEVEL 1' : moot ? 'No use while ' + k.name + ' ships everything'
        : run && e.id === 'dock' ? e.desc + ' · ' + k.name + ' the Packer: +20% speed per dock'
        : run && e.id === 'turbo' && k.trait === 'gear' ? e.desc + ' · ' + k.name + ' the Gearhead: +15% more per press' : e.desc,
      bar: locked || maxed ? '' : bar(s.pts / cost)
    });
  });
}

// ---------- kitten crew (from 10,000,000) ----------

const INTRO = 'Kittens can now run your factories. A kitten ships everything straight to you, so there is nothing to collect and nothing stops when the silo fills. Your first kitten is free; hire one for each factory. Each kitten works best in its favourite factory, and its trait decides where else it shines. Working fills a kitten\'s XP bar: when it\'s full, PROMOTE it for points to make it faster. Once a day it\'s care time: feed, nap and play with the crew, and every kitten-run factory runs ×' + G.HAPPY_MULT + ' for an hour.';
const INTRO_SUBS = 'From now on a kitten opens a slot for an underling at level ' + G.SLOT_LEVELS.join(', ') + ' (three in all). Underlings work at the belts of their lead\'s factory, need nothing, and give their lead XP. Each one speeds up the factory, more if it shares its lead\'s trait, and three with the same trait as the lead make a team bonus. The next underling waits on the crew screen: pick the kitten who gets it.';
const KITTEN_COLORS = ['#FFD479', '#FF9F43', '#F2F7F3', '#B7A58C', '#FFB3C7', '#9CFFB5', '#C8A27A', '#8FB8FF'];
const kittenColor = (i) => KITTEN_COLORS[i % KITTEN_COLORS.length];
const fmtBoost = (b) => '×' + (Math.round(b * 10) / 10);
const traitLine = (k) => G.traitOf(k).name.toUpperCase() + ' · ' + G.traitOf(k).desc;
const minutesLeft = (s) => Math.ceil(s.happy / 60) + 'm';
const xpLine = (k) => G.canPromote(k) ? 'XP FULL · READY TO PROMOTE' : 'XP ' + Math.floor(100 * (k.xp || 0) / G.xpNeed(k)) + '% · LV ' + (G.kittenLevel(k) + 1) + ' IN ' + fmtTime((G.xpNeed(k) - (k.xp || 0)) / G.xpRate(k));
function fmtTime(sec) {
  sec = Math.ceil(sec);
  return sec < 60 ? sec + 's' : sec < 3600 ? Math.ceil(sec / 60) + 'm' : Math.floor(sec / 3600) + 'h ' + Math.ceil((sec % 3600) / 60) + 'm';
}
/** The PROMOTE button: shows the price once the XP bar is full. */
function setPromote(btn, k) {
  const ready = G.canPromote(k), cost = G.promoteCost(state, k);
  set(btn, 'text', ready ? 'PROMOTE · ' + G.fmt(cost) : 'PROMOTE');
  set(btn, 'disabled', !ready || state.pts < cost);
  set(btn, 'class', 'care' + (ready && state.pts >= cost ? ' todo' : ''));
}
function promote(n) {
  if (!G.promoteKitten(state, n)) return;
  const k = state.crew[n];
  flash('kitten-' + n);
  if (G.kittenLevel(k) % G.MILESTONE_EVERY === 0) showToast(k.name.toUpperCase() + ' REACHED LV ' + G.kittenLevel(k) + ' · ×2 SPEED');
  save();
  render();
}
function hireSub(n) {
  if (!G.hireSub(state, n)) return;
  flash('kitten-' + n);
  save();
  render();
}
/** The player's local date: care time comes round once a day. */
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/** What reaches the balance by itself each second: the auto-clicker, the cat and kitten-run factories
 *  (factories without a kitten only pay when collected). Used to preview a move or a hire. */
const shipped = (t) => G.perSec(t) + t.facs.reduce((a, f) => a + (f.kitOn ? G.factoryRate(f) : 0), 0);
function shippedWith(change) {
  const t = structuredClone(state);
  change(t);
  G.syncCrew(t);
  return shipped(t);
}
const signed = (n) => (n >= 0 ? '+' : '−') + G.fmt(Math.abs(n)) + '/s';

function openCrew() {
  ui.view = 'crew';
  render();
  $('crew-back').focus({ preventScroll: true });
}
$('open-crew').addEventListener('click', openCrew);
$('crew-alert').addEventListener('click', openCrew);
$('crew-back').addEventListener('click', () => { ui.view = 'main'; render(); });

function hire(i) {
  if (!G.hireKitten(state, i)) return;
  flash('kitten-' + (state.crew.length - 1));
  save();
  render();
}
function hireRow(i) {
  const s = state, cost = G.hireCost(i), r = s.recruit, gain = shippedWith((t) => G.hireKitten(t, i, true)) - shipped(s);
  return { cls: s.pts >= cost ? 'ok' : 'no', nm: 'Hire ' + r.name + ' for factory #' + (i + 1), price: G.fmt(cost),
    ds: fmtBoost(G.kittenBoost(s, r, i)) + (r.fav === i ? ' · FAVOURITE' : '') + ' · SHIPS ' + signed(gain) + ' · NO MORE COLLECTING', bar: bar(s.pts / cost) };
}

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
    const job = h('span', 'job'), trait = h('span', 'ds trait');
    const xp = h('div', 'need xp'), xpFill = h('span'), xpMeter = h('span', 'meter'), xpText = h('span', 'xp-text');
    xpMeter.appendChild(xpFill);
    xp.append(h('span', null, 'XP'), xpMeter);
    const actions = h('div', 'care-actions'), promoteBtn = h('button', 'care'), move = h('button', 'care', 'MOVE');
    promoteBtn.addEventListener('click', () => promote(i));
    move.addEventListener('click', () => openMove(i));
    actions.append(promoteBtn, move);
    // The team: up to three underlings, a hire button for a free slot, or the level that opens the next one.
    const team = h('div', 'team'), members = G.SLOT_LEVELS.map(() => {
      const m = h('button', 'member'), art = h('span', 'art'), label = h('span', 'label');
      art.innerHTML = SUB_SVG;
      m.append(art, label);
      m.addEventListener('click', () => hireSub(i));
      team.appendChild(m);
      return { m, art, label };
    });
    body.append(top, job, trait, xp, xpText, actions, team);
    el.append(art, body);
    $('kitten-rows').appendChild(el);
    kittenRows.push({ el, name, status, job, trait, xpFill, xpText, promoteBtn, move, team, members });
  }
}

const hireRows = [];
function syncHireRows() {
  while (hireRows.length < state.facs.length) {
    const i = hireRows.length, r = makeRow(() => hire(i));
    $('hire-rows').appendChild(r.el);
    hireRows.push(r);
  }
}

function renderCrew() {
  const s = state;
  if (!G.crewOn(s)) { ui.view = 'main'; return; }
  set($('crew-pts'), 'text', G.fmt(s.pts));
  // Care time: once a day, three steps in any order; doing all three makes the crew happy for an hour.
  const day = today(), ready = G.careReady(s, day), happy = G.happy(s);
  set($('care-card'), 'class', 'lesson-card care-card' + (ready ? ' ready' : happy ? ' happy' : ' rested'));
  set($('care-title'), 'text', ready ? 'CARE TIME IS READY' : happy ? 'HAPPY CREW · FACTORIES ×' + G.HAPPY_MULT : 'THE CREW IS CONTENT');
  set($('care-left'), 'text', happy ? minutesLeft(s) + ' LEFT' : '');
  set($('care-text'), 'text', ready ? 'Feed, nap and play with the crew. Do all three and every kitten-run factory runs ×' + G.HAPPY_MULT + ' for an hour, even while you are away.'
    : 'Care time comes back tomorrow. Skipping it costs nothing: the crew keeps working either way.');
  set($('care-actions'), 'hidden', !ready);
  for (const step of G.CARE_STEPS) {
    const done = G.careDone(s, day, step), btn = $('care-' + step);
    set(btn, 'text', (done ? '✓ ' : '') + step.toUpperCase());
    set(btn, 'disabled', done);
    set(btn, 'class', 'care' + (done ? '' : ' todo'));
  }
  set($('crew-note'), 'text', G.underlingsOn(s) && s.subRecruit
    ? 'NEXT UNDERLING: ' + s.subRecruit.name.toUpperCase() + ' · ' + G.traitOf(s.subRecruit).name.toUpperCase() + '. ★ = same trait as the lead (+' + Math.round(G.SUB_MATCH * 100) + '% instead of +' + Math.round(G.SUB_BONUS * 100) + '%). Tap a free slot to hire.'
    : 'Each kitten works best in its favourite factory, and its trait decides where else it shines. MOVE swaps kittens around for free. Working fills the XP bar; when it\'s full, PROMOTE for points.');
  // Kittens
  syncKittenRows();
  s.crew.forEach((k, i) => {
    const r = kittenRows[i], fav = k.fav === k.fac;
    set(r.el, 'class', 'kitten working' + (happy ? ' happy' : '') + flashCls('kitten-' + i));
    set(r.name, 'text', k.name);
    set(r.status, 'text', fav ? '♥ FAVOURITE' : 'LOVES #' + (k.fac >= 0 ? k.fav + 1 : '?'));
    set(r.job, 'text', 'LV ' + G.kittenLevel(k) + ' · RUNS FACTORY #' + (k.fac + 1) + ' · ' + fmtBoost(G.kittenBoost(s, k, k.fac)) + ' · +' + G.fmt(G.factoryRate(s.facs[k.fac])) + '/s');
    set(r.trait, 'text', traitLine(k));
    set(r.xpFill, 'width', (100 * Math.min(1, (k.xp || 0) / G.xpNeed(k))).toFixed(1) + '%');
    set(r.xpText, 'text', xpLine(k));
    setPromote(r.promoteBtn, k);
    set(r.move, 'hidden', s.facs.length < 2);
    const on = G.underlingsOn(s), team = k.subs || [], open = G.slots(s, k), next = s.subRecruit, cost = G.subCost(s);
    set(r.team, 'hidden', !on);
    if (on) r.members.forEach((mb, j) => {
      const u = team[j], free = !u && j < open && next;
      set(mb.m, 'class', 'member' + (u ? ' filled' : free ? ' free' : ' locked'));
      set(mb.m, 'disabled', !free || s.pts < cost);
      set(mb.art, 'hidden', !u && !free);
      if (u || free) set(mb.art, 'color', subColor(u || next));
      set(mb.label, 'text', u ? u.name + (u.trait === k.trait ? ' ★' : '')
        : free ? 'HIRE ' + next.name.toUpperCase() + (next.trait === k.trait ? ' ★' : '') + ' · ' + G.fmt(cost)
        : 'SLOT AT LV ' + G.SLOT_LEVELS[j]);
    });
  });
  // Hiring: the next recruit waits, and the player picks the factory
  const open = s.facs.map((f, i) => i).filter((i) => !G.kittenAt(s, i));
  set($('hire-title'), 'hidden', !open.length);
  set($('recruit'), 'hidden', !open.length);
  if (open.length && $('recruit-art')._n !== s.recruit.name) {
    $('recruit-art')._n = s.recruit.name;
    $('recruit-art').innerHTML = KITTEN_SVG;
    $('recruit-art').style.color = kittenColor(s.crew.length);
  }
  set($('recruit-name'), 'text', s.recruit.name);
  set($('recruit-trait'), 'text', 'LOVES #' + (s.recruit.fav + 1) + ' · ' + traitLine(s.recruit));
  syncHireRows();
  s.facs.forEach((f, i) => {
    set(hireRows[i].el, 'hidden', !open.includes(i));
    if (open.includes(i)) setRow(hireRows[i], hireRow(i));
  });
}

// Care time buttons. Play is the yarn game.
$('care-feed').addEventListener('click', () => care('feed'));
$('care-nap').addEventListener('click', () => care('nap'));
$('care-play').addEventListener('click', openPlay);
function care(step) {
  if (!G.doCare(state, today(), step)) return;
  if (G.happy(state)) showToast('HAPPY CREW · FACTORIES ×' + G.HAPPY_MULT + ' FOR AN HOUR');
  save();
  render();
}

// Moving a kitten: pick a factory; a kitten already there swaps places. Each row previews the change.
function openMove(n) {
  const s = state, k = s.crew[n];
  if (!k) return;
  ui.moveIdx = n;
  $('move-art').innerHTML = KITTEN_SVG;
  $('move-art').style.color = kittenColor(n);
  $('move-title').textContent = 'MOVE ' + k.name.toUpperCase();
  $('move-desc').textContent = 'Loves factory #' + (k.fav + 1) + '. ' + traitLine(k);
  const rows = $('move-rows');
  rows.textContent = '';
  const base = shipped(s);
  s.facs.forEach((f, i) => {
    const here = k.fac === i, other = G.kittenAt(s, i);
    const r = makeRow(() => { if (G.moveKitten(state, n, i)) { flash('kitten-' + n); save(); } closeMove(); });
    const gain = here ? 0 : shippedWith((t) => G.moveKitten(t, n, i)) - base;
    setRow(r, { cls: here ? 'maxed' : gain >= 0 ? 'ok' : 'no', disabled: here,
      nm: 'Factory #' + (i + 1) + (k.fav === i ? ' ♥' : '') + (here ? ' · HERE NOW' : ''),
      price: fmtBoost(G.kittenBoost(s, k, i)),
      ds: here ? 'Where ' + k.name + ' works now' : (other ? 'Swaps with ' + other.name + ' · ' : 'Factory #' + (k.fac + 1) + ' goes back to collecting · ') + 'shipped ' + signed(gain), bar: '' });
    rows.appendChild(r.el);
  });
  $('move').hidden = false;
  $('move-cancel').focus({ preventScroll: true });
}
function closeMove() {
  ui.moveIdx = -1;
  $('move').hidden = true;
  render();
}
$('move-cancel').addEventListener('click', closeMove);

// Play: catch the yarn ball a few times (one of the care time steps).
const PLAY_CATCHES = 5;
function moveYarn() {
  const yard = $('yard'), yarn = $('yarn');
  const w = Math.max(0, yard.clientWidth - 56), hgt = Math.max(0, yard.clientHeight - 56);
  yarn.style.left = Math.round(Math.random() * w) + 'px';
  yarn.style.top = Math.round(Math.random() * hgt) + 'px';
}
function openPlay() {
  ui.playLeft = PLAY_CATCHES;
  $('play-title').textContent = 'PLAY TIME';
  $('play-left').textContent = String(PLAY_CATCHES);
  $('play').hidden = false;
  moveYarn();
  $('yarn').focus({ preventScroll: true });
}
function closePlay() {
  $('play').hidden = true;
  render();
}
$('yarn').addEventListener('click', () => {
  ui.playLeft--;
  $('play-left').textContent = String(ui.playLeft);
  if (ui.playLeft > 0) { moveYarn(); return; }
  closePlay();
  care('play');
});
$('play-stop').addEventListener('click', closePlay);

// The crew introduction, shown once when the crew arrives (after the store's boot sequence).
function maybeShowIntro() {
  if (!ui.introDue || !$('lesson').hidden || !$('boot').hidden || !$('confirm').hidden) return;
  const subs = ui.introDue === 'subs';
  ui.introDue = false;
  $('lesson-art').innerHTML = subs ? SUB_SVG : KITTEN_SVG;
  $('lesson-art').style.color = kittenColor(0);
  $('lesson-dlg-step').textContent = subs ? 'LEVEL 3 · UNDERLINGS' : 'NEW · KITTEN CREW';
  $('lesson-dlg-title').textContent = subs ? 'KITTENS HIRE UNDERLINGS'
    : state.crew.length ? state.crew[0].name.toUpperCase() + ' JOINS THE CREW' : 'KITTEN CREW';
  $('lesson-dlg-text').textContent = subs ? INTRO_SUBS : INTRO;
  $('lesson').hidden = false;
  $('lesson-go').focus({ preventScroll: true });
}
$('lesson-go').addEventListener('click', () => { $('lesson').hidden = true; openCrew(); });
$('lesson-later').addEventListener('click', () => { $('lesson').hidden = true; render(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('play').hidden) closePlay();
  else if (!$('move').hidden) closeMove();
  else if (!$('lesson').hidden) { $('lesson').hidden = true; render(); }
});

// ---------- store (cosmetics, opens at 10,000,000) ----------

function openStore() {
  // Open on the best class with something new in it, else where the player was.
  const fresh = state.fresh.map((id) => G.SKINS.find((sk) => sk.id === id).cls);
  if (fresh.length) ui.cls = Math.max(...fresh);
  seeClass();
  ui.view = 'store';
  render();
  $('store-back').focus({ preventScroll: true });
}
$('open-store').addEventListener('click', openStore);
$('store-back').addEventListener('click', () => { closeConfirm(); stopPreview(); ui.newHere.clear(); ui.view = 'main'; render(); });

// Skins: one tab per class. A class's cards are built the first time its tab opens.
const pct = (v) => { const p = v * 100; return '+' + (p < 10 ? +p.toFixed(1) : Math.round(p)) + '%'; };
const bonusText = (sk) => sk.bonus.map((b) => pct(b.value) + ' ' + G.BONUSES[b.type].label).join(' · ') || 'No bonus';
const isSecret = (sk) => sk.secret && !G.skinReleased(state, sk.id);
/** How far along a locked skin is, e.g. "1,234 / 4,000". */
function progressText(sk) {
  const c = sk.cond, p = G.skinProgress(state, sk);
  if (!c) return '';
  if (c.f) return p >= 1 ? 'DONE' : 'NOT YET';
  if (c.skins) return Math.round(p * c.skins.length) + ' / ' + c.skins.length;
  return G.fmt(Math.min(G.statValue(state, c.k), c.at)) + ' / ' + G.fmt(c.at) + (c.k === 'play' ? ' MIN' : '');
}
ui.cls = 0;
ui.newHere = new Set(); // skins shown as NEW during this visit to the store
const clsTabs = G.CLASSES.map((c, i) => {
  const el = h('button', 'cls-tab c' + i);
  el.setAttribute('role', 'tab');
  const nm = h('span', '', c.name), n = h('span', 'vt'), dot = h('span', 'dot');
  el.append(nm, n, dot);
  el.addEventListener('click', () => { ui.cls = i; seeClass(); render(); });
  $('cls-tabs').appendChild(el);
  return { el, n, dot };
});
const skinCards = new Map();
function buildClass(i) {
  for (const sk of G.SKINS.filter((x) => x.cls === i)) {
    if (skinCards.has(sk.id)) continue;
    const el = h('button', 'skin c' + i);
    el.innerHTML = catSvg(sk.id);
    el.style.setProperty('--glow-c', skinGlow(sk.id));
    const name = h('span', 'skin-name'), bonus = h('span', 'skin-bonus', bonusText(sk)), st = h('span', 'skin-state'), nw = h('span', 'new', 'NEW');
    el.append(nw, name, bonus, st);
    el.addEventListener('click', () => {
      if (state.skins.includes(sk.id)) { G.equipSkin(state, sk.id); save(); render(); }
      else openConfirm('skin', sk.id, el);
    });
    $('skin-grid').appendChild(el);
    skinCards.set(sk.id, { el, name, bonus, st, nw, sk });
  }
}
/** Opening a class marks its new skins as seen (they keep their NEW tag until the player leaves the store). */
function seeClass() {
  const ids = state.fresh.filter((id) => G.SKINS.find((sk) => sk.id === id).cls === ui.cls);
  ids.forEach((id) => ui.newHere.add(id));
  G.seeSkins(state, ids);
  ui.freshSeen = state.fresh.length;
}

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

// Codes for play-testing (see redeemCode in game.js).
$('code-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('code-input'), n = G.redeemCode(state, input.value);
  input.value = '';
  input.blur();
  showToast(n < 0 ? 'UNKNOWN CODE' : n === 0 ? 'CODE OK · NOTHING NEW TO UNLOCK' : 'CODE OK · ' + n + ' SKINS UNLOCKED');
  if (n > 0) { ui.freshSeen = state.fresh.length; save(); }
  render();
});

// Buying always goes through a confirmation sheet, so tapping around the store never spends points by accident.
let confirming = null; // {kind: 'skin' | 'track', item, returnFocus}

function openConfirm(kind, id, returnFocus) {
  const item = (kind === 'skin' ? G.SKINS : G.TRACKS).find((x) => x.id === id);
  confirming = { kind, item, returnFocus };
  const art = $('confirm-art');
  $('confirm-cls').hidden = kind !== 'skin';
  $('confirm').querySelector('.sheet').className = 'sheet' + (kind === 'skin' ? ' c' + item.cls : '');
  if (kind === 'skin') {
    const locked = !G.skinReleased(state, id), secret = isSecret(item);
    art.innerHTML = catSvg(id);
    art.className = 'sheet-art' + (locked ? ' locked' : '');
    art.style.setProperty('--glow-c', skinGlow(id));
    $('confirm-cls').textContent = G.CLASSES[item.cls].name + ' · ' + bonusText(item);
    $('confirm-desc').textContent = secret ? 'A secret. Nobody knows how to get this one.'
      : (locked ? 'LOCKED · ' : 'Unlocked: ') + item.text + '. Worn by your cat, it gives the bonus above. One skin at a time.';
  } else {
    art.className = 'sheet-art';
    const song = SONGS[id];
    art.innerHTML = '<span class="vt">♪</span>';
    $('confirm-desc').textContent = song.mood + ' · ' + song.bpm + ' BPM. Plays in place of the current track.';
  }
  const locked = kind === 'skin' && !G.skinReleased(state, id);
  $('confirm-title').textContent = locked ? (isSecret(item) ? '???' : item.name.toUpperCase()) : 'BUY ' + item.name.toUpperCase() + '?';
  $('confirm-price').textContent = locked ? '—' : G.fmt(itemPrice());
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

/** Tracks have a fixed price; a skin costs what it was priced at when it was released. */
function itemPrice() {
  const { kind, item } = confirming;
  return kind === 'skin' ? G.skinPrice(state, item.id) : item.price;
}
function renderConfirm() {
  if (!confirming) return;
  const { kind, item } = confirming;
  if (kind === 'skin' && !G.skinReleased(state, item.id)) {
    set($('confirm-have'), 'text', isSecret(item) ? '' : progressText(item));
    set($('confirm-buy'), 'disabled', true);
    set($('confirm-buy'), 'text', 'LOCKED');
    return;
  }
  const price = itemPrice(), can = state.pts >= price;
  set($('confirm-price'), 'text', G.fmt(price));
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
  const worn = G.SKINS.find((sk) => sk.id === s.skin);
  if ($('wearing-art')._skin !== s.skin) {
    $('wearing-art')._skin = s.skin;
    $('wearing-art').innerHTML = catSvg(s.skin);
    $('wearing-card').style.setProperty('--glow-c', skinGlow(s.skin));
  }
  set($('wearing-card'), 'class', 'wearing-card c' + worn.cls);
  set($('wearing-name'), 'text', worn.name);
  set($('wearing-bonus'), 'text', G.CLASSES[worn.cls].name.toUpperCase() + ' · ' + bonusText(worn));
  set($('skin-count'), 'text', s.skins.length + ' / ' + G.SKINS.length);
  clsTabs.forEach((t, i) => {
    const all = G.SKINS.filter((sk) => sk.cls === i);
    set(t.el, 'aria-selected', String(i === ui.cls));
    set(t.n, 'text', all.filter((sk) => s.skins.includes(sk.id)).length + '/' + all.length);
    set(t.dot, 'hidden', !s.fresh.some((id) => all.some((sk) => sk.id === id)));
  });
  buildClass(ui.cls);
  for (const c of skinCards.values()) {
    const k = c.sk, here = k.cls === ui.cls;
    set(c.el, 'hidden', !here);
    if (!here) continue;
    const owned = s.skins.includes(k.id), wearing = s.skin === k.id, released = G.skinReleased(s, k.id), secret = isSecret(k);
    const price = released ? G.skinPrice(s, k.id) : 0;
    set(c.el, 'class', 'skin c' + k.cls + ' ' + (wearing ? 'wearing' : owned ? 'owned' : !released ? 'locked' : s.pts >= price ? 'ok' : 'no') + flashCls('skin-' + k.id));
    set(c.name, 'text', secret ? '???' : k.name);
    set(c.bonus, 'text', secret ? '▓▓▓ ▓▓ ▓▓▓▓▓' : bonusText(k));
    set(c.nw, 'hidden', !ui.newHere.has(k.id) || owned);
    set(c.st, 'text', wearing ? 'WEARING' : owned ? 'WEAR' : released ? G.fmt(price) : secret ? 'SECRET' : progressText(k));
    set(c.el, 'aria-label', (secret ? 'Secret skin' : k.name) + ', ' + G.CLASSES[k.cls].name + (wearing ? ', wearing' : owned ? ', owned, tap to wear'
      : released ? ', costs ' + G.fmt(price) : ', locked: ' + (secret ? 'secret' : k.text)));
  }
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
    '<span class="ln" style="animation-delay:2.7s">&gt; CAT SKINS: ' + state.fresh.length + ' WAITING, ' + G.SKINS.length + ' TO COLLECT, EACH WITH A BONUS</span>' +
    '<span class="ln" style="animation-delay:3.2s">&gt; JUKEBOX: ' + (G.TRACKS.length - 1) + ' NEW TRACKS</span>' +
    '<span class="ln" style="animation-delay:3.7s">&gt; FIND IT ANY TIME: THE BAG, TOP RIGHT</span>' +
    '<span class="ln" style="animation-delay:3.9s">&gt; ALSO NEW: HIRE KITTENS TO RUN YOUR FACTORIES (THE PAW, TOP RIGHT)</span>' +
    '<span class="ln next" style="animation-delay:4.1s">&gt; NEXT LEVEL: 100,000,000</span>' +
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
    '<span class="ln" style="animation-delay:2.8s">&gt; IT NOW CLICKS FOR YOU ' + G.CAT_CPS + '×/SEC</span>' +
    '<span class="ln" style="animation-delay:3.4s">&gt; TRAIN IT IN THE SHOP TO CLICK FASTER</span>' +
    '<span class="ln next" style="animation-delay:4s">&gt; NEXT LEVEL: 10,000,000</span>' +
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

$('adopt-desc').textContent = '1,000,000 · IT CLICKS FOR YOU ' + G.CAT_CPS + '×/SEC';

// ---------- golden yarn (after the cat) ----------
// Every 6-10 minutes of play a golden yarn ball rolls across the screen. Catching it makes all income
// ×5 for a minute; missing it costs nothing.
const YARN_MIN = 360, YARN_MAX = 600, YARN_ROLL_MS = 7000;
ui.yarnIn = YARN_MIN + Math.random() * (YARN_MAX - YARN_MIN);
function tickYarn(dt) {
  const yarn = $('gold-yarn');
  const quiet = $('boot').hidden && $('lesson').hidden && $('confirm').hidden && $('play').hidden && $('move').hidden;
  if (!state.cat || document.hidden || !yarn.hidden || !quiet || ui.view === 'store') return;
  ui.yarnIn -= dt;
  if (ui.yarnIn > 0) return;
  ui.yarnIn = YARN_MIN + Math.random() * (YARN_MAX - YARN_MIN);
  yarn.style.top = Math.round(22 + Math.random() * 46) + '%';
  yarn.classList.toggle('rtl', Math.random() < 0.5);
  yarn.hidden = false;
  yarn.style.animation = 'none';
  void yarn.offsetWidth; // restart the roll
  yarn.style.animation = '';
  clearTimeout(tickYarn.timer);
  tickYarn.timer = setTimeout(() => { yarn.hidden = true; G.missYarn(state); }, YARN_ROLL_MS);
}
$('gold-yarn').addEventListener('click', () => {
  $('gold-yarn').hidden = true;
  clearTimeout(tickYarn.timer);
  if (!G.catchYarn(state)) return;
  showToast('GOLDEN YARN · ALL INCOME ×' + G.FRENZY_MULT + ' FOR ' + G.FRENZY_SECONDS + 's');
  save();
  render();
});

// ---------- loop ----------

/** A toast for skins released while playing (after the store opens; before that they wait for its boot screen). */
ui.freshSeen = state.fresh.length;
function announceSkins() {
  const n = state.fresh.length - ui.freshSeen;
  ui.freshSeen = state.fresh.length;
  if (n <= 0 || !state.storeOpen || !$('boot').hidden) return;
  const sk = G.SKINS.find((x) => x.id === state.fresh[state.fresh.length - 1]);
  showToast(n === 1 ? 'NEW ' + G.CLASSES[sk.cls].name.toUpperCase() + ' SKIN: ' + sk.name.toUpperCase() + ' · IN THE STORE' : n + ' NEW SKINS IN THE STORE');
}

function render() {
  set($('screen-main'), 'hidden', ui.view !== 'main');
  set($('screen-factory'), 'hidden', ui.view !== 'factory');
  set($('screen-store'), 'hidden', ui.view !== 'store');
  set($('screen-crew'), 'hidden', ui.view !== 'crew');
  const reached = G.checkGoal(state);
  if (reached >= 1) save();
  if (reached === 1) { showStoreUnlock(); ui.introDue = 'crew'; }
  if (reached === 2) ui.introDue = 'subs';
  if (reached > 2) showToast('LEVEL ' + (reached + 1) + ' REACHED · ALL INCOME +' + Math.round((G.LEVEL_BONUS - 1) * 100) + '%');
  maybeShowIntro();
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
  tickYarn(dt);
  announceSkins();
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

// Offline support and updates. A new version downloads in the background; the banner lets the player
// switch to it straight away (their progress is saved first).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  let waiting = null, reloadWanted = false;
  const offerUpdate = (worker) => { waiting = worker; $('update').hidden = false; };
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); // not on the very first install
      });
    });
    const check = () => reg.update().catch(() => { /* offline: try again later */ });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 30 * 60 * 1000);
  }).catch(() => { /* offline support is optional */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadWanted) location.reload();
  });
  $('update').addEventListener('click', () => {
    save();
    reloadWanted = true;
    $('update').textContent = 'UPDATING...';
    if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
    else location.reload();
  });
}
