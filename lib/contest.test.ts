import { describe, expect, it } from "vitest";
import {
  contestError, countsShown, datesProblem, defaultDates, fileUrl, fromLocalInput,
  inPlay, isNewEntry, isPending, phaseOf, placeEntries, shuffleFor, talkClosedToOwner,
  toLocalInput, type Contest,
} from "@/lib/contest";

/**
 * The arithmetic behind the glamour contest page.
 *
 * phaseOf matters most: it decides whether the enter and popoto buttons are
 * offered, and Aqua's windows overlap, so "entries" and "voting" are not two
 * steps in a row but two clocks running at once. The database has the final
 * say either way; this is about the page never offering a button that is
 * certain to be refused, or hiding one that would have worked.
 */

const H = 60 * 60 * 1000;
const D = 24 * H;
const T0 = Date.parse("2026-10-20T00:00:00+07:00");

/** A published contest: entries days 0–7, voting days 2–9. */
function contest(over: Partial<Contest> = {}): Contest {
  return {
    id: 1, title: "Halloween", title_en: null, body: null, body_en: null,
    poster_url: null,
    submit_opens_at: new Date(T0).toISOString(),
    submit_closes_at: new Date(T0 + 7 * D).toISOString(),
    vote_opens_at: new Date(T0 + 2 * D).toISOString(),
    vote_closes_at: new Date(T0 + 9 * D).toISOString(),
    vote_limit: null, show_votes: false, fc_only: true,
    needs_approval: false, hide_names: false,
    allow_mods: false, allow_shaders: true,
    published_at: new Date(T0 - 5 * D).toISOString(), announced_at: null,
    created_at: new Date(T0 - 6 * D).toISOString(),
    ...over,
  };
}

describe("where a contest is", () => {
  it("is a draft until published, whatever the clock says", () => {
    const p = phaseOf(contest({ published_at: null }), T0 + 3 * D);
    expect(p).toMatchObject({ stage: "draft", canEnter: false, canVote: false, next: null });
  });

  it("is coming soon before entries open, and counts down to them", () => {
    const p = phaseOf(contest(), T0 - H);
    expect(p.stage).toBe("soon");
    expect(p.canEnter).toBe(false);
    expect(p.next).toEqual({ what: "entries-open", at: T0 });
  });

  it("takes looks before voting opens, and counts down to voting", () => {
    const p = phaseOf(contest(), T0 + D);
    expect(p).toMatchObject({ stage: "entries", canEnter: true, canVote: false });
    expect(p.next?.what).toBe("voting-open");
  });

  it("takes looks and popoto at once while both windows are open", () => {
    const p = phaseOf(contest(), T0 + 3 * D);
    expect(p).toMatchObject({ stage: "both", canEnter: true, canVote: true });
    expect(p.next).toEqual({ what: "entries-close", at: T0 + 7 * D });
  });

  it("takes only popoto once entries close", () => {
    const p = phaseOf(contest(), T0 + 8 * D);
    expect(p).toMatchObject({ stage: "voting", canEnter: false, canVote: true });
    expect(p.next?.what).toBe("voting-close");
  });

  it("waits for Aqua after voting closes, with nothing left to count down to", () => {
    const p = phaseOf(contest(), T0 + 10 * D);
    expect(p).toMatchObject({ stage: "counting", canEnter: false, canVote: false, next: null });
  });

  it("is announced the moment the result is out, even mid-vote", () => {
    const p = phaseOf(contest({ announced_at: new Date(T0 + 3 * D).toISOString() }), T0 + 3 * D);
    expect(p).toMatchObject({ stage: "announced", canEnter: false, canVote: false });
  });

  it("knows the gap between entries closing and voting opening", () => {
    const c = contest({
      submit_closes_at: new Date(T0 + 2 * D).toISOString(),
      vote_opens_at: new Date(T0 + 3 * D).toISOString(),
    });
    const p = phaseOf(c, T0 + 2 * D + H);
    expect(p).toMatchObject({ stage: "between", canEnter: false, canVote: false });
    expect(p.next).toEqual({ what: "voting-open", at: T0 + 3 * D });
  });

  it("treats each window as open at its start and closed at its end", () => {
    expect(phaseOf(contest(), T0).canEnter).toBe(true);
    expect(phaseOf(contest(), T0 + 7 * D).canEnter).toBe(false);
    expect(phaseOf(contest(), T0 + 2 * D).canVote).toBe(true);
    expect(phaseOf(contest(), T0 + 9 * D).canVote).toBe(false);
  });
});

