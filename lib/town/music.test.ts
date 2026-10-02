import { describe, expect, it } from "vitest";
import { BARS, SONGS, STEPS, chordTones, compose, midiOf, songAt } from "./music";

describe("the town's music", () => {
  it("has a piece for every hour of the day, each its own", () => {
    expect(SONGS).toHaveLength(24);
    expect(songAt(0)).toBe(SONGS[0]);
    expect(songAt(23.9)).toBe(SONGS[23]);
    expect(songAt(24)).toBe(SONGS[0]);
    expect(songAt(-1)).toBe(SONGS[23]);
    const tunes = Object.values(SONGS).map((s) => JSON.stringify(compose(s).filter((n) => n.voice === s.lead).map((n) => n.midi)));
    expect(new Set(tunes).size).toBe(tunes.length);
  });

  it("composes the same piece every time", () => {
    for (const s of Object.values(SONGS)) expect(JSON.stringify(compose(s))).toBe(JSON.stringify(compose(s)));
  });

  it("keeps every note inside its loop and in a pleasant range", () => {
    for (const s of Object.values(SONGS)) {
      for (const n of compose(s)) {
        expect(n.step).toBeGreaterThanOrEqual(0);
        expect(n.step).toBeLessThan(BARS * STEPS);
        expect(n.dur).toBeGreaterThan(0);
        if (n.voice === s.lead) { expect(n.midi).toBeGreaterThanOrEqual(s.root + 5); expect(n.midi).toBeLessThanOrEqual(s.root + 27); }
        if (n.voice === "bass") expect(n.midi).toBeLessThan(s.root);
      }
    }
  });

  it("lands its strong beats on the chord, and goes home at the end", () => {
    for (const s of Object.values(SONGS)) {
      const notes = compose(s);
      for (const n of notes) {
        if (n.voice !== s.lead || n.step % 4 !== 0) continue;
        const chord = chordTones(s, Math.floor(n.step / STEPS)).map((x) => midiOf(s, x) % 12);
        expect(chord).toContain(n.midi % 12);
      }
      const last = notes.filter((n) => n.voice === s.lead).at(-1)!;
      expect(last.midi % 12).toBe(s.root % 12);
    }
  });

  it("is lofi: jazzy chords on the keys, a swung beat by day, none at night and dawn", () => {
    for (const s of Object.values(SONGS)) {
      // every bar's chord has four notes (a seventh and a ninth, the root left to the bass)
      const keys = compose(s).filter((n) => n.voice === "keys" && n.step % STEPS === 0);
      expect(keys.length).toBe(BARS * 4);
      expect(s.bpm).toBeLessThanOrEqual(90);
      if (s.groove) expect(s.swing).toBeGreaterThan(0.15);
    }
    // the small hours have no beat; the middle of the day has the full one
    for (const h of [22, 23, 0, 1, 2, 3, 4, 5]) expect(compose(songAt(h)).some((n) => n.voice === "kick" || n.voice === "snare" || n.voice === "hat")).toBe(false);
    for (const h of [9, 10, 11, 12, 13, 14, 15]) expect(compose(songAt(h)).some((n) => n.voice === "kick")).toBe(true);
    // and the night is slower than the day
    expect(songAt(2).bpm).toBeLessThan(songAt(11).bpm);
    expect(compose(songAt(2)).filter((n) => n.voice === songAt(2).lead).length)
      .toBeLessThan(compose(songAt(11)).filter((n) => n.voice === songAt(11).lead).length);
  });
});
