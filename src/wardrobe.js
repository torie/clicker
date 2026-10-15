// The skin catalog: 182 cat skins in six classes, from 100 commons down to one broken legendary. Pure data,
// no DOM. game.js decides when a skin is released (its unlock condition is met), what it costs and what its
// bonus does; src/skins.js draws it from `look`.
//
// Most skins come from stat tracks (taps, play time, yarn caught...): each track has a ladder of thresholds,
// and the higher rungs belong to higher classes. The rest are feats (one-off things, such as buying
// extensions in a certain order) and hand-made legendaries.

export const CLASSES = [
  {id: 'common', name: 'Common', count: 100, value: 0.05, secs: 15, floor: 25e3},
  {id: 'rare', name: 'Rare', count: 50, value: 0.25, secs: 60, floor: 250e3},
  {id: 'epic', name: 'Epic', count: 20, value: 0.5, secs: 240, floor: 2.5e6},
  {id: 'mythic', name: 'Mythic', count: 8, value: 1, secs: 600, floor: 25e6},
  {id: 'legendary', name: 'Legendary', count: 3, value: 2, secs: 1200, floor: 250e6},
  {id: 'broken', name: 'Broken legendary', count: 1, value: 3, secs: 2400, floor: 1e9}
];

// What a bonus does while the skin is worn. `half`: worth half as much per class, since it boosts everything.
export const BONUSES = {
  tap: {label: 'taps'},
  cat: {label: 'cat clicks'},
  factory: {label: 'factories'},
  luck: {label: 'lucky clicks'},
  yarn: {label: 'golden yarn time'},
  away: {label: 'earnings while away'},
  xp: {label: 'kitten XP'},
  all: {label: 'all income', half: true}
};

const N = (n) => n.toLocaleString('en-US');
const short = (n) => (n >= 1e12 ? n / 1e12 + 'T' : n >= 1e9 ? n / 1e9 + 'B' : n >= 1e6 ? n / 1e6 + 'M' : n >= 1e4 ? n / 1e3 + 'K' : N(n));
const times = (n, one, many) => (n === 1 ? one : many.replace('#', N(n)));
const mins = (m) => (m < 60 ? m + ' minutes' : m === 60 ? '1 hour' : m / 60 + ' hours');

