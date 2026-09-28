// Game rules, balance and state. Pure functions over a plain state object, no DOM,
// so the whole economy can be tested with `node --test`.
//
// Balance target: a player tapping ~5×/s and collecting every ~20 s reaches the
// first goal (1,000,000) in about 30 minutes.

export const MAX_FACTORIES = 5;
export const FACTORY_COST = [500, 4000, 25000, 120000, 500000];
export const LINE_RATE = 7;        // clicks/s per production line in factory #1
export const SILO_BASE = 400;      // silo capacity of factory #1
export const TIER_OUT = 3;         // each later factory makes ×3 (and stores ×3)
export const TIER_COST = 4;        // ...and its extensions cost ×4
export const CAT_CPS = 50;         // the cat's clicks per second
export const LUCK_CHANCE = 0.05;   // per Lucky clicks level
export const LUCK_MULT = 10;
export const DOCK_SHARE = 0.2;     // per Loading dock level
export const MAX_OFFLINE_SECONDS = 8 * 3600;

export const UPGRADES = [
  {id: 'auto', name: 'Auto-clicker', desc: '+1 point every second', base: 15, grow: 1.15, max: 0},
  {id: 'x2', name: 'Double tap', desc: 'Clicks worth ×2', base: 200, grow: 12, max: 5},
  {id: 'x4', name: 'Quad tap', desc: 'Clicks worth ×4', base: 25000, grow: 30, max: 3},
  {id: 'luck', name: 'Lucky clicks', desc: '+5% chance a click hits ×10', base: 5000, grow: 4, max: 5}
];

export const EXTENSIONS = [
  {id: 'lines', name: 'Assembly line', desc: '+1 production line', base: 400, grow: 2, max: 4, min: 1},
  {id: 'turbo', name: 'Turbo press', desc: 'Every line runs ×2 faster', base: 1500, grow: 4, max: 3, min: 0},
  {id: 'silo', name: 'Bigger silo', desc: 'Storage ×2', base: 500, grow: 2.2, max: 8, min: 0},
  {id: 'dock', name: 'Loading dock', desc: '20% ships straight to your balance', base: 5000, grow: 5, max: 3, min: 0}
];

export const GOALS = [
  {at: 1e6, teaser: 'REWARD: A CAT THAT CLICKS FOR YOU'},
  {at: 1e7, teaser: 'REWARD: A STORE WITH CAT SKINS + MUSIC'},
  {at: 1e8, teaser: 'REWARD: LEVEL UP YOUR KITTENS'}
];

// The kitten crew (from goal 2). Until 10M the cat is the only kitten; it clicks the button. From 10M
// the player hires one kitten per factory. A working kitten runs its factory: production ships
// straight to the balance, the silo empties, and the factory runs KITTEN_BOOST× faster. So the player
// stops collecting and looks after the crew instead. Needs drain while a kitten works and are
// introduced one at a time as the best balance grows, so 10M → 100M teaches the care routine. A kitten
// with an empty need stops working, and every unhappy kitten pulls the cat away from the button.
// (Next, at 100M: kittens level up and hire underlings they look after themselves.)
export const NEEDS = [
  {id: 'food', name: 'Food', unlockAt: 1e7, drain: 1 / 240},   // lasts 4 min of work
  {id: 'sleep', name: 'Sleep', unlockAt: 2.5e7, drain: 1 / 360}, // 6 min
  {id: 'fun', name: 'Play', unlockAt: 5e7, drain: 1 / 300}     // 5 min
];
export const HIRE_COST = [5e5, 1e6, 2e6, 4e6, 8e6]; // per factory; the first kitten is free
export const KITTEN_BOOST = 6;
export const FEED_COST = 50000;
export const NAP_SECONDS = 40;
export const NAP_MOOD = 0.5;         // a napping kitten is fine, but the cat keeps half an eye on it
export const LOW_NEED = 0.3;         // below this the crew screen warns
export const CREW_DRAIN = 0.2;       // a crewed factory's silo empties at 20% of its size per second
export const KITTEN_NAMES = ['Mochi', 'Pixel', 'Biscuit', 'Tofu', 'Nugget', 'Pickles', 'Waffles', 'Noodle',
  'Pumpkin', 'Sprout', 'Bean', 'Toast', 'Muffin', 'Pepper', 'Ziggy'];

