// Game rules, balance and state. Pure functions over a plain state object, no DOM,
// so the whole economy can be tested with `node --test`.
//
// Balance (economy v2, see docs/progression-research.md and scripts/balance-sim.mjs): a player
// tapping ~5×/s and collecting every ~20 s takes about 17 / 10 / 8 minutes for the three goals, never
// waits more than ~5 minutes for something worth buying, builds all five factories before the cat, and
// no income source makes the others pointless. The prices came from a search against those targets; small changes can tip the greedy
// player into ignoring the cat or the factories, so rerun the sim after any change.

export const MAX_FACTORIES = 5;
export const FACTORY_COST = [500, 3300, 38000, 67000, 120000];
export const LINE_RATE = 24;        // clicks/s per production line in factory #1
export const SILO_BASE = 900;      // silo capacity of factory #1
export const TIER_OUT = 1.6;       // each later factory makes ×1.6 (and stores ×1.6), so early factories stay worth having
export const TIER_COST = 1.9;       // ...and its extensions cost ×1.9, so upgrading an early factory is slightly better value
export const CAT_CPS = 12;         // the cat's clicks per second when adopted
export const CAT_TRAIN = 12;       // ...and per level of Cat training
export const POWER_SHARE = 0.01;   // per Power tap level: each tap also earns this share of the income per second
export const LUCK_CHANCE = 0.05;   // per Lucky clicks level
export const LUCK_MULT = 10;
export const DOCK_SHARE = 0.2;     // per Loading dock level
export const MAX_OFFLINE_SECONDS = 8 * 3600;

export const UPGRADES = [
  {id: 'auto', name: 'Auto-clicker', desc: '+1 point every second', base: 15, grow: 1.15, max: 0},
  {id: 'x2', name: 'Double tap', desc: 'Clicks worth ×2', base: 200, grow: 10, max: 5},
  {id: 'x4', name: 'Quad tap', desc: 'Clicks worth ×4', base: 25000, grow: 39, max: 2},
  {id: 'luck', name: 'Lucky clicks', desc: '+5% chance a click hits ×10', base: 5000, grow: 4.5, max: 5},
  {id: 'power', name: 'Power tap', desc: 'Each tap also earns 1% of your income per second', base: 7000, grow: 4.7, max: 5},
  {id: 'train', name: 'Cat training', desc: `The cat clicks ${CAT_TRAIN} more times a second`, base: 350000, grow: 2.6, max: 0, cat: true}
];

export const EXTENSIONS = [
  {id: 'lines', name: 'Assembly line', desc: '+1 production line', base: 750, grow: 1.75, max: 4, min: 1},
  {id: 'turbo', name: 'Turbo press', desc: 'Every line runs ×2 faster', base: 5000, grow: 3.75, max: 5, min: 0},
  {id: 'silo', name: 'Bigger silo', desc: 'Storage ×2', base: 380, grow: 2.4, max: 10, min: 0},
  {id: 'dock', name: 'Loading dock', desc: '20% ships straight to your balance', base: 5000, grow: 5, max: 3, min: 0}
];

export const GOALS = [
  {at: 1e6, teaser: 'REWARD: A CAT THAT CLICKS FOR YOU'},
  {at: 1e7, teaser: 'REWARD: A STORE WITH CAT SKINS + MUSIC'},
  {at: 1e8, teaser: 'REWARD: LEVEL UP YOUR KITTENS'}
];

// The kitten crew (from goal 2). Until 10M the cat is the only kitten; it clicks the button. From 10M
// the player hires one kitten per factory. A kitten runs its factory: production ships straight to the
// balance, the silo empties, and the factory runs faster. Nothing drains and nothing is ever taken away:
// the player's decisions are where each kitten works (its favourite factory and its trait) and, once a
// day, care time (feed, nap, play), which makes the crew happy for an hour.
// (Next, at 100M: kittens level up and hire underlings they look after themselves.)
export const HIRE_COST = [450000, 900000, 1800000, 3600000, 7200000]; // per factory; the first kitten is free
// A kitten-run factory never stalls on a full silo and needs no collecting, which is a big speed-up on
// its own (turbo presses and lines stop being held back by the silo). On top of that it runs ×1.7, and
// the favourite factory, traits and care time add to it.
export const KITTEN_BOOST = 1.7;
export const FAV_BONUS = 1.5;        // in its favourite factory
export const TRAITS = [
  {id: 'hard', name: 'Hard worker', desc: 'Runs its factory ×1.3 faster'},
  {id: 'gear', name: 'Gearhead', desc: '+15% for each Turbo press in its factory'},
  {id: 'pack', name: 'Packer', desc: '+20% for each Loading dock in its factory'},
  {id: 'cheer', name: 'Cheerleader', desc: 'Every other kitten works +15% faster'},
  {id: 'pal', name: "Cat's pal", desc: 'The cat clicks +25% faster'},
  {id: 'owl', name: 'Night owl', desc: 'Works ×2 while you are away'}
];
export const CARE_STEPS = ['feed', 'nap', 'play'];  // once a day, in any order
export const HAPPY_MULT = 2;         // care time done: every kitten-run factory ×2...
export const HAPPY_SECONDS = 3600;   // ...for an hour (time away counts too)
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
  return {v: 1, pts: 0, best: 0, total: 0, own: {auto: 0, x2: 0, x4: 0, luck: 0, power: 0, train: 0}, facs: [], goalIdx: 0, cat: false,
    storeOpen: false, crew: [], recruit: null, care: {day: '', done: []}, happy: 0, away: false,
    seed: Math.floor(Math.random() * 2 ** 31), rolls: 0, skins: ['classic'], skin: 'classic', tracks: ['silo'], track: 'silo', savedAt: Date.now()};
}

