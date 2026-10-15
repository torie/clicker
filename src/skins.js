// Pixel-art looks for the cat, drawn on a 16×16 grid as SVG rects. The catalog (names, classes, unlocks,
// bonuses) lives in src/wardrobe.js; each skin's `look` says how to draw it:
//   {legacy}            one of the hand-made skins from the first store (SKIN_LOOKS below)
//   {pal, pat}          a palette and a coat pattern (commons)
//   {..., acc, accColor, eye}  plus accessories and an eye colour (rares, epics)
//   {fx}                a material or legendary look, often animated (epics sparkle; CSS in styles.css)
import { skinById, PALETTES } from './wardrobe.js';

const GROUND = '#070A08';
const WHITE = '#F2F7F3';

// The cat's shape, shared by every skin: [x, y, w, h, part]. The face is drawn after the coat pattern.
const BODY = [
  [4, 2, 2, 2, 'body'], [10, 2, 2, 2, 'body'],           // ears
  [3, 4, 10, 6, 'body'],                                   // head
  [4, 10, 8, 5, 'body'],                                   // body
  [12, 11, 2, 2, 'body'], [13, 8, 2, 4, 'body'],           // tail
  [4, 15, 3, 1, 'feet'], [9, 15, 3, 1, 'feet'],            // feet
  [1, 10, 3, 2, 'paw']                                     // the tapping paw
];
const FACE = [[5, 6, 2, 2, 'eye'], [9, 6, 2, 2, 'eye'], [7, 8, 2, 1, 'nose']];

export const SKIN_LOOKS = {
  classic: { body: '#FFD479', glow: 'rgba(255,190,80,.55)' },
  ginger: {
    body: '#FF9F43', glow: 'rgba(255,140,50,.55)',
    extra: [[6, 4, 1, 2, '#B85A14'], [9, 4, 1, 2, '#B85A14'], [4, 11, 2, 1, '#B85A14'], [10, 12, 2, 1, '#B85A14'], [13, 8, 2, 1, '#B85A14']]
  },
  snow: {
    body: WHITE, nose: '#FF8FB1', glow: 'rgba(220,255,235,.5)',
    extra: [[5, 3, 1, 1, '#FF8FB1'], [10, 3, 1, 1, '#FF8FB1']]
  },
  midnight: { body: '#2E3444', eye: '#39FF6A', nose: '#56607A', glow: 'rgba(57,255,106,.55)' },
  tuxedo: {
    body: '#1E2230', feet: WHITE, paw: WHITE, eye: '#FFE66B', nose: WHITE, glow: 'rgba(242,247,243,.45)',
    extra: [[6, 11, 4, 4, WHITE], [6, 10, 1, 1, '#FF5A5A'], [7, 10, 2, 1, '#C73E3E'], [9, 10, 1, 1, '#FF5A5A']]
  },
  royal: {
    body: '#FFF1C9', glow: 'rgba(255,214,64,.7)',
    extra: [[6, 1, 1, 2, '#FFB300'], [9, 1, 1, 2, '#FFB300'], [7, 0, 2, 3, '#FFB300'], [6, 3, 4, 1, '#FFB300'], [7, 3, 2, 1, '#FF5A5A']]
  }
};

const light = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16) > 600;
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

// Coat patterns, in the palette's shade (or white, where the body is dark enough to show it).
function pattern(pat, body, shade) {
  const pale = light(body) ? shade : WHITE;
  switch (pat) {
    case 1: return [[6, 4, 1, 2], [9, 4, 1, 2], [4, 11, 2, 1], [10, 12, 2, 1], [13, 8, 2, 1], [5, 13, 2, 1]].map((r) => [...r, shade]);
    case 2: return {feet: pale, paw: pale};
    case 3: return [[3, 6, 2, 2], [7, 6, 2, 1], [11, 6, 2, 2], [4, 5, 8, 1]].map((r) => [...r, shade]);
    case 4: return [[3, 4, 3, 2, shade], [10, 10, 2, 3, '#FF9F43'], [5, 12, 3, 2, shade], [11, 4, 2, 2, '#FF9F43']];
    case 5: return [[4, 4, 1, 1], [11, 8, 1, 1], [5, 11, 1, 1], [8, 13, 1, 1], [10, 11, 1, 1], [12, 5, 1, 1], [14, 9, 1, 1]].map((r) => [...r, shade]);
    case 6: return [[6, 11, 4, 4, pale], [6, 9, 4, 1, pale]];
    case 7: return [[4, 2, 2, 1], [10, 2, 2, 1], [13, 8, 2, 1], [4, 15, 3, 1], [9, 15, 3, 1]].map((r) => [...r, shade]);
    case 8: return [[4, 10, 8, 2], [3, 4, 10, 1], [13, 8, 2, 2]].map((r) => [...r, shade]);
    case 9: return [[4, 2, 2, 2], [10, 2, 2, 2], [6, 7, 4, 2], [13, 8, 2, 4], [4, 15, 3, 1], [9, 15, 3, 1]].map((r) => [...r, shade]);
    default: return [];
  }
}

