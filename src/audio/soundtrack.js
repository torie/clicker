// "Silo Shuffle" — the game's looping 8-bit soundtrack, synthesised live with Web Audio.
// No audio files: four chip voices (pulse lead, pulse arp, triangle bass, noise drums)
// play a 76-bar arrangement. The 4-bar intro plays once; the other 72 bars loop (~2:46).
//
// Usage:
//   const music = createSoundtrack();
//   button.onclick = () => music.toggle();      // must start from a user gesture
//   music.onStep = (info) => { ... };           // optional, for visualisers
//   music.setVolume(0.6);

const BPM = 104;
const SWING = 0.14; // fraction of a 16th that off-beat 16ths are delayed

const CHORDS = {
  Cmaj7: ['C', 'E', 'G', 'B'], Am7: ['A', 'C', 'E', 'G'], Fmaj7: ['F', 'A', 'C', 'E'],
  G7: ['G', 'B', 'D', 'F'], G: ['G', 'B', 'D', 'G'], Em7: ['E', 'G', 'B', 'D'],
  Dm7: ['D', 'F', 'A', 'C'], C7: ['C', 'E', 'G', 'A#'], Abmaj7: ['G#', 'C', 'D#', 'G'],
  Bb: ['A#', 'D', 'F', 'A#']
};

// Melody phrases, one string per bar: NOTE:LENGTH in 16ths, "-" is a rest. Each bar sums to 16.
const A_THEME = [
  // a1
  'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 -:2 D5:2', 'C5:2 E5:2 A5:4 G5:2 E5:2 C5:2 D5:2',
  'A4:2 C5:2 F5:3 E5:1 F5:2 A5:4 G5:2', 'G5:6 F5:2 D5:4 B4:4',
  // a2
  'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 G5:2 C6:2', 'B5:4 A5:2 G5:2 E5:4 -:2 E5:2',
  'F5:2 E5:2 F5:2 A5:2 C6:3 B5:1 A5:2 F5:2', 'G5:8 -:4 D5:2 F5:2',
  // a1
  'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 -:2 D5:2', 'C5:2 E5:2 A5:4 G5:2 E5:2 C5:2 D5:2',
  'A4:2 C5:2 F5:3 E5:1 F5:2 A5:4 G5:2', 'G5:6 F5:2 D5:4 B4:4',
  // a3 (cadence)
  'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 -:2 D5:2', 'C5:2 E5:2 A5:4 C6:4 B5:2 A5:2',
  'A5:3 G5:1 F5:2 E5:2 D5:2 E5:2 F5:2 A5:2', 'G5:4 F5:2 D5:2 B4:2 D5:2 -:4'
];
const A_CHORDS = ['Cmaj7', 'Am7', 'Fmaj7', 'G7'];

const B_THEME = [
  'A5:4 C6:4 B5:2 A5:2 G5:4', 'G5:4 B5:4 A5:2 G5:2 D5:4',
  'E5:2 G5:2 B5:4 A5:2 G5:2 E5:4', 'A5:8 G5:2 E5:2 C5:4',
  'D5:2 F5:2 A5:4 C6:3 A5:1 G5:2 F5:2', 'G5:4 D5:2 G5:2 B5:4 A5:2 G5:2',
  'E5:2 G5:2 B5:6 C6:2 B5:2 G5:2', 'A#5:4 A5:2 G5:2 E5:4 G5:4'
];
const B_THEME_END = '-:4 G5:2 A5:2 A#5:2 A5:2 G5:2 E5:2';
const B_CHORDS = ['Fmaj7', 'G', 'Em7', 'Am7', 'Dm7', 'G', 'Cmaj7', 'C7'];

const C_THEME = [
  'C6:3 A#5:1 G5:4 D#5:2 F5:2 G5:4', 'F5:3 G5:1 A#5:4 D6:4 C6:2 A#5:2',
  'B5:4 G5:2 E5:2 G5:8', '-:4 E5:2 G5:2 C6:2 B5:2 G5:2 E5:2',
  'C6:3 A#5:1 G5:4 D#6:4 C6:4', 'D6:4 A#5:2 F5:2 D6:3 C6:1 A#5:4',
  'B5:4 D6:4 G6:4 F6:2 D6:2', 'B5:8 -:4 G5:2 A5:2'
];
const C_THEME_END = 'D6:8 B5:2 G5:2 F5:2 D5:2';
const C_CHORDS = ['Abmaj7', 'Bb', 'Cmaj7', 'Cmaj7', 'Abmaj7', 'Bb', 'G', 'G'];

