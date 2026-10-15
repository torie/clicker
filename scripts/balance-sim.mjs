// Simulates a greedy player against the real rules in src/game.js, to tune prices.
// Run: node scripts/balance-sim.mjs [--skins 1] [--taps 5] [--collect 20] [--daily 1] [--yarn 480] [--worth 300] [--seed 1] [--trace] [--load SAVE.json]
//   [--save-at 950000 --save-to test/presets/precat.json]  (--trace lists every purchase; --save-at writes the
//   save the first time the balance reaches that many points, for play-testing from that point)
//
// The player taps `taps` times per second, empties every silo every `collect` seconds,
// and always buys whatever pays for itself fastest (price ÷ extra income), unless
// saving for the current goal would be quicker and it takes longer than `worth` seconds to pay off. From 10M they keep every kitten in
// the factory where it does the most, hire a kitten as soon as they can afford one, and (unless
// --daily 0) do care time as soon as the crew arrives. After the cat they catch a golden yarn every
// `yarn` seconds (0: never). Kitten promotions and underlings are bought like any other purchase.
import { readFileSync, writeFileSync } from 'node:fs';
import * as G from '../src/game.js';

const arg = (name, d) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? Number(process.argv[i + 1]) : d;
};
const TRACE = process.argv.includes('--trace');
// Like a real player, buys anything that pays for itself within WORTH seconds even when saving for the goal would be quicker.
const WORTH = arg('worth', 300);
const SKINS = arg('skins', 1);
const TAPS = arg('taps', 5), COLLECT = arg('collect', 20), DAILY = arg('daily', 1), YARN = arg('yarn', 480), LIMIT = arg('limit', 8 * 3600);
const SAVE_AT = arg('save-at', 0), SAVE_TO = process.argv[process.argv.indexOf('--save-to') + 1];
const LOAD = process.argv.includes('--load') ? process.argv[process.argv.indexOf('--load') + 1] : null;

// What tapping earns per second on average, lucky clicks included.
const tapIncome = (s) => TAPS * (G.perClick(s) * G.gainMult(s) * (1 + (G.luckMult(s) - 1) * G.LUCK_CHANCE * s.own.luck) + G.powerGain(s)) * G.tapMult(s);

// Income the player actually gets per second, counting silos that fill before collection.
function effectiveIncome(s) {
  const tapping = tapIncome(s);
  G.syncCrew(s);
  const factories = s.facs.reduce((a, f) => a + (f.kitOn ? G.factoryRate(f) : Math.min(G.factoryRate(f), G.siloCap(f) / COLLECT)), 0);
  return tapping + G.perSec(s) + factories;
}

// Where the income comes from, e.g. "12K/s (tap 20%, cat 50%, factories 30%)".
function shares(s) {
  G.syncCrew(s);
  const src = {
    tap: tapIncome(s) + s.own.auto * G.gainMult(s),
    cat: G.catRate(s) * G.gainMult(s),
    factories: s.facs.reduce((a, f) => a + (f.kitOn ? G.factoryRate(f) : Math.min(G.factoryRate(f), G.siloCap(f) / COLLECT)), 0)
  };
  const tot = src.tap + src.cat + src.factories;
  return `${G.fmt(tot)}/s (` + Object.entries(src).map(([k, v]) => `${k} ${Math.round(100 * v / tot)}%`).join(', ') + ')';
}

// An option is a list of purchases made together; its cost is measured on a copy of the state.
const BIG = 1e15;
function bundle(s, name, steps) {
  const t = structuredClone(s);
  t.pts = BIG;
  if (!steps.every((f) => f(t))) return null;
  return { name, cost: BIG - t.pts, buy: (u) => steps.every((f) => f(u)) };
}
// A faster factory is worthless while its silo fills between collections, and so is a bigger silo on
// its own. Like a player who sees the silo flash full, the speed-ups also come with the silo they need.
const topUpSilo = (i) => (t) => {
  const f = t.facs[i], silo = G.EXTENSIONS.find((e) => e.id === 'silo');
  while (!G.extensionMaxed(f, silo) && G.siloCap(f) / COLLECT < G.factoryRate(f) && G.buyExtension(t, i, 'silo'));
  return true;
};
const ext = (i, id) => (t) => G.buyExtension(t, i, id);

