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

test('kittens need the cat, then double speed and silo', () => {
  const s = rich(1e9);
  G.buildFactory(s);
  assert.equal(G.buyExtension(s, 0, 'kit'), false);
  s.cat = true;
  assert.equal(G.buyExtension(s, 0, 'kit'), true);
  assert.equal(G.factoryRate(s.facs[0]), 14);
  assert.equal(G.siloCap(s.facs[0]), 800);
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
