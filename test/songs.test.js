import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS } from '../src/audio/songs.js';
import { parseBar, hasChord, loopSeconds } from '../src/audio/soundtrack.js';
import { TRACKS } from '../src/game.js';

test('every store track has a song', () => {
  for (const t of TRACKS) assert.ok(SONGS[t.id], t.id);
});

for (const song of Object.values(SONGS)) {
  test(`${song.name}: every bar is 16 steps, with known notes and chords`, () => {
    song.sections.forEach((sec, si) => sec.bars.forEach((b, bi) => {
      const where = `${sec.name} bar ${bi + 1}`;
      const { events, steps } = parseBar(b.melody);
      assert.equal(steps, 16, where);
      for (const e of Object.values(events)) assert.ok(e.midi != null, where + ': bad note');
      assert.ok(hasChord(b.chord), where + ': unknown chord ' + b.chord);
    }));
    assert.ok(song.loopFrom < song.sections.length);
    assert.ok(loopSeconds(song) > 60, 'loop should last over a minute');
  });
}