function options(s) {
  const o = [];
  for (const u of G.UPGRADES) {
    if (!G.upgradeHidden(s, u) && !G.upgradeMaxed(s, u)) o.push(bundle(s, u.id, [(t) => G.buyUpgrade(t, u.id)]));
  }
  if (s.facs.length < G.MAX_FACTORIES) {
    const i = s.facs.length, lines = G.EXTENSIONS.find((e) => e.id === 'lines');
    o.push(bundle(s, 'factory', [(t) => G.buildFactory(t) >= 0]));
    // A new factory is built to be filled with lines, so also offer it fully lined.
    o.push(bundle(s, 'factory+lines', [(t) => G.buildFactory(t) >= 0, ...Array.from({ length: lines.max - lines.min }, () => ext(i, 'lines')), topUpSilo(i)]));
  }
  if (G.crewOn(s)) s.facs.forEach((f, i) => { if (!G.kittenAt(s, i)) o.push(bundle(s, 'hire#' + (i + 1), [(t) => G.hireKitten(t, i)])); });
  s.crew.forEach((k, n) => {
    if (G.canPromote(k)) o.push(bundle(s, 'promote:' + k.name, [(t) => G.promoteKitten(t, n)]));
    if (s.subRecruit && (k.subs || []).length < G.slots(s, k)) o.push(bundle(s, 'sub:' + k.name, [(t) => G.hireSub(t, n)]));
  });
  // Skins (with --skins 1): buy a released skin and put it on, if that pays off like anything else.
  // Only the strongest few of each bonus type are worth trying.
  if (SKINS && s.storeOpen) {
    const worth = (id) => G.SKINS.find((sk) => sk.id === id).bonus.reduce((a, b) => a + b.value, 0);
    const top = (ids) => ids.sort((a, b) => worth(b) - worth(a)).slice(0, 6);
    for (const id of top(Object.keys(s.released).filter((id) => !s.skins.includes(id)))) o.push(bundle(s, 'skin:' + id, [(t) => G.buySkin(t, id) && G.equipSkin(t, id)]));
    for (const id of top(s.skins.filter((id) => id !== s.skin))) o.push(bundle(s, 'wear:' + id, [(t) => G.equipSkin(t, id)]));
  }
  s.facs.forEach((f, i) => {
    for (const e of G.EXTENSIONS) {
      if (G.extensionLocked(s, e) || G.extensionMaxed(f, e)) continue;
      o.push(bundle(s, e.id + '#' + (i + 1), [ext(i, e.id)]));
      if (e.id === 'lines' || e.id === 'turbo') o.push(bundle(s, e.id + '#' + (i + 1) + '+silo', [ext(i, e.id), topUpSilo(i)]));
    }
  });
  return o.filter(Boolean);
}

function bestBuy(s) {
  const base = effectiveIncome(s);
  let best = null;
  for (const o of options(s)) {
    const t = structuredClone(s);
    t.pts = Infinity;
    o.buy(t);
    const gain = effectiveIncome(t) - base, payback = Math.max(o.cost, 1e-9) / gain;
    if (gain > 0 && (!best || payback < best.payback)) best = { ...o, payback };
  }
  return best;
}

// Puts every kitten where it does the most (trying every arrangement; there are at most 5 kittens).
// Returns how many kittens moved.
function arrange(s) {
  if (s.crew.length < 2) return 0;
  const before = s.crew.map((k) => k.fac), facs = s.facs.map((f, i) => i);
  let best = null, bestInc = -1;
  const place = (n, used) => {
    if (n === s.crew.length) {
      G.syncCrew(s);
      const inc = effectiveIncome(s);
      if (inc > bestInc) { bestInc = inc; best = s.crew.map((k) => k.fac); }
      return;
    }
    for (const i of facs) if (!used.has(i)) { s.crew[n].fac = i; used.add(i); place(n + 1, used); used.delete(i); }
  };
  place(0, new Set());
  s.crew.forEach((k, n) => { k.fac = best[n]; });
  G.syncCrew(s);
  return best.filter((f, n) => f !== before[n]).length;
}