// Stat tracks (only the class values above are scaled per rung: commons go from +5% to +10% up their ladder).
// Each track: the stat (see `statValue` in game.js), how a rung reads, the bonus its skins give, and the
// rungs per class [common, rare, epic, mythic].
export const STAT_TRACKS = [
  {k: 'taps', bonus: 'tap', text: (n) => `Tap ${N(n)} times`, tiers: [[50, 150, 300, 600, 1000, 1500, 2500, 4000], [6000, 9000, 14000], [25000], [60000]]},
  {k: 'play', bonus: 'all', text: (n) => `Play for ${mins(n)}`, tiers: [[3, 6, 10, 15, 20, 30, 45], [60, 90, 120], [240], [600]]},
  {k: 'earned', bonus: 'all', text: (n) => `Earn ${short(n)} in total`, tiers: [[1e3, 1e4, 1e5, 1e6, 1e7], [1e8, 1e9, 1e10], [1e12]]},
  {k: 'lucky', bonus: 'luck', text: (n) => times(n, 'Land a lucky click', 'Land # lucky clicks'), tiers: [[1, 5, 15, 30, 60, 100], [200, 400, 700], [1500]]},
  {k: 'collects', bonus: 'factory', text: (n) => times(n, 'Collect from a silo', 'Collect from silos # times'), tiers: [[1, 5, 10, 20, 35, 50, 75], [120, 200, 300], [500]]},
  {k: 'upg', bonus: 'tap', text: (n) => times(n, 'Buy an upgrade', 'Buy # upgrades'), tiers: [[1, 3, 6, 10, 15, 20, 25], [35, 50, 70], [100]]},
  {k: 'fac', bonus: 'factory', text: (n) => times(n, 'Build a factory', 'Build # factories'), tiers: [[1, 2, 3, 4, 5]]},
  {k: 'ext', bonus: 'factory', text: (n) => times(n, 'Buy a factory extension', 'Buy # factory extensions'), tiers: [[1, 3, 6, 10, 15, 20, 25], [35, 50, 70], [100]]},
  {k: 'yarn', bonus: 'yarn', text: (n) => times(n, 'Catch a golden yarn', 'Catch # golden yarns'), tiers: [[1, 2, 3, 5, 8], [12, 18, 25], [40], [100]]},
  {k: 'ftaps', bonus: 'yarn', text: (n) => `Tap ${N(n)} times during golden yarn`, tiers: [[25, 100, 250], [600], [1500]]},
  {k: 'care', bonus: 'xp', text: (n) => times(n, 'Do a care time step', 'Do # care time steps'), tiers: [[1, 3], [9, 21]]},
  {k: 'happy', bonus: 'xp', text: (n) => times(n, 'Finish care time', 'Finish care time on # days'), tiers: [[1], [3, 7], [14], [30]]},
  {k: 'streak', bonus: 'all', text: (n) => `Finish care time ${n} days in a row`, tiers: [[], [3], [5]]},
  {k: 'hires', bonus: 'factory', text: (n) => times(n, 'Get a kitten', 'Have # kittens'), tiers: [[1, 2, 3, 4, 5]]},
  {k: 'promos', bonus: 'xp', text: (n) => times(n, 'Promote a kitten', 'Promote kittens # times'), tiers: [[1, 3, 6, 10, 15, 20], [30, 45, 60], [100]]},
  {k: 'maxLvl', bonus: 'xp', text: (n) => `Get a kitten to level ${n}`, tiers: [[3, 5], [10, 15], [20], [30]]},
  {k: 'subs', bonus: 'factory', text: (n) => times(n, 'Hire an underling', 'Hire # underlings'), tiers: [[1, 2, 3, 5], [8, 11, 14], [15]]},
  {k: 'moves', bonus: 'factory', text: (n) => times(n, 'Move a kitten', 'Move kittens # times'), tiers: [[1, 3, 10], [25]]},
  {k: 'owned', bonus: 'all', text: (n) => `Own ${n} skins`, tiers: [[3, 6, 10, 15, 20], [30, 45, 60], [80]]},
  {k: 'back', bonus: 'away', text: (n) => times(n, 'Come back after a break', 'Come back after a break # times'), tiers: [[1, 3, 6, 10], [20, 35], [60]]},
  {k: 'tracks', bonus: 'cat', text: (n) => times(n, 'Buy a jukebox track', 'Buy # jukebox tracks'), tiers: [[1, 2, 3]]},
  {k: 'level', bonus: 'all', text: (n) => `Complete LEVEL ${n}`, tiers: [[1, 2, 3], [4, 5, 6], [7], [8]]}
];

// One-off feats. `hint` is what the store shows before it's done.
export const FEATS = [
  {id: 'music', cls: 0, bonus: 'cat', text: 'Turn the music on'},
  {id: 'combo', cls: 1, bonus: 'factory', text: 'In one factory, buy Turbo press, Assembly line, Bigger silo in that order'},
  {id: 'lucky2', cls: 1, bonus: 'luck', text: 'Land two lucky clicks in a row'},
  {id: 'night', cls: 1, bonus: 'away', text: 'Play between midnight and 5 am'},
  {id: 'stairs', cls: 2, bonus: 'factory', text: 'Buy an extension in factory #1, #2, #3, #4, #5, in that order'},
  {id: 'frenzy', cls: 2, bonus: 'yarn', text: 'Tap 150 times during one golden yarn'},
  {id: 'team', cls: 2, bonus: 'factory', text: 'Give a kitten three underlings that share its trait'},
  {id: 'lucky3', cls: 3, bonus: 'luck', text: 'Land three lucky clicks in a row'},
  {id: 'yarn10', cls: 3, bonus: 'yarn', text: 'Catch 10 golden yarns in a row without missing one'}
];

