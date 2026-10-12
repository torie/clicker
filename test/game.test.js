import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';

const rich = (pts = 1e9) => Object.assign(G.newGame(), { pts, total: pts, best: pts });

test('fmt keeps small numbers exact and abbreviates large ones', () => {
  assert.equal(G.fmt(9999), '9,999');
  assert.equal(G.fmt(12345), '12.3K');
  assert.equal(G.fmt(3.84e12), '3.8T');
  assert.equal(G.fmt(999999), '999K');
  assert.equal(G.fmt(99999), '99.9K');
  assert.equal(G.fmtEta(3599), 'ETA 1h 0m', 'never "60m"');
  assert.equal(G.fmtEta(45), 'ETA 45s');
  assert.equal(G.fmt(1e40), '1.00e40');
});

test('tapping earns perClick, and lucky clicks are worth ×10', () => {
  const s = G.newGame();
  assert.deepEqual(G.tap(s, () => 0.99), { gain: 1, lucky: false });
  s.own.x2 = 2;
  s.own.luck = 1;
  assert.deepEqual(G.tap(s, () => 0.01), { gain: 40, lucky: true });
  assert.equal(s.pts, 41);
  assert.equal(s.best, 41);
});

test('upgrades stay hidden until half their price has been earned, and respect max level', () => {
  const s = G.newGame();
  s.pts = 1000;
  assert.equal(G.buyUpgrade(s, 'x2'), false, 'hidden: nothing earned yet');
  s.total = 100;
  assert.equal(G.buyUpgrade(s, 'x2'), true);
  assert.equal(s.pts, 800);
  const r = rich(1e30);
  r.own.x2 = 5;
  assert.equal(G.buyUpgrade(r, 'x2'), false, 'maxed');
});

test('factories fill their silo and stop when full', () => {
  const s = rich(1000);
  assert.equal(G.buildFactory(s), 0);
  const f = s.facs[0];
  assert.equal(G.factoryRate(f), G.LINE_RATE);
  G.step(s, 10);
  assert.equal(f.store, G.LINE_RATE * 10);
  G.step(s, 1000);
  assert.equal(f.store, G.siloCap(f));
  assert.equal(G.collect(s, 0), G.SILO_BASE);
  assert.equal(f.store, 0);
});

test('later factories are TIER_OUT× stronger, and at most five can be built', () => {
  const s = rich(1e9);
  for (let i = 0; i < 5; i++) assert.equal(G.buildFactory(s), i);
  assert.equal(G.buildFactory(s), -1);
  const t2 = G.TIER_OUT * G.TIER_OUT;
  assert.ok(Math.abs(G.factoryRate(s.facs[2]) - G.LINE_RATE * t2) < 1e-9);
  assert.ok(Math.abs(G.siloCap(s.facs[2]) - G.SILO_BASE * t2) < 1e-9);
});

test('fully upgraded, the first factory still makes a real share of all factory output', () => {
  const s = rich(1e9);
  for (let i = 0; i < 5; i++) G.buildFactory(s);
  for (const f of s.facs) { f.lines = 4; f.turbo = G.EXTENSIONS.find((e) => e.id === 'turbo').max; }
  const rates = s.facs.map(G.factoryRate), total = rates.reduce((a, b) => a + b);
  assert.ok(rates[0] / total > 0.05, 'factory #1 is more than 5%');
  assert.ok(rates[4] / total < 0.5, 'factory #5 is less than half');
});

test('loading dock ships part of production straight to the balance', () => {
  const s = rich(0);
  s.facs.push(Object.assign(G.newFactory(0), { dock: 1 }));
  G.step(s, 10);
  const made = G.LINE_RATE * 10;
  assert.ok(Math.abs(s.pts - made * G.DOCK_SHARE) < 1e-9);
  assert.ok(Math.abs(s.facs[0].store - made * (1 - G.DOCK_SHARE)) < 1e-9);
});

test('adopting the cat costs 1M, unlocks goal 2 and clicks CAT_CPS× per second', () => {
  const s = rich(999999);
  assert.equal(G.adoptCat(s), false);
  s.pts = 1e6;
  assert.equal(G.adoptCat(s), true);
  assert.equal(s.pts, 0);
  assert.equal(G.currentGoal(s).at, 1e7);
  s.own.x2 = 1;
  assert.equal(G.perSec(s), G.CAT_CPS * 2);
});

test('Cat training stays hidden until the cat is adopted, then adds CAT_TRAIN clicks per level', () => {
  const s = rich(1e9);
  assert.equal(G.buyUpgrade(s, 'train'), false, 'no cat yet');
  s.cat = true;
  assert.equal(G.buyUpgrade(s, 'train'), true);
  assert.equal(G.buyUpgrade(s, 'train'), true, 'no max level');
  assert.equal(G.catClicks(s), G.CAT_CPS + 2 * G.CAT_TRAIN);
});

