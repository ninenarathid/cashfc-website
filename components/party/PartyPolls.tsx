"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Party } from "@/lib/party";
import type { PersonOption } from "@/lib/people";
import {
  POLLS_PER_PARTY, POLL_CHOICES_MAX, POLL_CHOICES_MIN, POLL_CHOICE_MAX,
  POLL_QUESTION_MAX, choiceProblem, cleanChoices, myPicks, pollAnswered,
  pollProblem, pressChoice, withPicks,
} from "@/lib/party-poll";
import type { PartyPoll, PollProblem, PollVoter } from "@/lib/party-poll";
import {
  addPollChoice, answerPoll, askPoll, closePoll, dropPoll,
} from "@/lib/party-db";
import { useAvatarOverrides } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";
import type { Key } from "@/lib/i18n";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * The questions a lead asks the party, and everybody's answers.
 *
 * A party settles a dozen small things before it starts — which evening, what
 * time, which fight first — and until now each was a message under the party
 * and eight replies to count by hand. So the lead asks it once, with the
 * answers written out, and everybody presses one.
 *
 * Under the seats and above the conversation, which is where it sits in the
 * order somebody reads a party: what it is, whether there is a place in it,
 * and then what is being asked and said.
 *
 * The answers are shown as they stand, to everybody, before they have
 * answered. The gallery's poll holds its totals back because it decides
 * something and a running score is a nudge; this one arranges an evening, and
 * "the other five can all do Saturday" is exactly what the sixth person needs
 * to know before answering. For the same reason every answer has a face on
 * it: who is free is the answer, not how many.
 *
 * Who may do what is the database's to say (v136). What this decides is only
 * which buttons to draw.
 */
export default function PartyPolls(
  { party, me, userId, people, supabase, canAsk, refresh, setErr, setParties }: {
    party: Party;
    /** The reader's proved character, or null without one. */
    me: PersonOption | null;
    userId: string | null;
    /** The roster, for the faces and today's names under each choice. */
    people: PersonOption[];
    supabase: SupabaseClient | null;
    /** The lead, or an admin standing in for one. */
    canAsk: boolean;
    refresh: () => Promise<void>;
    setErr: (m: string | null) => void;
    setParties: React.Dispatch<React.SetStateAction<Party[]>>;
  },
) {
  const { t } = useLang();
  const [asking, setAsking] = useState(false);
  const roster = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  /*
   * One answer at a time, in the order they were pressed.
   *
   * Each press sends the whole answer, so two sent a moment apart must land in
   * the order they were made: the second arriving first would leave the
   * database holding the older one while the card shows the newer. A chain
   * rather than a lock, because a press is never refused — it waits its turn.
   */
  const line = useRef<Promise<unknown>>(Promise.resolve());

  const polls = party.polls;
  // A board whose database has no questions yet: nothing to draw, and no
  // button that could only fail.
  if (polls === undefined) return null;
  if (!polls.length && !canAsk) return null;

  const mayAnswer = !!supabase && !!userId && !!me;

  const answer = (poll: PartyPoll, choiceId: string) => {
    if (!supabase || !userId || !me || poll.closedAt) return;
    const picks = pressChoice(poll, myPicks(poll, userId), choiceId);
    const voter: PollVoter = { profileId: userId, characterId: me.id, name: me.name };
    // On the card first: an answer that waits for a round trip before it
    // shows reads as a press that did not take.
    setParties((v) => v.map((x) => (x.id === party.id ? {
      ...x,
      polls: (x.polls ?? []).map((q) => (q.id === poll.id ? withPicks(q, voter, picks) : q)),
    } : x)));
    line.current = line.current.then(async () => {
      const r = await answerPoll(supabase, poll.id, picks);
      if (r.error) { setErr(r.error); await refresh(); }
    });
  };

  /** Do it, say so if it failed, and read the board back either way. */
  const run = async (go: () => Promise<{ error?: string }>) => {
    const r = await go();
    if (r.error) setErr(r.error);
    await refresh();
    return !r.error;
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h3 className="font-data text-read text-muted">
          <span aria-hidden>📊 </span>{t("pf.polls")}
        </h3>
        {canAsk && !asking && polls.length < POLLS_PER_PARTY && (
          <button type="button" onClick={() => setAsking(true)}
                  className="ml-auto py-1 text-read text-accent hover:underline">
            + {t("pf.pollAsk")}
          </button>
        )}
        {canAsk && polls.length >= POLLS_PER_PARTY && (
          <span className="ml-auto text-ui text-muted">
            {t("pf.pollFull", { n: POLLS_PER_PARTY })}
          </span>
        )}
      </div>

      {polls.map((p) => (
        <PollCard key={p.id} poll={p} roster={roster} userId={userId}
                  mayAnswer={mayAnswer} signedIn={!!userId} canAsk={canAsk}
                  onAnswer={(choiceId) => answer(p, choiceId)}
                  onAddChoice={supabase
                    ? (label) => run(() => addPollChoice(supabase, p.id, label)) : undefined}
                  onClose={supabase
                    ? (closed) => void run(() => closePoll(supabase, p.id, closed)) : undefined}
                  onDrop={supabase
                    ? () => void run(() => dropPoll(supabase, p.id)) : undefined} />
      ))}

      {asking && supabase && (
        <PollForm
          onCancel={() => setAsking(false)}
          onAsk={async (q) => {
            const r = await askPoll(supabase, party.id, q);
            if ("error" in r) { setErr(r.error); return false; }
            setAsking(false);
            await refresh();
            return true;
          }} />
      )}
    </section>
  );
}