// Cosmetics sold in the store, which opens at goal 2. They change nothing in the economy.
// The first entry of each list is free and owned from the start. Visuals live in src/skins.js
// and src/audio/songs.js, keyed by id.
export const SKINS = [
  {id: 'classic', name: 'Classic', price: 0},
  {id: 'ginger', name: 'Ginger tabby', price: 1e6},
  {id: 'snow', name: 'Snowball', price: 2e6},
  {id: 'midnight', name: 'Midnight', price: 4e6},
  {id: 'tuxedo', name: 'Tuxedo', price: 8e6},
  {id: 'royal', name: 'Royal', price: 2e7}
];
export const TRACKS = [
  {id: 'silo', name: 'Silo Shuffle', price: 0},
  {id: 'cruise', name: 'Kitten Cruise', price: 2e6},
  {id: 'neon', name: 'Neon Commute', price: 5e6},
  {id: 'lullaby', name: 'Lullaby.exe', price: 1e7}
];

export function newGame() {
  return {v: 1, pts: 0, best: 0, total: 0, own: {auto: 0, x2: 0, x4: 0, luck: 0}, facs: [], goalIdx: 0, cat: false,
    storeOpen: false, crew: [], lessons: 0, skins: ['classic'], skin: 'classic', tracks: ['silo'], track: 'silo', savedAt: Date.now()};
}

export function newFactory(i) {
  return {i, lines: 1, turbo: 0, silo: 0, dock: 0, store: 0};
}

export const cost = (item, level) => Math.ceil(item.base * Math.pow(item.grow, level));
export const upgradeCost = (s, u) => cost(u, s.own[u.id]);
export const extensionCost = (e, f) => Math.ceil(cost(e, f[e.id] - e.min) * Math.pow(TIER_COST, f.i));

export const perClick = (s) => Math.pow(2, s.own.x2) * Math.pow(4, s.own.x4);
export const catRate = (s) => (s.cat ? CAT_CPS * perClick(s) * catFocus(s) : 0);
export const perSec = (s) => s.own.auto + catRate(s);
export const lineRate = (f) => LINE_RATE * Math.pow(TIER_OUT, f.i) * Math.pow(2, f.turbo);
/** `kitOn` (set by syncCrew) is true while the factory's kitten is working. */
export const factoryRate = (f) => f.lines * lineRate(f) * (f.kitOn ? KITTEN_BOOST : 1);
export const siloCap = (f) => SILO_BASE * Math.pow(TIER_OUT, f.i) * Math.pow(2, f.silo);

// ---------- kitten crew ----------

export const crewOn = (s) => s.storeOpen;
export const activeNeeds = (s) => NEEDS.slice(0, s.lessons);
export const napping = (k) => k.nap > 0;
export const needsCare = (s, k) => !napping(k) && activeNeeds(s).some((n) => k[n.id] <= 0);
export const isWorking = (s, k) => !napping(k) && !needsCare(s, k);
/** 0 for a kitten that needs care, up to 1 for one with every need full. */
export function kittenMood(s, k) {
  if (napping(k)) return NAP_MOOD;
  const needs = activeNeeds(s);
  if (!needs.length) return 1;
  const low = Math.min(...needs.map((n) => k[n.id]));
  return low <= 0 ? 0 : 0.1 + 0.9 * low;
}
/** How much of its time the cat spends clicking rather than looking after kittens. */
export const catFocus = (s) => (!crewOn(s) || !s.crew.length ? 1 : s.crew.reduce((a, k) => a + kittenMood(s, k), 0) / s.crew.length);

function newKitten(s, fac) {
  const used = new Set(s.crew.map((k) => k.name));
  const name = KITTEN_NAMES.find((n) => !used.has(n)) || 'Kitten ' + (s.crew.length + 1);
  const k = {name, fac, nap: 0};
  for (const n of NEEDS) k[n.id] = 1;
  return k;
}

