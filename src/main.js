import * as G from './game.js';
import { createSoundtrack } from './audio/soundtrack.js';

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

const ui = { view: 'main', cur: 0, taps: 0, flash: '', flashUntil: 0, catTimer: 0 };

// ---------- small DOM helpers ----------

/** Writes a DOM property only when the value changed, so the 10 Hz render stays cheap. */
function set(el, prop, value) {
  const cache = el._c || (el._c = {});
  if (cache[prop] === value) return;
  cache[prop] = value;
  if (prop === 'text') el.textContent = value;
  else if (prop === 'class') el.className = value;
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

const music = createSoundtrack();
let musicWanted = store.get(MUSIC_KEY) === 'on';
function setMusic(on) {
  musicWanted = on;
  store.set(MUSIC_KEY, on ? 'on' : 'off');
  if (on) music.start(); else music.stop();
  $('music').setAttribute('aria-pressed', String(on));
  $('music').setAttribute('aria-label', on ? 'Music on' : 'Music off');
}
$('music').setAttribute('aria-pressed', String(musicWanted));
$('music').addEventListener('click', () => setMusic(!music.playing));
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
  set(big, 'class', 'big' + (s.cat ? ' catpress' : ''));

  // Stretch goal
  const goal = G.currentGoal(s), reached = s.pts >= goal.at;
  const frac = Math.min(1, s.pts / goal.at), need = Math.max(0, goal.at - s.pts), inc = G.income(s);
  set($('goal'), 'hidden', reached);
  set($('adopt'), 'hidden', !(reached && s.goalIdx === 0));
  set($('goal-done'), 'hidden', !(reached && s.goalIdx === 1));
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
      ds: full ? 'SILO FULL · GO COLLECT!' : 'STORED ' + G.fmt(f.store) + ' / ' + G.fmt(c),
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
  const d = 3 / Math.pow(2, f.turbo + f.kit);
  set($('hall'), 'class', 'hall' + (full ? ' paused' : ''));
  set($('hall').parentElement, 'class', 'plant' + (full ? ' paused' : ''));
  set($('hall'), '--belt', d + 's');
  set($('hall'), '--press', (d / 4).toFixed(3) + 's');
  bays.forEach((b, i) => {
    const on = i < f.lines;
    set(b.el, 'class', 'bay' + (on ? '' : ' empty'));
    set(b.kit, 'hidden', i >= f.kit);
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
  set($('collect'), 'text', 'COLLECT +' + G.fmt(f.store));
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

// ---------- overlays ----------

const CAT_SVG = document.querySelector('#cat svg').outerHTML.replace('fill="#070A08"', 'fill="#050705"');

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
  if (ui.view === 'factory') renderFactory();
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
