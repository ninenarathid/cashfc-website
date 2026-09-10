"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonOption } from "@/lib/people";
import type { Flex, Party, SlotDef, SlotRole } from "@/lib/party";
import { ROLE_COLOR, ROLE_LABEL, openSeats, openTo } from "@/lib/party";
import JobIcon, { jobLabel, jobRoleGroup } from "@/components/JobIcon";
import { jobsForRole } from "@/components/party/JobRule";
import { askToJoin, confirmSeat, dropSeat } from "@/lib/party-db";
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
 * Everybody in the party, seated or floating, as one list.
 *
 * The seat id is carried along rather than left behind as the key of the
 * object it came out of, because every question asked here — who is waiting,
 * what did they ask for — needs the person and the seat together.
 */
const roster = (p: Party): Who[] => [
  ...Object.entries(p.seats).map(([seat, v]) => ({ ...v, seat })),
  ...(p.floating ?? []),
];

export default function PartyJoin(
  { party, me, userId, supabase, onDone, onError }: {
    party: Party;
    me: PersonOption | null;
    userId: string | null;
    supabase: SupabaseClient | null;
    /** Reload, because a seat changing changes the counts on the whole row. */
    onDone: () => void | Promise<void>;
    onError: (m: string) => void;
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  const [busy, setBusy] = useState(false);
  /** The open seats this reader says they can play. */
  const [want, setWant] = useState<Set<string>>(new Set());
  /** "Any of them", which overrules the list rather than adding to it. */
  const [any, setAny] = useState(false);
  /** What they will actually be playing. */
  const [job, setJob] = useState("");

  const iAmOwner = !!me && party.ownerCharacterId === me.id;
  const mine = useMemo(
    () => (me ? roster(party).find((m) => m.characterId === me.id) : undefined),
    [party, me]);

  /* Requests waiting on the lead. Invitations are somebody else's to answer. */
  const waiting = useMemo(
    () => roster(party).filter((m) => m.by === "self" && !m.confirmedAt),
    [party]);

  const free = useMemo(() => openSeats(party), [party]);
  const seated = party.shape !== "open";

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
      for (const j of openTo(party, sl.id, jobsForRole(sl.role))) out.add(j);
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
    if (!job) return true;
    // Through the broad grouping rather than the fine one: the seat grid knows
    // three roles and the job table knows six, and a Scholar is a "barrier"
    // there and a healer here.
    const g = jobRoleGroup(job);
    const asRole: SlotRole | null =
      g === "Tanks" ? "tank" : g === "Healers" ? "healer" : g === "DPS" ? "dps" : null;
    return asRole == null || sl.role === asRole;
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
    if (job && !jobs.includes(job)) setJob("");
  }, [job, jobs]);

  if (!me || !userId || !supabase) return null;

  const run = async (fn: () => Promise<{ error?: string } | { id: string }>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if ("error" in r && r.error) { onError(r.error); return; }
    await onDone();
  };

  const btn = "rounded-lg px-3 py-1.5 text-[12.5px] transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2.5">
      {/* ── The lead's side: who is waiting ────────────────────────────── */}
      {iAmOwner && waiting.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-gold/40 bg-gold/[0.07] p-2.5">
          <p className="font-data text-[10.5px] uppercase tracking-[0.14em] text-gold">
            {t("party.waitingOnYou", { n: waiting.length })}
          </p>
          {waiting.map((w) => {
            const src = (w.characterId != null && overrides[w.characterId]) || w.avatar;
            return (
              <div key={w.seatRowId ?? w.name}
                   className="flex flex-wrap items-center gap-2">
                {src
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={src} alt="" width={26} height={26}
                         className="size-[26px] rounded-full object-cover" />
                  : <span className="size-[26px] rounded-full bg-card" />}
                <span className="text-[13px] text-ink">{w.name}</span>
                <span className="text-[12px] text-muted">
                  {/* Which seat they asked for, or that they did not mind. */}
                  {w.seat ?? t("party.anySeat")}
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

      {/* ── The reader's side ───────────────────────────────────────────── */}
      {!iAmOwner && mine && !mine.confirmedAt && mine.by === "self" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-muted">{t("party.asked")}</span>
          <button disabled={busy}
                  onClick={() => run(() => dropSeat(supabase, mine.seatRowId!))}
                  className={`${btn} border border-line text-muted hover:text-ink`}>
            {t("party.withdraw")}
          </button>
        </div>
      )}

      {!iAmOwner && mine && !mine.confirmedAt && mine.by !== "self" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-muted">{t("party.invited")}</span>
          <button disabled={busy}
                  onClick={() => run(() => confirmSeat(supabase, mine.seatRowId!))}
                  className={`${btn} border border-jade/60 bg-jade/15 text-jade hover:bg-jade/25`}>
            {t("party.accept")}
          </button>
          <button disabled={busy}
                  onClick={() => run(() => dropSeat(supabase, mine.seatRowId!))}
                  className={`${btn} border border-line text-muted hover:text-ink`}>
            {t("party.turnDown")}
          </button>
        </div>
      )}

      {!iAmOwner && mine?.confirmedAt && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-jade">{t("party.youAreIn")}</span>
          <button disabled={busy}
                  onClick={() => run(() => dropSeat(supabase, mine.seatRowId!))}
                  className={`${btn} border border-line text-muted hover:text-ink`}>
            {t("party.leave")}
          </button>
        </div>
      )}

      {!iAmOwner && !mine && (
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
              <span className="font-data text-[10px] uppercase tracking-[0.12em] text-muted">
                {t("party.pickSeats")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {free.map((s) => {
                  const on = !any && want.has(s.id);
                  const c = ROLE_COLOR[s.role];
                  return (
                    <button key={s.id} type="button" disabled={any}
                            onClick={() => setWant((v) => {
                              const next = new Set(v);
                              if (!next.delete(s.id)) next.add(s.id);
                              return next;
                            })}
                            style={on
                              ? { borderColor: c, color: c,
                                  background: `color-mix(in srgb, ${c} 14%, transparent)` }
                              : undefined}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-[3px] text-[12.5px] transition-colors ${
                              on ? "" : "border-line text-muted hover:border-muted hover:text-ink"} ${
                              any ? "opacity-40" : ""}`}>
                      <span style={{ background: c }}
                            className="size-1.5 shrink-0 rounded-full" />
                      {s.label}
                      <span className="opacity-70">{ROLE_LABEL[s.role]}</span>
                    </button>
                  );
                })}

                {/* The widest offer there is, and its own button because it is
                    not one more seat — it is the answer that makes the others
                    beside the point. */}
                <button type="button"
                        onClick={() => { setAny((v) => !v); setWant(new Set()); }}
                        className={`rounded-full border px-3 py-[3px] text-[12.5px] transition-colors ${
                          any ? "border-jade bg-jade/15 text-jade"
                              : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                    {t("party.flexAny")}
                </button>
              </div>
            </>
          )}

          {/* Only once there is something to be a job for: an empty row of
              every job in the game is a question nobody has been asked yet. */}
          {jobs.length > 0 && (seated ? any || want.size > 0 : true) && (
            <>
              <span className="font-data text-[10px] uppercase tracking-[0.12em] text-muted">
                {t("party.pickJob")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {jobs.map((j) => {
                  const on = job === j;
                  return (
                    <button key={j} type="button" title={jobLabel(j)}
                            onClick={() => setJob(on ? "" : j)}
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[12px] transition-colors ${
                              on ? "border-accent bg-accent/15 text-accent"
                                 : "border-line text-muted hover:border-muted hover:text-ink"}`}>
                      <JobIcon job={j} size={16} />
                      {jobLabel(j)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button disabled={busy || !job
                              || (seated && free.length > 0 && !any && !want.size)}
                    onClick={() => run(() => askToJoin(supabase, userId, party.id, {
                      characterId: me.id, name: me.name, avatar: me.avatar,
                      job,
                      // One seat is a request for that seat. Anything else is a
                      // floater, which is what the resolver needs to place
                      // somebody across the seats they said they could take.
                      seat: asking.length === 1 ? asking[0].id : null,
                      flex: any && asking.length === free.length ? { all: true }
                        : asking.length > 1 ? { seats: asking.map((sl) => sl.id) }
                          : asking.length === 1 ? undefined : { all: true },
                    }))}
                    className={`${btn} border border-accent bg-accent/15 text-accent hover:bg-accent/25`}>
              {busy ? t("party.asking") : t("party.askToJoin")}
            </button>
            {seated && free.length > 0 && !any && !want.size ? (
              <span className="text-[12px] text-muted">{t("party.pickSeatsFirst")}</span>
            ) : !job ? (
              <span className="text-[12px] text-muted">{t("party.pickJobFirst")}</span>
            ) : asking.length > 1 ? (
              // What the party will actually be told, in one line, because
              // "flex across three seats" is a thing worth seeing before you
              // send it rather than after.
              <span className="text-[12px] text-muted">
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
export const pendingAsks = (p: Party): number =>
  roster(p).filter((m) => m.by === "self" && !m.confirmedAt).length;

/** Whether this reader is in the party at all, however they got there. */
export const amIn = (p: Party, me: PersonOption | null): boolean =>
  !!me && roster(p).some((m) => m.characterId === me.id);