export const kittenAt = (s, i) => s.crew.find((k) => k.fac === i) || null;

/** Marks each factory whose kitten is working. */
export function syncCrew(s) {
  s.facs.forEach((f, i) => {
    const k = crewOn(s) && kittenAt(s, i);
    f.kitOn = k ? isWorking(s, k) : undefined;
  });
}

/** The first kitten is free and goes to the strongest factory. */
function startCrew(s) {
  s.crew = [];
  if (s.facs.length) s.crew.push(newKitten(s, s.facs.length - 1));
  checkLessons(s);
  syncCrew(s);
}

export const hireCost = (i) => HIRE_COST[i];

/** Hires a kitten to run factory i (one per factory). */
export function hireKitten(s, i) {
  if (!crewOn(s) || !s.facs[i] || kittenAt(s, i) || s.pts < hireCost(i)) return false;
  s.pts -= hireCost(i);
  s.crew.push(newKitten(s, i));
  syncCrew(s);
  return true;
}

/** Unlocks the next need(s) once the best balance passes their threshold. Returns the newly unlocked needs. */
export function checkLessons(s) {
  const fresh = [];
  while (crewOn(s) && s.lessons < NEEDS.length && s.best >= NEEDS[s.lessons].unlockAt) fresh.push(NEEDS[s.lessons++]);
  return fresh;
}

export function feedKitten(s, i) {
  const k = s.crew[i];
  if (!k || s.lessons < 1 || napping(k) || k.food >= 1 || s.pts < FEED_COST) return false;
  s.pts -= FEED_COST;
  k.food = 1;
  syncCrew(s);
  return true;
}
export function napKitten(s, i) {
  const k = s.crew[i];
  if (!k || s.lessons < 2 || napping(k) || k.sleep >= 1) return false;
  k.nap = NAP_SECONDS;
  syncCrew(s);
  return true;
}
/** Called when the play mini-game is won. */
export function playKitten(s, i) {
  const k = s.crew[i];
  if (!k || s.lessons < 3 || napping(k)) return false;
  k.fun = 1;
  syncCrew(s);
  return true;
}

/** Drains working kittens' needs and wakes nappers. */
function tickCrew(s, dt) {
  for (const k of s.crew) {
    if (napping(k)) {
      k.nap = Math.max(0, k.nap - dt);
      k.sleep = k.nap > 0 ? Math.min(1, k.sleep + dt / NAP_SECONDS) : 1;
    } else if (isWorking(s, k)) {
      for (const n of activeNeeds(s)) k[n.id] = Math.max(0, k[n.id] - n.drain * dt);
    }
  }
}
export const isFull = (f) => f.store >= siloCap(f);
/** Everything the player earns per second if they keep the silos emptied. */
export const income = (s) => perSec(s) + s.facs.reduce((a, f) => a + factoryRate(f), 0);

export function earn(s, g) {
  s.pts += g;
  s.total += g;
  if (s.pts > s.best) s.best = s.pts;
}

/** Advances the game by dt seconds. Works for large dt too (offline progress). */
export function step(s, dt) {
  if (!(dt > 0)) return;
  syncCrew(s);
  earn(s, perSec(s) * dt);
  for (const f of s.facs) {
    if (f.kitOn) { // a working kitten ships everything straight out and empties the silo
      earn(s, factoryRate(f) * dt);
      const take = Math.min(f.store, siloCap(f) * CREW_DRAIN * dt);
      f.store -= take;
      earn(s, take);
      continue;
    }
    const c = siloCap(f);
    if (f.store >= c) continue;
    const r = factoryRate(f), kept = r * (1 - DOCK_SHARE * f.dock);
    const t = Math.min(dt, (c - f.store) / kept); // production stops once the silo is full
    f.store = Math.min(c, f.store + kept * t);
    earn(s, r * DOCK_SHARE * f.dock * t);
  }
  if (crewOn(s)) tickCrew(s, dt);
}

export function tap(s, rng = Math.random) {
  const lucky = rng() < LUCK_CHANCE * s.own.luck;
  const gain = perClick(s) * (lucky ? LUCK_MULT : 1);
  earn(s, gain);
  return {gain, lucky};
}