/** Why the form will not send yet, in words. */
const PROBLEM: Record<PollProblem, Key> = {
  question: "pf.pollNeedQuestion",
  few: "pf.pollNeedTwo",
  many: "pf.pollTooMany",
  same: "pf.pollSame",
  long: "pf.pollTooLong",
};

/**
 * One question, with its choices as the buttons that answer it.
 *
 * The row is the control: the words, how many picked them and who are all on
 * the thing that is pressed, so nobody reads a result in one place and
 * answers in another.
 */
function PollCard(
  { poll, roster, userId, mayAnswer, signedIn, canAsk, onAnswer, onAddChoice,
    onClose, onDrop }: {
    poll: PartyPoll;
    roster: Map<number, PersonOption>;
    userId: string | null;
    /** Signed in with a proved character. Whether it is open is the poll's. */
    mayAnswer: boolean;
    signedIn: boolean;
    canAsk: boolean;
    onAnswer: (choiceId: string) => void;
    onAddChoice?: (label: string) => Promise<boolean>;
    onClose?: (closed: boolean) => void;
    onDrop?: () => void;
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  /** Whether the names are written out under each choice. */
  const [named, setNamed] = useState(false);
  const [dropping, setDropping] = useState(false);
  /** The choice the lead is adding, or null while they are not. */
  const [extra, setExtra] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const closed = !!poll.closedAt;
  const answered = pollAnswered(poll);
  const mine = myPicks(poll, userId);
  const canPress = mayAnswer && !closed;
  const canAdd = canAsk && !closed && !!onAddChoice && poll.choices.length < POLL_CHOICES_MAX;
  const extraProblem = extra != null && extra.trim() ? choiceProblem(poll, extra) : null;

  /** Today's name where the roster has one; the name they answered under otherwise. */
  const nameOf = (v: PollVoter) =>
    (v.characterId != null ? roster.get(v.characterId)?.name : undefined) ?? v.name ?? "—";
  const faceOf = (v: PollVoter) => (v.characterId != null
    ? overrides[v.characterId] || roster.get(v.characterId)?.avatar || null : null);

  const addChoice = async () => {
    if (!onAddChoice || extra == null || busy || choiceProblem(poll, extra)) return;
    setBusy(true);
    const ok = await onAddChoice(extra.trim());
    setBusy(false);
    if (ok) setExtra(null);
  };

  return (
    <article className={`flex flex-col gap-2 rounded-xl border bg-card/40 p-3 ${
      closed ? "border-line" : "border-accent/35"}`}>
      <header className="flex flex-col gap-0.5">
        <p className="whitespace-pre-wrap break-words text-lead leading-relaxed text-ink">
          {poll.question}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-ui text-muted">
          <span>{t(poll.multi ? "pf.pollMany" : "pf.pollOne")}</span>
          <span aria-hidden className="opacity-40">·</span>
          <span>{answered ? t("pf.pollAnswered", { n: answered }) : t("pf.pollNobody")}</span>
          {closed && (
            <span className="rounded-full border border-line-strong px-2 font-data text-meta text-ink/80">
              {t("pf.pollClosed")}
            </span>
          )}
        </p>
      </header>

      <ul className="flex flex-col gap-1.5">
        {poll.choices.map((c) => {
          const picked = mine.includes(c.id);
          const n = c.by.length;
          const share = answered ? n / answered : 0;
          const names = c.by.map(nameOf);
          const inner = (
            <>
              {/* The share, drawn behind the words rather than beside them, so
                  the row is both the answer and how many chose it. Scaled, not
                  resized: the bar moves on every answer anybody gives. */}
              <span aria-hidden style={{ transform: `scaleX(${share})` }}
                    className={`absolute inset-0 origin-left transition-transform duration-300 ease-[var(--ease-settle)] motion-reduce:transition-none ${
                      picked ? "bg-accent/20" : "bg-line/45"}`} />
              <span className="relative flex items-center gap-2.5">
                {/* A dot for one answer and a box for several, so the kind of
                    question is drawn on every row and not only said above.
                    Left off a row nobody can press unless it is the reader's
                    own answer: an empty box is an invitation. */}
                {(canPress || picked) && (
                  <span aria-hidden
                        className={`grid size-[18px] shrink-0 place-items-center border font-data text-meta leading-none ${
                          poll.multi ? "rounded" : "rounded-full"} ${
                          picked ? "border-accent bg-accent text-bg" : "border-line-strong"}`}>
                    {picked ? "✓" : ""}
                  </span>
                )}
                <span className="min-w-0 flex-1 break-words text-read leading-relaxed text-ink">
                  {c.label}
                </span>
                {n > 0 && (
                  <span aria-hidden className="flex shrink-0 items-center">
                    {c.by.slice(0, 4).map((v, i) => {
                      const src = faceOf(v);
                      return src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={v.profileId} src={src} alt="" title={names[i]}
                             width={20} height={20} loading="lazy" decoding="async"
                             className="-ml-1.5 size-5 rounded-full border border-bg object-cover first:ml-0" />
                      ) : (
                        <span key={v.profileId} title={names[i]}
                              className="-ml-1.5 grid size-5 place-items-center rounded-full border border-bg bg-line font-data text-label text-ink first:ml-0">
                          {names[i].slice(0, 1)}
                        </span>
                      );
                    })}
                    {n > 4 && (
                      <span className="ml-1 font-data text-meta text-muted">+{n - 4}</span>
                    )}
                  </span>
                )}
                <span className="w-5 shrink-0 text-right font-data text-ui tabular-nums text-muted">
                  {n}
                </span>
                <span className="sr-only">
                  {t("pf.pollPickedBy", { n, who: names.join(", ") || "—" })}
                </span>
              </span>
            </>
          );
          const box = `relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors ${
            picked ? "border-accent" : "border-line"}`;
          return (
            <li key={c.id} className="flex flex-col gap-1">
              {canPress ? (
                <button type="button" aria-pressed={picked} onClick={() => onAnswer(c.id)}
                        className={`${box} hover:border-accent/70`}>
                  {inner}
                </button>
              ) : (
                // Not a disabled button: there is nothing to press, and a
                // greyed-out control invites a press that will never count.
                <div className={box}>{inner}</div>
              )}
              {named && n > 0 && (
                <p className="break-words px-1 text-ui leading-relaxed text-muted">
                  {names.join(", ")}
                </p>
              )}
            </li>
          );
        })}
        {/* One more choice, where the next one would be written: the last row
            of the list, shaped like a choice that is not there yet. It used
            to be a small grey link beside "close" and "delete" under the
            card, and a lead whose question already had answers took the list
            for settled. It never was: the database adds a choice for as long
            as the question is open, and nobody's answer moves. */}
        {canAdd && (
          <li>
            {extra == null ? (
              <button type="button" onClick={() => setExtra("")}
                      className="w-full rounded-lg border border-dashed border-line-strong px-3 py-2 text-left text-read text-accent transition-colors hover:border-accent/70 hover:bg-accent/10">
                + {t("pf.pollAddChoice")}
              </button>
            ) : (
              <form className="flex flex-col gap-1.5"
                    onSubmit={(e) => { e.preventDefault(); void addChoice(); }}>
                <div className="flex items-center gap-2">
                  <input value={extra} autoFocus maxLength={POLL_CHOICE_MAX}
                         onChange={(e) => setExtra(e.target.value)}
                         aria-label={t("pf.pollAddChoice")}
                         placeholder={t("pf.pollChoiceN", { n: poll.choices.length + 1 })}
                         className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-read text-ink placeholder:text-muted" />
                  <button type="submit" disabled={busy || !extra.trim() || !!extraProblem}
                          className="shrink-0 rounded-lg border border-accent/60 bg-accent/15 px-3 py-2 text-read text-accent hover:bg-accent/25 disabled:opacity-50">
                    {t("pf.pollAdd")}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setExtra(null)}
                          className="shrink-0 py-2 text-read text-muted hover:text-ink">
                    {t("common.cancel")}
                  </button>
                </div>
                {extraProblem ? (
                  <p className="text-ui text-gold">
                    {t(PROBLEM[extraProblem], { n: extraProblem === "long" ? POLL_CHOICE_MAX : POLL_CHOICES_MAX })}
                  </p>
                ) : answered > 0 && (
                  // What a lead wonders at this moment, with answers already in.
                  <p className="text-ui leading-relaxed text-muted">{t("pf.pollAddKeeps")}</p>
                )}
              </form>
            )}
          </li>
        )}
      </ul>

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {/* What pressing does, or why it does nothing. Said once, under the
            choices, rather than on a disabled copy of each of them. */}
        {!closed && (
          <p className="min-w-0 flex-1 basis-48 text-ui leading-relaxed text-muted">
            {!signedIn ? t("pf.pollSignIn")
              : !mayAnswer ? t("gate.needCharacter")
              : mine.length ? t("pf.pollChange")
              : t(poll.multi ? "pf.pollPressMany" : "pf.pollPressOne")}
          </p>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-x-3">
          {answered > 0 && (
            <button type="button" aria-expanded={named} onClick={() => setNamed((v) => !v)}
                    className="py-1 text-ui text-accent hover:underline">
              {t(named ? "pf.pollWhoHide" : "pf.pollWho")}
            </button>
          )}
          {canAsk && (
            <>
              {onClose && (
                <button type="button" onClick={() => onClose(!closed)}
                        className="py-1 text-ui text-muted hover:text-ink">
                  {t(closed ? "pf.pollReopen" : "pf.pollClose")}
                </button>
              )}
              {onDrop && (
                <button type="button" onClick={() => setDropping(true)}
                        className="py-1 text-ui text-muted hover:text-chili">
                  {t("pf.pollDelete")}
                </button>
              )}
            </>
          )}
        </span>
      </footer>

      {dropping && (
        <ConfirmDialog z={120} danger
                       message={t("pf.pollDeleteAsk")}
                       confirmLabel={t("pf.pollDelete")}
                       onCancel={() => setDropping(false)}
                       onConfirm={() => { setDropping(false); onDrop?.(); }} />
      )}
    </article>
  );
}

/**
 * Asking one.
 *
 * A question and a short list. The list ends in an empty line as long as
 * there is room for another, so adding a choice is typing in the next box
 * rather than finding a button first — the button is there as well, for
 * somebody who looks for it.
 */
function PollForm(
  { onAsk, onCancel }: {
    onAsk: (q: { question: string; choices: string[]; multi: boolean }) => Promise<boolean>;
    onCancel: () => void;
  },
) {
  const { t } = useLang();
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState<string[]>(["", ""]);
  const [multi, setMulti] = useState(false);
  const [busy, setBusy] = useState(false);
  /** The choice box to put the cursor in after the next render. */
  const [focusAt, setFocusAt] = useState<number | null>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (focusAt == null) return;
    boxes.current[focusAt]?.focus();
    setFocusAt(null);
  }, [focusAt, choices.length]);

  const problem = pollProblem(question, choices);
  // Nothing to complain about until somebody has started: an empty form is
  // not a mistake yet.
  const started = !!question.trim() || choices.some((c) => c.trim());

  const addBox = () => {
    if (choices.length >= POLL_CHOICES_MAX) return;
    setChoices((v) => [...v, ""]);
    setFocusAt(choices.length);
  };

  const send = async () => {
    if (busy || problem) return;
    setBusy(true);
    const ok = await onAsk({ question: question.trim(), choices: cleanChoices(choices), multi });
    // Gone on success: the parent has already put the form away.
    if (!ok) setBusy(false);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="flex flex-col gap-2 rounded-xl border border-line bg-bg/40 p-3">
      <label className="flex flex-col gap-1">
        <span className="text-read text-muted">{t("pf.pollQuestion")}</span>
        <input value={question} autoFocus maxLength={POLL_QUESTION_MAX}
               onChange={(e) => setQuestion(e.target.value)}
               placeholder={t("pf.pollQuestionHint")}
               className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-title text-ink placeholder:text-muted" />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-read text-muted">{t("pf.pollChoices")}</span>
        {choices.map((c, i) => (
          // The index is the key on purpose: these are positions in a list
          // somebody is typing down, and nothing here is reordered.
          <div key={i} className="flex items-center gap-2">
            <input ref={(el) => { boxes.current[i] = el; }}
                   value={c} maxLength={POLL_CHOICE_MAX}
                   onChange={(e) => setChoices((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
                   onKeyDown={(e) => {
                     // Return in the last box is "and another", the way a
                     // list is typed everywhere else.
                     if (e.key !== "Enter" || i !== choices.length - 1 || !c.trim()) return;
                     if (choices.length >= POLL_CHOICES_MAX) return;
                     e.preventDefault();
                     addBox();
                   }}
                   aria-label={t("pf.pollChoiceN", { n: i + 1 })}
                   placeholder={t("pf.pollChoiceN", { n: i + 1 })}
                   className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-read text-ink placeholder:text-muted" />
            {choices.length > POLL_CHOICES_MIN && (
              <button type="button"
                      onClick={() => setChoices((v) => v.filter((_, j) => j !== i))}
                      aria-label={t("pf.pollRemoveChoice")}
                      className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-read text-muted hover:border-chili/60 hover:text-chili">
                ✕
              </button>
            )}
          </div>
        ))}
        {choices.length < POLL_CHOICES_MAX && (
          <button type="button" onClick={addBox}
                  className="self-start py-1 text-read text-accent hover:underline">
            + {t("pf.pollAddChoice")}
          </button>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-read text-ink/90">
        <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
        {t("pf.pollMultiple")}
      </label>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="submit" disabled={busy || !!problem}
                className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-1.5 text-lead text-accent hover:bg-accent/25 disabled:opacity-50">
          {busy ? t("pf.pollPosting") : t("pf.pollPost")}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}
                className="py-1.5 text-lead text-muted hover:text-ink">
          {t("common.cancel")}
        </button>
        {started && problem && (
          <span className="text-ui text-gold">
            {t(PROBLEM[problem], {
              n: problem === "long" ? POLL_CHOICE_MAX
                : problem === "few" ? POLL_CHOICES_MIN : POLL_CHOICES_MAX,
            })}
          </span>
        )}
      </div>
    </form>
  );
}