export function newFactory(i) {
  return {i, lines: 1, turbo: 0, silo: 0, dock: 0, store: 0};
}

export const cost = (item, level) => Math.ceil(item.base * Math.pow(item.grow, level));
export const upgradeCost = (s, u) => cost(u, s.own[u.id]);
export const extensionCost = (e, f) => Math.ceil(cost(e, f[e.id] - e.min) * Math.pow(TIER_COST, f.i));

export const perClick = (s) => Math.pow(2, s.own.x2) * Math.pow(4, s.own.x4);
export const catClicks = (s) => (s.cat ? (CAT_CPS + CAT_TRAIN * s.own.train) * (1 + 0.25 * crewTrait(s, 'pal')) : 0);
/** The cat's clicks are plain clicks: Power tap only works for the player's own taps. */
export const catRate = (s) => catClicks(s) * perClick(s);
export const perSec = (s) => s.own.auto + catRate(s);
export const lineRate = (f) => LINE_RATE * Math.pow(TIER_OUT, f.i) * Math.pow(2, f.turbo);
/** `kitOn` and `boost` are set by syncCrew while a kitten runs the factory. */
export const factoryRate = (f) => f.lines * lineRate(f) * (f.kitOn ? f.boost : 1);
export const siloCap = (f) => SILO_BASE * Math.pow(TIER_OUT, f.i) * Math.pow(2, f.silo);

// ---------- kitten crew ----------

export const crewOn = (s) => s.storeOpen;
export const kittenAt = (s, i) => s.crew.find((k) => k.fac === i) || null;
export const traitOf = (k) => TRAITS.find((t) => t.id === k.trait) || TRAITS[0];
const crewTrait = (s, id) => (crewOn(s) ? s.crew.filter((k) => k.trait === id).length : 0);
export const happy = (s) => s.happy > 0;

/** How much faster kitten k would run factory i (it doesn't have to be there now). */
export function kittenBoost(s, k, i) {
  const f = s.facs[i];
  if (!f) return 1;
  let b = KITTEN_BOOST * (k.fav === i ? FAV_BONUS : 1);
  if (k.trait === 'hard') b *= 1.3;
  if (k.trait === 'gear') b *= 1 + 0.15 * f.turbo;
  if (k.trait === 'pack') b *= 1 + 0.2 * f.dock;
  if (k.trait === 'owl' && s.away) b *= 2;
  b *= 1 + 0.15 * (crewTrait(s, 'cheer') - (k.trait === 'cheer' ? 1 : 0));
  return b * (happy(s) ? HAPPY_MULT : 1);
}

/** Marks each factory run by a kitten and how much faster it runs. */
export function syncCrew(s) {
  s.facs.forEach((f, i) => {
    const k = crewOn(s) && kittenAt(s, i);
    f.kitOn = k ? true : undefined;
    f.boost = k ? kittenBoost(s, k, i) : undefined;
  });
}