test('Power tap adds a share of the income per second to every tap, which luck does not multiply', () => {
  const s = G.newGame();
  s.own.auto = 1000;
  s.own.power = 2;
  s.own.luck = 1;
  const power = 2 * G.POWER_SHARE * 1000;
  assert.equal(G.tapGain(s), 1 + power);
  assert.deepEqual(G.tap(s, () => 0.99), { gain: 1 + power, lucky: false });
  assert.deepEqual(G.tap(s, () => 0.01), { gain: G.LUCK_MULT + power, lucky: true });
  s.cat = true;
  assert.equal(G.catRate(s), G.CAT_CPS, 'the cat clicks plain clicks');
});

test('offline progress is capped at 8 hours', () => {
  const s = G.newGame();
  s.own.auto = 1;
  const r = G.applyOffline(s, 48 * 3600);
  assert.equal(r.seconds, 8 * 3600);
  assert.equal(r.points, 8 * 3600);
});

test('saves round-trip and bad data falls back to defaults', () => {
  const s = rich(5000);
  G.buildFactory(s);
  s.facs[0].store = 123;
  const back = G.deserialize(JSON.parse(JSON.stringify(G.serialize(s))));
  assert.deepEqual(G.serialize(back), G.serialize(s));
  assert.deepEqual(G.serialize(G.deserialize({ v: 1, pts: -5, own: { x2: 99 }, facs: [{ lines: 0, store: 1e9 }] })).own.x2, 5);
  const bad = G.deserialize({ v: 1, facs: [{ lines: 0, store: 1e9 }] });
  assert.equal(bad.facs[0].lines, 1);
  assert.equal(bad.facs[0].store, G.siloCap(bad.facs[0]));
  assert.equal(G.deserialize('nonsense').pts, 0);
});

test('the store opens once, when 10,000,000 is reached after adopting the cat', () => {
  const s = rich(2e7);
  assert.equal(G.checkStoreUnlock(s), false, 'needs the cat first');
  s.cat = true;
  s.goalIdx = 1;
  assert.equal(G.checkStoreUnlock(s), true);
  assert.equal(G.currentGoal(s).at, 1e8, 'the meter moves on to goal 3');
  assert.equal(G.checkStoreUnlock(s), false, 'only fires once');
  s.pts = 0;
  assert.equal(s.storeOpen, true, 'stays open after spending');
});

test('skins and tracks cost points, can only be bought once, and must be owned to use', () => {
  const s = rich(3e6);
  assert.equal(G.buySkin(s, 'ginger'), false, 'store closed');
  Object.assign(s, { cat: true, goalIdx: 1, storeOpen: true });
  assert.equal(G.equipSkin(s, 'ginger'), false);
  assert.equal(G.buySkin(s, 'ginger'), true);
  assert.equal(s.pts, 2e6);
  assert.equal(G.buySkin(s, 'ginger'), false, 'already owned');
  assert.equal(G.equipSkin(s, 'ginger'), true);
  assert.equal(G.buyTrack(s, 'cruise'), true);
  assert.equal(G.selectTrack(s, 'cruise'), true);
  assert.equal(G.buyTrack(s, 'lullaby'), false, 'too expensive');
  assert.equal(s.pts, 0);
});

test('saved cosmetics are validated', () => {
  const s = G.deserialize({ v: 1, cat: true, goalIdx: 1, storeOpen: true, skins: ['ginger', 'hacked'], skin: 'royal', tracks: [], track: 'neon' });
  assert.deepEqual(s.skins, ['classic', 'ginger']);
  assert.equal(s.skin, 'classic', 'falls back when the saved skin is not owned');
  assert.deepEqual(s.tracks, ['silo']);
  assert.equal(s.track, 'silo');
  assert.equal(G.deserialize({ v: 1, storeOpen: true }).storeOpen, false, 'store needs goal 2');
  assert.equal(G.deserialize({ v: 1, cat: true, goalIdx: 1, storeOpen: true }).goalIdx, 2, 'older store saves move on to goal 3');
  const old = G.deserialize({ v: 1, pts: 5 });
  assert.equal(old.skin, 'classic', 'saves from before the store still load');
});

test('goal 3 is 100,000,000 and is the last goal for now', () => {
  const s = Object.assign(rich(1e8 - 1), { cat: true, goalIdx: 2, storeOpen: true });
  assert.equal(G.finalGoalReached(s), false);
  s.pts = 1e8;
  assert.equal(G.finalGoalReached(s), true);
});