// Looks. Commons and rares are built from a palette, a coat pattern and (rares) an accessory.
export const PALETTES = [
  ['Amber', '#FFD479', '#C99A3C'], ['Ginger', '#FF9F43', '#B85A14'], ['Snow', '#F2F7F3', '#B8C4BC'], ['Ash', '#9AA3A0', '#5E6663'],
  ['Cocoa', '#8B5A3C', '#5A3520'], ['Smoke', '#5E6675', '#383E4A'], ['Peach', '#FFC09A', '#D9875E'], ['Lilac', '#C9B6E4', '#8E7AB0'],
  ['Mint', '#A8F0C6', '#5EB88A'], ['Sky', '#9CD3FF', '#5A93C9'], ['Rose', '#FF9FC0', '#C4607F'], ['Lemon', '#FFF07A', '#C2B23C'],
  ['Moss', '#7FA35A', '#4E6B33'], ['Rust', '#C0582E', '#7E3418'], ['Slate', '#3E4A5C', '#242C38'], ['Sand', '#E3C99A', '#A88B5C'],
  ['Coral', '#FF7F6B', '#B8473A'], ['Jet', '#2A2D35', '#101114'], ['Teal', '#4FC8C0', '#2A7E78'], ['Plum', '#8E4F86', '#5A2C55']
];
export const PATTERNS = ['Kitty', 'Tabby', 'Socks', 'Bandit', 'Calico', 'Spotty', 'Belly', 'Tips', 'Saddle', 'Point'];
export const ACCESSORIES = [
  ['bow', 'Bow'], ['bell', 'Bell'], ['bandana', 'Bandana'], ['glasses', 'Nerdy'], ['beanie', 'Beanie'],
  ['flower', 'Flower'], ['bowtie', 'Dapper'], ['scarf', 'Cozy'], ['phones', 'Groovy'], ['party', 'Party']
];
const ACC_COLORS = ['#FF5A5A', '#5CC8FF', '#FFE66B', '#C77DFF', '#39FF6A', '#FF8FB1'];

// Epics: hand-picked outfits [id, name, palette, pattern, accessories, eye colour]. Royal is from the first store.
const EPICS = [
  ['royal', 'Royal', null, 0, [], null], ['wizard', 'Wizard', 9, 0, ['wizard', 'star'], '#FFE66B'],
  ['pirate', 'Pirate', 13, 1, ['patch', 'bandana'], null], ['professor', 'Professor', 3, 6, ['glasses', 'bowtie'], null],
  ['rockstar', 'Rockstar', 17, 0, ['phones', 'star'], '#FF5A5A'], ['angel', 'Angel', 2, 0, ['halo', 'wings'], '#5CC8FF'],
  ['imp', 'Imp', 16, 7, ['horns', 'tailtip'], '#FFE66B'], ['detective', 'Detective', 15, 3, ['deerstalker', 'pipe'], null],
  ['chef', 'Chef', 2, 2, ['chef', 'scarf'], null], ['ninja', 'Ninja', 17, 0, ['ninja'], '#FF5A5A'],
  ['viking', 'Viking', 1, 1, ['viking', 'beard'], null], ['clown', 'Clown', 2, 5, ['party', 'clownnose'], null],
  ['sailor', 'Sailor', 9, 6, ['sailor', 'scarf'], null], ['cowboy', 'Cowboy', 4, 4, ['cowboy', 'bandana'], null],
  ['painter', 'Painter', 7, 5, ['beret', 'scarf'], null], ['dj', 'DJ', 14, 8, ['phones', 'shades'], null],
  ['gentleman', 'Gentleman', 5, 2, ['tophat', 'monocle', 'mustache'], null], ['witch', 'Witch', 17, 7, ['witch', 'star'], '#39FF6A'],
  ['hero', 'Hero', 9, 6, ['cape', 'mask'], null], ['baron', 'Baron', 19, 2, ['tophat', 'bowtie'], '#FFE66B']
];
// Mythics: materials that move.
const MYTHICS = [['gold', 'Golden Idol'], ['ghost', 'Ghost'], ['crystal', 'Crystal'], ['magma', 'Magma'],
  ['galaxy', 'Galaxy'], ['neon', 'Neon'], ['shadow', 'Shadow'], ['mecha', 'Mecha']];

