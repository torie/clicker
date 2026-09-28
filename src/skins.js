// Pixel-art looks for the cat, drawn on a 16×16 grid as SVG rects. Prices and names live in game.js (SKINS).

const GROUND = '#070A08';

// The cat's shape, shared by every skin: [x, y, w, h, part]
const SHAPE = [
  [4, 2, 2, 2, 'body'], [10, 2, 2, 2, 'body'],           // ears
  [3, 4, 10, 6, 'body'],                                   // head
  [4, 10, 8, 5, 'body'],                                   // body
  [12, 11, 2, 2, 'body'], [13, 8, 2, 4, 'body'],           // tail
  [4, 15, 3, 1, 'feet'], [9, 15, 3, 1, 'feet'],            // feet
  [1, 10, 3, 2, 'paw'],                                    // the tapping paw
  [5, 6, 2, 2, 'eye'], [9, 6, 2, 2, 'eye'],
  [7, 8, 2, 1, 'nose']
];

export const SKIN_LOOKS = {
  classic: { body: '#FFD479', glow: 'rgba(255,190,80,.55)' },
  ginger: {
    body: '#FF9F43', glow: 'rgba(255,140,50,.55)',
    extra: [[6, 4, 1, 2, '#B85A14'], [9, 4, 1, 2, '#B85A14'], [4, 11, 2, 1, '#B85A14'], [10, 12, 2, 1, '#B85A14'], [13, 8, 2, 1, '#B85A14']]
  },
  snow: {
    body: '#F2F7F3', nose: '#FF8FB1', glow: 'rgba(220,255,235,.5)',
    extra: [[5, 3, 1, 1, '#FF8FB1'], [10, 3, 1, 1, '#FF8FB1']]
  },
  midnight: { body: '#2E3444', eye: '#39FF6A', nose: '#56607A', glow: 'rgba(57,255,106,.55)' },
  tuxedo: {
    body: '#1E2230', feet: '#F2F7F3', paw: '#F2F7F3', eye: '#FFE66B', nose: '#F2F7F3', glow: 'rgba(242,247,243,.45)',
    extra: [[6, 11, 4, 4, '#F2F7F3'], [6, 10, 1, 1, '#FF5A5A'], [7, 10, 2, 1, '#C73E3E'], [9, 10, 1, 1, '#FF5A5A']]
  },
  royal: {
    body: '#FFF1C9', glow: 'rgba(255,214,64,.7)',
    extra: [[6, 1, 1, 2, '#FFB300'], [9, 1, 1, 2, '#FFB300'], [7, 0, 2, 3, '#FFB300'], [6, 3, 4, 1, '#FFB300'], [7, 3, 2, 1, '#FF5A5A']]
  }
};

/** SVG markup for the cat in a given skin. `ground` is the colour cut-outs (eyes, nose) fall back to. */
export function catSvg(skinId, ground = GROUND) {
  const look = SKIN_LOOKS[skinId] || SKIN_LOOKS.classic;
  const color = (part) => look[part] || (part === 'eye' || part === 'nose' ? ground : look.body);
  const rects = SHAPE.map(([x, y, w, h, part]) => {
    const cls = part === 'paw' ? ' class="paw"' : part === 'eye' ? ' class="eye"' : '';
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color(part)}"${cls}/>`;
  });
  for (const [x, y, w, h, fill] of look.extra || []) rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

export const skinGlow = (skinId) => (SKIN_LOOKS[skinId] || SKIN_LOOKS.classic).glow;