// A player who has just reached 10M, with the cat and `n` factories.
function crewGame(n = 1, seed = 1) {
  const s = Object.assign(rich(1e7), { cat: true, goalIdx: 1, seed });
  for (let i = 0; i < n; i++) s.facs.push(G.newFactory(i));
  assert.equal(G.checkStoreUnlock(s), true);
  return s;
}
const DAY = '2026-10-11';

test('before 10M there are no kittens in the factories: the extension list has no kitten crew', () => {
  assert.equal(G.EXTENSIONS.some((e) => e.id === 'kit'), false);
  assert.equal(G.crewOn(rich(1e9)), false);
});

test('at 10M the first kitten joins free and runs the strongest factory; the next recruit waits', () => {
  const s = crewGame(3);
  assert.equal(s.crew.length, 1);
  assert.equal(s.crew[0].fac, 2);
  assert.ok(G.TRAITS.some((t) => t.id === s.crew[0].trait));
  assert.ok(s.crew[0].fav >= 0 && s.crew[0].fav < G.MAX_FACTORIES);
  assert.ok(s.recruit && s.recruit.name !== s.crew[0].name);
  assert.equal(s.pts, 1e7, 'free');
});

test('kittens are rolled from the save seed, so the same save always offers the same recruits', () => {
  assert.deepEqual(crewGame(3, 42).crew, crewGame(3, 42).crew);
  assert.deepEqual(crewGame(3, 42).recruit, crewGame(3, 42).recruit);
});

test('hiring: the waiting recruit joins, one kitten per factory, priced by factory', () => {
  const s = crewGame(3);
  s.pts = 1e9;
  const recruit = s.recruit;
  assert.equal(G.hireKitten(s, 2), false, 'factory #3 already has a kitten');
  assert.equal(G.hireKitten(s, 0), true);
  assert.equal(s.pts, 1e9 - G.HIRE_COST[0]);
  assert.deepEqual(G.kittenAt(s, 0), { ...recruit, fac: 0 });
  assert.notEqual(s.recruit.name, recruit.name, 'a new recruit turns up');
  assert.equal(G.hireKitten(s, 0), false, 'one per factory');
  assert.equal(G.hireKitten(s, 7), false, 'no such factory');
});

test('a kitten runs its factory: shipped straight to the balance, silo emptied, never stalls', () => {
  const s = crewGame(1), f = s.facs[0], k = s.crew[0];
  const plain = f.lines * G.lineRate(f);
  f.store = 300;
  s.pts = 0;
  G.step(s, 1);
  assert.equal(f.kitOn, true);
  assert.equal(G.factoryRate(f), plain * G.kittenBoost(s, k, 0));
  assert.ok(f.store < 300, 'the silo is being emptied');
  assert.ok(s.pts >= G.factoryRate(f), 'production goes straight to the balance');
});

test('the favourite factory and traits change how fast a kitten runs a factory', () => {
  const s = crewGame(2);
  const k = { name: 'Test', trait: 'gear', fav: 1 };
  s.facs[0].turbo = 2;
  assert.ok(Math.abs(G.kittenBoost(s, k, 0) - G.KITTEN_BOOST * 1.3) < 1e-9, 'Gearhead: +15% per turbo press');
  assert.ok(Math.abs(G.kittenBoost(s, k, 1) - G.KITTEN_BOOST * G.FAV_BONUS) < 1e-9, 'favourite factory');
  s.facs[1].dock = 2;
  assert.ok(Math.abs(G.kittenBoost(s, { ...k, trait: 'pack' }, 1) - G.KITTEN_BOOST * G.FAV_BONUS * 1.4) < 1e-9, 'Packer: +20% per dock');
  s.crew[0].trait = 'cheer';
  assert.ok(Math.abs(G.kittenBoost(s, { ...k, trait: 'hard', fav: 4 }, 0) - G.KITTEN_BOOST * 1.3 * 1.15) < 1e-9, 'a Cheerleader helps the others');
  assert.ok(Math.abs(G.kittenBoost(s, s.crew[0], 0) - (s.crew[0].fav === 0 ? G.FAV_BONUS : 1) * G.KITTEN_BOOST) < 1e-9, '...but not itself');
  s.crew[0].trait = 'pal';
  assert.equal(G.catClicks(s), G.CAT_CPS * 1.25, "Cat's pal: the cat clicks faster");
  s.crew[0].trait = 'owl';
  s.away = true;
  assert.equal(G.kittenBoost(s, s.crew[0], 7), 1, 'no such factory');
  assert.ok(G.kittenBoost(s, s.crew[0], 0) >= 2 * G.KITTEN_BOOST, 'Night owl: ×2 while away');
});