// Kittens are rolled from the save's own seed, so a save always offers the same recruits.
function rand(s) {
  let t = (s.seed + 0x6D2B79F5 * ++s.rolls) >>> 0; // mulberry32 step
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rollKitten(s) {
  const used = new Set([...s.crew.map((k) => k.name), s.recruit && s.recruit.name]);
  const free = KITTEN_NAMES.filter((n) => !used.has(n));
  const name = free.length ? free[Math.floor(rand(s) * free.length)] : 'Kitten ' + (s.crew.length + 2);
  return {name, trait: TRAITS[Math.floor(rand(s) * TRAITS.length)].id, fav: Math.floor(rand(s) * MAX_FACTORIES)};
}

/** The first kitten is free and goes to the strongest factory. */
function startCrew(s) {
  s.crew = [];
  s.recruit = rollKitten(s);
  if (s.facs.length) hireKitten(s, s.facs.length - 1, true);
}

export const hireCost = (i) => HIRE_COST[i];

/** Hires the waiting recruit to run factory i (one kitten per factory), and a new recruit turns up. */
export function hireKitten(s, i, free = false) {
  if (!crewOn(s) || !s.facs[i] || kittenAt(s, i) || (!free && s.pts < hireCost(i))) return false;
  if (!free) s.pts -= hireCost(i);
  s.crew.push({...s.recruit, fac: i});
  s.recruit = rollKitten(s);
  syncCrew(s);
  return true;
}

/** Moves kitten n to factory i, swapping with the kitten already there. */
export function moveKitten(s, n, i) {
  const k = s.crew[n];
  if (!k || !s.facs[i] || k.fac === i) return false;
  const other = kittenAt(s, i);
  if (other) other.fac = k.fac;
  k.fac = i;
  syncCrew(s);
  return true;
}

/** Care time, once a day (`today` is the player's local date, e.g. '2026-10-11'). */
const careToday = (s, today) => (s.care.day === today ? s.care.done : []);
export const careDone = (s, today, step) => careToday(s, today).includes(step);
export const careReady = (s, today) => crewOn(s) && s.crew.length > 0 && careToday(s, today).length < CARE_STEPS.length;
/** Does one step of today's care time. The last of the three makes the crew happy. */
export function doCare(s, today, step) {
  if (!careReady(s, today) || !CARE_STEPS.includes(step) || careDone(s, today, step)) return false;
  s.care = {day: today, done: [...careToday(s, today), step]};
  if (s.care.done.length === CARE_STEPS.length) s.happy = HAPPY_SECONDS;
  syncCrew(s);
  return true;
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
  if (s.happy > 0) s.happy = Math.max(0, s.happy - dt);
}

/** Power tap's part of every tap: a share of the income per second. Lucky clicks don't multiply it. */
export const powerGain = (s) => s.own.power * POWER_SHARE * income(s);
export const tapGain = (s) => perClick(s) + powerGain(s);

export function tap(s, rng = Math.random) {
  const lucky = rng() < LUCK_CHANCE * s.own.luck;
  const gain = perClick(s) * (lucky ? LUCK_MULT : 1) + powerGain(s);
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

/** Upgrades stay hidden until the player has earned half their base price (cat upgrades until the cat is adopted). */
export const upgradeHidden = (s, u) => (u.cat && !s.cat) || (s.own[u.id] === 0 && s.total < u.base / 2);
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
  // Small steps, so the happy crew bonus runs out partway through the time away.
  s.away = true;
  for (let left = t; left > 0; left -= 5) step(s, Math.min(5, left));
  s.away = false;
  syncCrew(s);
  return {seconds: t, points: s.pts - pts0, stored: stored() - store0};
}

export function serialize(s) {
  return {v: 1, pts: s.pts, best: s.best, total: s.total, own: {...s.own}, facs: s.facs.map(({kitOn, boost, ...f}) => f),
    goalIdx: s.goalIdx, cat: s.cat, storeOpen: s.storeOpen, crew: s.crew.map((k) => ({...k})),
    recruit: s.recruit && {...s.recruit}, care: {day: s.care.day, done: [...s.care.done]}, happy: s.happy, seed: s.seed, rolls: s.rolls,
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
  if (Number.isInteger(data.seed)) s.seed = data.seed;
  s.rolls = int(data.rolls);
  if (s.storeOpen) {
    // At most one kitten per factory; saves from before the crew (or with none) get the free starter.
    // Kittens from before traits get a trait and a favourite picked from their name, so they stay the same.
    const kitten = (k) => {
      if (!k || typeof k.name !== 'string' || !k.name || k.name.length > 20) return null;
      const h = [...k.name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
      return {name: k.name, trait: TRAITS.some((t) => t.id === k.trait) ? k.trait : TRAITS[h % TRAITS.length].id,
        fav: Number.isInteger(k.fav) && k.fav >= 0 && k.fav < MAX_FACTORIES ? k.fav : (h >>> 8) % MAX_FACTORIES};
    };
    const saved = Array.isArray(data.crew) ? data.crew : [];
    s.crew = [];
    for (const k of saved) {
      const fac = k && Number.isInteger(k.fac) ? k.fac : -1, n = kitten(k);
      if (!n || !s.facs[fac] || kittenAt(s, fac) || s.crew.some((x) => x.name === n.name)) continue;
      s.crew.push({...n, fac});
    }
    if (!s.crew.length) startCrew(s);
    const r = kitten(data.recruit);
    s.recruit = r && !s.crew.some((x) => x.name === r.name) ? r : rollKitten(s);
    if (data.care && typeof data.care.day === 'string' && Array.isArray(data.care.done)) {
      s.care = {day: data.care.day, done: CARE_STEPS.filter((x) => data.care.done.includes(x))};
    }
    s.happy = Math.min(num(data.happy), HAPPY_SECONDS);
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
