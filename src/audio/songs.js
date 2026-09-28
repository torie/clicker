// The game's music, as data for the chip synth in soundtrack.js.
//
// Melody notation: one string per bar, NOTE:LENGTH tokens in 16ths ("-" is a rest); each bar sums to 16.
// Every bar also names its chord (arpeggio + bass follow it) and how each voice plays:
//   lead:  off | pulse25 | pulse50 | duet (lead plus a soft octave below)
//   arp:   eighths | sixteenths | high | soft | dreamy | none
//   bass:  bounce | drive | walk | hold | none
//   drums: intro | groove | drive | four | halftime | light | none
// Sections play in order; after the last one playback jumps back to `loopFrom`.

function bars(chords, melody, opts) {
  return melody.map((m, i) => Object.assign({ chord: chords[i % chords.length], melody: m }, opts));
}
const rests = (n) => Array(n).fill('-:16');

// ---------- Silo Shuffle: the original theme. Upbeat but chill, C major. ----------

const SILO_A = [
  'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 -:2 D5:2', 'C5:2 E5:2 A5:4 G5:2 E5:2 C5:2 D5:2',
  'A4:2 C5:2 F5:3 E5:1 F5:2 A5:4 G5:2', 'G5:6 F5:2 D5:4 B4:4',
  'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 G5:2 C6:2', 'B5:4 A5:2 G5:2 E5:4 -:2 E5:2',
  'F5:2 E5:2 F5:2 A5:2 C6:3 B5:1 A5:2 F5:2', 'G5:8 -:4 D5:2 F5:2',
  'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 -:2 D5:2', 'C5:2 E5:2 A5:4 G5:2 E5:2 C5:2 D5:2',
  'A4:2 C5:2 F5:3 E5:1 F5:2 A5:4 G5:2', 'G5:6 F5:2 D5:4 B4:4',
  'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 -:2 D5:2', 'C5:2 E5:2 A5:4 C6:4 B5:2 A5:2',
  'A5:3 G5:1 F5:2 E5:2 D5:2 E5:2 F5:2 A5:2', 'G5:4 F5:2 D5:2 B4:2 D5:2 -:4'
];
const SILO_A_CHORDS = ['Cmaj7', 'Am7', 'Fmaj7', 'G7'];
const SILO_B = [
  'A5:4 C6:4 B5:2 A5:2 G5:4', 'G5:4 B5:4 A5:2 G5:2 D5:4',
  'E5:2 G5:2 B5:4 A5:2 G5:2 E5:4', 'A5:8 G5:2 E5:2 C5:4',
  'D5:2 F5:2 A5:4 C6:3 A5:1 G5:2 F5:2', 'G5:4 D5:2 G5:2 B5:4 A5:2 G5:2',
  'E5:2 G5:2 B5:6 C6:2 B5:2 G5:2', 'A#5:4 A5:2 G5:2 E5:4 G5:4'
];
const SILO_B_CHORDS = ['Fmaj7', 'G', 'Em7', 'Am7', 'Dm7', 'G', 'Cmaj7', 'C7'];
const SILO_C = [
  'C6:3 A#5:1 G5:4 D#5:2 F5:2 G5:4', 'F5:3 G5:1 A#5:4 D6:4 C6:2 A#5:2',
  'B5:4 G5:2 E5:2 G5:8', '-:4 E5:2 G5:2 C6:2 B5:2 G5:2 E5:2',
  'C6:3 A#5:1 G5:4 D#6:4 C6:4', 'D6:4 A#5:2 F5:2 D6:3 C6:1 A#5:4',
  'B5:4 D6:4 G6:4 F6:2 D6:2', 'B5:8 -:4 G5:2 A5:2'
];
const SILO_C_CHORDS = ['Abmaj7', 'Bb', 'Cmaj7', 'Cmaj7', 'Abmaj7', 'Bb', 'G', 'G'];
const SILO_BD = [
  'E5:8 -:8', 'A5:8 -:8', 'E5:8 -:8', 'D5:8 -:8',
  'E5:8 -:8', 'C6:8 -:8', '-:16', 'D5:1 E5:1 F5:1 G5:1 A5:1 B5:1 C6:1 D6:1 E6:8'
];

const SILO_SHUFFLE = {
  id: 'silo', name: 'Silo Shuffle', mood: 'Upbeat, chill', bpm: 104, swing: 0.14, loopFrom: 1,
  sections: [
    { name: 'Intro', bars: bars(SILO_A_CHORDS, rests(4), { arp: 'eighths', bass: 'bounce', drums: 'intro', lead: 'off' }) },
    { name: 'Theme', bars: bars(SILO_A_CHORDS, SILO_A, { arp: 'eighths', bass: 'bounce', drums: 'groove', lead: 'pulse25' }) },
    { name: 'Lift', bars: bars(SILO_B_CHORDS, SILO_B.concat(SILO_B.slice(0, 7), ['-:4 G5:2 A5:2 A#5:2 A5:2 G5:2 E5:2']),
      { arp: 'sixteenths', bass: 'bounce', drums: 'groove', lead: 'pulse25' }) },
    { name: 'Night shift', bars: bars(SILO_C_CHORDS, SILO_C.concat(SILO_C.slice(0, 7), ['D6:8 B5:2 G5:2 F5:2 D5:2']),
      { arp: 'high', bass: 'drive', drums: 'drive', lead: 'pulse25' }) },
    { name: 'Theme reprise', bars: bars(SILO_A_CHORDS, SILO_A, { arp: 'sixteenths', bass: 'bounce', drums: 'groove', lead: 'duet' }) },
    { name: 'Breather', bars: bars(['Am7', 'Fmaj7', 'Am7', 'G', 'Am7', 'Fmaj7', 'G', 'G'], SILO_BD,
      { arp: 'soft', bass: 'hold', drums: 'light', lead: 'pulse50' }) }
  ]
};

