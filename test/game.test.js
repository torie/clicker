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
  assert.equal(G.factoryRate(f), 7);
  G.step(s, 10);
  assert.equal(f.store, 70);
  G.step(s, 1000);
  assert.equal(f.store, G.siloCap(f));
  assert.equal(G.collect(s, 0), 400);
  assert.equal(f.store, 0);
});

test('later factories are 3× stronger, and at most five can be built', () => {
  const s = rich(1e9);
  for (let i = 0; i < 5; i++) assert.equal(G.buildFactory(s), i);
  assert.equal(G.buildFactory(s), -1);
  assert.equal(G.factoryRate(s.facs[2]), 7 * 9);
  assert.equal(G.siloCap(s.facs[2]), 400 * 9);
});

test('loading dock ships part of production straight to the balance', () => {
  const s = rich(0);
  s.facs.push(Object.assign(G.newFactory(0), { dock: 1 }));
  G.step(s, 10);
  assert.ok(Math.abs(s.pts - 14) < 1e-9);
  assert.ok(Math.abs(s.facs[0].store - 56) < 1e-9);
});

test('adopting the cat costs 1M, unlocks goal 2 and clicks 50× per second', () => {
  const s = rich(999999);
  assert.equal(G.adoptCat(s), false);
  s.pts = 1e6;
  assert.equal(G.adoptCat(s), true);
  assert.equal(s.pts, 0);
  assert.equal(G.currentGoal(s).at, 1e7);
  s.own.x2 = 1;
  assert.equal(G.perSec(s), 100);
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
function crewGame(n = 1) {
  const s = Object.assign(rich(1e7), { cat: true, goalIdx: 1 });
  for (let i = 0; i < n; i++) s.facs.push(G.newFactory(i));
  assert.equal(G.checkStoreUnlock(s), true);
  return s;
}

test('before 10M there are no kittens in the factories: the extension list has no kitten crew', () => {
  assert.equal(G.EXTENSIONS.some((e) => e.id === 'kit'), false);
  assert.equal(G.crewOn(rich(1e9)), false);
});

test('at 10M the first kitten joins free, runs the strongest factory, and the first lesson is food', () => {
  const s = crewGame(3);
  assert.equal(s.crew.length, 1);
  assert.equal(s.crew[0].name, 'Mochi');
  assert.equal(s.crew[0].fac, 2);
  assert.deepEqual(G.activeNeeds(s).map((n) => n.id), ['food']);
});

test('hiring: one kitten per factory, priced by factory', () => {
  const s = crewGame(3);
  s.pts = 1e9;
  assert.equal(G.hireKitten(s, 2), false, 'factory #3 already has Mochi');
  assert.equal(G.hireKitten(s, 0), true);
  assert.equal(s.pts, 1e9 - G.HIRE_COST[0]);
  assert.equal(G.kittenAt(s, 0).name, 'Pixel');
  assert.equal(G.hireKitten(s, 0), false, 'one per factory');
  assert.equal(G.hireKitten(s, 7), false, 'no such factory');
});

test('a working kitten runs its factory: faster, shipped straight to the balance, silo emptied', () => {
  const s = crewGame(1), f = s.facs[0];
  const plain = f.lines * G.lineRate(f);
  f.store = 300;
  s.pts = 0;
  G.step(s, 1);
  assert.equal(f.kitOn, true);
  assert.equal(G.factoryRate(f), plain * G.KITTEN_BOOST);
  assert.ok(f.store < 300, 'the silo is being emptied');
  assert.ok(s.pts >= G.factoryRate(f), 'production goes straight to the balance');
});

test('a hungry kitten stops working and pulls the cat away; feeding it fixes both', () => {
  const s = crewGame(2);
  s.pts = 1e9;
  G.hireKitten(s, 0);
  assert.equal(G.catFocus(s), 1);
  s.crew[0].food = 0;
  assert.equal(G.needsCare(s, s.crew[0]), true);
  assert.equal(G.isWorking(s, s.crew[0]), false);
  assert.ok(Math.abs(G.catFocus(s) - 0.5) < 1e-9, 'one of two kittens needs care: the cat clicks half as much');
  G.syncCrew(s);
  assert.equal(s.facs[s.crew[0].fac].kitOn, false);
  s.pts = G.FEED_COST;
  assert.equal(G.feedKitten(s, 0), true);
  assert.equal(s.pts, 0);
  assert.equal(G.isWorking(s, s.crew[0]), true);
  assert.equal(G.feedKitten(s, 0), false, 'already full');
});

test('needs drain only while working, at the tuned rate', () => {
  const s = crewGame(1);
  G.step(s, 120);
  assert.ok(Math.abs(s.crew[0].food - 0.5) < 1e-6, 'food lasts 4 min of work');
  assert.equal(s.crew[0].sleep, 1, 'sleep is not a need yet');
});

test('sleep and play unlock at 25M and 50M; a nap takes the kitten off work and refills sleep', () => {
  const s = crewGame(1);
  assert.equal(G.napKitten(s, 0), false, 'not learned yet');
  s.pts = s.best = 2.5e7;
  assert.deepEqual(G.checkLessons(s).map((n) => n.id), ['sleep']);
  s.crew[0].sleep = 0.2;
  assert.equal(G.napKitten(s, 0), true);
  assert.equal(G.isWorking(s, s.crew[0]), false);
  assert.equal(G.kittenMood(s, s.crew[0]), G.NAP_MOOD);
  G.step(s, G.NAP_SECONDS);
  assert.equal(G.napping(s.crew[0]), false);
  assert.equal(s.crew[0].sleep, 1);
  s.best = 5e7;
  assert.deepEqual(G.checkLessons(s).map((n) => n.id), ['fun']);
  s.crew[0].fun = 0;
  assert.equal(G.playKitten(s, 0), true);
  assert.equal(s.crew[0].fun, 1);
});

test('time away drains the crew too, so the cat earns less while nobody feeds the kittens', () => {
  const cared = crewGame(1), neglected = crewGame(1);
  cared.own.x2 = neglected.own.x2 = 3;
  const a = G.applyOffline(cared, 60).points, b = G.applyOffline(neglected, 3600).points;
  assert.ok(b < a * 60 * 0.5, 'an hour away earns far less than 60 cared-for minutes');
  assert.ok(neglected.crew.every((k) => G.needsCare(neglected, k)));
});

test('the crew survives a save; bad crew data is repaired', () => {
  const s = crewGame(2);
  s.pts = s.best = s.total = 1e9;
  G.hireKitten(s, 0);
  s.crew[0].food = 0.4;
  const back = G.deserialize(JSON.parse(JSON.stringify(G.serialize(s))));
  assert.deepEqual(G.serialize(back), G.serialize(s));
  const bad = G.deserialize(Object.assign(JSON.parse(JSON.stringify(G.serialize(s))),
    { crew: [{ fac: 9 }, { fac: 0, name: 'Mochi', food: 7 }, { fac: 0, name: 'Twin' }] }));
  assert.equal(bad.crew.length, 1, 'unknown factories and second kittens are dropped');
  assert.equal(bad.crew[0].food, 1, 'needs are clamped');
  const old = G.deserialize({ v: 1, cat: true, goalIdx: 2, storeOpen: true, facs: [{ kit: 3 }] });
  assert.equal(old.crew.length, 1, 'store saves from before the crew get the free kitten');
  assert.equal('kit' in old.facs[0], false, 'old kitten counts are dropped');
});
