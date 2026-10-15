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

test('the generation rate counts the auto-clicker, the cat and every factory still producing', () => {
  const s = rich(1e6);
  s.own.auto = 3;
  G.buildFactory(s);
  G.buildFactory(s);
  const [a, b] = s.facs;
  assert.equal(G.generating(s), 3 + G.factoryRate(a) + G.factoryRate(b));
  a.store = G.siloCap(a);
  assert.equal(G.generating(s), 3 + G.factoryRate(b), 'a full silo has stopped');
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
  assert.equal(G.checkGoal(s), -1, 'needs the cat first');
  s.cat = true;
  s.goalIdx = 1;
  assert.equal(G.checkGoal(s), 1);
  assert.equal(s.storeOpen, true);
  assert.equal(G.currentGoal(s).at, 1e8, 'the meter moves on to level 3');
  assert.equal(G.checkGoal(s), -1, 'only fires once');
  s.pts = 0;
  assert.equal(s.storeOpen, true, 'stays open after spending');
});

test('the catalog has 100 / 50 / 20 / 8 / 3 / 1 skins per class, with unique ids and names', () => {
  assert.deepEqual(G.CLASSES.map((c) => G.SKINS.filter((sk) => sk.cls === G.CLASSES.indexOf(c)).length), [100, 50, 20, 8, 3, 1]);
  assert.equal(new Set(G.SKINS.map((sk) => sk.id)).size, G.SKINS.length);
  assert.equal(new Set(G.SKINS.map((sk) => sk.name)).size, G.SKINS.length);
  for (const id of ['classic', 'ginger', 'snow', 'midnight', 'tuxedo', 'royal']) assert.ok(G.SKINS.some((sk) => sk.id === id), id + ' kept for old saves');
  // Bonuses grow with the class: the best of each class beats the best of the class below.
  const best = G.CLASSES.map((c, i) => Math.max(...G.SKINS.filter((sk) => sk.cls === i).map((sk) => sk.bonus.reduce((a, b) => a + b.value, 0))));
  for (let i = 1; i < best.length; i++) assert.ok(best[i] > best[i - 1], G.CLASSES[i].id);
});

test('skins are released when their condition is met, at a price fixed at release, then bought and worn', () => {
  const s = rich(3e6);
  assert.equal(G.skinReleased(s, 'ginger'), false);
  assert.equal(G.buySkin(s, 'ginger'), false, 'not released');
  for (let i = 0; i < 150; i++) G.tap(s, () => 1); // ginger: tap 150 times
  assert.deepEqual(G.releaseSkins(s).includes('ginger'), true);
  assert.ok(s.fresh.includes('ginger'));
  const price = G.skinPrice(s, 'ginger');
  assert.ok(price >= G.CLASSES[0].floor);
  assert.equal(G.buySkin(s, 'ginger'), false, 'store closed');
  Object.assign(s, { cat: true, goalIdx: 1, storeOpen: true });
  assert.equal(G.equipSkin(s, 'ginger'), false, 'must be owned');
  const before = s.pts;
  assert.equal(G.buySkin(s, 'ginger'), true);
  assert.equal(s.pts, before - price);
  assert.equal(G.buySkin(s, 'ginger'), false, 'already owned');
  const plain = G.tapGain(s);
  assert.equal(G.equipSkin(s, 'ginger'), true);
  assert.ok(Math.abs(G.tapGain(s) / plain - 1.05) < 1e-9, 'ginger: +5% taps');
  G.seeSkins(s, ['ginger']);
  assert.equal(s.fresh.includes('ginger'), false);
});

