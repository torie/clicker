// Game rules, balance and state. Pure functions over a plain state object, no DOM,
// so the whole economy can be tested with `node --test`.
//
// Balance (economy v2, see docs/progression-research.md and scripts/balance-sim.mjs): a player
// tapping ~5×/s and collecting every ~20 s takes about 17 / 10 / 8 minutes for the three goals, never
// waits more than ~5 minutes for something worth buying, builds all five factories before the cat, and
// no income source makes the others pointless. The prices came from a search against those targets; small changes can tip the greedy
// player into ignoring the cat or the factories, so rerun the sim after any change.

import { CATALOG, CLASSES, BONUSES, skinById } from './wardrobe.js';
export { CLASSES, BONUSES };

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

// The levels (the UI says LEVEL n): stretch goals ×10 apart. Level 1 is bought (it adopts the cat);
// the rest are reached by holding that many points. Level 2 opens the store and the kitten crew,
// level 3 lets kittens hire underlings, and every level after that adds LEVEL_BONUS to all income.
export const GOALS = [
  {at: 1e6, teaser: 'REWARD: A CAT THAT CLICKS FOR YOU'},
  {at: 1e7, teaser: 'REWARD: A STORE + A KITTEN CREW'},
  {at: 1e8, teaser: 'REWARD: KITTENS HIRE UNDERLINGS'},
  {at: 1e9, teaser: 'REWARD: ALL INCOME +50%'},
  {at: 1e10, teaser: 'REWARD: ALL INCOME +50%'},
  {at: 1e11, teaser: 'REWARD: ALL INCOME +50%'},
  {at: 1e12, teaser: 'REWARD: ALL INCOME +50%'},
  {at: 1e13, teaser: 'REWARD: ALL INCOME +50% · END OF ERA 1'}
];
export const LEVEL_BONUS = 1.5;      // ×1.5 to all income for every level from 4 on (keep the teasers in step)

// Golden yarn: after the cat arrives it sometimes rolls past (the UI decides when). Catching it
// starts a frenzy: all income ×5 for a minute. Missing it costs nothing.
export const FRENZY_MULT = 5;
export const FRENZY_SECONDS = 60;

// The kitten crew (from goal 2). Until 10M the cat is the only kitten; it clicks the button. From 10M
// the player hires one kitten per factory. A kitten runs its factory: production ships straight to the
// balance, the silo empties, and the factory runs faster. Nothing drains and nothing is ever taken away:
// the player's decisions are where each kitten works (its favourite factory and its trait) and, once a
// day, care time (feed, nap, play), which makes the crew happy for an hour. Kittens level up from 10M
// and hire underlings from 100M (below).
export const HIRE_COST = [450000, 900000, 1800000, 3600000, 7200000]; // per factory; the first kitten is free
// A kitten-run factory never stalls on a full silo and needs no collecting, which is a big speed-up on
// its own (turbo presses and lines stop being held back by the silo). So the base boost is ×1, and the
// favourite factory, traits, levels, underlings and care time add to it.
export const KITTEN_BOOST = 1;
export const FAV_BONUS = 1.5;        // in its favourite factory
export const TRAITS = [
  {id: 'hard', name: 'Hard worker', desc: 'Runs its factory ×1.3 faster'},
  {id: 'gear', name: 'Gearhead', desc: '+15% for each Turbo press in its factory'},
  {id: 'pack', name: 'Packer', desc: '+20% for each Loading dock in its factory'},
  {id: 'cheer', name: 'Cheerleader', desc: 'Every other kitten works +15% faster'},
  {id: 'pal', name: "Cat's pal", desc: 'The cat clicks +25% faster'},
  {id: 'owl', name: 'Night owl', desc: 'Works ×2 while you are away'}
];
// Kitten levels (from 10M). Working fills a kitten's XP bar (seconds of work, faster in its favourite
// factory and with underlings); once it's full, PROMOTE costs points. Each level runs its factory
// ×LEVEL_STEP faster, and every MILESTONE_EVERY-th level doubles it. No cap, no decay, nothing lost on MOVE.
export const XP_BASE = 180;           // seconds of work from level 1 to 2...
export const XP_GROW = 1.04;          // ...×1.04 for each level after
export const XP_FAV = 1.5;           // XP ×1.5 in its favourite factory
// Promotions and underlings are priced in seconds of the crew's average output (without the temporary
// yarn and care bonuses), so they pay back in minutes at every stage instead of becoming free or out of
// reach. The average covers the whole crew, so moving a kitten doesn't change the price.
export const PROMO_SECONDS = 40;     // a promotion costs this many seconds of average kitten output...
export const PROMO_GROW = 1.06;      // ...×1.06 for each level the kitten already has
export const PROMO_MIN = 100000;
export const LEVEL_STEP = 1.16;
export const MILESTONE_EVERY = 5;
// Underlings (from 100M): a kitten's levels 5, 10 and 15 each open a slot. Underlings need nothing; each
// adds to its lead's factory (more if it shares the lead's trait), and gives the lead XP. Three that all
// share the lead's trait make a team bonus.
export const SLOT_LEVELS = [5, 10, 15];
export const SUB_SECONDS = 300;      // the first underling costs this many seconds of average kitten output...
export const SUB_GROW = 1.8;         // ...×1.8 for each one hired after
export const SUB_BONUS = 0.5;        // +50% to the lead's factory...
export const SUB_MATCH = 1.0;        // ...+100% if it shares the lead's trait
export const TEAM_BONUS = 1.5;       // three matching underlings: ×1.5 more
export const SUB_XP = 0.5;           // +50% XP for the lead per underling
export const SUB_NAMES = ['Bit', 'Byte', 'Pip', 'Dot', 'Nib', 'Jot', 'Zip', 'Fig', 'Pea', 'Bun', 'Kip', 'Tad', 'Wink', 'Mote', 'Speck'];