export function collect(s, i) {
  const f = s.facs[i];
  if (!f) return 0;
  const g = Math.floor(f.store);
  if (g < 1) return 0;
  f.store -= g;
  earn(s, g);
  return g;
}

/** Upgrades stay hidden until the player has earned half their base price. */
export const upgradeHidden = (s, u) => s.own[u.id] === 0 && s.total < u.base / 2;
export const upgradeMaxed = (s, u) => !!u.max && s.own[u.id] >= u.max;

export function buyUpgrade(s, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || upgradeHidden(s, u) || upgradeMaxed(s, u)) return false;
  const c = upgradeCost(s, u);
  if (s.pts < c) return false;
  s.pts -= c;
  s.own[id]++;
  return true;
}

export const nextFactoryCost = (s) => FACTORY_COST[s.facs.length];

export function buildFactory(s) {
  const n = s.facs.length;
  if (n >= MAX_FACTORIES || s.pts < FACTORY_COST[n]) return -1;
  s.pts -= FACTORY_COST[n];
  s.facs.push(newFactory(n));
  return n;
}

export const extensionLocked = () => false; // every extension is available from the start
export const extensionMaxed = (f, e) => f[e.id] >= e.max;

export function buyExtension(s, i, id) {
  const f = s.facs[i], e = EXTENSIONS.find((x) => x.id === id);
  if (!f || !e || extensionLocked(s, e) || extensionMaxed(f, e)) return false;
  const c = extensionCost(e, f);
  if (s.pts < c) return false;
  s.pts -= c;
  f[id]++;
  return true;
}

export const currentGoal = (s) => GOALS[s.goalIdx];

export function adoptCat(s) {
  if (s.goalIdx !== 0 || s.pts < GOALS[0].at) return false;
  s.pts -= GOALS[0].at;
  s.cat = true;
  s.goalIdx = 1;
  return true;
}

/**
 * Goal 2 needs no purchase: the first time the player holds 10,000,000 after adopting the cat,
 * the store opens for good and the meter moves on to goal 3. Returns true on that moment.
 */
export function checkStoreUnlock(s) {
  if (s.storeOpen || s.goalIdx !== 1 || s.pts < GOALS[1].at) return false;
  s.storeOpen = true;
  s.goalIdx = 2;
  startCrew(s);
  return true;
}

/** True once the last goal has been reached (its reward isn't designed yet). */
export const finalGoalReached = (s) => s.goalIdx === GOALS.length - 1 && s.pts >= GOALS[s.goalIdx].at;

function buyCosmetic(s, list, owned, id) {
  const item = list.find((x) => x.id === id);
  if (!s.storeOpen || !item || s[owned].includes(id) || s.pts < item.price) return false;
  s.pts -= item.price;
  s[owned].push(id);
  return true;
}
export const buySkin = (s, id) => buyCosmetic(s, SKINS, 'skins', id);
export const buyTrack = (s, id) => buyCosmetic(s, TRACKS, 'tracks', id);

export function equipSkin(s, id) {
  if (!s.skins.includes(id)) return false;
  s.skin = id;
  return true;
}
export function selectTrack(s, id) {
  if (!s.tracks.includes(id)) return false;
  s.track = id;
  return true;
}

/** Applies time spent away. Returns what was earned to the balance and into the silos. */
export function applyOffline(s, seconds) {
  const t = Math.min(Math.max(0, seconds), MAX_OFFLINE_SECONDS);
  const stored = () => s.facs.reduce((a, f) => a + f.store, 0);
  const pts0 = s.pts, store0 = stored();
  // Small steps, so kittens get hungry (and the cat distracted) partway through the time away.
  for (let left = t; left > 0; left -= 5) step(s, Math.min(5, left));
  return {seconds: t, points: s.pts - pts0, stored: stored() - store0};
}