test('skin bonuses: cat, factories, all income, golden yarn, away', () => {
  const s = rich(0);
  Object.assign(s, { cat: true, goalIdx: 1, storeOpen: true });
  G.buildFactory(Object.assign(s, { pts: 1e6 }));
  const wear = (id) => { s.skins.push(id); G.equipSkin(s, id); };
  const cat = G.catRate(s), fac = (G.syncCrew(s), G.factoryRate(s.facs[0])), all = G.perSec(s);
  wear('tracks-1'); // +5% cat clicks
  assert.ok(Math.abs(G.catRate(s) / cat - 1.05) < 1e-9);
  wear('fac-1'); // +5% factories
  assert.ok(Math.abs(G.factoryRate(s.facs[0]) / fac - 1.05) < 1e-9);
  wear('ninelives'); // all +100%, away +200%
  assert.ok(Math.abs(G.perSec(s) / all - 2) < 1e-9);
  s.away = true;
  assert.ok(Math.abs(G.perSec(s) / all - 6) < 1e-9);
  s.away = false;
  wear('goldenpaw'); // yarn +200%
  G.catchYarn(s);
  assert.equal(s.frenzy, G.FRENZY_SECONDS * 3);
});

test('feats: lucky streaks, purchase order, yarn streaks', () => {
  const s = rich(1e12);
  s.own.luck = 5;
  G.tap(s, () => 0); G.tap(s, () => 0);
  assert.ok(s.feats.includes('lucky2'));
  assert.ok(!s.feats.includes('lucky3'));
  G.tap(s, () => 1); G.tap(s, () => 0); G.tap(s, () => 0);
  assert.ok(!s.feats.includes('lucky3'), 'a miss breaks the streak');
  for (let i = 0; i < 5; i++) G.buildFactory(s);
  for (const id of ['turbo', 'lines', 'silo']) G.buyExtension(s, 2, id);
  assert.ok(s.feats.includes('combo'));
  for (let i = 0; i < 5; i++) G.buyExtension(s, i, 'silo');
  assert.ok(s.feats.includes('stairs'));
  s.cat = true;
  for (let i = 0; i < 9; i++) G.catchYarn(s);
  G.missYarn(s);
  G.catchYarn(s);
  assert.ok(!s.feats.includes('yarn10'));
  for (let i = 0; i < 9; i++) G.catchYarn(s);
  assert.ok(s.feats.includes('yarn10'));
});

test('care streaks count days in a row', () => {
  assert.equal(G.dayBefore('2026-03-01'), '2026-02-28');
  assert.equal(G.dayBefore('2027-01-01'), '2026-12-31');
  const s = rich(2e7);
  G.buildFactory(s);
  Object.assign(s, { cat: true, goalIdx: 1 });
  G.checkGoal(s);
  const care = (day) => G.CARE_STEPS.forEach((c) => G.doCare(s, day, c));
  care('2026-10-10'); care('2026-10-11'); care('2026-10-12');
  assert.equal(s.stats.streak, 3);
  care('2026-10-14');
  assert.equal(s.stats.streak, 1);
  assert.equal(s.stats.streakMax, 3);
  assert.equal(s.stats.happy, 4);
});

test('night shift: an underling on a trip stops working until its loot is opened', () => {
  const s = rich(1e12);
  for (let i = 0; i < 5; i++) G.buildFactory(s);
  Object.assign(s, { cat: true, goalIdx: 1 });
  G.checkGoal(Object.assign(s, { pts: 1e12 }));
  G.checkGoal(s); // 100M: underlings
  const k = s.crew[0];
  k.lvl = 15;
  k.subs = [{ name: 'Bit', trait: k.trait }];
  G.syncCrew(s);
  const withSub = G.kittenBoost(s, k, k.fac);
  assert.equal(G.sendTrip(s, 0, 0, 1, 1000), true);
  assert.equal(G.sendTrip(s, 0, 0, 1, 1000), false, 'already away');
  assert.ok(G.kittenBoost(s, k, k.fac) < withSub, 'its bonus is gone while away');
  assert.equal(G.tripLeft(k.subs[0], 1000), 7200);
  assert.equal(G.openTrip(s, 0, 0, 1000 + 7199e3), null, 'not back yet');
  const early = structuredClone(s);
  assert.equal(G.redeemCode(early, 'wakeup'), 1);
  assert.ok(G.tripBack(early.crew[0].subs[0], 1000), 'the wakeup code brings it back now');
  assert.deepEqual(G.tripsReady(s, 1000 + 7200e3), [[0, 0]]);
  const saved = G.deserialize(JSON.parse(JSON.stringify(G.serialize(s))));
  assert.deepEqual(saved.crew[0].subs[0].trip, k.subs[0].trip, 'trips survive a save');
  const loot = G.openTrip(s, 0, 0, 1000 + 7200e3);
  assert.equal(loot.length, 2, 'the catnip fields bring back two things');
  assert.equal(k.subs[0].trip, undefined);
  assert.equal(G.kittenBoost(s, k, k.fac) >= withSub, true, 'back at work');
  assert.equal(s.stats.trips, 1);
});