// Night shift (from 100M): an underling goes on a trip for real time and comes back with loot. While it's
// away (until the player opens its loot) it doesn't work: no factory bonus, no XP for its lead.
export const TRIPS = [
  {id: 'silo', name: 'The old silo', secs: 1800, items: 1},
  {id: 'fields', name: 'The catnip fields', secs: 7200, items: 2},
  {id: 'server', name: 'The server room', secs: 28800, items: 4}
];
// Loot, with weights per trip (longer trips find more blueprints).
export const LOOT = [
  {id: 'crate', name: 'Crate of clicks', weights: [5, 4, 3]},
  {id: 'spool', name: 'Golden spool', weights: [3, 3, 2]},
  {id: 'blueprint', name: 'Blueprint', weights: [1, 2, 3]},
  {id: 'treat', name: 'Treat', weights: [2, 2, 2]}
];
export const CRATE_SECS = 900;       // a crate holds 15 minutes of income
export const BP_STEP = 1.1;          // each blueprint: its factory ×1.1 for good
export const MAX_SPOOLS = 5;         // golden spools: a golden yarn frenzy whenever you like

export const CARE_STEPS = ['feed', 'nap', 'play'];  // once a day, in any order
export const HAPPY_MULT = 2;         // care time done: every kitten-run factory ×2...
export const HAPPY_SECONDS = 3600;   // ...for an hour (time away counts too)
export const CREW_DRAIN = 0.2;       // a crewed factory's silo empties at 20% of its size per second
export const KITTEN_NAMES = ['Mochi', 'Pixel', 'Biscuit', 'Tofu', 'Nugget', 'Pickles', 'Waffles', 'Noodle',
  'Pumpkin', 'Sprout', 'Bean', 'Toast', 'Muffin', 'Pepper', 'Ziggy'];

// Cat skins (catalog in src/wardrobe.js, art in src/skins.js): each is released when its unlock
// condition is met, and from then on sold in the store (which opens at goal 2) at a price fixed at
// release. The worn skin gives its bonus. Tracks are cosmetic; the first is free and owned from the start.
export const SKINS = CATALOG;
export const TRACKS = [
  {id: 'silo', name: 'Silo Shuffle', price: 0},
  {id: 'cruise', name: 'Kitten Cruise', price: 2e6},
  {id: 'neon', name: 'Neon Commute', price: 5e6},
  {id: 'lullaby', name: 'Lullaby.exe', price: 1e7}
];

export function newGame() {
  return {v: 1, pts: 0, best: 0, total: 0, own: {auto: 0, x2: 0, x4: 0, luck: 0, power: 0, train: 0}, facs: [], goalIdx: 0, cat: false,
    storeOpen: false, crew: [], recruit: null, spools: 0, parts: {}, subRecruit: null, care: {day: '', done: []}, happy: 0, frenzy: 0, away: false,
    seed: Math.floor(Math.random() * 2 ** 31), rolls: 0, skins: ['classic'], skin: 'classic', tracks: ['silo'], track: 'silo', savedAt: Date.now(),
    stats: newStats(), feats: [], log: [], released: {classic: 0}, fresh: []};
}

// Counters behind the skin unlocks. `play` is seconds of active play; the *Run ones are current streaks.
const STAT_KEYS = ['taps', 'lucky', 'play', 'collects', 'upg', 'ext', 'yarn', 'ftaps', 'care', 'happy', 'streak', 'streakMax',
  'promos', 'moves', 'back', 'luckyRun', 'yarnRun', 'burst', 'trips', 'boxes'];
const newStats = () => Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));

export function newFactory(i) {
  return {i, lines: 1, turbo: 0, silo: 0, dock: 0, store: 0, bp: 0};
}

export const cost = (item, level) => Math.ceil(item.base * Math.pow(item.grow, level));
export const upgradeCost = (s, u) => cost(u, s.own[u.id]);
export const extensionCost = (e, f) => Math.ceil(cost(e, f[e.id] - e.min) * Math.pow(TIER_COST, f.i));

export const perClick = (s) => Math.pow(2, s.own.x2) * Math.pow(4, s.own.x4);
export const catClicks = (s) => (s.cat ? (CAT_CPS + CAT_TRAIN * s.own.train) * (1 + 0.25 * crewTrait(s, 'pal')) * (1 + bonus(s, 'cat')) : 0);
/** The cat's clicks are plain clicks: Power tap only works for the player's own taps. */
export const catRate = (s) => catClicks(s) * perClick(s);
/** Everything earned is multiplied by the level bonus and, while it lasts, the golden yarn frenzy. */
export const levelBonus = (s) => Math.pow(LEVEL_BONUS, Math.max(0, s.goalIdx - 3));
export const gainMult = (s) => levelBonus(s) * (s.frenzy > 0 ? FRENZY_MULT : 1) * (1 + bonus(s, 'all')) * (s.away ? 1 + bonus(s, 'away') : 1);
export const perSec = (s) => (s.own.auto + catRate(s)) * gainMult(s);
export const lineRate = (f) => LINE_RATE * Math.pow(TIER_OUT, f.i) * Math.pow(2, f.turbo) * Math.pow(BP_STEP, f.bp || 0);
/** `kitOn` and `boost` are set by syncCrew while a kitten runs the factory; `gm` is gainMult. */
export const factoryRate = (f) => f.lines * lineRate(f) * (f.kitOn ? f.boost : 1) * (f.gm || 1);
export const siloCap = (f) => SILO_BASE * Math.pow(TIER_OUT, f.i) * Math.pow(2, f.silo);

