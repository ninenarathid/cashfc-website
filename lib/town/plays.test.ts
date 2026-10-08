import { describe, expect, it } from "vitest";
import type { FishId } from "./items";
import { STEPS, replayFight, startFight, stepFight } from "./fishing";
import { PLAIN } from "./gear";
import { KEPT, count, endOf, keep, newTally, tallyOf, type FishingPlay, type Play, type WorkPlay } from "./plays";

const play = (over: Partial<FishingPlay> = {}): FishingPlay => ({
  game: "fishing", at: 1_000, won: true, secs: 12.5, spent: false, buff: null,
  how: "landed", place: "deck", tile: [17, 40], bait: "worm", hour: 9, rain: false,
  what: "minnow", size: 6.2, wait: 14, nibbles: 1, reaction: 0.31, strike: "perfect", gear: PLAIN,
  fight: { seed: 7, holds: [3, 40, 61], steps: 1500, inBand: 0.82 }, kept: true, record: true,
  ...over,
});

describe("how a go at a board ended", () => {
  const go: WorkPlay = { game: "farming", at: 1_000, won: true, secs: 2, spent: true, buff: null, what: "water", need: 2, hits: 2, misses: 0 };
  it("is done when it was won and dropped when it was not, unless it says otherwise", () => {
    expect(endOf(go)).toBe("done");
    expect(endOf({ ...go, won: false })).toBe("dropped");
    // (a board its member shut; and a pot stirred to its end that was no recipe's: played out, though not won)
    expect(endOf({ ...go, won: false, how: "left" })).toBe("left");
    expect(endOf({ ...go, game: "cooking", won: false, how: "done" })).toBe("done");
  });
  it("counts on the tally under its own line of work, the forest's and the net's among them", () => {
    const tally = [go, { ...go, game: "forest" as const, won: false }, { ...go, game: "insects" as const }].reduce(count, newTally());
    expect(tally.games.forest).toMatchObject({ plays: 1, won: 0, spent: 1 });
    expect(tally.games.insects).toMatchObject({ plays: 1, won: 1 });
    expect(tally.games.farming).toMatchObject({ plays: 1, won: 1 });
  });
});

describe("the record of every go at a mini-game (the owner: \"ช่วยเก็บประวัติการเล่น minigame ทั้งหมดไว้ด้วย\")", () => {
  it("keeps every go, whatever its end, the newest last, and only so many", () => {
    let log: Play[] = [];
    for (const how of ["landed", "snapped", "slipped", "early", "missed", "left"] as const) log = keep(log, play({ how, won: how === "landed", at: log.length }));
    expect(log.map((p) => (p as FishingPlay).how)).toEqual(["landed", "snapped", "slipped", "early", "missed", "left"]);
    let long: Play[] = [];
    for (let i = 0; i < KEPT + 25; i++) long = keep(long, play({ at: i }));
    expect(long.length).toBe(KEPT);
    expect(long[0].at).toBe(25);
    expect(long[long.length - 1].at).toBe(KEPT + 24);
    // what it was given is left alone
    const few = Object.freeze([play()]) as FishingPlay[];
    expect(keep(few, play({ at: 2 }))).toHaveLength(2);
    expect(few).toHaveLength(1);
  });

  it("counts what a board of the best, or a skill, would be read from", () => {
    const log = [
      play({ at: 10, what: "minnow", size: 5 }),
      play({ at: 20, what: "minnow", size: 7.5, strike: "good" }),
      play({ at: 30, what: "catfish", how: "snapped", won: false, strike: "late", secs: 20, spent: true, kept: false, record: false }),
      play({ at: 40, what: "koi", how: "early", won: false, strike: null, reaction: -0.4, fight: null, secs: 0, place: "bank", kept: false, record: false }),
      play({ at: 50, what: "boot", how: "landed", size: 0, fight: null, secs: 0, strike: "good", place: "bank" }),
    ];
    const t = tallyOf(log);
    expect(t.games.fishing).toEqual({ plays: 5, won: 3, secs: 45, spent: 1, first: 10, last: 50 });
    expect(t.fishing.ends).toEqual({ landed: 3, snapped: 1, early: 1 });
    expect(t.fishing.strikes).toEqual({ perfect: 1, good: 2, late: 1 });
    expect(t.fishing.places).toEqual({ deck: 3, bank: 2 });
    // hooked is a strike that came in time; a fish scared off was never hooked, so it is not on the list
    expect(t.fishing.caught).toEqual({
      minnow: { hooked: 2, landed: 2, longest: 7.5 },
      catfish: { hooked: 1, landed: 0, longest: 0 },
      boot: { hooked: 1, landed: 1, longest: 0 },
    });
    // counted one at a time it is the same, and the tally it was given is left alone
    const first = Object.freeze(newTally());
    expect(log.reduce(count, first)).toEqual(t);
    expect(first).toEqual(newTally());
  });

  it("counts the other games too: work done by the game of timing", () => {
    const work = (game: "farming" | "cooking", over: Partial<Play> = {}): Play =>
      ({ game, at: 100, won: true, secs: 4, spent: false, buff: null, what: "till", need: 3, hits: 3, misses: 1, ...over } as Play);
    const t = tallyOf([play({ at: 10 }), work("farming", { at: 20 }), work("farming", { at: 30, spent: true }), work("cooking", { at: 40, won: false })]);
    expect(t.games.farming).toEqual({ plays: 2, won: 2, secs: 8, spent: 1, first: 20, last: 30 });
    expect(t.games.cooking).toEqual({ plays: 1, won: 0, secs: 4, spent: 0, first: 40, last: 40 });
    // fishing's own counts are fishing's alone
    expect(t.games.fishing!.plays).toBe(1);
    expect(t.fishing.places).toEqual({ deck: 1, bank: 0 });
  });

  it("holds enough of a fight to play it again exactly", () => {
    // a fight as the panel plays and writes it: in steps of the same length, the hand's every change noted
    const seed = 4242, holds: number[] = [];
    let f = startFight("catfish", "good", {}, seed), was = false, steps = 0, inside = 0;
    while (!f.over) {
      const hold: boolean = f.tension < (f.lo + f.hi) / 2;
      if (hold !== was) { holds.push(steps); was = hold; }
      f = stepFight(f, hold, 1 / STEPS);
      steps++;
      if (f.tension >= f.lo && f.tension <= f.hi) inside++;
    }
    const written = play({ what: "catfish", how: f.over, won: f.over === "landed", strike: "good", secs: f.t, fight: { seed, holds, steps, inBand: inside / steps } });
    // whoever keeps the records plays it again from the line alone
    const again = replayFight(
      startFight(written.what as FishId, written.strike!, { spent: written.spent, calm: written.buff === "calm", gear: written.gear }, written.fight!.seed),
      written.fight!.holds, written.fight!.steps,
    );
    expect(again.over).toBe(written.how);
    expect(again.t).toBeCloseTo(written.secs, 6);
    // a line that claims a landing its hand did not earn is found out
    const lie = replayFight(startFight("catfish", "good", {}, seed), [], steps);
    expect(lie.over).not.toBe("landed");
  });
});