test('loot: blueprints speed a factory up for good, spools start a frenzy on demand', () => {
  const s = rich(1e6);
  G.buildFactory(s);
  const f = s.facs[0], r = G.factoryRate(f);
  f.bp = 2;
  assert.ok(Math.abs(G.factoryRate(f) / r - G.BP_STEP ** 2) < 1e-9);
  assert.equal(G.useSpool(s), false, 'no cat, no spool');
  Object.assign(s, { cat: true, spools: 1 });
  assert.equal(G.useSpool(s), true);
  assert.equal(s.frenzy, G.FRENZY_SECONDS);
  assert.equal(s.spools, 0);
  assert.equal(s.stats.yarn, 0, 'a spool is not a catch');
});

test('boxes: bigger boxes cost less per item, open into items that apply right away', () => {
  const per = G.BOXES.map((b) => G.boxSecs(b) / b.items / b.odds.reduce((a, p, c) => a + p * G.PART_VALUE[c], 0));
  for (let i = 1; i < per.length; i++) assert.ok(per[i] < per[i - 1], G.BOXES[i].id + ' is better value');
  const s = rich(1e15);
  G.buildFactory(s);
  assert.equal(G.buyBox(s, 0), null, 'store closed');
  Object.assign(s, { cat: true, goalIdx: 2, storeOpen: true });
  const before = s.pts, price = G.boxPrice(s, 3);
  const items = G.buyBox(s, 3);
  assert.equal(items.length, 8);
  assert.ok(items.every((it, i) => i === 0 || it.cls <= items[i - 1].cls), 'best first');
  assert.ok(items.every((it) => it.cls >= 1), 'a golden chest has no commons');
  assert.ok(s.pts >= before - price - 1, 'paid (crates may pay some back)');
  assert.equal(s.stats.boxes, 1);
  for (let i = 0; i < 30; i++) G.buyBox(s, 2);
  const kinds = new Set();
  for (let i = 0; i < 40; i++) G.buyBox(s, 1).forEach((it) => kinds.add(it.kind));
  assert.ok(kinds.has('part') && kinds.has('skin') && kinds.has('crate'), [...kinds].join());
  assert.ok(Object.values(s.parts).some((v) => v > 0));
  const t = G.deserialize(JSON.parse(JSON.stringify(G.serialize(s))));
  assert.deepEqual(t.parts, s.parts, 'upgrades survive a save');
});

test('box upgrades add to the worn skin bonus', () => {
  const s = rich(0);
  const plain = G.tapGain(s);
  s.parts.tap = 0.1;
  assert.ok(Math.abs(G.tapGain(s) / plain - 1.1) < 1e-9);
  s.skins.push('ginger');
  G.equipSkin(s, 'ginger');
  assert.ok(Math.abs(G.tapGain(s) / plain - 1.15) < 1e-9);
});

