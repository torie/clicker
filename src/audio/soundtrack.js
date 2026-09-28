// Chip-music engine: plays the songs in songs.js live with Web Audio. No audio files.
// Four voices: pulse lead (with vibrato and echo), thin pulse arpeggio, triangle bass, noise drums.
//
// Usage:
//   const music = createSoundtrack(SONGS.silo);
//   button.onclick = () => music.toggle();      // must start from a user gesture
//   music.setSong(SONGS.neon);                  // switches immediately, from the top
//   music.onStep = (info) => { ... };           // optional, for visualisers
//   music.setVolume(0.6);

const CHORDS = {
  C: ['C', 'E', 'G', 'C'], Cmaj7: ['C', 'E', 'G', 'B'], C7: ['C', 'E', 'G', 'A#'],
  D: ['D', 'F#', 'A', 'D'], Dm: ['D', 'F', 'A', 'D'], Dm7: ['D', 'F', 'A', 'C'],
  Em: ['E', 'G', 'B', 'E'], Em7: ['E', 'G', 'B', 'D'], E7: ['E', 'G#', 'B', 'D'],
  F: ['F', 'A', 'C', 'F'], Fmaj7: ['F', 'A', 'C', 'E'],
  G: ['G', 'B', 'D', 'G'], G7: ['G', 'B', 'D', 'F'], Gmaj7: ['G', 'B', 'D', 'F#'], Gm7: ['G', 'A#', 'D', 'F'],
  Am: ['A', 'C', 'E', 'A'], Am7: ['A', 'C', 'E', 'G'], Abmaj7: ['G#', 'C', 'D#', 'G'],
  Bb: ['A#', 'D', 'F', 'A#'], Bbmaj7: ['A#', 'D', 'F', 'A'], Bm7: ['B', 'D', 'F#', 'A']
};

const ARPS = {
  eighths: { every: 2, octave: 4, vol: 0.045 }, sixteenths: { every: 1, octave: 4, vol: 0.045 },
  high: { every: 1, octave: 5, vol: 0.045 }, soft: { every: 1, octave: 4, vol: 0.03 },
  dreamy: { every: 2, octave: 5, vol: 0.03 }, none: null
};

const DRUMS = {
  intro: { kick: [0, 8], snare: [], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [] },
  groove: { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 15], open: [14] },
  drive: { kick: [0, 7, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 13, 15], open: [14] },
  four: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], open: [14] },
  halftime: { kick: [0, 10], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], open: [] },
  light: { kick: [0], snare: [], hat: [2, 6, 10, 14], open: [] },
  none: { kick: [], snare: [], hat: [], open: [] }
};

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midi = (name, octave) => 12 * (octave + 1) + NOTE_INDEX[name];
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
function parseNote(s) {
  const m = /^([A-G]#?)(\d)$/.exec(s);
  return m ? midi(m[1], +m[2]) : null;
}

/** Turns a bar's melody string into {step: {midi, len}}. Exported for tests. */
export function parseBar(str) {
  const events = {};
  let step = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [n, len] = tok.split(':');
    if (n !== '-') events[step] = { midi: parseNote(n), len: +len };
    step += +len;
  }
  return { events, steps: step };
}

/** Loop length in seconds (everything from `loopFrom` onwards). */
export function loopSeconds(song) {
  const loopBars = song.sections.slice(song.loopFrom).reduce((a, s) => a + s.bars.length, 0);
  return loopBars * 16 * (60 / song.bpm / 4);
}

export const hasChord = (name) => name in CHORDS;

