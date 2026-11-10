import { describe, expect, it } from 'vitest';
import { Interval, Note } from 'tonal';
import { INTERVALS, spellInterval } from './intervals';

describe('spellInterval', () => {
  it('spells a fourth above F as B flat', () => {
    expect(spellInterval(53, INTERVALS.find((i) => i.short === 'P4')!)).toEqual(['F3', 'Bb3']);
  });

  it('avoids double sharps by respelling the bottom note', () => {
    // MIDI 51 is D#3/Eb3; a major third above should be Eb3–G3, not D#3–F##3.
    expect(spellInterval(51, INTERVALS.find((i) => i.short === 'M3')!)).toEqual(['Eb3', 'G3']);
  });

  it('is pitch-exact and uses the right letter distance for every interval from every note', () => {
    for (const info of INTERVALS) {
      for (let low = 48; low < 60; low++) {
        const [a, b] = spellInterval(low, info);
        expect(Note.midi(a)).toBe(low);
        expect(Note.midi(b)).toBe(low + info.semitones);
        expect(info.spellings).toContain(Interval.distance(a, b));
        expect(b).not.toMatch(/##|bb/);
      }
    }
  });
});
