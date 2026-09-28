// Simulates a greedy player against the real rules in src/game.js, to tune prices.
// Run: node scripts/balance-sim.mjs [--taps 5] [--collect 20]
//
// The player taps `taps` times per second, empties every silo every `collect` seconds,
// and always buys whatever pays for itself fastest (price ÷ extra income), unless
// saving for the current goal would be quicker. After 10M they check on the kitten crew every
// `care` seconds and feed, nap or play with any kitten whose need is below LOW_NEED (or empty).
import * as G from '../src/game.js';

const arg = (name, d) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? Number(process.argv[i + 1]) : d;
};
const TAPS = arg('taps', 5), COLLECT = arg('collect', 20), CARE = arg('care', 20), LIMIT = 4 * 3600;

// Income the player actually gets per second, counting silos that fill before collection.
function effectiveIncome(s) {
  const tapping = TAPS * G.perClick(s) * (1 + (G.LUCK_MULT - 1) * G.LUCK_CHANCE * s.own.luck);
  G.syncCrew(s);
  const factories = s.facs.reduce((a, f) => a + (f.kitOn ? G.factoryRate(f) : Math.min(G.factoryRate(f), G.siloCap(f) / COLLECT)), 0);
  return tapping + G.perSec(s) + factories;
}

function options(s) {
  const o = [];
  for (const u of G.UPGRADES) {
    if (!G.upgradeHidden(s, u) && !G.upgradeMaxed(s, u)) o.push({ name: u.id, cost: G.upgradeCost(s, u), buy: (t) => G.buyUpgrade(t, u.id) });
  }
  if (s.facs.length < G.MAX_FACTORIES) o.push({ name: 'factory', cost: G.nextFactoryCost(s), buy: (t) => G.buildFactory(t) >= 0 });
  if (G.crewOn(s)) s.facs.forEach((f, i) => { if (!G.kittenAt(s, i)) o.push({ name: 'hire#' + (i + 1), cost: G.hireCost(i), buy: (t) => G.hireKitten(t, i) }); });
  s.facs.forEach((f, i) => {
    for (const e of G.EXTENSIONS) {
      if (!G.extensionLocked(s, e) && !G.extensionMaxed(f, e)) o.push({ name: e.id + '#' + (i + 1), cost: G.extensionCost(e, f), buy: (t) => G.buyExtension(t, i, e.id) });
    }
  });
  return o;
}

function bestBuy(s) {
  const base = effectiveIncome(s);
  let best = null;
  for (const o of options(s)) {
    const t = structuredClone(s);
    t.pts = Infinity;
    o.buy(t);
    const gain = effectiveIncome(t) - base, payback = o.cost / gain;
    if (gain > 0 && (!best || payback < best.payback)) best = { ...o, payback };
  }
  return best;
}

const s = G.newGame(), log = [], stats = { feeds: 0, naps: 0, plays: 0, focus: 0, focusN: 0 };
// Management effort per goal: collecting a silo or caring for a kitten each count as one action.
const phases = G.GOALS.map(() => ({ actions: 0 }));
let goalNow = 0;
const phase = () => phases[goalNow];
let t = 0, lastBuy = 0;
for (const [gi, goal] of G.GOALS.entries()) {
  const start = t;
  goalNow = gi;
  while (s.pts < goal.at && t < LIMIT) {
    for (let b = bestBuy(s); b && s.pts >= b.cost && (goal.at - s.pts) / effectiveIncome(s) > b.payback; b = bestBuy(s)) {
      b.buy(s);
      lastBuy = t;
    }
    const tapping = TAPS * G.perClick(s) * (1 + (G.LUCK_MULT - 1) * G.LUCK_CHANCE * s.own.luck);
    G.earn(s, tapping);
    G.step(s, 1);
    t++;
    if (t % COLLECT === 0) s.facs.forEach((f, i) => { if (!f.kitOn && G.collect(s, i) > 0) phase().actions++; });
    G.checkLessons(s);
    if (G.crewOn(s) && t % CARE === 0) {
      s.crew.forEach((k, i) => {
        if (G.napping(k)) return;
        if (s.lessons >= 2 && k.sleep < G.LOW_NEED) { G.napKitten(s, i); stats.naps++; phase().actions++; return; }
        if (k.food < G.LOW_NEED && G.feedKitten(s, i)) { stats.feeds++; phase().actions++; }
        if (s.lessons >= 3 && k.fun < G.LOW_NEED && G.playKitten(s, i)) { stats.plays++; phase().actions++; }
      });
    }
    if (G.crewOn(s)) { stats.focus += G.catFocus(s); stats.focusN++; }
  }
  const mins = (t - start) / 60;
  log.push(`goal ${gi + 1} (${G.fmt(goal.at)}): ${mins.toFixed(1)} min, last purchase at ${(lastBuy / 60).toFixed(1)} min, ${(phases[gi].actions / mins).toFixed(1)} management actions/min`);
  if (gi === 0) G.adoptCat(s);
  if (gi === 1) G.checkStoreUnlock(s);
}
console.log(`taps ${TAPS}/s, collect every ${COLLECT}s, crew care every ${CARE}s`);
console.log(log.join('\n'));
console.log(`crew after 10M: ${s.crew.length} kittens (${s.crew.map((k) => '#' + (k.fac + 1)).join(' ')}), ${stats.feeds} feeds, ${stats.naps} naps, ${stats.plays} plays, cat focus ${(100 * stats.focus / (stats.focusN || 1)).toFixed(0)}% on average`);
console.log('final:', JSON.stringify({ own: s.own, facs: s.facs.map(({ lines, turbo, silo, kit }) => [lines, turbo, silo, kit].join('')) }));