export function createSoundtrack(initialSong) {
  let ctx = null, master, leadBus, echo, timer = null, volume = 0.7;
  let waves, noise, nextTime = 0, sec = 0, bar = 0, step = 0;
  let song = null, stepDur = 0.15;
  const api = { onStep: null, playing: false, song: null, sections: [] };

  function load(s) {
    song = s;
    s.sections.forEach((section) => section.bars.forEach((b) => { if (!b.events) b.events = parseBar(b.melody).events; }));
    stepDur = 60 / s.bpm / 4;
    if (echo) echo.delayTime.value = stepDur * 3;
    sec = 0; bar = 0; step = 0;
    api.song = s;
    api.sections = s.sections.map((x) => ({ name: x.name, bars: x.bars.length }));
    api.loopSeconds = loopSeconds(s);
  }

  function pulseWave(duty) {
    const n = 64, real = new Float32Array(n), imag = new Float32Array(n);
    for (let i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = volume * 0.5;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 8500;
    const comp = ctx.createDynamicsCompressor();
    master.connect(lpf).connect(comp).connect(ctx.destination);
    // The lead gets a dotted-eighth echo for a softer, roomier sound.
    leadBus = ctx.createGain();
    echo = ctx.createDelay(1);
    const fb = ctx.createGain(), wet = ctx.createGain();
    echo.delayTime.value = stepDur * 3;
    fb.gain.value = 0.28;
    wet.gain.value = 0.3;
    leadBus.connect(master);
    leadBus.connect(echo).connect(fb).connect(echo);
    echo.connect(wet).connect(master);
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
    const s = song.sections[sec], b = s.bars[bar], chord = CHORDS[b.chord], hits = [];
    const lastBar = bar === s.bars.length - 1;
    // Lead
    const ev = b.events[step];
    if (ev && b.lead !== 'off') {
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
    const arp = ARPS[b.arp];
    if (arp && step % arp.every === 0) {
      const i = (step / arp.every) % 4, up = (step / arp.every) % 8 >= 4 ? 12 : 0;
      tone(midi(chord[i], arp.octave) + up, t, stepDur * arp.every * 0.7, waves.p125, arp.vol, master);
      hits.push('arp');
    }
    // Bass
    const root = midi(chord[0], 2), fifth = root + 7, third = midi(chord[1], 2) + (NOTE_INDEX[chord[1]] < NOTE_INDEX[chord[0]] ? 12 : 0);
    const bassPat = {
      bounce: { 0: root, 3: root + 12, 6: root, 8: fifth, 11: root + 12, 14: root },
      drive: { 0: root, 2: root, 4: root + 12, 6: root, 8: root, 10: fifth, 12: root + 12, 14: fifth },
      walk: { 0: root, 4: third, 8: fifth, 12: root + 12 },
      hold: { 0: root },
      none: {}
    }[b.bass];
    if (bassPat[step] != null) {
      const len = b.bass === 'hold' ? stepDur * 15 : b.bass === 'walk' ? stepDur * 3.5 : stepDur * 1.7;
      tone(bassPat[step], t, len, 'triangle', 0.26, master);
      hits.push('bass');
    }
    // Drums, with a snare fill at the end of each section
    const kit = DRUMS[b.drums];
    if (lastBar && step >= 12 && b.drums !== 'light' && b.drums !== 'none') {
      hit('snare', t);
      hits.push('drums');
    } else {
      for (const k of ['kick', 'snare', 'hat', 'open']) {
        if (kit[k].includes(step) && !(k === 'open' && bar % 2 === 0)) { hit(k, t); hits.push('drums'); }
      }
    }
    if (api.onStep) {
      const info = { song: song.id, sectionIndex: sec, section: s.name, bar, bars: s.bars.length, step, chord: b.chord, hits };
      setTimeout(() => api.onStep && api.onStep(info), Math.max(0, (t - ctx.currentTime) * 1000));
    }
  }

  function advance() {
    step++;
    if (step < 16) return;
    step = 0;
    bar++;
    if (bar < song.sections[sec].bars.length) return;
    bar = 0;
    sec = sec + 1 < song.sections.length ? sec + 1 : song.loopFrom;
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(nextTime + (step % 2 ? song.swing * stepDur : 0));
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
  api.setSong = function (s) {
    if (s === song) return;
    load(s);
    if (ctx) nextTime = ctx.currentTime + 0.08;
  };
  api.jumpTo = function (sectionIndex) { sec = sectionIndex; bar = 0; step = 0; };
  api.setVolume = function (v) {
    volume = v;
    if (master) master.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05);
  };

  load(initialSong);
  return api;
}