// ---------- Kitten Cruise: laid-back and swung, F major. ----------

const CRUISE_A = [
  'A5:4 C6:2 A5:2 G5:4 F5:4', 'D5:2 F5:2 A5:6 G5:2 F5:4',
  'A#5:4 A5:2 G5:2 F5:4 D5:4', 'E5:6 G5:2 A#5:4 A5:4',
  'A5:4 C6:2 A5:2 G5:4 F5:2 G5:2', 'A5:4 D6:4 C6:2 A5:2 F5:4',
  'G5:2 A#5:2 D6:4 C6:2 A#5:2 A5:2 G5:2', 'F5:8 -:4 C5:2 E5:2'
];
const CRUISE_A_CHORDS = ['Fmaj7', 'Dm7', 'Gm7', 'C7'];
const CRUISE_B = [
  'D6:4 C6:2 A#5:2 A5:8', 'C6:4 A5:2 G5:2 E5:8',
  'F5:2 G5:2 A#5:4 D6:4 C6:4', 'A#5:6 A5:2 G5:8',
  'F5:2 A5:2 D6:4 F6:4 D6:4', 'E6:4 C6:2 A5:2 G5:4 E5:4',
  'D5:2 F5:2 G5:2 A#5:2 A5:4 G5:4', 'E5:4 G5:4 C6:8'
];
const CRUISE_B_CHORDS = ['Bbmaj7', 'Am7', 'Gm7', 'C7'];

const KITTEN_CRUISE = {
  id: 'cruise', name: 'Kitten Cruise', mood: 'Laid-back, swung', bpm: 88, swing: 0.22, loopFrom: 1,
  sections: [
    { name: 'Intro', bars: bars(CRUISE_A_CHORDS, rests(4), { arp: 'dreamy', bass: 'walk', drums: 'none', lead: 'off' }) },
    { name: 'Theme', bars: bars(CRUISE_A_CHORDS, CRUISE_A, { arp: 'eighths', bass: 'walk', drums: 'halftime', lead: 'pulse50' }) },
    { name: 'Theme duet', bars: bars(CRUISE_A_CHORDS, CRUISE_A, { arp: 'eighths', bass: 'walk', drums: 'halftime', lead: 'duet' }) },
    { name: 'Bridge', bars: bars(CRUISE_B_CHORDS, CRUISE_B, { arp: 'dreamy', bass: 'walk', drums: 'halftime', lead: 'pulse50' }) },
    { name: 'Bridge lift', bars: bars(CRUISE_B_CHORDS, CRUISE_B, { arp: 'sixteenths', bass: 'walk', drums: 'groove', lead: 'pulse25' }) },
    { name: 'Theme return', bars: bars(CRUISE_A_CHORDS, CRUISE_A, { arp: 'eighths', bass: 'walk', drums: 'groove', lead: 'pulse25' }) },
    { name: 'Coast', bars: bars(['Fmaj7', 'Dm7', 'Gm7', 'C7'], ['F5:16', 'A5:16', 'A#5:16', 'G5:8 -:8'],
      { arp: 'dreamy', bass: 'hold', drums: 'light', lead: 'pulse50' }) }
  ]
};

// ---------- Neon Commute: driving four-on-the-floor, A minor. ----------

const NEON_A = [
  'A5:2 C6:2 E6:2 C6:2 A5:2 G5:2 A5:4', 'F5:2 A5:2 C6:2 A5:2 F5:2 E5:2 F5:4',
  'E5:2 G5:2 C6:2 E6:2 D6:2 C6:2 G5:4', 'D6:4 B5:2 G5:2 B5:2 D6:2 G6:4',
  'A5:2 C6:2 E6:2 C6:2 A5:2 G5:2 A5:2 B5:2', 'C6:4 A5:2 F5:2 A5:2 C6:2 F6:4',
  'E6:2 D6:2 C6:2 G5:2 E5:2 G5:2 C6:4', 'B5:2 C6:2 D6:4 -:4 E6:1 D6:1 C6:1 B5:1'
];
const NEON_A_CHORDS = ['Am', 'F', 'C', 'G'];
const NEON_B = [
  'F5:4 A5:4 D6:4 F6:4', 'E6:6 D6:2 C6:4 A5:4',
  'G#5:4 B5:4 D6:4 E6:4', 'C6:4 B5:2 A5:2 E5:8',
  'D6:2 F6:2 A6:4 F6:2 D6:2 A5:4', 'C6:2 E6:2 A6:4 E6:2 C6:2 A5:4',
  'B5:2 D6:2 E6:2 G#6:2 B6:4 G#6:4', 'A6:8 -:4 E6:2 G6:2'
];
const NEON_B_CHORDS = ['Dm', 'Am', 'E7', 'Am'];
const NEON_C = [
  'A4:8 C5:8', 'B4:8 D5:8', 'G5:8 E5:8', 'A5:12 -:4',
  'A4:8 C5:8', 'B4:8 D5:8', 'G5:8 E5:8', 'E5:1 F5:1 G5:1 A5:1 B5:1 C6:1 D6:1 E6:1 A6:8'
];
const NEON_C_CHORDS = ['F', 'G', 'Em', 'Am'];

