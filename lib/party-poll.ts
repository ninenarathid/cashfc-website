/**
 * A question the lead asks the party, and the answers under it.
 *
 * The model only: what a question is, what pressing a choice means, and what
 * the form may send. Where it is kept is lib/party-db.ts, and who may do what
 * is the database's to say (v136) — the limits here are the same numbers said
 * a second time, so the form can explain a refusal before the database makes
 * one.
 */

/** Somebody who picked a choice, as the database named them when they did. */
export interface PollVoter {
  /** The account, which is how "mine" is told from everybody else's. */
  profileId: string;
  /** Their character, for the face and the name the roster has today. */
  characterId: number | null;
  /** The name on their profile at the moment they answered. */
  name: string | null;
}

export interface PollChoice {
  id: string;
  label: string;
  /** Who picked it, first to answer first. */
  by: PollVoter[];
}

export interface PartyPoll {
  id: string;
  question: string;
  /** Several answers each, where the question is "which evenings can you do". */
  multi: boolean;
  /** When the lead stopped taking answers, or null while it is open. */
  closedAt: string | null;
  createdAt: string;
  choices: PollChoice[];
}

/** v136's limits. The database refuses anything past them whatever this says. */
export const POLL_QUESTION_MAX = 200;
export const POLL_CHOICE_MAX = 80;
export const POLL_CHOICES_MIN = 2;
export const POLL_CHOICES_MAX = 10;
export const POLLS_PER_PARTY = 10;

/** How many people have answered, however many choices each of them picked. */
export function pollAnswered(p: PartyPoll): number {
  const who = new Set<string>();
  for (const c of p.choices) for (const v of c.by) who.add(v.profileId);
  return who.size;
}

/** The choices this account has picked, in the question's own order. */
export const myPicks = (p: PartyPoll, profileId: string | null): string[] =>
  (profileId
    ? p.choices.filter((c) => c.by.some((v) => v.profileId === profileId)).map((c) => c.id)
    : []);

/** The questions still taking answers. */
export const openPolls = (polls: readonly PartyPoll[] | undefined): PartyPoll[] =>
  (polls ?? []).filter((p) => !p.closedAt);

/** Whether an open question has nothing from this account yet. */
export const pollWaitsOn = (
  polls: readonly PartyPoll[] | undefined, profileId: string | null,
): boolean =>
  !!profileId && openPolls(polls).some((p) => !myPicks(p, profileId).length);

/**
 * What my answer becomes when I press a choice.
 *
 * Pressing the one I hold takes it back, in both kinds: the second press on
 * the same thing is how everything else on this board is undone. Where the
 * question takes one answer, pressing another moves it there.
 */
export function pressChoice(p: PartyPoll, mine: string[], choiceId: string): string[] {
  if (!p.choices.some((c) => c.id === choiceId)) return mine;
  if (mine.includes(choiceId)) return mine.filter((id) => id !== choiceId);
  return p.multi ? [...mine, choiceId] : [choiceId];
}

/**
 * The question as it reads once my answer is exactly `picks`.
 *
 * For drawing the press at once, before the database has answered. Everybody
 * else's answers are left where they are, and a choice I already held keeps my
 * place in its line.
 */
export function withPicks(p: PartyPoll, me: PollVoter, picks: string[]): PartyPoll {
  const want = new Set(picks);
  return {
    ...p,
    choices: p.choices.map((c) => {
      const has = c.by.some((v) => v.profileId === me.profileId);
      if (want.has(c.id)) return has ? c : { ...c, by: [...c.by, me] };
      return has ? { ...c, by: c.by.filter((v) => v.profileId !== me.profileId) } : c;
    }),
  };
}

/** The choices as they will be sent: trimmed, and the empty ones left out. */
export const cleanChoices = (typed: readonly string[]): string[] =>
  typed.map((s) => s.trim()).filter(Boolean);

/** Why a question cannot be asked yet, or null when it can. */
export type PollProblem = "question" | "few" | "many" | "same" | "long";

/**
 * What is wrong with the form, in the order somebody would fix it.
 *
 * The same rules party_poll_create holds, so the button can say why before the
 * database does. Two choices that differ only in their capitals are the same
 * choice there, and so here.
 */
export function pollProblem(question: string, typed: readonly string[]): PollProblem | null {
  const q = question.trim();
  if (!q || q.length > POLL_QUESTION_MAX) return "question";
  const choices = cleanChoices(typed);
  if (choices.length < POLL_CHOICES_MIN) return "few";
  if (choices.length > POLL_CHOICES_MAX) return "many";
  if (choices.some((c) => c.length > POLL_CHOICE_MAX)) return "long";
  if (new Set(choices.map((c) => c.toLowerCase())).size !== choices.length) return "same";
  return null;
}

/** Whether one more choice may be added to a question that already stands. */
export function choiceProblem(p: PartyPoll, typed: string): PollProblem | null {
  const label = typed.trim();
  if (!label) return "few";
  if (label.length > POLL_CHOICE_MAX) return "long";
  if (p.choices.length >= POLL_CHOICES_MAX) return "many";
  if (p.choices.some((c) => c.label.toLowerCase() === label.toLowerCase())) return "same";
  return null;
}