// Accessories: pixel rects; `c` is the skin's accent colour.
const DARK = '#22252B', YEL = '#FFE66B', RED = '#C73E3E', GREY = '#9AA3A0';
function accessory(id, c) {
  switch (id) {
    case 'bow': return [[9, 1, 2, 2, c], [12, 1, 2, 2, c], [11, 2, 1, 1, YEL]];
    case 'bell': return [[4, 10, 8, 1, c], [7, 11, 2, 1, YEL]];
    case 'bandana': return [[4, 10, 8, 1, c], [6, 11, 4, 1, c], [7, 12, 2, 1, c]];
    case 'glasses': return [[4, 6, 1, 2, c], [7, 6, 2, 1, c], [11, 6, 1, 2, c], [5, 5, 2, 1, c], [9, 5, 2, 1, c]];
    case 'shades': return [[4, 6, 8, 1, DARK], [5, 7, 2, 1, DARK], [9, 7, 2, 1, DARK], [5, 6, 2, 1, '#3E4A5C'], [9, 6, 2, 1, '#3E4A5C']];
    case 'beanie': return [[4, 1, 8, 2, c], [4, 3, 8, 1, WHITE], [7, 0, 2, 1, WHITE]];
    case 'flower': return [[11, 1, 1, 1, c], [10, 2, 1, 1, c], [12, 2, 1, 1, c], [11, 3, 1, 1, c], [11, 2, 1, 1, YEL]];
    case 'bowtie': return [[6, 10, 1, 2, c], [9, 10, 1, 2, c], [7, 10, 2, 1, c]];
    case 'scarf': return [[3, 9, 10, 2, c], [10, 11, 2, 3, c], [10, 13, 2, 1, WHITE]];
    case 'phones': return [[4, 1, 8, 1, DARK], [3, 2, 1, 2, DARK], [12, 2, 1, 2, DARK], [2, 4, 2, 3, c], [12, 4, 2, 3, c]];
    case 'party': return [[7, 0, 2, 1, YEL], [7, 1, 2, 1, c], [6, 2, 4, 1, c], [6, 3, 4, 1, WHITE]];
    case 'star': return [[6, 12, 1, 1, YEL], [5, 13, 3, 1, YEL], [6, 14, 1, 1, YEL]];
    case 'wizard': return [[8, 0, 1, 1, c], [7, 1, 2, 1, c], [6, 2, 4, 1, c], [4, 3, 8, 1, c], [7, 2, 1, 1, YEL]];
    case 'witch': return [[9, 0, 1, 1, DARK], [8, 1, 2, 1, DARK], [6, 2, 4, 1, DARK], [3, 3, 10, 1, DARK], [6, 2, 4, 1, '#8E4F86']];
    case 'halo': return [[5, 0, 6, 1, YEL]];
    case 'wings': return [[0, 5, 3, 1, WHITE], [0, 6, 2, 2, WHITE], [13, 5, 3, 1, WHITE], [14, 6, 2, 2, WHITE]];
    case 'horns': return [[4, 1, 1, 2, RED], [3, 0, 1, 1, RED], [11, 1, 1, 2, RED], [12, 0, 1, 1, RED]];
    case 'tailtip': return [[13, 7, 2, 1, RED], [14, 6, 1, 1, RED]];
    case 'patch': return [[4, 5, 8, 1, DARK], [9, 6, 2, 2, DARK]];
    case 'deerstalker': return [[4, 2, 8, 2, '#8B6B3C'], [3, 3, 10, 1, '#6B4F2A'], [5, 2, 1, 1, '#6B4F2A'], [10, 2, 1, 1, '#6B4F2A']];
    case 'pipe': return [[10, 9, 2, 1, '#5A3520'], [12, 8, 1, 2, '#5A3520']];
    case 'chef': return [[5, 0, 6, 3, WHITE], [5, 3, 6, 1, '#C8D0CB']];
    case 'ninja': return [[3, 5, 10, 1, DARK], [3, 8, 10, 2, DARK], [13, 5, 2, 1, RED], [14, 6, 1, 2, RED]];
    case 'viking': return [[4, 3, 8, 1, GREY], [5, 2, 6, 1, GREY], [3, 1, 1, 2, WHITE], [12, 1, 1, 2, WHITE]];
    case 'beard': return [[5, 9, 6, 2, '#C0582E'], [6, 11, 4, 1, '#C0582E']];
    case 'clownnose': return [[7, 8, 2, 1, '#FF3B3B']];
    case 'sailor': return [[5, 2, 6, 2, WHITE], [5, 3, 6, 1, '#3E6FC9']];
    case 'cowboy': return [[2, 3, 12, 1, '#8B5A3C'], [5, 1, 6, 2, '#8B5A3C'], [5, 2, 6, 1, '#5A3520']];
    case 'beret': return [[4, 2, 8, 2, RED], [10, 1, 2, 1, RED]];
    case 'tophat': return [[5, 0, 6, 3, DARK], [5, 2, 6, 1, c], [4, 3, 8, 1, DARK]];
    case 'monocle': return [[8, 5, 4, 1, YEL], [8, 8, 4, 1, YEL], [8, 6, 1, 2, YEL], [11, 6, 1, 2, YEL], [11, 9, 1, 3, YEL]];
    case 'mustache': return [[5, 9, 2, 1, DARK], [9, 9, 2, 1, DARK], [7, 9, 2, 1, DARK]];
    case 'cape': return [[3, 10, 1, 5, c], [12, 10, 1, 4, c], [4, 10, 8, 1, c]];
    case 'mask': return [[3, 6, 2, 1, c], [7, 6, 2, 1, c], [11, 6, 2, 1, c], [4, 5, 8, 1, c]];
    default: return [];
  }
}