const BD_THEME = [
  'E5:8 -:8', 'A5:8 -:8', 'E5:8 -:8', 'D5:8 -:8',
  'E5:8 -:8', 'C6:8 -:8', '-:16', 'D5:1 E5:1 F5:1 G5:1 A5:1 B5:1 C6:1 D6:1 E6:8'
];
const BD_CHORDS = ['Am7', 'Fmaj7', 'Am7', 'G', 'Am7', 'Fmaj7', 'G', 'G'];

function bars(chords, melody, opts) {
  return melody.map((m, i) => Object.assign({ chord: chords[i % chords.length], melody: m }, opts));
}

// The arrangement. Sections play in order; after the last one playback returns to LOOP_FROM.
const SECTIONS = [
  { id: 'intro', name: 'Intro', bars: bars(A_CHORDS, ['-:16', '-:16', '-:16', '-:16'],
    { arp: 'eighths', bass: 'bounce', drums: 'intro', lead: 'off' }) },
  { id: 'A', name: 'Theme', bars: bars(A_CHORDS, A_THEME,
    { arp: 'eighths', bass: 'bounce', drums: 'groove', lead: 'pulse25' }) },
  { id: 'B', name: 'Lift', bars: bars(B_CHORDS, B_THEME.concat(B_THEME.slice(0, 7), [B_THEME_END]),
    { arp: 'sixteenths', bass: 'bounce', drums: 'groove', lead: 'pulse25' }) },
  { id: 'C', name: 'Night shift', bars: bars(C_CHORDS, C_THEME.concat(C_THEME.slice(0, 7), [C_THEME_END]),
    { arp: 'high', bass: 'drive', drums: 'drive', lead: 'pulse25' }) },
  { id: 'A2', name: 'Theme reprise', bars: bars(A_CHORDS, A_THEME,
    { arp: 'sixteenths', bass: 'bounce', drums: 'groove', lead: 'duet' }) },
  { id: 'BD', name: 'Breather', bars: bars(BD_CHORDS, BD_THEME,
    { arp: 'soft', bass: 'hold', drums: 'light', lead: 'pulse50' }) }
];
const LOOP_FROM = 1;

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function midi(name, octave) { return 12 * (octave + 1) + NOTE_INDEX[name]; }
function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function parseNote(s) {
  const m = /^([A-G]#?)(\d)$/.exec(s);
  return m ? midi(m[1], +m[2]) : null;
}
function parseBar(str) {
  const events = {};
  let step = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [n, len] = tok.split(':');
    if (n !== '-') events[step] = { midi: parseNote(n), len: +len };
    step += +len;
  }
  return events;
}
SECTIONS.forEach((s) => s.bars.forEach((b) => { b.events = parseBar(b.melody); }));

const DRUMS = {
  intro: { kick: [0, 8], snare: [], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [] },
  groove: { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 15], open: [14] },
  drive: { kick: [0, 7, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 13, 15], open: [14] },
  light: { kick: [0], snare: [], hat: [2, 6, 10, 14], open: [] }
};