describe("who sees the count", () => {
  it("is hidden from members unless the contest shows it", () => {
    expect(countsShown(contest(), false)).toBe(false);
    expect(countsShown(contest({ show_votes: true }), false)).toBe(true);
  });

  it("is shown to everybody once announced", () => {
    expect(countsShown(contest({ announced_at: new Date(T0).toISOString() }), false)).toBe(true);
  });

  it("is shown to an admin with the switch on", () => {
    expect(countsShown(contest(), true)).toBe(true);
  });
});

describe("a new look", () => {
  it("is new for a day while the contest runs", () => {
    const c = contest();
    const e = { created_at: new Date(T0 + 3 * D).toISOString(), approved_at: null };
    expect(isNewEntry(e, c, T0 + 3 * D + H)).toBe(true);
    expect(isNewEntry(e, c, T0 + 4 * D + H)).toBe(false);
  });

  it("is new from when it was let in, when that came later", () => {
    const c = contest({ needs_approval: true });
    const e = {
      created_at: new Date(T0 + D).toISOString(),
      approved_at: new Date(T0 + 3 * D).toISOString(),
    };
    expect(isNewEntry(e, c, T0 + 3 * D + H)).toBe(true);
  });

  it("is not new once the contest is over", () => {
    const c = contest({ announced_at: new Date(T0 + 3 * D).toISOString() });
    const e = { created_at: new Date(T0 + 3 * D).toISOString(), approved_at: null };
    expect(isNewEntry(e, c, T0 + 3 * D + H)).toBe(false);
  });
});

describe("a look waiting for approval", () => {
  const waiting = { hidden: false, approved_at: null };
  const approved = { hidden: false, approved_at: new Date(T0).toISOString() };

  it("waits only where the contest asks for approval", () => {
    expect(isPending(waiting, contest({ needs_approval: true }))).toBe(true);
    expect(isPending(waiting, contest({ needs_approval: false }))).toBe(false);
    expect(isPending(approved, contest({ needs_approval: true }))).toBe(false);
  });

  it("is out of the running while it waits, and so is a hidden one", () => {
    expect(inPlay(waiting, contest({ needs_approval: true }))).toBe(false);
    expect(inPlay(approved, contest({ needs_approval: true }))).toBe(true);
    expect(inPlay({ ...approved, hidden: true }, contest())).toBe(false);
  });

  it("comes into the running when approval is switched off", () => {
    expect(inPlay(waiting, contest({ needs_approval: false }))).toBe(true);
  });
});

