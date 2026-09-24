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
  {id: 'dock', name: 'Loading dock', desc: '20% ships straight to your balance', base: 5000, grow: 5, max: 3, min: 0},
  {id: 'kit', name: 'Kitten crew', desc: 'Each kitten: ×2 speed, ×2 silo', base: 20000, grow: 3, max: 3, min: 0, needsCat: true}
];

export const GOALS = [
  {at: 1e6, teaser: 'REWARD: A CAT THAT CLICKS FOR YOU'},
  {at: 1e7, teaser: 'REWARD: [LOCKED]'}
];

export function newGame() {
  return {v: 1, pts: 0, best: 0, total: 0, own: {auto: 0, x2: 0, x4: 0, luck: 0}, facs: [], goalIdx: 0, cat: false, savedAt: Date.now()};
}

export function newFactory(i) {
  return {i, lines: 1, turbo: 0, silo: 0, dock: 0, kit: 0, store: 0};
}

export const cost = (item, level) => Math.ceil(item.base * Math.pow(item.grow, level));
export const upgradeCost = (s, u) => cost(u, s.own[u.id]);
export const extensionCost = (e, f) => Math.ceil(cost(e, f[e.id] - e.min) * Math.pow(TIER_COST, f.i));

export const perClick = (s) => Math.pow(2, s.own.x2) * Math.pow(4, s.own.x4);
export const catRate = (s) => (s.cat ? CAT_CPS * perClick(s) : 0);
export const perSec = (s) => s.own.auto + catRate(s);
export const lineRate = (f) => LINE_RATE * Math.pow(TIER_OUT, f.i) * Math.pow(2, f.turbo + f.kit);
export const factoryRate = (f) => f.lines * lineRate(f);
export const siloCap = (f) => SILO_BASE * Math.pow(TIER_OUT, f.i) * Math.pow(2, f.silo + f.kit);
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
  earn(s, perSec(s) * dt);
  for (const f of s.facs) {
    const c = siloCap(f);
    if (f.store >= c) continue;
    const r = factoryRate(f), kept = r * (1 - DOCK_SHARE * f.dock);
    const t = Math.min(dt, (c - f.store) / kept); // production stops once the silo is full
    f.store = Math.min(c, f.store + kept * t);
    earn(s, r * DOCK_SHARE * f.dock * t);
  }
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

export const extensionLocked = (s, e) => !!e.needsCat && !s.cat;
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

/** Applies time spent away. Returns what was earned to the balance and into the silos. */
export function applyOffline(s, seconds) {
  const t = Math.min(Math.max(0, seconds), MAX_OFFLINE_SECONDS);
  const stored = () => s.facs.reduce((a, f) => a + f.store, 0);
  const pts0 = s.pts, store0 = stored();
  step(s, t);
  return {seconds: t, points: s.pts - pts0, stored: stored() - store0};
}

export function serialize(s) {
  return {v: 1, pts: s.pts, best: s.best, total: s.total, own: {...s.own}, facs: s.facs.map((f) => ({...f})),
    goalIdx: s.goalIdx, cat: s.cat, savedAt: s.savedAt};
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
    s.facs = data.facs.slice(0, MAX_FACTORIES).map((f, i) => {
      const n = newFactory(i);
      for (const e of EXTENSIONS) n[e.id] = Math.max(e.min, int(f && f[e.id], e.max));
      n.store = Math.min(num(f && f.store), siloCap(n));
      return n;
    });
  }
  s.cat = data.cat === true;
  s.goalIdx = Math.min(int(data.goalIdx), GOALS.length - 1);
  if (s.cat && s.goalIdx === 0) s.goalIdx = 1;
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
  if (sec < 3600) return 'ETA ' + Math.ceil(sec / 60) + 'm';
  return 'ETA ' + Math.floor(sec / 3600) + 'h ' + Math.ceil((sec % 3600) / 60) + 'm';
}