test('moving a kitten swaps it with the kitten already there', () => {
  const s = crewGame(3);
  s.pts = 1e9;
  G.hireKitten(s, 0);
  const a = s.crew[0], b = s.crew[1];
  assert.equal(G.moveKitten(s, 0, 0), true);
  assert.equal(a.fac, 0);
  assert.equal(b.fac, 2);
  assert.equal(G.moveKitten(s, 0, 1), true, 'to an empty factory');
  assert.equal(a.fac, 1);
  assert.equal(G.moveKitten(s, 0, 1), false, 'already there');
  assert.equal(G.moveKitten(s, 0, 9), false, 'no such factory');
  assert.equal(s.facs[0].kitOn, undefined, 'factory #1 is back to collecting');
});

test('care time: once a day, feed, nap and play in any order make the crew happy for an hour', () => {
  const s = crewGame(1), f = s.facs[0];
  const before = G.factoryRate(f);
  assert.equal(G.careReady(s, DAY), true);
  assert.equal(G.doCare(s, DAY, 'play'), true);
  assert.equal(G.doCare(s, DAY, 'play'), false, 'each step once');
  assert.equal(G.doCare(s, DAY, 'feed'), true);
  assert.equal(G.happy(s), false, 'not until all three are done');
  assert.equal(G.doCare(s, DAY, 'nap'), true);
  assert.equal(G.happy(s), true);
  assert.equal(G.factoryRate(f), before * G.HAPPY_MULT);
  assert.equal(G.careReady(s, DAY), false, 'done for today');
  assert.equal(G.doCare(s, DAY, 'feed'), false);
  G.step(s, G.HAPPY_SECONDS);
  assert.equal(G.happy(s), false, 'an hour later');
  G.step(s, 1);
  assert.equal(G.factoryRate(f), before);
  assert.equal(G.careReady(s, '2026-10-12'), true, 'tomorrow it comes round again');
  assert.equal(G.careDone(s, '2026-10-12', 'feed'), false);
});

test('skipping care costs nothing, and time away counts down the happy hour', () => {
  const s = crewGame(1);
  const rate = G.income(s);
  G.applyOffline(s, 3600);
  assert.equal(G.income(s), rate, 'neglect never slows the crew or the cat');
  for (const c of G.CARE_STEPS) G.doCare(s, DAY, c);
  G.applyOffline(s, 1800);
  assert.equal(s.happy, G.HAPPY_SECONDS - 1800);
});

test('the crew survives a save; bad crew data is repaired; old kittens get a trait', () => {
  const s = crewGame(2);
  s.pts = s.best = s.total = 1e9;
  G.hireKitten(s, 0);
  G.doCare(s, DAY, 'feed');
  const back = G.deserialize(JSON.parse(JSON.stringify(G.serialize(s))));
  assert.deepEqual(G.serialize(back), G.serialize(s));
  const bad = G.deserialize(Object.assign(JSON.parse(JSON.stringify(G.serialize(s))),
    { crew: [{ fac: 9, name: 'Lost' }, { fac: 0, name: 'Mochi', trait: 'laser', fav: 99 }, { fac: 0, name: 'Twin' }], happy: 1e9, care: { day: DAY, done: ['feed', 'dance'] } }));
  assert.equal(bad.crew.length, 1, 'unknown factories and second kittens are dropped');
  assert.ok(G.TRAITS.some((t) => t.id === bad.crew[0].trait), 'unknown traits are replaced');
  assert.ok(bad.crew[0].fav < G.MAX_FACTORIES);
  assert.equal(bad.happy, G.HAPPY_SECONDS, 'clamped');
  assert.deepEqual(bad.care.done, ['feed']);
  const old = G.deserialize({ v: 1, cat: true, goalIdx: 2, storeOpen: true, facs: [{}, {}], crew: [{ name: 'Mochi', fac: 1, food: 0.2, nap: 3 }], lessons: 3 });
  assert.deepEqual(Object.keys(old.crew[0]).sort(), ['fac', 'fav', 'name', 'trait'], 'needs are gone');
  assert.deepEqual(G.deserialize({ v: 1, cat: true, goalIdx: 2, storeOpen: true, facs: [{}, {}], crew: [{ name: 'Mochi', fac: 1 }] }).crew, old.crew, 'the same kitten gets the same trait every time');
  const none = G.deserialize({ v: 1, cat: true, goalIdx: 2, storeOpen: true, facs: [{ kit: 3 }] });
  assert.equal(none.crew.length, 1, 'store saves from before the crew get the free kitten');
  assert.equal('kit' in none.facs[0], false, 'old kitten counts are dropped');
});
