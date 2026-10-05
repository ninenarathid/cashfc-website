import { describe, expect, it } from "vitest";
import {
  POLL_CHOICES_MAX, POLL_CHOICE_MAX, POLL_QUESTION_MAX, choiceProblem,
  cleanChoices, myPicks, openPolls, pollAnswered, pollProblem, pollWaitsOn,
  pressChoice, withPicks,
} from "@/lib/party-poll";
import type { PartyPoll, PollVoter } from "@/lib/party-poll";

/**
 * A question under a party: what a press means and what the form may send.
 *
 * The database decides all of it again (v136). These are the page's half: an
 * answer drawn at once has to be the answer the database will keep, or the
 * card says one thing for a moment and another after the reload.
 */

const who = (n: number): PollVoter => ({ profileId: `u${n}`, characterId: n, name: `P${n}` });

const poll = (multi: boolean, by: Record<string, number[]>): PartyPoll => ({
  id: "1", question: "Which evening?", multi, closedAt: null, createdAt: "2026-10-05T12:00:00Z",
  choices: ["sat", "sun", "mon"].map((id) => ({
    id, label: id, by: (by[id] ?? []).map(who),
  })),
});

describe("who has answered", () => {
  it("counts people, not ticks", () => {
    expect(pollAnswered(poll(true, { sat: [1, 2], sun: [1], mon: [] }))).toBe(2);
  });

  it("is nobody on a question just asked", () => {
    expect(pollAnswered(poll(false, {}))).toBe(0);
  });

  it("finds my own picks in the question's order", () => {
    const p = poll(true, { mon: [1], sat: [2, 1] });
    expect(myPicks(p, "u1")).toEqual(["sat", "mon"]);
    expect(myPicks(p, "u9")).toEqual([]);
    expect(myPicks(p, null)).toEqual([]);
  });
});

describe("what is still open, and what waits on me", () => {
  const closed: PartyPoll = { ...poll(false, {}), id: "2", closedAt: "2026-10-05T13:00:00Z" };

  it("leaves a closed question out", () => {
    expect(openPolls([poll(false, {}), closed]).map((p) => p.id)).toEqual(["1"]);
    expect(openPolls(undefined)).toEqual([]);
  });

  it("waits on somebody who has not answered an open one", () => {
    expect(pollWaitsOn([poll(false, { sat: [2] })], "u1")).toBe(true);
    expect(pollWaitsOn([poll(false, { sat: [1] })], "u1")).toBe(false);
  });

  it("never waits on a closed question, or on nobody", () => {
    expect(pollWaitsOn([closed], "u1")).toBe(false);
    expect(pollWaitsOn([poll(false, {})], null)).toBe(false);
  });
});

describe("pressing a choice", () => {
  it("moves a single answer to the choice pressed", () => {
    expect(pressChoice(poll(false, {}), ["sat"], "sun")).toEqual(["sun"]);
  });

  it("adds to several, where the question takes several", () => {
    expect(pressChoice(poll(true, {}), ["sat"], "sun")).toEqual(["sat", "sun"]);
  });

  it("takes an answer back on the second press, in both kinds", () => {
    expect(pressChoice(poll(false, {}), ["sat"], "sat")).toEqual([]);
    expect(pressChoice(poll(true, {}), ["sat", "sun"], "sat")).toEqual(["sun"]);
  });

  it("ignores a choice the question does not have", () => {
    expect(pressChoice(poll(false, {}), ["sat"], "tue")).toEqual(["sat"]);
  });
});

describe("the question once my answer is in", () => {
  it("puts me under what I picked and takes me off the rest", () => {
    const next = withPicks(poll(false, { sat: [1, 2], sun: [3] }), who(1), ["sun"]);
    expect(next.choices.map((c) => c.by.map((v) => v.profileId)))
      .toEqual([["u2"], ["u3", "u1"], []]);
  });

  it("keeps my place in a line I was already in", () => {
    const next = withPicks(poll(true, { sat: [1, 2] }), who(1), ["sat", "mon"]);
    expect(next.choices[0].by.map((v) => v.profileId)).toEqual(["u1", "u2"]);
    expect(next.choices[2].by.map((v) => v.profileId)).toEqual(["u1"]);
  });

  it("is the same people as before when nothing was picked or held", () => {
    const p = poll(false, { sat: [2] });
    expect(withPicks(p, who(1), []).choices).toEqual(p.choices);
  });

  it("agrees with pressChoice: a press drawn is a press counted once", () => {
    const p = poll(false, { sat: [1] });
    const next = withPicks(p, who(1), pressChoice(p, myPicks(p, "u1"), "sun"));
    expect(myPicks(next, "u1")).toEqual(["sun"]);
    expect(pollAnswered(next)).toBe(1);
  });
});

describe("what the form may send", () => {
  it("trims the choices and leaves the empty ones out", () => {
    expect(cleanChoices([" Sat ", "", "  ", "Sun"])).toEqual(["Sat", "Sun"]);
  });

  it("wants a question", () => {
    expect(pollProblem("   ", ["a", "b"])).toBe("question");
    expect(pollProblem("x".repeat(POLL_QUESTION_MAX + 1), ["a", "b"])).toBe("question");
  });

  it("wants two choices, and no more than ten", () => {
    expect(pollProblem("When?", ["a", " "])).toBe("few");
    const many = Array.from({ length: POLL_CHOICES_MAX + 1 }, (_, i) => `c${i}`);
    expect(pollProblem("When?", many)).toBe("many");
    expect(pollProblem("When?", many.slice(1))).toBeNull();
  });

  it("refuses a choice that is too long, and two that say the same thing", () => {
    expect(pollProblem("When?", ["a", "x".repeat(POLL_CHOICE_MAX + 1)])).toBe("long");
    expect(pollProblem("When?", ["Sat", " sat"])).toBe("same");
  });

  it("lets a good one through", () => {
    expect(pollProblem("วันไหนดี", ["เสาร์", "อาทิตย์"])).toBeNull();
  });

  it("holds one more choice to the same rules", () => {
    const p = poll(false, {});
    expect(choiceProblem(p, "  ")).toBe("few");
    expect(choiceProblem(p, "SAT")).toBe("same");
    expect(choiceProblem(p, "x".repeat(POLL_CHOICE_MAX + 1))).toBe("long");
    expect(choiceProblem(p, "tue")).toBeNull();
    const full: PartyPoll = {
      ...p,
      choices: Array.from({ length: POLL_CHOICES_MAX }, (_, i) => ({ id: `${i}`, label: `c${i}`, by: [] })),
    };
    expect(choiceProblem(full, "one more")).toBe("many");
  });
});
