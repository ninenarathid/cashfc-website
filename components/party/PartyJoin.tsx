"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonOption } from "@/lib/people";
import { fmtDateTime } from "@/lib/dates";
import type { Flex, Party } from "@/lib/party";
import { askedAbout, flexLabel, openSeats, partyStatus } from "@/lib/party";
import { acceptInvite, confirmSeat, dropSeat } from "@/lib/party-db";
import { useLang } from "@/lib/i18n";
import { useAvatarOverrides } from "@/lib/avatars";

/**
 * Asking to be let in, and letting people in.
 *
 * The board could already describe a party and could not do the one thing
 * somebody reading it wants to do next. Joining happened in Discord, which
 * meant the listing was out of date the moment it worked.
 *
 * Two-sided on purpose. A member asks and the lead answers, rather than a
 * member simply taking a seat: a party is somebody's evening, and a stranger
 * appearing in it uninvited is how a static ends up with a ninth person on
 * reclear night. The request costs the lead one press and costs the member
 * nothing, and until it is answered the seat is still advertised — an
 * unanswered request is not a filled seat, the same rule the invitations
 * already follow.
 */

type Who = { seatRowId?: number; characterId: number | null; name: string;
             avatar: string | null; confirmedAt: string | null;
             by?: "owner" | "self"; flex?: Flex;
             /** The seat id, where there is one. Absent means floating. */
             seat?: string };

/**
 * Everybody in the party or at the door, as one list.
 *
 * The seat id is carried along rather than left behind as the key of the
 * object it came out of, because every question asked here — who is waiting,
 * what did they ask for — needs the person and the seat together.
 *
 * The requests are in it here and nowhere else on the board, which is the
 * point of this file: the grid, the headcount and the shortfall describe the
 * party, and this describes what is being decided about it. Both questions
 * asked here — is this reader in it, and who is the lead being kept waiting by
 * — are questions about people who may well not be in it yet.
 */
const roster = (p: Party): Who[] => [
  ...Object.entries(p.seats).map(([seat, v]) => ({ ...v, seat })),
  ...(p.floating ?? []),
  ...(p.requests ?? []),
  ...(p.invites ?? []),
];

