"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonOption } from "@/lib/people";
import { fmtDateTime } from "@/lib/dates";
import type {
  ContentKind, Flex, Party, SlotDef, SlotRole, Wing,
} from "@/lib/party";
import {
  ROLE_COLOR, ROLE_LABEL, askedAbout, flexLabel, jobMatters, openSeats, openTo,
  partyStatus,
} from "@/lib/party";
import JobIcon, { jobLabel, jobRoleGroup } from "@/components/JobIcon";
import { jobsForRole, jobsForSlot } from "@/components/party/JobRule";
import {
  acceptInvite, askToJoin, confirmSeat, dropSeat, takeSeat,
} from "@/lib/party-db";
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
  { party, kind, me, userId, supabase, now, clash, onDone, onError }: {
    party: Party;
    /** The board's clock, which decides whether it is too late to leave. */
    now: number;
    /** What it is for, which decides whether a job is even a question. */
    kind?: ContentKind;
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
  /** The open seats this reader says they can play. */
  const [want, setWant] = useState<Set<string>>(new Set());
  /** "Any of them", which overrules the list rather than adding to it. */
  const [any, setAny] = useState(false);
  /**
   * What they can be playing.
   *
   * A set, because "White Mage or Sage, you pick" is the ordinary answer and
   * making somebody choose one of them at the door is the same decision flex
   * exists to prevent, one level down. The lead picks from what was offered.
   */
  const [picked, setPicked] = useState<Set<string>>(new Set());
  /*
   * "Whatever you are short of."
   *
   * A real answer, and for a lot of people the honest one — somebody with
   * eight jobs at cap does not have a preference, they have a party to fill.
   * Ticking all twenty-one to say so was a row of lit chips that meant the
   * same thing and read like somebody who could not decide.
   *
   * It sends every job the seats will take, which is what it says.
   */
  const [anyJob, setAnyJob] = useState(false);

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

  const free = useMemo(() => openSeats(party), [party]);
  const seated = party.shape !== "open";

  /** The seat this reader was asked about, where they were asked about one. */
  const asked = askedAbout(mine);
  /** And whether somebody has since sat in it. */
  const seatGone = !!asked && !free.some((sl) => sl.id === asked);

  /*
   * The open seats, by which of the three eights they are in.
   *
   * One nameless group for anything that is not an alliance, so the ordinary
   * party draws exactly as it did — a heading over a single row of four or
   * eight seats would be a label for the obvious.
   */
  const wings = useMemo(() => {
    if (party.shape !== "alliance") return [[null, free]] as [Wing | null, SlotDef[]][];
    return (["A", "B", "C"] as Wing[])
      .map((w) => [w, free.filter((sl) => sl.wing === w)] as [Wing | null, SlotDef[]])
      // A wing with nothing open is a heading over nothing.
      .filter(([, seats]) => seats.length);
  }, [party.shape, free]);
  /*
   * Whether to ask about a job at all.
   *
   * A photo shoot, a FATE farm, a hunt train and a night in Bozja are not
   * compositions — you turn up on whatever you are on — and a form that will
   * not let you press Join until you have committed to a job is a form
   * standing in front of an evening that has no form.
   */
  const asksJob = jobMatters(kind);

  /*
   * The jobs those seats will actually take.
   *
   * Locked to the seats rather than offered whole, because a list of every job
   * in the game under a healer seat is a list that is wrong twenty times out of
   * twenty-one. Narrowed twice over: by the role, and then by whatever the
   * party has said about that particular seat — a group asking for a Warrior on
   * ST should not be shown a Paladin button that would be refused, and a party
   * running one player per job should not offer a job somebody already holds.
   *
   * openTo does both, and does the second one at the moment it is drawn, which
   * matters: what a seat will take changes every time somebody joins.
   */
  const chosenSeats: SlotDef[] = useMemo(
    () => (any || !seated ? free : free.filter((sl) => want.has(sl.id))),
    [any, seated, free, want]);

  const jobs = useMemo(() => {
    // A hunt train has no seats to lock anything to, so every job is a true
    // answer. Without this the row came out empty and the button stayed
    // disabled behind a job nobody could choose — an open party that could
    // not be joined at all.
    if (!seated) {
      return (["tank", "healer", "dps"] as SlotRole[]).flatMap(jobsForRole);
    }
    const out = new Set<string>();
    for (const sl of chosenSeats) {
      for (const j of openTo(party, sl.id, jobsForSlot(sl))) out.add(j);
    }
    return [...out];
  }, [party, chosenSeats, seated]);

  /*
   * A job is an answer about a role, so choosing one settles which of the
   * picked seats were serious.
   *
   * Somebody who ticks ST and H1 and then says "White Mage" has not asked for
   * two seats — they have asked for the healer one, and the tank tick was them
   * saying they could do either before they decided. Dropping it here rather
   * than sending it means the party is never advertised a Paladin on H1.
   */
  const jobFits = (sl: SlotDef): boolean => {
    if (!picked.size) return true;
    // Through the broad grouping rather than the fine one: the seat grid knows
    // three roles and the job table knows six, and a Scholar is a "barrier"
    // there and a healer here.
    //
    // Any of the offered jobs covering the seat is enough: somebody offering
    // Warrior and White Mage is genuinely asking for both the tank seat and the
    // healer one, and it is the lead who decides which.
    return [...picked].some((j) => {
      const g = jobRoleGroup(j);
      const asRole: SlotRole | null =
        g === "Tanks" ? "tank" : g === "Healers" ? "healer" : g === "DPS" ? "dps" : null;
      return asRole == null || sl.role === asRole;
    });
  };
  const asking = chosenSeats.filter(jobFits);

  /*
   * A job that has stopped making sense.
   *
   * Untick the healer seat after choosing White Mage and the choice is still
   * sitting there, invisible under a row that no longer contains it — and the
   * request would go out advertising a White Mage for a tank seat.
   */
  useEffect(() => {
    setPicked((v) => {
      const next = new Set([...v].filter((j) => jobs.includes(j)));
      return next.size === v.size ? v : next;
    });
  }, [jobs]);

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

      {!party.endedAt && !mine && !clash && (
        <div className="flex flex-col gap-2">
          {/*
            * Which seats, not which seat.
            *
            * The question a party actually needs answering is "what can you
            * play", and for most people that is more than one thing. A single
            * choice made them pick their best guess at what the party was
            * short of and hope — which is the decision flex exists to stop
            * anybody having to make, made again at the door.
            *
            * Only the empty seats can be picked, because the others are not
            * an offer anybody can make. Several picked is a floater who covers
            * exactly those, and the resolver puts them in whichever is left
            * when the party fills; one picked is a request for that seat.
            */}
          {seated && free.length > 0 && (
            <>
              <span className="font-data text-[13px] uppercase tracking-[0.12em] text-muted">
                {t("party.pickSeats")}
              </span>
              {/*
                * An alliance is three parties, and its seats say so.
                *
                * Flat, twenty-one open seats came out as "ST Tank, H2 Healer,
                * D2 DPS … MT Tank, ST Tank" — every label appearing up to
                * three times with nothing to tell them apart, so picking "D3"
                * meant picking one of three different seats at random. The
                * grid above has drawn them as Party A, B and C from the
                * beginning; this is the same three headings.
                */}
              {wings.map(([wing, seats]) => (
                <div key={wing ?? "-"} className="flex flex-col gap-1.5">
                  {wing && (
                    <span className="font-data text-[13px] uppercase tracking-[0.14em] text-muted">
                      {t("pf.partyWing", { wing })}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {seats.map((sl) => {
                      const on = !any && want.has(sl.id);
                      const c = sl.free ? "#8b93a1" : ROLE_COLOR[sl.role];
                      return (
                        <button key={sl.id} type="button" disabled={any}
                                onClick={() => setWant((v) => {
                                  const next = new Set(v);
                                  if (!next.delete(sl.id)) next.add(sl.id);
                                  return next;
                                })}
                                style={on
                                  ? { borderColor: c, color: c,
                                      background: `color-mix(in srgb, ${c} 14%, transparent)` }
                                  : undefined}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-[3px] text-[15.5px] transition-colors ${
                                  on ? "" : "border-line text-muted hover:border-muted hover:text-ink"} ${
                                  any ? "opacity-40" : ""}`}>
                          <span style={{ background: c }}
                                className="size-1.5 shrink-0 rounded-full" />
                          {sl.label}
                          {!sl.free && (
                            <span className="opacity-70">{ROLE_LABEL[sl.role]}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* The widest offer there is, and its own button because it is
                  not one more seat — it is the answer that makes the others
                  beside the point. Outside the wings for the same reason: it
                  is not a seat in any of them. */}
              <button type="button"
                      onClick={() => { setAny((v) => !v); setWant(new Set()); }}
                      className={`self-start rounded-full border px-3 py-[3px] text-[15.5px] transition-colors ${
                        any ? "border-jade bg-jade/15 text-jade"
                            : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {t("party.flexAny")}
              </button>
            </>
          )}

          {/* Only once there is something to be a job for: an empty row of
              every job in the game is a question nobody has been asked yet. */}
          {asksJob && jobs.length > 0 && (seated ? any || want.size > 0 : true) && (
            <>
              <span className="font-data text-[13px] uppercase tracking-[0.12em] text-muted">
                {t("party.pickJob")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button type="button"
                        onClick={() => { setAnyJob((v) => !v); setPicked(new Set()); }}
                        className={`rounded-full border px-2.5 py-[3px] text-[15px] transition-colors ${
                          anyJob ? "border-accent bg-accent/15 text-accent"
                                 : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                  {t("party.jobAny")}
                </button>
                {jobs.map((j) => {
                  const on = picked.has(j);
                  return (
                    <button key={j} type="button" title={jobLabel(j)}
                            onClick={() => {
                              setAnyJob(false);
                              setPicked((v) => {
                                const next = new Set(v);
                                if (!next.delete(j)) next.add(j);
                                return next;
                              });
                            }}
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[15px] transition-colors ${
                              on ? "border-accent bg-accent/15 text-accent"
                                 : `border-line hover:border-muted hover:text-ink ${
                                     anyJob ? "text-muted/50" : "text-muted"}`}`}>
                      <JobIcon job={j} size={20} />
                      {jobLabel(j)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button disabled={busy || (asksJob && !picked.size && !anyJob)
                              || (seated && free.length > 0 && !any && !want.size)}
                    onClick={() => run(() => askToJoin(supabase, userId, party.id, {
                      characterId: me.id, name: me.name, avatar: me.avatar,
                      own: iAmOwner,
                      // "Any" is every job the seats will take, which is what
                      // it means and what the resolver can place.
                      jobs: anyJob ? jobs : [...picked],
                      // One seat is a request for that seat. Anything else is a
                      // floater, which is what the resolver needs to place
                      // somebody across the seats they said they could take.
                      seat: asking.length === 1 ? asking[0].id : null,
                      flex: any && asking.length === free.length ? { all: true }
                        : asking.length > 1 ? { seats: asking.map((sl) => sl.id) }
                          : asking.length === 1 ? undefined : { all: true },
                    }))}
                    className={`${btn} border border-accent bg-accent/15 text-accent hover:bg-accent/25`}>
              {busy ? t("party.asking")
                    : t(iAmOwner ? "party.takeOwnSeat" : "party.askToJoin")}
            </button>
            {seated && free.length > 0 && !any && !want.size ? (
              <span className="text-[15px] text-muted">{t("party.pickSeatsFirst")}</span>
            ) : anyJob ? (
              <span className="text-[15px] text-muted">{t("party.jobAnyWhy")}</span>
            ) : asksJob && !picked.size ? (
              <span className="text-[15px] text-muted">{t("party.pickJobFirst")}</span>
            ) : asking.length > 1 ? (
              // What the party will actually be told, in one line, because
              // "flex across three seats" is a thing worth seeing before you
              // send it rather than after.
              <span className="text-[15px] text-muted">
                {t("party.askingFor", { seats: asking.map((sl) => sl.label).join(", ") })}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/** How many people are waiting on the lead — for a mark on the closed row. */
export const pendingAsks = (p: Party): number => (p.requests ?? []).length;