export function serialize(s) {
  return {v: 1, pts: s.pts, best: s.best, total: s.total, own: {...s.own}, facs: s.facs.map(({kitOn, ...f}) => f),
    goalIdx: s.goalIdx, cat: s.cat, storeOpen: s.storeOpen, crew: s.crew.map((k) => ({...k})), lessons: s.lessons,
    skins: [...s.skins], skin: s.skin,
    tracks: [...s.tracks], track: s.track, savedAt: s.savedAt};
}

/** Keeps only known ids, always includes the free first item, and falls back to it if the selection isn't owned. */
function ownedList(list, saved) {
  const ids = new Set(Array.isArray(saved) ? saved : []);
  return list.filter((x, i) => i === 0 || ids.has(x.id)).map((x) => x.id);
}

/** Rebuilds a state from saved JSON, falling back to defaults for anything missing or malformed. */
export function deserialize(data) {
  const s = newGame();
  if (!data || typeof data !== 'object' || data.v !== 1) return s;
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);
  const int = (v, max) => Math.min(Math.floor(num(v)), max || Infinity);
  s.pts = num(data.pts);
  s.total = Math.max(num(data.total), s.pts);
  s.best = Math.max(num(data.best), s.pts);
  for (const u of UPGRADES) s.own[u.id] = int(data.own && data.own[u.id], u.max);
  if (Array.isArray(data.facs)) {
    s.facs = data.facs.slice(0, MAX_FACTORIES).map((f, i) => { // kitOn is derived, never loaded
      const n = newFactory(i);
      for (const e of EXTENSIONS) n[e.id] = Math.max(e.min, int(f && f[e.id], e.max));
      n.store = Math.min(num(f && f.store), siloCap(n));
      return n;
    });
  }
  s.cat = data.cat === true;
  s.goalIdx = Math.min(int(data.goalIdx), GOALS.length - 1);
  if (s.cat && s.goalIdx === 0) s.goalIdx = 1;
  s.storeOpen = data.storeOpen === true && s.goalIdx >= 1;
  if (s.storeOpen && s.goalIdx < 2) s.goalIdx = 2; // saves from before goal 3 existed
  if (s.storeOpen) {
    // At most one kitten per factory; saves from before the crew (or with none) get the free starter.
    const saved = Array.isArray(data.crew) ? data.crew : [];
    s.crew = [];
    for (const k of saved) {
      const fac = k && Number.isInteger(k.fac) ? k.fac : -1;
      if (!s.facs[fac] || kittenAt(s, fac)) continue;
      const n = newKitten(s, fac);
      if (typeof k.name === 'string' && k.name && k.name.length <= 20 && !s.crew.some((x) => x.name === k.name)) n.name = k.name;
      for (const need of NEEDS) n[need.id] = Math.min(1, num(k[need.id], 1));
      n.nap = Math.min(NAP_SECONDS, num(k.nap));
      s.crew.push(n);
    }
    if (!s.crew.length) startCrew(s);
    else s.lessons = Math.min(int(data.lessons), NEEDS.length); // the game unlocks any new lesson itself, with its card
    syncCrew(s);
  }
  s.skins = ownedList(SKINS, data.skins);
  s.skin = s.skins.includes(data.skin) ? data.skin : SKINS[0].id;
  s.tracks = ownedList(TRACKS, data.tracks);
  s.track = s.tracks.includes(data.track) ? data.track : TRACKS[0].id;
  s.savedAt = num(data.savedAt, Date.now());
  return s;
}

export function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('en-US');
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let v = n, i = -1;
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  if (v >= 1000) return n.toExponential(2).replace('+', '');
  // Round down so the display never claims more than the player has (999,999 is "999K", not "1000K").
  return (v < 100 ? (Math.floor(v * 10) / 10).toFixed(1) : Math.floor(v).toString()) + units[i];
}

export function fmtEta(seconds) {
  if (!isFinite(seconds)) return 'KEEP TAPPING';
  const sec = Math.ceil(seconds);
  if (sec < 60) return 'ETA ' + sec + 's';
  const min = Math.ceil(sec / 60);
  if (min < 60) return 'ETA ' + min + 'm';
  return 'ETA ' + Math.floor(min / 60) + 'h ' + (min % 60) + 'm';
}