describe("the order a reader sees the looks in", () => {
  const looks = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ id }));

  it("is the same every time for the same reader", () => {
    expect(shuffleFor(looks, "a").map((x) => x.id))
      .toEqual(shuffleFor(looks, "a").map((x) => x.id));
  });

  it("does not depend on the order the database sent them in", () => {
    expect(shuffleFor([...looks].reverse(), "a").map((x) => x.id))
      .toEqual(shuffleFor(looks, "a").map((x) => x.id));
  });

  it("differs between readers", () => {
    expect(shuffleFor(looks, "a").map((x) => x.id))
      .not.toEqual(shuffleFor(looks, "b").map((x) => x.id));
  });

  it("keeps everything else where it was when a late look arrives", () => {
    const before = shuffleFor(looks, "a").map((x) => x.id);
    const after = shuffleFor([...looks, { id: 9 }], "a").map((x) => x.id).filter((id) => id !== 9);
    expect(after).toEqual(before);
  });

  it("loses and invents nothing", () => {
    expect(shuffleFor(looks, "z").map((x) => x.id).sort((a, b) => a - b))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("places", () => {
  const at = (n: number) => new Date(T0 + n * H).toISOString();
  const looks = [
    { id: 1, created_at: at(1) }, { id: 2, created_at: at(2) },
    { id: 3, created_at: at(3) }, { id: 4, created_at: at(4) },
  ];

  it("puts the most popoto first", () => {
    const got = placeEntries(looks, new Map([[3, 9], [1, 4], [2, 1]]));
    expect(got.map((p) => [p.entry.id, p.votes, p.place]))
      .toEqual([[3, 9, 1], [1, 4, 2], [2, 1, 3], [4, 0, 4]]);
  });

  it("shares a place on a tie and skips the next one", () => {
    const got = placeEntries(looks, new Map([[1, 5], [2, 3], [3, 3], [4, 1]]));
    expect(got.map((p) => p.place)).toEqual([1, 2, 2, 4]);
  });

  it("lists a tie by who entered first, without ranking them apart", () => {
    const got = placeEntries(looks, new Map([[4, 2], [2, 2]]));
    expect(got.slice(0, 2).map((p) => [p.entry.id, p.place])).toEqual([[2, 1], [4, 1]]);
  });

  it("gives everybody first place when nobody has any", () => {
    expect(placeEntries(looks, new Map()).map((p) => p.place)).toEqual([1, 1, 1, 1]);
  });
});

describe("the admin form's dates", () => {
  it("round-trips a local time through the input", () => {
    const iso = new Date(2026, 9, 20, 18, 30).toISOString();
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  });

  it("reads a half-typed input as nothing", () => {
    expect(fromLocalInput("2026-10-20T1")).toBeNull();
    expect(fromLocalInput("")).toBeNull();
    expect(toLocalInput(null)).toBe("");
  });

  it("starts a new contest with dates that pass its own checks", () => {
    expect(datesProblem(defaultDates(new Date(2026, 9, 1, 15, 0)))).toBeNull();
  });

  it("names which date is wrong", () => {
    const ok = {
      submit_opens_at: new Date(T0).toISOString(),
      submit_closes_at: new Date(T0 + 7 * D).toISOString(),
      vote_opens_at: new Date(T0 + 2 * D).toISOString(),
      vote_closes_at: new Date(T0 + 9 * D).toISOString(),
    };
    expect(datesProblem(ok)).toBeNull();
    expect(datesProblem({ ...ok, vote_closes_at: undefined })).toBe("contest.adm.errDatesMissing");
    expect(datesProblem({ ...ok, submit_closes_at: ok.submit_opens_at }))
      .toBe("contest.adm.errEntriesBackwards");
    expect(datesProblem({ ...ok, vote_closes_at: ok.vote_opens_at }))
      .toBe("contest.adm.errVotingBackwards");
    expect(datesProblem({ ...ok, vote_opens_at: new Date(T0 - D).toISOString() }))
      .toBe("contest.adm.errVotingBeforeEntries");
    expect(datesProblem({ ...ok, vote_closes_at: new Date(T0 + 6 * D).toISOString() }))
      .toBe("contest.adm.errVotingEndsFirst");
  });
});

describe("what a refusal means", () => {
  it("reads a second look as already entered", () => {
    expect(contestError({ code: "23505", message: "duplicate key" })).toBe("contest.err.alreadyIn");
  });

  it("reads each reason the database gives", () => {
    expect(contestError({ message: "entries are closed" })).toBe("contest.err.entriesClosed");
    expect(contestError({ message: "voting is closed" })).toBe("contest.err.votingClosed");
    expect(contestError({ message: "no popoto left" })).toBe("contest.err.noneLeft");
    expect(contestError({ message: "not your own" })).toBe("contest.err.ownLook");
    expect(contestError({ message: "this contest is for the FC" })).toBe("contest.err.fcOnly");
    expect(contestError({ message: "verify your character first" })).toBe("contest.err.verify");
    expect(contestError({ message: "a look needs a picture" })).toBe("contest.err.noPicture");
    expect(contestError({ message: "four pictures at most" })).toBe("contest.err.tooMany");
  });

  it("falls back to a general sentence for anything else", () => {
    expect(contestError({ message: "something odd" })).toBe("contest.err.generic");
    expect(contestError(null)).toBe("contest.err.generic");
  });
});

describe("where a picture lives", () => {
  it("keeps the slashes and encodes the rest", () => {
    expect(fileUrl("12/ab cd/x.webp")).toMatch(/\/storage\/v1\/object\/public\/contest\/12\/ab%20cd\/x\.webp$/);
  });
});

describe("talking under your own look", () => {
  it("is closed while the contest hides names", () => {
    expect(talkClosedToOwner(contest({ hide_names: true }), { mine: true })).toBe(true);
  });

  it("opens once the result is out", () => {
    const c = contest({ hide_names: true, announced_at: new Date(T0).toISOString() });
    expect(talkClosedToOwner(c, { mine: true })).toBe(false);
  });

  it("is never closed where names show, or on somebody else's look", () => {
    expect(talkClosedToOwner(contest({ hide_names: false }), { mine: true })).toBe(false);
    expect(talkClosedToOwner(contest({ hide_names: true }), { mine: false })).toBe(false);
  });
});