// ---------- kitten crew ----------

export const crewOn = (s) => s.storeOpen;
export const kittenAt = (s, i) => s.crew.find((k) => k.fac === i) || null;
export const traitOf = (k) => TRAITS.find((t) => t.id === k.trait) || TRAITS[0];
const crewTrait = (s, id) => (crewOn(s) ? s.crew.filter((k) => k.trait === id).length : 0);
export const happy = (s) => s.happy > 0;
export const underlingsOn = (s) => s.goalIdx >= 3;

// Levels and teams. A recruit has no level or team yet, so everything defaults.
export const kittenLevel = (k) => k.lvl || 1;
export const xpNeed = (k) => XP_BASE * Math.pow(XP_GROW, kittenLevel(k) - 1);
export const canPromote = (k) => (k.xp || 0) >= xpNeed(k);
export const promoteCost = (s, k) => Math.ceil(Math.max(PROMO_MIN, PROMO_SECONDS * crewPace(s) * Math.pow(PROMO_GROW, kittenLevel(k) - 1)));
export const levelMult = (lvl) => Math.pow(LEVEL_STEP, lvl - 1) * Math.pow(2, Math.floor(lvl / MILESTONE_EVERY));
export const slots = (s, k) => (underlingsOn(s) ? SLOT_LEVELS.filter((l) => kittenLevel(k) >= l).length : 0);
const subs = (k) => k.subs || [];
/** Underlings at work: the ones on a trip (or back with unopened loot) don't count. */
const working = (k) => subs(k).filter((u) => !u.trip);
export function teamMult(k) {
  const t = working(k), match = t.filter((u) => u.trait === k.trait).length;
  const m = 1 + t.reduce((a, u) => a + (u.trait === k.trait ? SUB_MATCH : SUB_BONUS), 0);
  return m * (match === SLOT_LEVELS.length ? TEAM_BONUS : 1);
}
export const xpRate = (k) => (k.fav === k.fac ? XP_FAV : 1) * (1 + SUB_XP * working(k).length);

/** Average output of a kitten-run factory, without the yarn, care and level bonuses: the price unit for crew upgrades. */
export function crewPace(s) {
  if (!crewOn(s) || !s.crew.length) return 0;
  return s.crew.reduce((a, k) => {
    const f = s.facs[k.fac];
    return a + (f ? f.lines * lineRate(f) * kittenBoost(s, k, k.fac, false) : 0);
  }, 0) / s.crew.length;
}

/** How much faster kitten k would run factory i (it doesn't have to be there now). `bonus`: count care time. */
export function kittenBoost(s, k, i, bonus = true) {
  const f = s.facs[i];
  if (!f) return 1;
  let b = KITTEN_BOOST * (k.fav === i ? FAV_BONUS : 1);
  if (k.trait === 'hard') b *= 1.3;
  if (k.trait === 'gear') b *= 1 + 0.15 * f.turbo;
  if (k.trait === 'pack') b *= 1 + 0.2 * f.dock;
  if (k.trait === 'owl' && s.away) b *= 2;
  b *= 1 + 0.15 * (crewTrait(s, 'cheer') - (k.trait === 'cheer' ? 1 : 0));
  return b * levelMult(kittenLevel(k)) * teamMult(k) * (bonus && happy(s) ? HAPPY_MULT : 1);
}