test('the code yumi unlocks every skin; unknown codes do nothing', () => {
  const s = rich(0);
  assert.equal(G.redeemCode(s, 'nope'), -1);
  assert.equal(G.redeemCode(s, ' YUMI '), G.SKINS.length - 1);
  assert.equal(s.skins.length, G.SKINS.length);
  assert.ok(G.SKINS.every((sk) => G.skinReleased(s, sk.id)));
  assert.equal(G.equipSkin(s, 'err'), true);
  assert.equal(G.redeemCode(s, 'yumi'), 0);
});

test('the broken legendary needs every legendary', () => {
  const s = rich(0);
  s.skins.push('ninelives', 'collector');
  assert.equal(G.releaseSkins(s).includes('err'), false);
  s.skins.push('goldenpaw');
  assert.equal(G.releaseSkins(s).includes('err'), true);
});

test('stats, feats and released skins survive a save; owned skins from old saves count as released', () => {
  const s = rich(1e6);
  for (let i = 0; i < 60; i++) G.tap(s, () => 1);
  G.markFeat(s, 'music');
  G.releaseSkins(s);
  const t = G.deserialize(JSON.parse(JSON.stringify(G.serialize(s))));
  assert.equal(t.stats.taps, 60);
  assert.deepEqual(t.feats, ['music']);
  assert.deepEqual(t.released, s.released);
  assert.deepEqual(t.fresh, s.fresh);
  const old = G.deserialize({ v: 1, cat: true, goalIdx: 2, storeOpen: true, skins: ['royal'], skin: 'royal' });
  assert.equal(old.skin, 'royal');
  assert.equal(G.skinReleased(old, 'royal'), true);
});

test('saved cosmetics are validated', () => {
  const s = G.deserialize({ v: 1, cat: true, goalIdx: 1, storeOpen: true, skins: ['ginger', 'hacked'], skin: 'royal', tracks: [], track: 'neon' });
  assert.deepEqual(s.skins, ['classic', 'ginger']);
  assert.equal(s.skin, 'classic', 'falls back when the saved skin is not owned');
  assert.deepEqual(s.tracks, ['silo']);
  assert.equal(s.track, 'silo');
  assert.equal(G.deserialize({ v: 1, storeOpen: true }).storeOpen, false, 'store needs goal 2');
  assert.equal(G.deserialize({ v: 1, cat: true, goalIdx: 1, storeOpen: true }).goalIdx, 2, 'older store saves move on to level 3');
  const old = G.deserialize({ v: 1, pts: 5 });
  assert.equal(old.skin, 'classic', 'saves from before the store still load');
});

test('the levels go ×10 from 1M to 10T; 100M opens underlings and later levels add +25% income', () => {
  assert.deepEqual(G.GOALS.map((g) => g.at), [1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13]);
  const s = Object.assign(rich(1e8), { cat: true, goalIdx: 2, storeOpen: true });
  s.facs.push(G.newFactory(0));
  s.crew = [{ name: 'Mochi', trait: 'hard', fav: 0, fac: 0, lvl: 1, xp: 0, subs: [] }];
  assert.equal(G.underlingsOn(s), false);
  assert.equal(G.checkGoal(s), 2);
  assert.equal(G.underlingsOn(s), true);
  assert.ok(s.subRecruit, 'the first underling waits');
  assert.equal(G.levelBonus(s), 1);
  s.pts = 1e9;
  assert.equal(G.checkGoal(s), 3);
  assert.equal(G.levelBonus(s), G.LEVEL_BONUS);
  for (let i = 4; i < G.GOALS.length; i++) { s.pts = G.GOALS[i].at; assert.equal(G.checkGoal(s), i); }
  assert.equal(G.finalGoalReached(s), true);
  assert.equal(G.checkGoal(s), -1, 'nothing after the last level');
  assert.ok(Math.abs(G.levelBonus(s) - Math.pow(G.LEVEL_BONUS, 5)) < 1e-9);
});