export function createSoundtrack() {
  let ctx = null, master, lpf, leadBus, timer = null, volume = 0.7;
  let waves, noise, nextTime = 0, sec = 0, bar = 0, step = 0;
  const api = { onStep: null, playing: false, sections: SECTIONS.map((s) => ({ id: s.id, name: s.name, bars: s.bars.length })) };
  const stepDur = 60 / BPM / 4;

  function pulseWave(duty) {
    const n = 64, real = new Float32Array(n), imag = new Float32Array(n);
    for (let i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = volume * 0.5;
    lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 8500;
    const comp = ctx.createDynamicsCompressor();
    master.connect(lpf).connect(comp).connect(ctx.destination);
    // Lead gets a dotted-eighth echo for the chill feel.
    leadBus = ctx.createGain();
    const delay = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    delay.delayTime.value = stepDur * 3;
    fb.gain.value = 0.28;
    wet.gain.value = 0.3;
    leadBus.connect(master);
    leadBus.connect(delay).connect(fb).connect(delay);
    delay.connect(wet).connect(master);
    waves = { p125: pulseWave(0.125), p25: pulseWave(0.25), p50: pulseWave(0.5) };
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(m, t, dur, wave, vol, dest, vibrato) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    if (typeof wave === 'string') o.type = wave; else o.setPeriodicWave(wave);
    o.frequency.value = freq(m);
    if (vibrato && dur > 0.25) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(freq(m) * 0.006, t + 0.25);
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.linearRampToValueAtTime(vol * 0.65, t + 0.09);
    g.gain.setValueAtTime(vol * 0.65, t + Math.max(0.09, dur - 0.04));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function hit(kind, t) {
    if (kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.55, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.18);
      return;
    }
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise;
    const len = kind === 'snare' ? 0.13 : kind === 'open' ? 0.16 : 0.035;
    f.type = kind === 'snare' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 'snare' ? 1800 : 7000;
    g.gain.setValueAtTime(kind === 'snare' ? 0.26 : kind === 'open' ? 0.06 : 0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + len + 0.01);
    if (kind === 'snare') tone(midi('F', 3), t, 0.06, 'triangle', 0.12, master);
  }

  function scheduleStep(t) {
    const s = SECTIONS[sec], b = s.bars[bar], chord = CHORDS[b.chord], hits = [];
    const lastBar = bar === s.bars.length - 1;
    // Lead
    const ev = b.events[step];
    if (ev && s.bars[bar].lead !== 'off') {
      const dur = ev.len * stepDur * 0.92;
      if (b.lead === 'duet') {
        tone(ev.midi, t, dur, waves.p50, 0.11, leadBus, true);
        tone(ev.midi - 12, t, dur, waves.p125, 0.06, leadBus);
      } else {
        tone(ev.midi, t, dur, b.lead === 'pulse50' ? waves.p50 : waves.p25, 0.12, leadBus, true);
      }
      hits.push('lead');
    }
    // Arpeggio over the chord
    const arpEvery = b.arp === 'eighths' ? 2 : 1;
    if (b.arp !== 'none' && step % arpEvery === 0) {
      const i = (step / arpEvery) % 4, oct = b.arp === 'high' ? 5 : 4;
      const up = (step / arpEvery) % 8 >= 4 ? 12 : 0;
      tone(midi(chord[i], oct) + up, t, stepDur * 0.7, waves.p125, b.arp === 'soft' ? 0.03 : 0.045, master);
      hits.push('arp');
    }
    // Bass
    const root = midi(chord[0], 2), fifth = root + 7;
    const bassPat = {
      bounce: { 0: root, 3: root + 12, 6: root, 8: fifth, 11: root + 12, 14: root },
      drive: { 0: root, 2: root, 4: root + 12, 6: root, 8: root, 10: fifth, 12: root + 12, 14: fifth },
      hold: { 0: root }
    }[b.bass];
    if (bassPat[step] != null) {
      const len = b.bass === 'hold' ? stepDur * 15 : stepDur * 1.7;
      tone(bassPat[step], t, len, 'triangle', 0.26, master);
      hits.push('bass');
    }
    // Drums, with a snare fill at the end of each section
    const kit = DRUMS[b.drums];
    if (lastBar && step >= 12 && b.drums !== 'light') {
      hit('snare', t);
      hits.push('drums');
    } else {
      for (const k of ['kick', 'snare', 'hat', 'open']) {
        if (kit[k].includes(step) && !(k === 'open' && bar % 2 === 0)) { hit(k, t); hits.push('drums'); }
      }
    }
    if (api.onStep) {
      const info = { section: s.id, sectionIndex: sec, bar, bars: s.bars.length, step, chord: b.chord, hits };
      setTimeout(() => api.onStep && api.onStep(info), Math.max(0, (t - ctx.currentTime) * 1000));
    }
  }

  function advance() {
    step++;
    if (step < 16) return;
    step = 0;
    bar++;
    if (bar < SECTIONS[sec].bars.length) return;
    bar = 0;
    sec = sec + 1 < SECTIONS.length ? sec + 1 : LOOP_FROM;
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(nextTime + (step % 2 ? SWING * stepDur : 0));
      advance();
      nextTime += stepDur;
    }
  }

  api.start = function () {
    if (!ctx) init();
    ctx.resume();
    if (timer) return;
    nextTime = ctx.currentTime + 0.08;
    timer = setInterval(tick, 25);
    api.playing = true;
  };
  api.stop = function () {
    clearInterval(timer);
    timer = null;
    api.playing = false;
    if (ctx) ctx.suspend();
  };
  api.toggle = function () { api.playing ? api.stop() : api.start(); return api.playing; };
  api.jumpTo = function (sectionIndex) { sec = sectionIndex; bar = 0; step = 0; };
  api.setVolume = function (v) {
    volume = v;
    if (master) master.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05);
  };
  api.loopSeconds = SECTIONS.slice(LOOP_FROM).reduce((a, s) => a + s.bars.length, 0) * 16 * stepDur;
  return api;
}