const NEON_COMMUTE = {
  id: 'neon', name: 'Neon Commute', mood: 'Driving, bright', bpm: 126, swing: 0, loopFrom: 1,
  sections: [
    { name: 'Intro', bars: bars(NEON_A_CHORDS, rests(4), { arp: 'sixteenths', bass: 'drive', drums: 'four', lead: 'off' }) },
    { name: 'Theme', bars: bars(NEON_A_CHORDS, NEON_A, { arp: 'sixteenths', bass: 'drive', drums: 'four', lead: 'pulse25' }) },
    { name: 'Theme duet', bars: bars(NEON_A_CHORDS, NEON_A, { arp: 'high', bass: 'drive', drums: 'four', lead: 'duet' }) },
    { name: 'Chase', bars: bars(NEON_B_CHORDS, NEON_B, { arp: 'sixteenths', bass: 'drive', drums: 'drive', lead: 'pulse25' }) },
    { name: 'Chase again', bars: bars(NEON_B_CHORDS, NEON_B, { arp: 'high', bass: 'drive', drums: 'four', lead: 'pulse50' }) },
    { name: 'Tunnel', bars: bars(NEON_C_CHORDS, NEON_C, { arp: 'high', bass: 'hold', drums: 'light', lead: 'pulse50' }) },
    { name: 'Theme return', bars: bars(NEON_A_CHORDS, NEON_A, { arp: 'sixteenths', bass: 'drive', drums: 'four', lead: 'pulse25' }) }
  ]
};

// ---------- Lullaby.exe: slow and dreamy, G major, almost no drums. ----------

const LULL_A = [
  'B5:6 A5:2 G5:4 D5:4', 'E5:8 G5:4 B5:4', 'C6:6 B5:2 G5:4 E5:4', 'F#5:8 A5:4 D6:4',
  'D6:6 B5:2 A5:4 G5:4', 'G5:4 B5:4 E6:8', 'E6:4 D6:4 B5:4 G5:4', 'A5:12 -:4'
];
const LULL_A_CHORDS = ['Gmaj7', 'Em7', 'Cmaj7', 'D'];
const LULL_B = [
  'C6:8 E6:8', 'D6:4 F#5:4 A5:8', 'B5:8 D6:4 F#6:4', 'E6:12 -:4',
  'G5:4 C6:4 E6:4 G6:4', 'F#6:6 E6:2 D6:4 A5:4', 'B5:16', '-:8 D5:2 G5:2 B5:2 D6:2'
];
const LULL_B_CHORDS = ['Am7', 'D', 'Bm7', 'Em7', 'Cmaj7', 'D', 'G', 'G'];

const LULLABY = {
  id: 'lullaby', name: 'Lullaby.exe', mood: 'Slow, dreamy', bpm: 76, swing: 0.1, loopFrom: 1,
  sections: [
    { name: 'Intro', bars: bars(LULL_A_CHORDS, rests(4), { arp: 'dreamy', bass: 'hold', drums: 'none', lead: 'off' }) },
    { name: 'Theme', bars: bars(LULL_A_CHORDS, LULL_A, { arp: 'dreamy', bass: 'hold', drums: 'none', lead: 'pulse50' }) },
    { name: 'Drift', bars: bars(LULL_B_CHORDS, LULL_B, { arp: 'soft', bass: 'hold', drums: 'light', lead: 'pulse50' }) },
    { name: 'Theme duet', bars: bars(LULL_A_CHORDS, LULL_A, { arp: 'soft', bass: 'hold', drums: 'light', lead: 'duet' }) },
    { name: 'Drift again', bars: bars(LULL_B_CHORDS, LULL_B, { arp: 'dreamy', bass: 'hold', drums: 'none', lead: 'pulse50' }) },
    { name: 'Theme high', bars: bars(LULL_A_CHORDS, LULL_A, { arp: 'high', bass: 'hold', drums: 'none', lead: 'pulse25' }) }
  ]
};

export const SONGS = { silo: SILO_SHUFFLE, cruise: KITTEN_CRUISE, neon: NEON_COMMUTE, lullaby: LULLABY };