// A player who has just reached 10M, with the cat and `n` factories.
function crewGame(n = 1, seed = 1) {
  const s = Object.assign(rich(1e7), { cat: true, goalIdx: 1, seed });
  for (let i = 0; i < n; i++) s.facs.push(G.newFactory(i));
  assert.equal(G.checkGoal(s), 1);
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
  assert.deepEqual(G.kittenAt(s, 0), { ...recruit, fac: 0, lvl: 1, xp: 0, subs: [] });
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
  assert.deepEqual(Object.keys(old.crew[0]).sort(), ['fac', 'fav', 'lvl', 'name', 'subs', 'trait', 'xp'], 'needs are gone');
  assert.equal(old.crew[0].lvl, 1, 'kittens from before levels start at level 1');
  assert.deepEqual(G.deserialize({ v: 1, cat: true, goalIdx: 2, storeOpen: true, facs: [{}, {}], crew: [{ name: 'Mochi', fac: 1 }] }).crew, old.crew, 'the same kitten gets the same trait every time');
  const none = G.deserialize({ v: 1, cat: true, goalIdx: 2, storeOpen: true, facs: [{ kit: 3 }] });
  assert.equal(none.crew.length, 1, 'store saves from before the crew get the free kitten');
  assert.equal('kit' in none.facs[0], false, 'old kitten counts are dropped');
});

test('kittens earn XP by working and are promoted for points once the bar is full', () => {
  const s = crewGame(1), k = s.crew[0];
  assert.equal(G.kittenLevel(k), 1);
  assert.equal(G.canPromote(k), false);
  assert.equal(G.promoteKitten(s, 0), false, 'XP bar not full');
  G.step(s, G.XP_BASE * 10);
  assert.equal(k.xp, G.xpNeed(k), 'the bar stops at full');
  const before = G.kittenBoost(s, k, 0);
  s.pts = G.promoteCost(s, k) - 1;
  assert.equal(G.promoteKitten(s, 0), false, 'too expensive');
  s.pts = G.promoteCost(s, k);
  assert.equal(G.promoteKitten(s, 0), true);
  assert.equal(s.pts, 0);
  assert.equal(k.lvl, 2);
  assert.equal(k.xp, 0);
  assert.ok(Math.abs(G.kittenBoost(s, k, 0) / before - G.LEVEL_STEP) < 1e-9);
  assert.equal(G.xpNeed(k), G.XP_BASE * G.XP_GROW);
  assert.ok(G.promoteCost(s, k) >= G.PROMO_MIN);
});

test('milestone levels double the kitten, and the favourite factory and underlings speed up XP', () => {
  assert.ok(Math.abs(G.levelMult(5) / G.levelMult(4) - 2 * G.LEVEL_STEP) < 1e-9);
  assert.ok(Math.abs(G.levelMult(4) / G.levelMult(3) - G.LEVEL_STEP) < 1e-9);
  const k = { name: 'A', trait: 'hard', fav: 0, fac: 0, lvl: 1, xp: 0, subs: [] };
  assert.equal(G.xpRate(k), G.XP_FAV);
  assert.equal(G.xpRate({ ...k, fac: 1 }), 1);
  assert.equal(G.xpRate({ ...k, fac: 1, subs: [{ name: 'Bit', trait: 'gear' }] }), 1 + G.SUB_XP);
});

test('underlings: slots open at levels 5/10/15 after 100M; matching traits and full teams add more', () => {
  const s = crewGame(1), k = s.crew[0];
  Object.assign(s.facs[0], { lines: 4, turbo: 5 });
  k.lvl = 5;
  assert.equal(G.slots(s, k), 0, 'not before 100M');
  s.goalIdx = 3;
  s.subRecruit = { name: 'Bit', trait: k.trait === 'gear' ? 'hard' : 'gear' };
  assert.equal(G.slots(s, k), 1);
  s.pts = 1e15;
  const cost = G.subCost(s);
  assert.equal(G.hireSub(s, 0), true);
  assert.equal(s.pts, 1e15 - cost);
  assert.ok(G.subCost(s) > cost, 'each one costs more');
  assert.equal(G.hireSub(s, 0), false, 'no free slot');
  assert.ok(Math.abs(G.teamMult(k) - (1 + G.SUB_BONUS)) < 1e-9);
  k.subs = [0, 1, 2].map((i) => ({ name: 'S' + i, trait: k.trait }));
  assert.ok(Math.abs(G.teamMult(k) - (1 + 3 * G.SUB_MATCH) * G.TEAM_BONUS) < 1e-9, 'a full matching team');
  k.lvl = 15;
  assert.equal(G.slots(s, k), 3);
});