/** Marks each factory run by a kitten and how much faster it runs. */
export function syncCrew(s) {
  const gm = gainMult(s);
  s.facs.forEach((f, i) => {
    const k = crewOn(s) && kittenAt(s, i);
    f.kitOn = k ? true : undefined;
    f.boost = k ? kittenBoost(s, k, i) : undefined;
    f.gm = gm * (1 + bonus(s, 'factory'));
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
  logBuy(s, 'h' + i);
  const r = s.recruit;
  s.crew.push({name: r.name, trait: r.trait, fav: r.fav, fac: i, lvl: 1, xp: 0, subs: []});
  s.recruit = rollKitten(s);
  syncCrew(s);
  return true;
}

/** Promotes kitten n once its XP bar is full, for points. */
export function promoteKitten(s, n) {
  const k = s.crew[n];
  if (!k || !canPromote(k) || s.pts < promoteCost(s, k)) return false;
  s.pts -= promoteCost(s, k);
  k.lvl = kittenLevel(k) + 1;
  k.xp = 0;
  s.stats.promos++;
  syncCrew(s);
  return true;
}

/** Fills every kitten's XP bar (it stops at full until the kitten is promoted). */
function tickXp(s, dt) {
  const m = 1 + bonus(s, 'xp');
  for (const k of s.crew) k.xp = Math.min(xpNeed(k), (k.xp || 0) + xpRate(k) * m * dt);
}

function rollSub(s) {
  const used = new Set(s.crew.flatMap((k) => subs(k).map((u) => u.name)));
  const free = SUB_NAMES.filter((n) => !used.has(n));
  const name = free.length ? free[Math.floor(rand(s) * free.length)] : 'Kit ' + (used.size + 1);
  return {name, trait: TRAITS[Math.floor(rand(s) * TRAITS.length)].id};
}
export const subCount = (s) => s.crew.reduce((a, k) => a + subs(k).length, 0);
export const subCost = (s) => Math.ceil(Math.max(PROMO_MIN, SUB_SECONDS * crewPace(s) * Math.pow(SUB_GROW, subCount(s))));
/** Hires the waiting underling into kitten n's team, if it has a free slot. */
export function hireSub(s, n) {
  const k = s.crew[n];
  if (!k || !s.subRecruit || subs(k).length >= slots(s, k) || s.pts < subCost(s)) return false;
  s.pts -= subCost(s);
  k.subs = [...subs(k), {...s.subRecruit}];
  if (k.subs.length === SLOT_LEVELS.length && k.subs.every((u) => u.trait === k.trait)) markFeat(s, 'team');
  s.subRecruit = rollSub(s);
  syncCrew(s);
  return true;
}

// ---------- night shift ----------

/** Seconds until underling u is back from its trip (0 when back; null when it isn't on one). */
export const tripLeft = (u, now) => (u && u.trip ? Math.max(0, (u.trip.back - now) / 1000) : null);
export const tripBack = (u, now) => tripLeft(u, now) === 0;
/** Underlings back with loot, as [kitten index, slot] pairs. */
export const tripsReady = (s, now) => s.crew.flatMap((k, n) => subs(k).map((u, j) => (tripBack(u, now) ? [n, j] : null)).filter(Boolean));

/** Sends underling j of kitten n on trip t. */
export function sendTrip(s, n, j, t, now) {
  const k = s.crew[n], u = k && subs(k)[j];
  if (!underlingsOn(s) || !u || u.trip || !TRIPS[t]) return false;
  u.trip = {t, back: now + TRIPS[t].secs * 1000};
  syncCrew(s);
  return true;
}

function rollLoot(s, t) {
  const total = LOOT.reduce((a, l) => a + l.weights[t], 0);
  let r = rand(s) * total;
  return LOOT.find((l) => (r -= l.weights[t]) < 0) || LOOT[0];
}

/** Opens the loot of underling j of kitten n once it's back; it goes back to work. Returns the loot, or null. */
export function openTrip(s, n, j, now) {
  const k = s.crew[n], u = k && subs(k)[j];
  if (!tripBack(u, now)) return null;
  const t = u.trip.t, out = [];
  delete u.trip;
  syncCrew(s);
  for (let i = 0; i < TRIPS[t].items; i++) {
    const l = rollLoot(s, t);
    if (l.id === 'crate') {
      const g = Math.ceil(CRATE_SECS * income(s) / (s.frenzy > 0 ? FRENZY_MULT : 1));
      earn(s, g);
      out.push({id: 'crate', text: 'CRATE OF CLICKS · +' + fmt(g)});
    } else if (l.id === 'spool' && s.spools < MAX_SPOOLS) {
      s.spools++;
      out.push({id: 'spool', text: 'GOLDEN SPOOL · USE IT FOR A YARN ×' + FRENZY_MULT + ' ANY TIME'});
    } else if (l.id === 'treat' || l.id === 'spool') { // spools are full: a treat instead
      k.xp = xpNeed(k);
      out.push({id: 'treat', text: 'TREAT · ' + k.name.toUpperCase() + '\'S XP BAR IS FULL'});
    } else {
      const f = s.facs[Math.floor(rand(s) * s.facs.length)];
      f.bp = (f.bp || 0) + 1;
      out.push({id: 'blueprint', text: 'BLUEPRINT · FACTORY #' + (f.i + 1) + ' ×' + BP_STEP + ' FOR GOOD'});
    }
  }
  s.stats.trips++;
  syncCrew(s);
  return out;
}

/** Uses a golden spool: a golden yarn frenzy now (it doesn't count as a catch). */
export function useSpool(s) {
  if (!s.cat || s.spools < 1 || s.frenzy > 0) return false;
  s.spools--;
  s.frenzy = FRENZY_SECONDS * (1 + bonus(s, 'yarn'));
  syncCrew(s);
  return true;
}

/** Catching the golden yarn: all income ×FRENZY_MULT for FRENZY_SECONDS. */
export function catchYarn(s) {
  if (!s.cat) return false;
  s.frenzy = FRENZY_SECONDS * (1 + bonus(s, 'yarn'));
  s.stats.yarn++;
  s.stats.burst = 0;
  if (++s.stats.yarnRun >= 10) markFeat(s, 'yarn10');
  syncCrew(s);
  return true;
}
/** A golden yarn rolled past without being caught: the catch streak starts over. */
export function missYarn(s) {
  s.stats.yarnRun = 0;
}

/** Moves kitten n to factory i, swapping with the kitten already there. */
export function moveKitten(s, n, i) {
  const k = s.crew[n];
  if (!k || !s.facs[i] || k.fac === i) return false;
  const other = kittenAt(s, i);
  if (other) other.fac = k.fac;
  k.fac = i;
  s.stats.moves++;
  syncCrew(s);
  return true;
}

/** The day before a 'YYYY-MM-DD' date. */
export function dayBefore(day) {
  const [y, m, d] = day.split('-').map(Number), t = Date.UTC(y, m - 1, d - 1);
  return isFinite(t) ? new Date(t).toISOString().slice(0, 10) : '';
}
/** Care time, once a day (`today` is the player's local date, e.g. '2026-10-11'). */
const careToday = (s, today) => (s.care.day === today ? s.care.done : []);
export const careDone = (s, today, step) => careToday(s, today).includes(step);
export const careReady = (s, today) => crewOn(s) && s.crew.length > 0 && careToday(s, today).length < CARE_STEPS.length;
/** Does one step of today's care time. The last of the three makes the crew happy. */
export function doCare(s, today, step) {
  if (!careReady(s, today) || !CARE_STEPS.includes(step) || careDone(s, today, step)) return false;
  s.care = {day: today, done: [...careToday(s, today), step], last: s.care.last || ''};
  s.stats.care++;
  if (s.care.done.length === CARE_STEPS.length) {
    s.happy = HAPPY_SECONDS;
    s.stats.happy++;
    s.stats.streak = s.care.last === dayBefore(today) ? s.stats.streak + 1 : 1;
    s.stats.streakMax = Math.max(s.stats.streakMax, s.stats.streak);
    s.care.last = today;
  }
  syncCrew(s);
  return true;
}

export const isFull = (f) => f.store >= siloCap(f);
/** Everything the player earns per second if they keep the silos emptied. */
export const income = (s) => perSec(s) + s.facs.reduce((a, f) => a + factoryRate(f), 0);
/** What is being generated right now without tapping: the auto-clicker, the cat, and every factory that
 *  is producing (kitten-run ones always; the others until their silo is full). */
export const generating = (s) => perSec(s) + s.facs.reduce((a, f) => a + (f.kitOn || !isFull(f) ? factoryRate(f) : 0), 0);

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
  if (s.frenzy > 0) s.frenzy = Math.max(0, s.frenzy - dt);
  if (crewOn(s)) tickXp(s, dt);
  if (!s.away) s.stats.play += dt;
  releaseSkins(s);
}

/** Power tap's part of every tap: a share of the income per second. Lucky clicks don't multiply it. */
export const powerGain = (s) => s.own.power * POWER_SHARE * income(s);
export const tapMult = (s) => 1 + bonus(s, 'tap');
export const tapGain = (s) => (perClick(s) * gainMult(s) + powerGain(s)) * tapMult(s);
export const luckMult = (s) => LUCK_MULT * (1 + bonus(s, 'luck'));

export function tap(s, rng = Math.random) {
  const lucky = rng() < LUCK_CHANCE * s.own.luck;
  const gain = (perClick(s) * gainMult(s) * (lucky ? luckMult(s) : 1) + powerGain(s)) * tapMult(s);
  earn(s, gain);
  const st = s.stats;
  st.taps++;
  if (lucky) {
    st.lucky++;
    st.luckyRun++;
    if (st.luckyRun >= 2) markFeat(s, 'lucky2');
    if (st.luckyRun >= 3) markFeat(s, 'lucky3');
  } else st.luckyRun = 0;
  if (s.frenzy > 0) {
    st.ftaps++;
    if (++st.burst >= 150) markFeat(s, 'frenzy');
  }
  return {gain, lucky};
}

export function collect(s, i) {
  const f = s.facs[i];
  if (!f) return 0;
  const g = Math.floor(f.store);
  if (g < 1) return 0;
  f.store -= g;
  earn(s, g);
  s.stats.collects++;
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
  s.stats.upg++;
  logBuy(s, 'u' + id);
  return true;
}

export const nextFactoryCost = (s) => FACTORY_COST[s.facs.length];

export function buildFactory(s) {
  const n = s.facs.length;
  if (n >= MAX_FACTORIES || s.pts < FACTORY_COST[n]) return -1;
  s.pts -= FACTORY_COST[n];
  s.facs.push(newFactory(n));
  logBuy(s, 'f' + n);
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
  s.stats.ext++;
  logBuy(s, 'e' + i + id);
  // Order feats: Turbo, Line, Silo in one factory; and one extension in each factory from #1 to #5.
  const last = (n) => s.log.slice(-n).join(',');
  if (last(3) === ['turbo', 'lines', 'silo'].map((x) => 'e' + i + x).join(',')) markFeat(s, 'combo');
  if (s.log.length >= 5 && s.log.slice(-5).every((x, j) => x.startsWith('e' + j))) markFeat(s, 'stairs');
  return true;
}

export const currentGoal = (s) => GOALS[Math.min(s.goalIdx, GOALS.length - 1)];

export function adoptCat(s) {
  if (s.goalIdx !== 0 || s.pts < GOALS[0].at) return false;
  s.pts -= GOALS[0].at;
  s.cat = true;
  s.goalIdx = 1;
  return true;
}

/**
 * Levels after the first need no purchase: the first time the player holds the level's points, its
 * reward arrives and the meter moves on. Level 2 (10M) opens the store and the crew; level 3 (100M)
 * opens underlings; later levels add the level bonus. Returns the index of the level just reached, or -1.
 */
export function checkGoal(s) {
  const i = s.goalIdx;
  if (i < 1 || i >= GOALS.length || s.pts < GOALS[i].at) return -1;
  if (i === 1) { s.storeOpen = true; startCrew(s); }
  s.goalIdx = i + 1;
  if (underlingsOn(s) && !s.subRecruit) s.subRecruit = rollSub(s);
  syncCrew(s);
  return i;
}

/** True once the last level has been reached. */
export const finalGoalReached = (s) => s.goalIdx >= GOALS.length;

// ---------- skins ----------

/** Everything boosting one thing: the worn skin plus the upgrades found in boxes (0.25 = +25%). */
export const bonus = (s, type) => skinBonus(s, type) + (s.parts[type] || 0);

/** The worn skin's bonus of one type (0.25 = +25%). */
export function skinBonus(s, type) {
  const sk = skinById.get(s.skin);
  return sk ? sk.bonus.reduce((a, b) => a + (b.type === type ? b.value : 0), 0) : 0;
}
export function markFeat(s, id) {
  if (!s.feats.includes(id)) s.feats.push(id);
}
/** The last few purchases, for the order feats. */
function logBuy(s, code) {
  s.log = [...s.log.slice(-4), code];
}

/** The value of an unlock stat: counters, or things the state already knows. */
export function statValue(s, k) {
  switch (k) {
    case 'play': return s.stats.play / 60; // minutes
    case 'earned': return s.total;
    case 'fac': return s.facs.length;
    case 'hires': return s.crew.length;
    case 'maxLvl': return s.crew.reduce((a, k2) => Math.max(a, kittenLevel(k2)), 0);
    case 'subs': return subCount(s);
    case 'owned': return s.skins.length;
    case 'tracks': return s.tracks.length - 1;
    case 'level': return s.goalIdx;
    case 'streak': return s.stats.streakMax;
    default: return s.stats[k] || 0;
  }
}
/** How far along a skin's unlock condition is, from 0 to 1. */
export function skinProgress(s, sk) {
  const c = sk.cond;
  if (!c) return 1;
  if (c.f) return s.feats.includes(c.f) ? 1 : 0;
  if (c.skins) return c.skins.filter((id) => s.skins.includes(id)).length / c.skins.length;
  return Math.min(1, statValue(s, c.k) / c.at);
}
export const skinReleased = (s, id) => id in s.released;
export const skinPrice = (s, id) => s.released[id];
/** What a newly released skin of class c costs: CLASSES[c].secs of income at the time (at least its floor). */
export function releasePrice(s, c) {
  const k = CLASSES[c], pace = income(s) / (s.frenzy > 0 ? FRENZY_MULT : 1);
  const p = Math.max(k.floor, k.secs * pace);
  const mag = Math.pow(10, Math.floor(Math.log10(p)) - 1); // two significant digits
  return Math.ceil(p / mag) * mag;
}
/** Releases every skin whose condition is met. Returns the ids released now (also added to s.fresh). */
export function releaseSkins(s) {
  const out = [];
  for (const sk of SKINS) {
    if (skinReleased(s, sk.id) || skinProgress(s, sk) < 1) continue;
    s.released[sk.id] = releasePrice(s, sk.cls);
    out.push(sk.id);
  }
  if (out.length) s.fresh = [...s.fresh, ...out];
  return out;
}
/** Marks released skins as seen in the store (they stop counting as new). */
export function seeSkins(s, ids) {
  s.fresh = s.fresh.filter((id) => !ids.includes(id));
}

export function buySkin(s, id) {
  if (!s.storeOpen || !skinReleased(s, id) || s.skins.includes(id) || s.pts < skinPrice(s, id)) return false;
  s.pts -= skinPrice(s, id);
  s.skins.push(id);
  return true;
}
// ---------- boxes ----------
// Boxes are sold in the store for points. Each holds a few items, and each item has a class (common to
// legendary, as skins) that sets how good it is. Bigger boxes hold more items with better odds, and cost
// less per item's worth (`discount`). Prices are seconds of income, like promotions, so a box stays worth
// opening at every stage.
export const BOXES = [
  {id: 'cardboard', name: 'Cardboard box', items: 1, odds: [70, 25, 5, 0, 0], discount: 1},
  {id: 'wooden', name: 'Wooden crate', items: 3, odds: [45, 38, 14, 3, 0], discount: 0.85},
  {id: 'iron', name: 'Iron chest', items: 5, odds: [20, 45, 25, 9, 1], discount: 0.7},
  {id: 'golden', name: 'Golden chest', items: 8, odds: [0, 30, 45, 20, 5], discount: 0.55}
];
// What an item can be, with weights, and how big it is per class [common, rare, epic, mythic, legendary].
export const BOX_ITEMS = [
  {id: 'part', weight: 50},       // an upgrade: a permanent bonus to one thing (taps, cat, factories...)
  {id: 'skin', weight: 20},       // a skin of that class you don't own yet, even one not released yet
  {id: 'crate', weight: 15},      // minutes of income
  {id: 'spool', weight: 10},      // golden spools
  {id: 'blueprint', weight: 5}    // blueprints for a random factory
];
export const PART_VALUE = [0.02, 0.05, 0.1, 0.25, 0.5];
export const CRATE_MINUTES = [1, 3, 6, 12, 24];   // kept small, so crates never pay a box back on their own
export const ITEM_COUNT = [1, 1, 2, 3, 5];     // spools or blueprints per item
const PART_TYPES = Object.keys(BONUSES);
const SECS_PER_PART = 38;                       // a cardboard box (+3% on average) costs about 2 minutes of income
/** A box's price: its expected upgrade value in seconds of income, with the bigger boxes' discount. */
export function boxSecs(b) {
  const ev = b.odds.reduce((a, p, c) => a + p / 100 * PART_VALUE[c] * 100, 0);
  return Math.round(ev * b.items * SECS_PER_PART * b.discount);
}
export function boxPrice(s, i) {
  const p = Math.max(1e5, boxSecs(BOXES[i]) * income(s) / (s.frenzy > 0 ? FRENZY_MULT : 1));
  const mag = Math.pow(10, Math.floor(Math.log10(p)) - 1);
  return Math.ceil(p / mag) * mag;
}

function rollWeighted(s, weights) {
  let r = rand(s) * weights.reduce((a, w) => a + w, 0);
  return Math.max(0, weights.findIndex((w) => (r -= w) < 0));
}
/** One item of class c, applied to the state. Returns {cls, kind, text}. */
function boxItem(s, c) {
  let kind = BOX_ITEMS[rollWeighted(s, BOX_ITEMS.map((x) => x.weight))].id;
  const skins = SKINS.filter((sk) => sk.cls === c && !s.skins.includes(sk.id) && !sk.secret);
  if (kind === 'skin' && !skins.length) kind = 'part';
  if (kind === 'spool' && (!s.cat || s.spools >= MAX_SPOOLS)) kind = 'crate';
  if (kind === 'blueprint' && !s.facs.length) kind = 'crate';
  if (kind === 'skin') {
    const sk = skins[Math.floor(rand(s) * skins.length)];
    if (!skinReleased(s, sk.id)) s.released[sk.id] = 0;
    s.skins.push(sk.id);
    return {cls: c, kind, id: sk.id, text: 'SKIN · ' + sk.name.toUpperCase()};
  }
  if (kind === 'part') {
    const type = PART_TYPES[Math.floor(rand(s) * PART_TYPES.length)], v = PART_VALUE[c] * (BONUSES[type].half ? 0.5 : 1);
    s.parts[type] = (s.parts[type] || 0) + v;
    return {cls: c, kind, text: 'UPGRADE · +' + +(v * 100).toFixed(1) + '% ' + BONUSES[type].label.toUpperCase() + ' FOR GOOD'};
  }
  if (kind === 'spool') {
    const n = Math.min(ITEM_COUNT[c], MAX_SPOOLS - s.spools);
    s.spools += n;
    return {cls: c, kind, text: (n === 1 ? 'A GOLDEN SPOOL' : n + ' GOLDEN SPOOLS') + ' · YARN ×' + FRENZY_MULT + ' WHEN YOU LIKE'};
  }
  if (kind === 'blueprint') {
    const f = s.facs[Math.floor(rand(s) * s.facs.length)];
    f.bp = (f.bp || 0) + ITEM_COUNT[c];
    return {cls: c, kind, text: (ITEM_COUNT[c] === 1 ? 'BLUEPRINT' : ITEM_COUNT[c] + ' BLUEPRINTS') + ' · FACTORY #' + (f.i + 1) + ' ×' + +Math.pow(BP_STEP, ITEM_COUNT[c]).toFixed(2) + ' FOR GOOD'};
  }
  const g = Math.ceil(CRATE_MINUTES[c] * 60 * income(s) / (s.frenzy > 0 ? FRENZY_MULT : 1));
  earn(s, g);
  return {cls: c, kind: 'crate', text: CRATE_MINUTES[c] + ' MIN OF CLICKS · +' + fmt(g)};
}
/** Buys and opens box i. Returns its items, best first, or null. */
export function buyBox(s, i) {
  const b = BOXES[i];
  if (!s.storeOpen || !b) return null;
  const price = boxPrice(s, i);
  if (s.pts < price) return null;
  s.pts -= price;
  const out = [];
  for (let n = 0; n < b.items; n++) out.push(boxItem(s, rollWeighted(s, b.odds)));
  s.stats.boxes++;
  syncCrew(s);
  return out.sort((a, z) => z.cls - a.cls);
}

// Play-test codes, entered in the store. 'yumi' unlocks every skin, for free; 'wakeup' brings every
// underling back from its night shift now.
const CODES = {
  wakeup: (s) => {
    const away = s.crew.flatMap((k) => subs(k)).filter((u) => u.trip);
    for (const u of away) u.trip.back = 0;
    return away.length;
  },
  yumi: (s) => {
    const ids = SKINS.map((sk) => sk.id).filter((id) => !s.skins.includes(id));
    for (const id of ids) {
      if (!skinReleased(s, id)) s.released[id] = 0;
      s.skins.push(id);
    }
    s.fresh = [];
    return ids.length;
  }
};
/** Runs a code. Returns how many things it unlocked, or -1 for an unknown code. */
export function redeemCode(s, code) {
  const run = CODES[String(code).trim().toLowerCase()];
  return run ? run(s) : -1;
}

export function buyTrack(s, id) {
  const item = TRACKS.find((x) => x.id === id);
  if (!s.storeOpen || !item || s.tracks.includes(id) || s.pts < item.price) return false;
  s.pts -= item.price;
  s.tracks.push(id);
  return true;
}

export function equipSkin(s, id) {
  if (!s.skins.includes(id)) return false;
  s.skin = id;
  syncCrew(s);
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
  if (t >= 60) s.stats.back++;
  s.away = true;
  for (let left = t; left > 0; left -= 5) step(s, Math.min(5, left));
  s.away = false;
  syncCrew(s);
  return {seconds: t, points: s.pts - pts0, stored: stored() - store0};
}

export function serialize(s) {
  return {v: 1, pts: s.pts, best: s.best, total: s.total, own: {...s.own}, facs: s.facs.map(({kitOn, boost, gm, ...f}) => f),
    goalIdx: s.goalIdx, cat: s.cat, storeOpen: s.storeOpen, crew: s.crew.map((k) => ({...k, subs: subs(k).map((u) => ({...u, ...(u.trip && {trip: {...u.trip}})}))})),
    recruit: s.recruit && {...s.recruit}, subRecruit: s.subRecruit && {...s.subRecruit}, care: {day: s.care.day, done: [...s.care.done]},
    happy: s.happy, frenzy: s.frenzy, seed: s.seed, rolls: s.rolls, spools: s.spools, parts: {...s.parts},
    skins: [...s.skins], skin: s.skin,
    tracks: [...s.tracks], track: s.track, savedAt: s.savedAt,
    stats: {...s.stats}, feats: [...s.feats], log: [...s.log], released: {...s.released}, fresh: [...s.fresh]};
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
      n.bp = int(f && f.bp, 1000);
      n.store = Math.min(num(f && f.store), siloCap(n));
      return n;
    });
  }
  s.cat = data.cat === true;
  s.goalIdx = Math.min(int(data.goalIdx), GOALS.length);
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
    const trip = (t) => (t && Number.isInteger(t.t) && TRIPS[t.t] && typeof t.back === 'number' && isFinite(t.back) ? {t: t.t, back: t.back} : null);
    const sub = (u) => (u && typeof u.name === 'string' && u.name && u.name.length <= 20 && TRAITS.some((t) => t.id === u.trait)
      ? {name: u.name, trait: u.trait, ...(trip(u.trip) && {trip: trip(u.trip)})} : null);
    for (const k of saved) {
      const fac = k && Number.isInteger(k.fac) ? k.fac : -1, n = kitten(k);
      if (!n || !s.facs[fac] || kittenAt(s, fac) || s.crew.some((x) => x.name === n.name)) continue;
      const lvl = Math.max(1, int(k.lvl, 500)), team = (Array.isArray(k.subs) ? k.subs : []).map(sub).filter(Boolean);
      const kit = {...n, fac, lvl, xp: 0, subs: []};
      kit.subs = team.slice(0, SLOT_LEVELS.filter((l) => lvl >= l).length);
      kit.xp = Math.min(num(k.xp), xpNeed(kit));
      s.crew.push(kit);
    }
    if (!s.crew.length) startCrew(s);
    const r = kitten(data.recruit);
    s.recruit = r && !s.crew.some((x) => x.name === r.name) ? r : rollKitten(s);
    if (data.care && typeof data.care.day === 'string' && Array.isArray(data.care.done)) {
      s.care = {day: data.care.day, done: CARE_STEPS.filter((x) => data.care.done.includes(x)),
        last: typeof data.care.last === 'string' ? data.care.last : ''};
    }
    s.happy = Math.min(num(data.happy), HAPPY_SECONDS);
    if (underlingsOn(s)) s.subRecruit = sub(data.subRecruit) || rollSub(s);
    if (s.subRecruit) delete s.subRecruit.trip;
    syncCrew(s);
  }
  const parts = data.parts && typeof data.parts === 'object' ? data.parts : {};
  for (const k of Object.keys(BONUSES)) if (num(parts[k]) > 0) s.parts[k] = Math.min(num(parts[k]), 1e4);
  const st = data.stats && typeof data.stats === 'object' ? data.stats : {};
  for (const k of STAT_KEYS) s.stats[k] = num(st[k]);
  const feats = new Set(Array.isArray(data.feats) ? data.feats : []);
  s.feats = SKINS.filter((sk) => sk.cond && sk.cond.f && feats.has(sk.cond.f)).map((sk) => sk.cond.f);
  s.log = (Array.isArray(data.log) ? data.log : []).filter((x) => typeof x === 'string' && x.length < 12).slice(-5);
  s.skins = ownedList(SKINS, data.skins);
  s.skin = s.skins.includes(data.skin) ? data.skin : SKINS[0].id;
  // Released skins keep the price they came out at. Skins owned from before releases existed count as released.
  const rel = data.released && typeof data.released === 'object' ? data.released : {};
  for (const sk of SKINS) {
    if (typeof rel[sk.id] === 'number' && isFinite(rel[sk.id]) && rel[sk.id] >= 0) s.released[sk.id] = rel[sk.id];
    else if (s.skins.includes(sk.id)) s.released[sk.id] = 0;
  }
  s.fresh = (Array.isArray(data.fresh) ? data.fresh : []).filter((id) => skinReleased(s, id) && !s.skins.includes(id));
  s.tracks = ownedList(TRACKS, data.tracks);
  s.track = s.tracks.includes(data.track) ? data.track : TRACKS[0].id;
  s.frenzy = s.cat ? Math.min(num(data.frenzy), FRENZY_SECONDS * (1 + bonus(s, 'yarn'))) : 0;
  s.spools = s.cat ? int(data.spools, MAX_SPOOLS) : 0;
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