// --load starts from a save (e.g. a preset) instead of a new game, at that save's level.
const s = LOAD ? G.deserialize(JSON.parse(readFileSync(LOAD, 'utf8'))) : G.newGame(), log = [], stats = { moves: 0, cares: 0 };
if (!LOAD) s.seed = arg('seed', 1);
// Management effort per goal: collecting a silo or caring for a kitten each count as one action.
const phases = G.GOALS.map(() => ({ actions: 0, gap: 0 }));
let goalNow = 0;
const phase = () => phases[goalNow];
let t = 0, lastBuy = 0, SAVE_DONE = false;
for (const [gi, goal] of G.GOALS.entries()) {
  if (gi < s.goalIdx) continue; // a loaded save has already passed these
  const start = t;
  goalNow = gi;
  lastBuy = t; // reaching a goal counts as an event: the wait is measured within each goal
  while (s.pts < goal.at && t < LIMIT) {
    // Kittens end the collecting, which the income maths doesn't value, so the player hires one as
    // soon as they can afford it (cheapest factory first).
    for (let i = 0; i < s.facs.length && G.crewOn(s); i++) {
      if (G.kittenAt(s, i) || s.pts < G.hireCost(i) || !G.hireKitten(s, i)) continue;
      if (TRACE) console.log(`${(t / 60).toFixed(1).padStart(5)} min  hire#${i + 1}   ${G.fmt(G.hireCost(i)).padStart(7)}  (no more collecting)`);
      const moved = arrange(s);
      stats.moves += moved;
      phase().actions += moved;
    }
    for (let b = bestBuy(s); b && s.pts >= b.cost && Math.max(WORTH, (goal.at - s.pts) / effectiveIncome(s)) > b.payback; b = bestBuy(s)) {
      if (TRACE) console.log(`${(t / 60).toFixed(1).padStart(5)} min  ${b.name.padEnd(9)} ${G.fmt(b.cost).padStart(7)}  payback ${Math.round(b.payback)}s`);
      b.buy(s);
      phase().gap = Math.max(phase().gap, t - lastBuy);
      lastBuy = t;
      const moved = arrange(s);
      stats.moves += moved;
      phase().actions += moved;
    }
    const tapping = tapIncome(s);
    G.earn(s, tapping);
    s.stats.taps += TAPS; // for the skin unlocks
    s.stats.lucky += TAPS * G.LUCK_CHANCE * s.own.luck;
    G.step(s, 1);
    t++;
    if (t % COLLECT === 0) s.facs.forEach((f, i) => { if (!f.kitOn && G.collect(s, i) > 0) phase().actions++; });
    if (YARN && s.cat && t % YARN === 0) { G.catchYarn(s); if (SKINS) G.markFeat(s, 'music'); }
    if (DAILY && G.careReady(s, 'day 1')) {
      for (const c of G.CARE_STEPS) G.doCare(s, 'day 1', c);
      stats.cares++;
      phase().actions += G.CARE_STEPS.length;
    }
    if (SAVE_AT && SAVE_TO && !SAVE_DONE && s.pts >= SAVE_AT) {
      writeFileSync(SAVE_TO, JSON.stringify(G.serialize(s)) + '\n');
      console.log(`saved the game at ${(t / 60).toFixed(1)} min (${G.fmt(s.pts)} points) to ${SAVE_TO}`);
      SAVE_DONE = true;
    }
  }
  const mins = (t - start) / 60, p = phases[gi];
  p.gap = Math.max(p.gap, t - lastBuy); // the wait after the last purchase counts too
  log.push(`goal ${gi + 1} (${G.fmt(goal.at)}): ${mins.toFixed(1)} min, longest wait between purchases ${(p.gap / 60).toFixed(1)} min, ` +
    `${(p.actions / mins).toFixed(1)} management actions/min, income at the end ${shares(s)}, ${s.facs.length} factories, ` +
    `${Object.keys(s.released).length} skins released (${s.skins.length} owned, wearing ${s.skin})`);
  if (gi === 0) G.adoptCat(s);
  if (gi >= 1) G.checkGoal(s);
}
console.log(`taps ${TAPS}/s, collect every ${COLLECT}s, ${DAILY ? 'does' : 'skips'} care time`);
console.log(log.join('\n'));
console.log(`crew after 10M: ${s.crew.map((k) => `${k.name} L${G.kittenLevel(k)}+${(k.subs || []).length} (${k.trait}, loves #${k.fav + 1}) at #${k.fac + 1} ×${G.kittenBoost(s, k, k.fac).toFixed(1)}`).join(', ')}; ` +
  `${stats.moves} moves, care time ${stats.cares}×`);
console.log('final:', JSON.stringify({ own: s.own, facs: s.facs.map(({ lines, turbo, silo, kit }) => [lines, turbo, silo, kit].join('')) }));