test('promotions and underlings are priced from the crew\'s average output, so moving a kitten does not change them', () => {
  const s = crewGame(3);
  s.pts = 1e15;
  G.hireKitten(s, 0);
  for (const f of s.facs) Object.assign(f, { lines: 4, turbo: 5 });
  G.syncCrew(s);
  const k = s.crew[0];
  const pace = G.crewPace(s), cost = G.promoteCost(s, k);
  assert.ok(Math.abs(cost - Math.ceil(Math.max(G.PROMO_MIN, G.PROMO_SECONDS * pace))) <= 1);
  G.moveKitten(s, 0, 1);
  assert.ok(Math.abs(G.crewPace(s) - pace) / pace < 0.5, 'roughly the same crew output');
  for (const c of G.CARE_STEPS) G.doCare(s, '2026-10-12', c);
  G.catchYarn(s);
  assert.ok(Math.abs(G.crewPace(s) - G.crewPace(Object.assign(structuredClone(s), { happy: 0, frenzy: 0 }))) < 1e-6, 'yarn and care time don\'t raise prices');
  k.lvl = 3;
  assert.ok(G.promoteCost(s, k) > G.promoteCost(s, { ...k, lvl: 1 }), 'higher levels cost a little more');
});

test('golden yarn: catching it makes all income ×5 for a minute', () => {
  const s = rich(0);
  s.own.auto = 10;
  assert.equal(G.catchYarn(s), false, 'not before the cat');
  s.cat = true;
  const before = G.income(s), click = G.tapGain(s);
  assert.equal(G.catchYarn(s), true);
  assert.ok(Math.abs(G.income(s) - before * G.FRENZY_MULT) < 1e-9);
  assert.ok(Math.abs(G.tapGain(s) - click * G.FRENZY_MULT) < 1e-9);
  G.step(s, G.FRENZY_SECONDS);
  G.step(s, 0.001);
  assert.ok(Math.abs(G.income(s) - before) < 1e-9, 'over after a minute');
});

test('levels, XP, teams and the frenzy survive a save; bad team data is repaired', () => {
  const s = crewGame(2);
  s.pts = s.best = s.total = 1e15;
  G.hireKitten(s, 0);
  s.goalIdx = 3;
  s.subRecruit = { name: 'Bit', trait: 'gear' };
  s.crew[0].lvl = 6;
  s.crew[0].xp = 12;
  G.hireSub(s, 0);
  G.catchYarn(s);
  const back = G.deserialize(JSON.parse(JSON.stringify(G.serialize(s))));
  assert.deepEqual(G.serialize(back), G.serialize(s));
  const data = JSON.parse(JSON.stringify(G.serialize(s)));
  data.crew[0].subs = [{ name: 'A', trait: 'gear' }, { name: 'B', trait: 'laser' }, { name: 'C', trait: 'hard' }];
  data.crew[0].lvl = 6;
  data.crew[0].xp = 1e9;
  data.frenzy = 1e9;
  const bad = G.deserialize(data);
  assert.deepEqual(bad.crew[0].subs.map((u) => u.name), ['A'], 'unknown traits dropped, only as many as the level allows');
  assert.equal(bad.crew[0].xp, G.xpNeed(bad.crew[0]), 'XP clamped to a full bar');
  assert.equal(bad.frenzy, G.FRENZY_SECONDS);
  assert.ok(!('gm' in G.serialize(s).facs[0]), 'derived values are not saved');
});