/** Builds the catalog. Each skin: {id, cls, name, cond, bonus: [{type, value}], look}. */
function build() {
  const byClass = CLASSES.map(() => []);
  // Track rungs, in track order, then feats.
  for (const tr of STAT_TRACKS) {
    tr.tiers.forEach((rungs, c) => rungs.forEach((at, j) => {
      const v = CLASSES[c].value * (c === 0 ? 1 + j / Math.max(1, rungs.length - 1) : 1) * (BONUSES[tr.bonus].half ? 0.5 : 1);
      byClass[c].push({id: tr.k + '-' + at, cond: {k: tr.k, at}, text: tr.text(at), bonus: [{type: tr.bonus, value: v}]});
    }));
  }
  for (const f of FEATS) byClass[f.cls].push({id: f.id, cond: {f: f.id}, text: f.text, bonus: [{type: f.bonus, value: CLASSES[f.cls].value * (f.cls === 0 ? 2 : 1) * (BONUSES[f.bonus].half ? 0.5 : 1)}]});
  byClass[4].push(
    {id: 'ninelives', name: 'Nine Lives', cond: {k: 'streak', at: 9}, text: 'Finish care time 9 days in a row',
      bonus: [{type: 'all', value: 1}, {type: 'away', value: 2}], look: {fx: 'ninelives'}},
    {id: 'collector', name: 'The Collector', cond: {k: 'owned', at: 100}, text: 'Own 100 skins',
      bonus: [{type: 'all', value: 1}, {type: 'cat', value: 2}], look: {fx: 'collector'}},
    {id: 'goldenpaw', name: 'Golden Paw', cond: {k: 'yarn', at: 200}, text: 'Catch 200 golden yarns',
      bonus: [{type: 'all', value: 1}, {type: 'yarn', value: 2}], look: {fx: 'goldenpaw'}});
  byClass[5].push({id: 'err', name: 'ERR_CAT', cond: {skins: ['ninelives', 'collector', 'goldenpaw']}, text: 'Own every legendary skin',
    secret: true, bonus: [{type: 'all', value: 3}, {type: 'yarn', value: 1}, {type: 'away', value: 3}], look: {fx: 'err'}});

  // The free classic skin and the first store's skins keep their ids, so saves that own them keep them.
  const common = byClass[0];
  common.unshift({id: 'classic', name: 'Classic', cond: null, text: 'Yours from the start', bonus: [], look: {legacy: 'classic'}});
  [['ginger', 'Ginger tabby'], ['snow', 'Snowball'], ['midnight', 'Midnight']].forEach(([id, name], j) => {
    Object.assign(common[j + 1], {id, name, look: {legacy: id}});
  });
  let n = 0;
  for (const sk of common) {
    if (sk.look) continue;
    const pal = n % 20, pat = (Math.floor(n / 20) + 3 * pal) % 10; // every (palette, pattern) pair at most once
    sk.name = PALETTES[pal][0] + ' ' + PATTERNS[pat];
    sk.look = {pal, pat};
    n++;
  }
  byClass[1].forEach((sk, i) => {
    if (i === 0) { Object.assign(sk, {id: 'tuxedo', name: 'Tuxedo', look: {legacy: 'tuxedo'}}); return; }
    const pal = (i * 7) % 20, acc = (pal + 3 * Math.floor(i / 20)) % 10, pat = (i * 3) % 10;
    sk.name = ACCESSORIES[acc][1] + ' ' + PALETTES[pal][0];
    sk.look = {pal, pat, acc: [ACCESSORIES[acc][0]], accColor: ACC_COLORS[i % ACC_COLORS.length]};
  });
  byClass[2].forEach((sk, i) => {
    const [id, name, pal, pat, acc, eye] = EPICS[i];
    Object.assign(sk, {name, look: id === 'royal' ? {legacy: 'royal'} : {pal, pat, acc, eye, accColor: ACC_COLORS[i % ACC_COLORS.length], fx: 'sparkle'}});
    if (id === 'royal') sk.id = 'royal';
  });
  byClass[3].forEach((sk, i) => Object.assign(sk, {name: MYTHICS[i][1], look: {fx: MYTHICS[i][0]}}));

  const all = [];
  byClass.forEach((list, c) => {
    if (list.length !== CLASSES[c].count) throw new Error(`${CLASSES[c].id}: ${list.length} skins, expected ${CLASSES[c].count}`);
    for (const sk of list) all.push({...sk, cls: c});
  });
  return all;
}

export const CATALOG = build();
export const skinById = new Map(CATALOG.map((sk) => [sk.id, sk]));