// Mythic and legendary looks: colours, extra rects and an animation class.
const FX = {
  sparkle: { sparks: [[0, 1, YEL], [15, 3, WHITE], [1, 14, '#C77DFF']] },
  gold: { body: '#FFC93C', shade: '#B8860B', eye: '#7A4E00', glow: 'rgba(255,201,60,.8)', extra: [[5, 4, 1, 1, '#FFF3B0'], [6, 10, 1, 3, '#FFF3B0'], [14, 8, 1, 2, '#FFF3B0']], sparks: [[0, 2, YEL], [15, 1, WHITE], [15, 14, YEL]] },
  ghost: { body: '#DDE8FF', eye: '#5A6B9A', nose: '#9AA8D0', glow: 'rgba(200,220,255,.7)', extra: [[4, 15, 1, 1, GROUND], [7, 14, 2, 1, '#DDE8FF']] },
  crystal: { body: '#9CF0FF', shade: '#4FB6D8', eye: '#1A4E70', glow: 'rgba(120,230,255,.8)', extra: [[4, 4, 2, 1, WHITE], [9, 11, 2, 2, '#4FB6D8'], [6, 12, 1, 2, WHITE], [11, 4, 1, 1, WHITE], [13, 9, 1, 2, WHITE]], sparks: [[1, 1, WHITE], [15, 6, '#9CF0FF'], [0, 13, WHITE]] },
  magma: { body: '#3A1A12', eye: '#FFB000', nose: '#FF7A1A', glow: 'rgba(255,110,30,.8)', pulse: [[5, 4, 1, 2, '#FF7A1A'], [10, 5, 1, 1, '#FF7A1A'], [6, 11, 3, 1, '#FF7A1A'], [8, 12, 1, 2, '#FF7A1A'], [13, 9, 1, 2, '#FF7A1A'], [4, 13, 2, 1, '#FF7A1A']] },
  galaxy: { body: '#1B1640', eye: '#C77DFF', nose: '#5CC8FF', glow: 'rgba(160,110,255,.8)', sparks: [[5, 4, WHITE], [11, 5, YEL], [6, 12, '#5CC8FF'], [9, 11, WHITE], [13, 9, '#FF8FB1'], [4, 9, YEL], [10, 13, WHITE]] },
  neon: { body: '#0B2A14', eye: '#39FF6A', nose: '#39FF6A', glow: 'rgba(57,255,106,.9)', pulse: [[3, 4, 10, 1, '#39FF6A'], [3, 4, 1, 6, '#39FF6A'], [12, 4, 1, 6, '#39FF6A'], [4, 14, 8, 1, '#39FF6A'], [4, 10, 1, 5, '#39FF6A'], [11, 10, 1, 5, '#39FF6A'], [4, 2, 2, 1, '#39FF6A'], [10, 2, 2, 1, '#39FF6A']] },
  shadow: { body: '#0D0F12', eye: '#FF3B3B', nose: '#2A2D35', glow: 'rgba(255,40,40,.7)', extra: [[3, 9, 10, 1, '#16191E']] },
  mecha: { body: '#9AA3A0', shade: '#5E6663', eye: '#5CC8FF', nose: '#5E6663', glow: 'rgba(92,200,255,.7)', extra: [[7, 0, 1, 2, '#5E6663'], [7, 0, 2, 1, '#FF3B3B'], [4, 6, 8, 1, '#5E6663'], [5, 11, 1, 1, YEL], [10, 11, 1, 1, YEL], [5, 13, 1, 1, YEL], [10, 13, 1, 1, YEL], [6, 12, 4, 2, '#5E6663']] },
  ninelives: { body: '#C9B6E4', eye: '#5A2C55', glow: 'rgba(201,182,228,.9)', extra: [[5, 0, 6, 1, YEL], [14, 5, 1, 3, '#C9B6E4'], [15, 4, 1, 2, '#C9B6E4'], [12, 6, 1, 2, '#8E7AB0'], [0, 7, 1, 2, '#C9B6E4']], sparks: [[1, 1, '#C77DFF'], [15, 1, '#C77DFF'], [15, 13, '#C77DFF']] },
  collector: { body: '#FFF1C9', eye: '#3E4A5C', glow: 'rgba(255,214,64,.8)', extra: [[6, 1, 1, 2, '#FFB300'], [9, 1, 1, 2, '#FFB300'], [7, 0, 2, 3, '#FFB300'], [6, 3, 4, 1, '#FFB300'], [7, 3, 2, 1, '#5CC8FF'], [4, 10, 8, 1, '#FF5A5A'], [7, 11, 2, 1, YEL]] },
  goldenpaw: { body: '#FFC93C', shade: '#B8860B', eye: '#7A4E00', paw: YEL, glow: 'rgba(255,220,80,.9)', extra: [[0, 9, 4, 1, YEL], [0, 12, 3, 1, YEL], [5, 4, 1, 1, '#FFF3B0'], [4, 10, 8, 1, '#B8860B']], sparks: [[0, 1, WHITE], [15, 2, YEL], [15, 14, WHITE], [3, 0, YEL]] },
  err: { body: '#FF3BD4', eye: WHITE, nose: '#3BF0FF', glow: 'rgba(255,59,212,.9)', extra: [[3, 6, 10, 1, '#3BF0FF'], [11, 11, 3, 1, '#3BF0FF'], [2, 12, 3, 1, '#FF3BD4'], [13, 3, 2, 1, '#3BF0FF'], [0, 8, 2, 1, WHITE]] }
};