export default function PartyJoin(
  { party, me, userId, supabase, now, clash, onDone, onError }: {
    party: Party;
    /** The board's clock, which decides whether it is too late to leave. */
    now: number;
    /** What it is for, which decides whether a job is even a question. */
    me: PersonOption | null;
    userId: string | null;
    supabase: SupabaseClient | null;
    /**
     * A party this reader is already in over the same hours.
     *
     * Worked out by the board, which is the only place holding everybody's
     * parties to compare against. Null when their evening is free.
     */
    clash?: Party | null;
    /** Reload, because a seat changing changes the counts on the whole row. */
    onDone: () => void | Promise<void>;
    onError: (m: string) => void;
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  const [busy, setBusy] = useState(false);
  /*
   * Past the point of dropping out.
   *
   * An hour before the start the row turns amber, everybody in the party is
   * told, and that is the moment the rest of them start counting on you. A
   * seat given up at ten to eight is a seat nobody can fill, so it stops being
   * something you can give up: being in it an hour before is the answer.
   *
   * Somebody who has not answered is not held to anything — they never said
   * yes, and an invitation that cannot be turned down is not an invitation.
   * The same goes for a request nobody has accepted: withdrawing it takes
   * nothing away from anybody.
   */
  const started = partyStatus(party, now) !== "upcoming";
  const iAmOwner = !!me && party.ownerCharacterId === me.id;
  const mine = useMemo(
    () => (me ? roster(party).find((m) => m.characterId === me.id) : undefined),
    [party, me]);

  /*
   * Requests waiting on the lead. Invitations are somebody else's to answer.
   *
   * The board no longer draws these anywhere — an unanswered request is not a
   * seat and is not one of the eight — so this panel is the only place they
   * appear, and the only place the lead can say yes from. See Party.requests.
   */
  const waiting = party.requests ?? [];

  /** The seat this reader was asked about, where they were asked about one. */
  const asked = askedAbout(mine);
  /*
   * And whether somebody has since sat in it.
   *
   * Everything else this panel knew about seats — which are open, which wings
   * they fall in, which jobs each would take — went with the join form. The
   * grid above is the control now and works that out for itself; the one
   * question left here is about an invitation this reader is holding.
   */
  const seatGone = !!asked && !openSeats(party).some((sl) => sl.id === asked);

  if (!me || !userId || !supabase) return null;

  const run = async (fn: () => Promise<{ error?: string } | { id: string }>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if ("error" in r && r.error) { onError(r.error); return; }
    await onDone();
  };

  const btn = "rounded-lg px-3 py-1.5 text-[15.5px] transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2.5">
      {/* ── The lead's side: who is waiting ────────────────────────────── */}
      {iAmOwner && waiting.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-gold/40 bg-gold/[0.07] p-2.5">
          <p className="font-data text-[13.5px] uppercase tracking-[0.14em] text-gold">
            {t("party.waitingOnYou", { n: waiting.length })}
          </p>
          {waiting.map((w) => {
            const src = (w.characterId != null && overrides[w.characterId]) || w.avatar;
            return (
              <div key={w.seatRowId ?? w.name}
                   className="flex flex-wrap items-center gap-2">
                {src
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={src} alt="" width={30} height={30}
                         className="size-[30px] rounded-full object-cover" />
                  : <span className="size-[30px] rounded-full bg-card" />}
                <span className="text-[16px] text-ink">{w.name}</span>
                <span className="text-[15px] text-muted">
                  {/* What they asked for. One seat named is that seat — it is
                      carried in the flex rather than held, so this is the only
                      thing that reads it back — several is the list, and
                      nothing at all is "wherever you need me". */}
                  {askedAbout(w) ?? flexLabel(w.flex) ?? t("party.anySeat")}
                </span>
                <span className="ml-auto flex gap-1.5">
                  <button disabled={busy}
                          onClick={() => run(() => confirmSeat(supabase, w.seatRowId!))}
                          className={`${btn} border border-jade/60 bg-jade/15 text-jade hover:bg-jade/25`}>
                    {t("party.letIn")}
                  </button>
                  <button disabled={busy}
                          onClick={() => run(() => dropSeat(supabase, w.seatRowId!))}
                          className={`${btn} border border-line text-muted hover:text-ink`}>
                    {t("party.turnDown")}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── The lead's side: who has been asked and has not answered ───── */}
      {iAmOwner && (party.invites ?? []).length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
          <p className="font-data text-[13.5px] uppercase tracking-[0.14em] text-muted">
            {t("party.invitesOut", { n: (party.invites ?? []).length })}
          </p>
          {(party.invites ?? []).map((w) => {
            const src = (w.characterId != null && overrides[w.characterId]) || w.avatar;
            /*
             * The seat only where one was suggested.
             *
             * An invitation does not have to name one — "come if you are
             * free" is the ordinary way to ask somebody — and printing
             * "ทุกตำแหน่ง" against every name would be a column of the same
             * word saying nothing. Where the lead did suggest one it is a
             * hint, not a reservation: whoever accepts picks their own.
             */
            const where = askedAbout(w) ?? flexLabel(w.flex);
            return (
              <span key={w.seatRowId ?? w.name}
                    className="flex flex-wrap items-center gap-2">
                {src
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={src} alt="" width={26} height={26}
                         className="size-[26px] rounded-full object-cover" />
                  : <span className="size-[26px] rounded-full bg-card" />}
                <span className="text-[15.5px] text-ink">{w.name}</span>
                {where && (
                  <span className="font-data text-[13px] uppercase tracking-[0.1em] text-steel">
                    {where}
                  </span>
                )}
                <button disabled={busy}
                        onClick={() => run(() => dropSeat(supabase, w.seatRowId!))}
                        className="ml-auto text-[14px] text-muted underline hover:text-chili">
                  {t("party.withdrawInvite")}
                </button>
              </span>
            );
          })}
          <p className="text-[14px] text-muted">{t("party.invitesWhy")}</p>
        </div>
      )}

      {/* ── The reader's side ───────────────────────────────────────────── */}
      {!iAmOwner && mine && !mine.confirmedAt && mine.by === "self" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15.5px] text-muted">
            {asked ? t("party.askedFor", { seat: asked }) : t("party.asked")}
          </span>
          <button disabled={busy}
                  onClick={() => run(() => dropSeat(supabase, mine.seatRowId!))}
                  className={`${btn} border border-line text-muted hover:text-ink`}>
            {t("party.withdraw")}
          </button>
        </div>
      )}

      {!iAmOwner && mine && !mine.confirmedAt && mine.by !== "self" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[15.5px] text-muted">
            {asked
              ? t("party.invitedTo", { seat: asked })
              : t("party.invited")}
          </span>
          {/* Which seat is theirs to decide, whether or not one was suggested:
              the lead asking about D4 is a suggestion, and somebody who would
              rather heal should not have to decline to say so. */}
          <span className="text-[14.5px] text-muted">{t("party.invitedPick")}</span>
          {/*
            * Said before they answer, not after.
            *
            * The lead may have asked three people about D4. If one of them has
            * already sat in it, this is the moment that matters — saying yes
            * is still worth doing and is a different yes, so it says so here
            * rather than surprising them on the way in.
            */}
          {asked && seatGone && (
            <span className="text-[15px] text-gold">
              {t("party.seatGone", { seat: asked })}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button disabled={busy}
                    onClick={() => run(async () => {
                      const r = await acceptInvite(supabase, mine.seatRowId!);
                      if ("error" in r) return r;
                      // Somebody filled the last seat while this was open.
                      if (r.got === "full") onError(t("party.tooLateFull"));
                      return {};
                    })}
                    className={`${btn} border border-jade/60 bg-jade/15 text-jade hover:bg-jade/25`}>
              {asked && !seatGone ? t("party.acceptSeat", { seat: asked })
                                  : t("party.acceptAnyway")}
            </button>
            <button disabled={busy}
                    onClick={() => run(() => dropSeat(supabase, mine.seatRowId!))}
                    className={`${btn} border border-line text-muted hover:text-ink`}>
              {t("party.turnDown")}
            </button>
          </div>
        </div>
      )}

      {mine?.confirmedAt && (
        <div className="flex flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15.5px] text-jade">
              {mine.seat ? t("party.youAreInAt", { seat: mine.seat })
                         : t("party.youAreIn")}
            </span>
            {started ? (
              <span className="text-[15px] text-muted">{t("party.tooLateToLeave")}</span>
            ) : (
              <button disabled={busy}
                      onClick={() => run(() => dropSeat(supabase, mine.seatRowId!))}
                      className={`${btn} border border-line text-muted hover:text-ink`}>
                {t("party.leave")}
              </button>
            )}
          </span>

          {/*
            * Pick where you are standing, afterwards.
            *
            * Which is the order people decide in: yes to the evening first,
            * and the seat when the party has taken shape. Somebody who never
            * picks one is a floater, which the resolver has always known what
            * to do with.
            */}
          {/* The seats themselves are where a seat is taken now: press the
              one you want in the grid above and confirm there. A row of
              buttons here was the same list said twice, and the second
              telling was the one that could not show who was already in
              which chair. */}
        </div>
      )}

      {/*
        * Nothing to join once the lead has called it.
        *
        * Only when they said so, not merely when the estimate ran out: a
        * party going twenty minutes longer than somebody guessed is still a
        * party, and shutting the door on it would be the guess deciding.
        */}
      {party.endedAt && !mine && (
        <span className="text-[15.5px] text-muted">{t("party.overNow")}</span>
      )}

      {/*
        * Already promised elsewhere.
        *
        * Two parties at once is a promise somebody is going to break, and it
        * breaks on whoever kept a seat open all week. Said before the promise
        * rather than after, and it names the other party — "you are busy" is
        * only useful if you can tell what with.
        *
        * Only in front of joining. Somebody already in this one is left alone:
        * whatever they have double-booked, telling them now is too late to
        * help, and the way out is the Leave button they already have.
        */}
      {!party.endedAt && !mine && clash && (
        <span className="rounded-lg border border-gold/45 bg-gold/10 px-3 py-2 text-[15.5px] text-gold">
          {t("party.clash", { when: fmtDateTime(clash.startsAt) })}
        </span>
      )}

      {/*
        * And joining is the grid.
        *
        * This was a row of seat chips, a row of job buttons and an "ask to
        * join" button — the same seats the grid above was already drawing,
        * listed a second time because the first list was only a picture.
        * Now the picture is the control: press the seat you want and confirm,
        * or press the flex row under it and name the seats you could take.
        * See PartyDetail, which works out what a press means, and PartySeats,
        * which asks.
        */}
    </div>
  );
}

/** How many people are waiting on the lead — for a mark on the closed row. */
export const pendingAsks = (p: Party): number => (p.requests ?? []).length;