const rect = ([x, y, w, h, fill], cls = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${cls ? ` class="${cls}"` : ''}/>`;

/** Colours, extra rects and animation for a skin. */
function resolve(skinId) {
  const sk = skinById.get(skinId);
  const look = (sk && sk.look) || { legacy: 'classic' };
  if (look.legacy) return { ...SKIN_LOOKS[look.legacy], fxName: '' };
  const out = { extra: [], over: [], fxName: look.fx || '' };
  if (look.pal != null) {
    const [, body, shade] = PALETTES[look.pal];
    const pat = pattern(look.pat, body, shade);
    Object.assign(out, { body, glow: rgba(body, 0.5) }, Array.isArray(pat) ? {} : pat);
    if (Array.isArray(pat)) out.extra.push(...pat);
    if (look.eye) out.eye = look.eye;
    for (const a of look.acc || []) out.over.push(...accessory(a, look.accColor));
  }
  const fx = FX[look.fx];
  if (fx) {
    const { extra = [], ...rest } = fx;
    Object.assign(out, rest);
    out.over.push(...extra);
  }
  return out;
}

/** SVG markup for the cat in a given skin. `ground` is the colour cut-outs (eyes, nose) fall back to. */
export function catSvg(skinId, ground = GROUND) {
  const look = resolve(skinId);
  const color = (part) => look[part] || (part === 'eye' || part === 'nose' ? ground : look.body);
  const part = ([x, y, w, h, p]) => rect([x, y, w, h, color(p)], p === 'paw' ? 'paw' : p === 'eye' ? 'eye' : '');
  // Coat patterns go under the face; accessories and material details go over it.
  const rects = [...BODY.map(part), ...(look.extra || []).map((r) => rect(r)), ...FACE.map(part), ...(look.over || []).map((r) => rect(r))];
  for (const r of look.pulse || []) rects.push(rect(r, 'pulse'));
  (look.sparks || []).forEach(([x, y, fill], i) => rects.push(rect([x, y, 1, 1, fill], 'spark s' + (i % 3))));
  const cls = look.fxName ? ` class="fx fx-${look.fxName}"` : '';
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"${cls}>${rects.join('')}</svg>`;
}

export const skinGlow = (skinId) => resolve(skinId).glow || 'rgba(255,190,80,.55)';
