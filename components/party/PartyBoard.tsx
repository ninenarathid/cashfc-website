"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PersonOption } from "@/lib/people";
import type {
  ContentDef, ContentSeed, LootRule, Party, PartyComment, PartyStatus,
  ProgressAt, SlotRole,
} from "@/lib/party";
import type { DutyArt } from "@/lib/duty";
import {
  KIND_COLOR, KIND_ICON, KIND_ORDER, ROLE_COLOR, ROLE_LABEL,
  LOOT_LABEL, PROGRESS_LABEL, catalogue, dayKey, endsAt, fmtDay,
  fmtTime, hasBody, lengthIsEstimate, lootText, mapsText,
  clashFor,
  needsByRole, partyStatus, placeOf, progressText, resolveParty, slotsOf, spotText,
  worldText,
  timeIsEstimate,
} from "@/lib/party";
import { createClient } from "@/lib/supabase/client";

import {
  acceptInto, addComment, createParty, deleteParty, dropComment, editComment,
  leaveSeat, loadParties, takeSeat,
  finishParty,
  inviteMembers,
  setOwnSeat,
  updateParty,
} from "@/lib/party-db";
import { useLiveParties } from "@/lib/party-live";
import type { SuggestRow } from "@/lib/suggest";
import { mapLabel } from "@/lib/treasure";
import { useLang } from "@/lib/i18n";
import Link from "next/link";
import { freeAt } from "@/lib/suggest";
import {
  headSay, kindSay, lengthSay, lootLine, whenFull, whyEstimate,
} from "@/lib/party-i18n";
import PartySeats, { NeedLine, seatState } from "@/components/party/PartySeats";
import { OneEachMark } from "@/components/party/JobRule";
import TagIcon from "@/components/TagIcon";
import PartyIcon from "@/components/party/PartyIcon";
import ConfirmDialog from "@/components/ConfirmDialog";
import FoodIcon from "@/components/party/FoodIcon";
import { PartyBody } from "@/components/party/PartyBody";
import { ProgressChip } from "@/components/party/ProgressTrack";
import { LootChip } from "@/components/party/LootPlan";
import { SpotChip } from "@/components/party/WherePicker";
import MapShot from "@/components/party/MapShot";
import PartyComments from "@/components/party/PartyComments";
import { useAvatarOverrides } from "@/lib/avatars";
import PartyCreate from "@/components/party/PartyCreate";
import PartyJoin, { pendingAsks } from "@/components/party/PartyJoin";
import Modal from "@/components/ui/Modal";
import { StatusPill, WhenLine, useNow } from "@/components/party/PartyClock";
import ShareParty from "@/components/party/ShareParty";

/**
 * Who is running what, and when.
 *
 * The FC arranges everything in Discord, where a party posted on Tuesday is
 * eight messages up by Wednesday and the only way to know whether it still
 * needs a healer is to read the replies. This is the same information as a list
 * that can be filtered: what, when, and which seats are still open.
 *
 * Built on the member board's chrome on purpose — the chip row, the search box,
 * the panel of narrowing controls underneath. Not to save work: it is the same
 * question ("who, out of many, matches what I want?") and somebody who has used
 * one page should not have to learn a second set of controls to use the other.
 *
 * Who may look is not decided here. This draws a board for whoever is handed to
 * it, and PartyFinder is the one that says who that may be — so the view can be
 * rendered and looked at without an admin session, which is the only way it
 * could be checked at all while the page is shut.
 */

/**
 * The keys of the sections that are not days. No date can collide with them.
 *
 * Three, because standing in a party has three answers and the board was
 * giving one. A party that asked you and is waiting on your reply sat under
 * "parties you are in" beside the ones you are actually in — which tells
 * somebody they have decided something they have not, and buries the one
 * row on the page that cannot move without them.
 */
const INVITED = "\u0000invited";
const MINE = "\u0000mine";
const ASKED = "\u0000asked";

type Sort = "soon" | "new" | "open";
type When = "" | "today" | "3d" | "week";

/**
 * On the board, or in the past.
 *
 * Two settings, not seven. The five states are worth telling apart on a row —
 * "starting soon" and "just ended" are different things to know at a glance —
 * and are not worth filtering by one at a time: nobody looks for the parties
 * that are between fifty and sixty minutes away. The question a reader actually
 * has is whether they are looking at tonight or at last week.
 *
 * "" means everything that has not finished, which is the board's job. Ended is
 * not deleted, and "how did Tuesday go" is answered by the other setting.
 */
type StatusPick = "" | "done";

const EMPTY = {
  role: "" as SlotRole | "", when: "" as When, openOnly: false,
  prog: "" as ProgressAt | "",
  loot: "" as LootRule | "",
  status: "" as StatusPick,
  /** Only parties that start in an hour the reader said they play. */
  free: false,
};


/**
 * One party, opened.
 *
 * A window rather than the row growing downwards. The row had to carry the
 * write-up, the seat grid, the join controls and the whole conversation, which
 * pushed every other party off the screen and made a link to one land on a page
 * that looked exactly like the page without it — the thing you followed the
 * link for was somewhere in the middle of a list, quietly expanded.
 *
 * Now the link arrives at the party. Which is what a link to a party should do,
 * and is the whole reason the address carries an id.
 */
function PartyDetail(
  { party, def, now, people, me, userId, supabase, refresh, setErr, setParties,
    parties, onClose, onEdit }: {
    party: Party;
    def: ContentDef | undefined;
    now: number;
    /** The roster, for reading names out of what people say to each other. */
    people: PersonOption[];
    me: PersonOption | null;
    userId: string | null;
    supabase: ReturnType<typeof createClient>;
    refresh: () => Promise<void>;
    setErr: (m: string | null) => void;
    setParties: React.Dispatch<React.SetStateAction<Party[]>>;
    /** Every party on the board, for "are you already busy then". */
    parties: readonly Party[];
    onClose: () => void;
    /** Given to whoever may change it. Absent for everybody else. */
    onEdit?: () => void;
  },
) {
  const { t } = useLang();
  const tint = def ? KIND_COLOR[def.kind] : "#8b93a1";
  /** Whether the "delete this party?" question is on screen. */
  const [dropping, setDropping] = useState(false);
  /** Asked before the party is declared over. */
  const [ending, setEnding] = useState(false);
  /** True while a seat is being taken, so the grid cannot be pressed twice. */
  const [seating, setSeating] = useState(false);

  /** Do it, say so if it failed, and read the board back either way. */
  const run = async (go: () => Promise<{ error?: string }>) => {
    if (!supabase) return;
    const r = await go();
    if (r.error) { setErr(r.error); return; }
    await refresh();
  };
  /*
   * Edited, as opposed to merely saved.
   *
   * The trigger stamps updated_at on the insert as well, so the two are within
   * a moment of each other on a party nobody has been back to. A minute is the
   * gap that means somebody returned.
   */
  const edited = !!party.updatedAt
    && new Date(party.updatedAt).getTime() - new Date(party.createdAt).getTime() > 60_000;
  return (
    /* Wide, because a party is not a column of fields: a still across the
       top, a seat grid eight cells across, a write-up with screenshots in it
       and the whole conversation underneath. At the form's width the grid
       wrapped and the pictures came out postage stamps. */
    <Modal open wide onOpenChange={(v) => { if (!v) onClose(); }}
           title={def?.duty ?? def?.name ?? party.contentKey}
           subtitle={party.lengthUnit === "runs" || party.lengthUnit === "maps"
             // No end time, because that is the point of counting in runs.
             ? `${fmtDay(party.startsAt)} · ${fmtTime(party.startsAt)}`
             : `${fmtDay(party.startsAt)} · ${fmtTime(party.startsAt)} → ${fmtTime(endsAt(party))}`}>
      <div className="flex flex-col gap-3">
        {/*
          * The still from the fight, across the top.
          *
          * A window has no row above it to have shown this already, and the
          * picture is how people recognise which evening they have opened —
          * the same reason it is on the row and on the content picker.
          */}
        <div style={{
               backgroundImage: def?.art ? `url(${def.art})` : undefined,
               backgroundPosition: def?.focus ?? "center",
               backgroundColor: def?.art ? undefined
                 : `color-mix(in srgb, ${tint} 22%, var(--color-bg))`,
             }}
             /*
              * The picture's own shape where there is one.
              *
              * These are the game's own duty banners and they are drawn at
              * 1128x360 — a hundred and ten pixels of that is a band across
              * the middle, which on Bozja meant the sky and none of the
              * fortress. Given its own ratio nothing is cropped at any width,
              * and the art is composed the way somebody meant it to be seen.
              *
              * A party with no picture keeps the short strip: it is a tinted
              * block with an icon in the middle, and three hundred pixels of
              * that is three hundred pixels of nothing.
              */
             className={`relative flex items-end overflow-hidden rounded-xl bg-cover ${
               def?.art
                 // A floor as well as a ratio. On a phone the ratio alone
                 // gives about a hundred and twenty pixels, and the clock,
                 // the status and the copy button wrap to two rows inside
                 // that — leaving the picture a strip too thin to make out.
                 // Below the floor it crops the sides instead, which these
                 // are composed to survive: the subject is in the middle.
                 ? "aspect-[1128/360] min-h-[168px]" : "h-[110px]"}`}>
          {/* Only as dark as the words need. It used to be 85% black at the
              bottom fading to 20% at the top, which is a scrim over the whole
              picture; the clock and the countdown sit along the bottom edge,
              so that is the only part that has to be dark. */}
          <span aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          {!def?.art && def && (def.icon || KIND_ICON[def.kind]) && (
            /* Not on a phone, where it lands on the clock.
               The banner is a fixed 110px and the row along its bottom wraps
               to two lines at 400px wide, which puts the time and the
               countdown exactly where this is centred. It stands in for
               cover art nobody has drawn yet and says nothing the row does
               not, so it is the half that gives way. */
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90 max-sm:hidden">
              <TagIcon tag={def.icon ?? KIND_ICON[def.kind]!} size={38} />
            </span>
          )}
          <span className="relative z-[1] flex w-full flex-wrap items-center gap-2 p-3">
            <span className="font-data text-[23px] font-semibold tabular-nums text-white drop-shadow">
              {fmtTime(party.startsAt)}
            </span>
            <StatusPill status={partyStatus(party, now)} />
            <WhenLine party={party} now={now}
                      className="font-data text-[14.5px] text-white/85 drop-shadow" />
            <span className="ml-auto flex items-center gap-1.5">
              {/*
                * The lead's two, only for the lead.
                *
                * On the banner beside the share button rather than at the
                * bottom of the window: they are things you do to the listing,
                * and the listing's own controls belong together at the top of
                * it. Both ask before they happen — a party people have read
                * and made plans around is not a thing to change by a misclick.
                */}
              {onEdit && (
                <>
                  <button onClick={onEdit}
                          className="rounded-lg border border-line/70 bg-bg/70 px-2.5 py-1 text-[15px] text-ink/85 transition-colors hover:border-accent hover:text-accent">
                    ✎ {t("pf.edit")}
                  </button>
                  {/* Over when the lead says so, which is the only one who can
                      know. The estimate on the listing is a guess about how
                      long a thing takes; this is the answer. Reversible, so a
                      misclick on a party still going is a second press rather
                      than a party nobody can rejoin. */}
                  <button onClick={() => (party.endedAt
                            ? void run(() => finishParty(supabase!, party.id, false))
                            : setEnding(true))}
                          className="rounded-lg border border-line/70 bg-bg/70 px-2.5 py-1 text-[15px] text-ink/85 transition-colors hover:border-jade hover:text-jade">
                    {t(party.endedAt ? "pf.reopenParty" : "pf.endParty")}
                  </button>
                  <button onClick={() => setDropping(true)}
                          className="rounded-lg border border-line/70 bg-bg/70 px-2.5 py-1 text-[15px] text-chili/90 transition-colors hover:border-chili hover:text-chili">
                    {t("pf.deleteParty")}
                  </button>
                </>
              )}
              <ShareParty id={party.id} />
            </span>
          </span>
        </div>

        {ending && (
          <ConfirmDialog z={120}
                         message={t("pf.endAsk")}
                         confirmLabel={t("pf.endParty")}
                         onCancel={() => setEnding(false)}
                         onConfirm={async () => {
                           setEnding(false);
                           await run(() => finishParty(supabase!, party.id, true));
                         }} />
        )}

        {dropping && (
          <ConfirmDialog z={120} danger
                         message={t("pf.deleteAsk")}
                         confirmLabel={t("pf.deleteParty")}
                         onCancel={() => setDropping(false)}
                         onConfirm={async () => {
                           setDropping(false);
                           if (!supabase) return;
                           const r = await deleteParty(supabase, party.id);
                           if (r.error) { setErr(r.error); return; }
                           onClose();
                           await refresh();
                         }} />
        )}

        {party.note && (
          <p className="text-[16.5px] text-ink/80">{party.note}</p>
        )}

        {/*
          * When it last changed, where it has.
          *
          * A board people read once and come back to: a party that moved from
          * nine to ten is the same row in the same place, and somebody who
          * read it this morning has no way of knowing it moved. Only when it
          * actually has — the database sets updated_at on the insert too, so
          * a party nobody has touched would otherwise announce an edit it
          * never had.
          */}
        {edited && (
          <p className="font-data text-[14px] text-muted">
            {t("pf.editedAt", { at: `${fmtDay(party.updatedAt!)} ${fmtTime(party.updatedAt!)}` })}
          </p>
        )}

        {/* The terms of the evening, the way the row says them. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-muted">
          <span className="flex items-center gap-1"
                title={whyEstimate(party, def?.kind, t)}>
            {lengthIsEstimate(party, def?.kind) && <span className="opacity-70">~</span>}
            {party.lengthUnit === "food" && <FoodIcon size={11} className="text-gold" />}
            {lengthSay(party, t)}
          </span>
          <span className="opacity-40">·</span>
          <span>{headSay(party, def?.kind, t)}</span>
          {progressText(party.progress) && (
            <><span className="opacity-40">·</span>
              <span>{progressText(party.progress)}</span></>
          )}
          {lootLine(party.loot, t) && (
            <><span className="opacity-40">·</span>
              <span>{lootLine(party.loot, t)}</span></>
          )}
          {mapsText(party.maps, mapLabel) && (
            <><span className="opacity-40">·</span>
              <span>🗺 {mapsText(party.maps, mapLabel)}</span></>
          )}
          {!!party.roulettes?.length && (
            <><span className="opacity-40">·</span>
              <span>{party.roulettes.join(", ")}</span></>
          )}
          {/* Which world it is on, spelled out. Everybody here is on
              Tonberry and will read past it, which is the point: the row where
              it says something else is the row somebody has to travel for. */}
          {worldText(party.spot) && (
            <><span className="opacity-40">·</span>
              <span>🌐 {worldText(party.spot)}</span></>
          )}
          {spotText(party.spot) && (
            <><span className="opacity-40">·</span>
              <span>📍 {spotText(party.spot)}</span></>
          )}
          {party.oneOfEachJob && (
            <><span className="opacity-40">·</span>
              <span>{t("party.onePerJob")}</span></>
          )}
        </p>

          {/* Where it is, on the map, once there are coordinates to put a
              pin at. The line above is an address anybody in the game can
              use and also two numbers: somebody who does not know the zone
              would otherwise log in to find out whether that is the north
              end or the far side of a river. */}
          <MapShot spot={party.spot} size={300} />

          {/* The write-up first, then who is in it. What the party is
              doing is the thing somebody opened the row to read; the
              seats are the answer to whether they can join it. */}
          {hasBody(party.body) && <PartyBody body={party.body!} />}

          {/*
            * The grid is the control.
            *
            * Everything it can be asked is worked out here, where the reader
            * and the party are both in hand, and handed to it as one question
            * per seat — the grid itself stays a drawing of the party and does
            * not learn who is looking at it.
            */}
          <PartySeats party={party} kind={def?.kind}
                      pick={me && userId && supabase ? {
                        busy: seating,
                        ask: (slot) => {
                          const mine = placeOf(party, me.id);
                          // Not signed in as somebody who can sit anywhere, or
                          // the evening is over: nothing to ask.
                          if (party.endedAt) return null;
                          if (!mine) return null;
                          const res = resolveParty(party);
                          /*
                           * A seat somebody offered to move out of is a seat
                           * that can be asked for. They said so themselves,
                           * in advance and in public, and the offer only ever
                           * meant this — so the question names them and what
                           * would happen, and the press does the rest.
                           */
                          const sat = res.seats[slot.id];
                          const moving =
                            sat && res.takeable.some((s) => s.id === slot.id)
                            && sat.characterId !== me.id ? sat : null;
                          if (!moving
                              && seatState(party, slot.id, res) !== "open") {
                            return null;
                          }
                          const also = moving
                            ? t("party.theyWouldMove", { who: moving.name })
                            : "";
                          if (mine.invited) {
                            return t("party.acceptInto", { seat: slot.label }) + also;
                          }
                          if (mine.pending) return null;
                          return (mine.seat
                            ? t("party.moveHere", { seat: slot.label })
                            : t("party.sitHere", { seat: slot.label })) + also;
                        },
                        take: (slot, job) => void (async () => {
                          const mine = placeOf(party, me.id);
                          if (!mine?.rowId) return;
                          setSeating(true);
                          const r = mine.invited
                            ? await acceptInto(supabase, mine.rowId, slot.id, job)
                            : await takeSeat(supabase, mine.rowId, slot.id, job);
                          setSeating(false);
                          if ("error" in r) { setErr(r.error); return; }
                          if (r.got === "taken") {
                            setErr(t("party.seatGone", { seat: slot.label }));
                          }
                          await refresh();
                        })(),
                        benchAsk: (() => {
                          const mine = placeOf(party, me.id);
                          return mine && !mine.invited && !mine.pending && mine.seat
                            ? t("party.toBench") : null;
                        })(),
                        bench: () => void (async () => {
                          const mine = placeOf(party, me.id);
                          if (!mine?.rowId) return;
                          setSeating(true);
                          const r = await leaveSeat(supabase, mine.rowId);
                          setSeating(false);
                          if (r.error) { setErr(r.error); return; }
                          await refresh();
                        })(),
                      } : undefined} />

          <PartyJoin party={party} kind={def?.kind} me={me} userId={userId}
                     clash={me ? clashFor(parties, me.id, party, party.id) : null}
                     supabase={supabase} now={now}
                     onDone={refresh} onError={setErr} />

          {/* The boss, which neither the title nor the row has room for: the
              title leads with the duty you queue for, and this is the third
              name the same fight has. The clock is in the subtitle already. */}
          <p className="text-[14.5px] text-muted">
            {def?.name && def.name !== def.badge && def.name !== def.duty && (
              <>{def.name}</>
            )}
            {/* The sentence names treasure, because treasure is the only
                evening whose end is a dice roll rather than a decision. A
                party counted in runs is also a guess, and says so in its own
                words beside the length rather than borrowing these. */}
            {timeIsEstimate(def?.kind) && (
              <>{def?.name ? " · " : ""}{t("party.estimateWhy")}</>
            )}
          </p>

          <PartyComments comments={party.comments ?? []} people={people} me={me}
                         userId={userId}
                         /* The start time has come and the party is still on:
                            somebody has to send the invites, and the moment
                            that has to happen is the moment everybody stops
                            watching the board and starts watching the game. */
                         notice={partyStatus(party, now) === "live"
                           ? t("party.timeToInvite") : undefined}
                         onReact={(cid, emoji, on, who) =>
                           // Shown at once; the write and the
                           // realtime event follow behind it.
                           setParties((v) => v.map((x) => (x.id === party.id ? {
                             ...x,
                             comments: (x.comments ?? []).map((c) => {
                               if (c.id !== cid) return c;
                               const rs = [...(c.reactions ?? [])];
                               const i = rs.findIndex((r) => r.emoji === emoji);
                               if (on) {
                                 if (i < 0) rs.push({ emoji, by: [who] });
                                 else rs[i] = { ...rs[i], by: [...rs[i].by, who] };
                               } else if (i >= 0) {
                                 const by = rs[i].by.filter(
                                   (w) => w.characterId !== who.characterId);
                                 if (by.length) rs[i] = { ...rs[i], by };
                                 else rs.splice(i, 1);
                               }
                               return { ...c, reactions: rs };
                             }),
                           } : x)))}
                         onAdd={async (c: PartyComment) => {
                           // On the screen first: a reply that waits
                           // for a round trip before appearing reads
                           // as a reply that did not send.
                           setParties((v) => v.map((x) => (x.id === party.id
                             ? { ...x, comments: [...(x.comments ?? []), c] }
                             : x)));
                           if (!supabase || !userId) return;
                           const r = await addComment(supabase, userId, party.id, {
                             characterId: c.author.characterId,
                             name: c.author.name,
                             avatar: c.author.avatar,
                             text: c.text,
                             images: c.images ?? [],
                             mentions: c.mentions,
                             mentionsAll: c.mentionsAll,
                             replyTo: c.replyTo,
                           });
                           if ("error" in r) { setErr(r.error); void refresh(); }
                         }}
                         /*
                          * Both the same shape as the reply above: on the
                          * screen at once, the write behind it. A correction
                          * that waits for a round trip reads as a correction
                          * that did not take, which is the thing somebody
                          * fixing a typo is least patient about.
                          */
                         onEdit={supabase && userId
                           ? async (cid, text) => {
                               const at = new Date().toISOString();
                               setParties((v) => v.map((x) => (x.id === party.id ? {
                                 ...x,
                                 comments: (x.comments ?? []).map((c) => (
                                   c.id === cid ? { ...c, text, editedAt: at } : c)),
                               } : x)));
                               const r = await editComment(supabase, cid, text);
                               if (r.error) { setErr(r.error); void refresh(); }
                             }
                           : undefined}
                         onDrop={supabase && userId
                           ? async (cid) => {
                               const at = new Date().toISOString();
                               setParties((v) => v.map((x) => (x.id === party.id ? {
                                 ...x,
                                 comments: (x.comments ?? []).map((c) => (
                                   c.id === cid
                                     ? { ...c, text: "", images: undefined, deletedAt: at }
                                     : c)),
                               } : x)));
                               const r = await dropComment(supabase, cid);
                               if (r.error) { setErr(r.error); void refresh(); }
                             }
                           : undefined} />
      </div>
    </Modal>
  );
}

export default function PartyBoard(
  { people, extremes, savage, ultimates, alliances, criterions, art, me, userId,
    openParty, suggest, labels }: {
    people: PersonOption[];
    extremes: ContentSeed[];
    savage: ContentSeed[];
    /** Who plays what, for the seat suggestions. */
    suggest?: SuggestRow[];
    /** The tier's labels, which is how the savage clears are indexed. */
    labels?: string[];
    ultimates: ContentSeed[];
    alliances: ContentSeed[];
    criterions: ContentSeed[];
    art: DutyArt;
    /** Whoever is reading, for "I am in it" and for taking a seat. */
    me: PersonOption | null;
    /** Their account, which is what the tables are written as. */
    userId: string | null;
    /**
     * A party to open on arrival, from /party/[id].
     *
     * Same idea as the `?p=` in the address and handled by the same latch: the
     * page was opened *for* this party, so it stays findable whatever the
     * filters would otherwise have done with it.
     */
    openParty?: string;
  },
) {
  // Chosen pictures over Lodestone portraits, the same order as everywhere else.
  const overrides = useAvatarOverrides();
  const face = (id: number | null | undefined, fallback: string | null) =>
    (id != null && overrides[id]) || fallback || null;

  const content = useMemo(
    () => catalogue({ extremes, savage, ultimates, alliances, criterions, art }),
    [extremes, savage, ultimates, alliances, criterions, art]);
  const byKey = useMemo(
    () => Object.fromEntries(content.map((c) => [c.key, c])) as Record<string, ContentDef>,
    [content]);

  const [supabase] = useState(createClient);
  const [parties, setParties] = useState<Party[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  /**
   * The party being changed, where somebody is changing one.
   *
   * Held on the board rather than inside the window it is opened from, because
   * the form replaces the window: two dialogs, one over the other, asking about
   * the same party is two places to press Escape and one of them wrong.
   */
  const [amending, setAmending] = useState<Party | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>("soon");
  const [adv, setAdv] = useState(EMPTY);
  const { t } = useLang();

  /*
   * A link to one party.
   *
   * Read once, on the way in, and then held rather than re-read: the id in the
   * address is where the reader arrived, and it goes on being the party they
   * came for even after they have changed a filter that would otherwise have
   * hidden it. Sending somebody a link to Tuesday's raid and having it open on
   * an empty board because Tuesday is over would make the link useless in
   * exactly the case people share one.
   */
  const [pinned, setPinned] = useState<string | null>(openParty ?? null);
  /*
   * The address, re-read on every navigation rather than once on arrival.
   *
   * A party notification links to /party?p=38, and somebody who is already
   * looking at the board is exactly who gets one — the board does not remount
   * for that, so reading the query once when the component mounted meant
   * following the link did nothing at all. Which is the whole point of the
   * link, and the case it was most often used in.
   *
   * Through the router's own hook rather than window.location, because that
   * is the one that changes when Next navigates.
   */
  const linked = useSearchParams().get("p");
  useEffect(() => {
    if (openParty) return;
    setPinned(linked && /^\d+$/.test(linked) ? linked : null);
  }, [linked, openParty]);

  const [openId, setOpenIdRaw] = useState<string | null>(null);
  const setOpenId = useCallback((id: string | null) => {
    setOpenIdRaw(id);
    if (!id) setPinned(null);
    // Arriving at /party/11 and closing the window leaves you on the board,
    // not on an address for a party that is no longer open. That one is a
    // different route, so it is rewritten rather than navigated.
    if (!id && openParty) { window.history.replaceState(null, "", "/party"); return; }
    /*
     * Through the router rather than history.replaceState.
     *
     * The address is read back through the router's hook now, and a raw
     * replaceState does not reach it: the query would change while the hook
     * went on reporting the old one, and closing a party would leave the board
     * believing it was still open. /party is a static route, so this is the
     * client cache rather than a request.
     */
    router.replace(id ? `/party?p=${id}` : "/party", { scroll: false });
  }, [openParty, router]);
  /*
   * Open whatever the link named, once the board has it — and once only.
   *
   * The board reloads whenever anything on it changes, so without the latch
   * this would fire again on every seat somebody takes anywhere, and snap a
   * reader who had since opened a different party back to the one they arrived
   * on. Which is a page that will not let go of you.
   */
  const landed = useRef<string | null>(null);
  useEffect(() => {
    // Which party was landed on, not merely whether one was. A flag meant the
    // second link anybody followed in a session was ignored — and following a
    // second link is what a board full of parties is for.
    if (!pinned) { landed.current = null; return; }
    if (landed.current === pinned) return;
    if (!parties.some((p) => p.id === pinned)) return;
    landed.current = pinned;
    setOpenIdRaw(pinned);
  }, [pinned, parties]);

  /*
   * A finished party is not in the usual load at all — the query stops twelve
   * hours back, which is what keeps the common case small. So asking to see
   * ended ones, or following a link to one, is a wider read rather than a
   * filter over what is already here.
   */
  const wide = adv.status === "done" || !!pinned;

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setParties(await loadParties(supabase, wide ? { back: 24 * 30 } : undefined));
    setLoading(false);
  }, [supabase, wide]);

  useEffect(() => { void refresh(); }, [refresh]);

  // And keeps itself current: two people looking at the last open seat should
  // not both take it because neither could see the other.
  useLiveParties(supabase, refresh);

  /** One clock for the board. See PartyClock. */
  const now = useNow(parties);

  /**
   * Where this reader stands with a party — which of the three it is.
   *
   * The lead is in it whether or not they took a seat, which is the part a
   * roster walk on its own gets wrong. Everybody else is told apart by what
   * has to happen next and by whom: an invitation waits on the reader, a
   * request waits on the lead, and being in it waits on nobody.
   */
  const standing = useCallback(
    (p: Party): "in" | "invited" | "asked" | null => {
      if (!me) return null;
      if (p.ownerCharacterId === me.id) return "in";
      const at = placeOf(p, me.id);
      if (!at) return null;
      return at.invited ? "invited" : at.pending ? "asked" : "in";
    },
    [me]);

  /*
   * The reader's own hours, from the grid on their profile.
   *
   * One row, fetched once. The suggestions in the create form need everybody's
   * and ask for all of them; a board only ever has to answer "does this clash
   * with me", which is one person's.
   *
   * Null means they have never filled it in, which is not the same as being
   * busy — so the filter below is offered but cannot be switched on, rather
   * than switched on and quietly emptying the board.
   */
  const [myHours, setMyHours] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase || !me) return;
    void supabase.from("profiles").select("availability")
      .eq("character_id", me.id).maybeSingle()
      .then(({ data }) => {
        setMyHours((data as { availability?: string | null } | null)?.availability ?? null);
      });
  }, [supabase, me]);

  const kindCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of parties) {
      const k = byKey[p.contentKey]?.kind;
      if (k) c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [parties, byKey]);

  /*
   * Everything the reader has narrowed to, except by progress and by loot.
   *
   * Split out because those two controls have to know whether they are worth
   * offering, and they cannot ask a list they have already filtered — a board
   * showing only farm parties would report that progress is worth filtering on
   * because it is, circularly, filtered on. This is the list they are choosing
   * from, which is the honest thing to ask.
   */
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    const horizon = adv.when === "today" ? 1 : adv.when === "3d" ? 3 : adv.when === "week" ? 7 : 0;

    const out = parties.filter((p) => {
      // The party somebody followed a link to is shown whatever else is set.
      if (p.id === pinned) return true;

      // Finished is out of the way by default and one setting away. Everything
      // else on this board is about an evening somebody can still be part of.
      const over = partyStatus(p, now) === "done";
      if (over !== (adv.status === "done")) return false;

      const c = byKey[p.contentKey];
      if (kinds.size && (!c || !kinds.has(c.kind))) return false;

      if (q) {
        const hay = [c?.name, c?.short, c?.badge, c?.duty, p.note,
                     progressText(p.progress), lootText(p.loot), spotText(p.spot),
                     mapsText(p.maps, mapLabel),
                     p.roulettes?.join(" "),
                     ...Object.values(p.seats).map((s) => s.name)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (horizon) {
        const days = (new Date(p.startsAt).getTime() - now) / 86_400_000;
        if (days > horizon) return false;
      }

      if (adv.role) {
        if (!needsByRole(p)[adv.role]) return false;
      }
      if (adv.openOnly && !slotsOf(p.shape).some((s) => seatState(p, s.id) === "open")) {
        // "Open" means a seat somebody could take. A hunt train has none and is
        // always joinable, so it stays.
        if (p.shape !== "open") return false;
      }
      /*
       * Parties that start while the reader is usually around.
       *
       * The start alone, not the whole evening: somebody who plays from eight
       * is available for a party that begins at eight and runs past when they
       * log off, and they can say so themselves. Requiring the whole length to
       * fit would hide every long raid night from everybody who has been
       * honest about when they go to bed.
       */
      if (adv.free && freeAt(myHours, p.startsAt) !== true) return false;

      return true;
    });

    return out;
  }, [parties, byKey, query, kinds, adv, me, now, pinned, myHours]);

  const anyProgress = useMemo(() => base.some((p) => p.progress), [base]);
  const anyLoot = useMemo(() => base.some((p) => p.loot), [base]);

  const shown = useMemo(() => {
    // The most useful pair of filters on the page: somebody who wants a farm
    // run and somebody who wants to learn the fight are looking for opposite
    // things in the same list.
    const out = base.filter((p) =>
      (!adv.prog || p.progress?.at === adv.prog)
      && (!adv.loot || p.loot?.rule === adv.loot));

    const openCount = (p: Party) =>
      slotsOf(p.shape).filter((s) => seatState(p, s.id) === "open").length;

    /*
     * "Soonest first" has nothing to sort when everything has already
     * happened. Looking at finished parties, the one somebody wants is the one
     * that just finished — so the same setting runs the other way, and a month
     * of history does not open on the oldest night in it.
     */
    const back = adv.status === "done" ? -1 : 1;

    return [...out].sort((a, b) =>
      sort === "new" ? b.createdAt.localeCompare(a.createdAt)
      : sort === "open" ? openCount(b) - openCount(a)
                          || back * a.startsAt.localeCompare(b.startsAt)
      : back * a.startsAt.localeCompare(b.startsAt));
  }, [base, adv.prog, adv.loot, adv.status, sort]);

  /**
   * The reader's own parties, and then everybody else's by day.
   *
   * Yours at the top and out of the schedule entirely. A party you are in is
   * not one listing among forty — it is the thing you came to check, and
   * hunting for your own name down a list of Thursdays is the work this board
   * exists to remove. Sorting them first inside the list would have been
   * half of it; they would still have been rows in somebody else's Friday.
   *
   * The rest stay grouped by the day they fall on in Bangkok, which is how
   * people read a schedule.
   */
  const sections = useMemo(() => {
    const invited: Party[] = [];
    const mine: Party[] = [];
    const asked: Party[] = [];
    const rest: Party[] = [];
    for (const p of shown) {
      const where = standing(p);
      (where === "invited" ? invited
        : where === "in" ? mine
        : where === "asked" ? asked
        : rest).push(p);
    }

    const m = new Map<string, Party[]>();
    for (const p of rest) {
      const k = dayKey(p.startsAt);
      (m.get(k) ?? m.set(k, []).get(k)!).push(p);
    }
    // In the order the list is already in, rather than always oldest first.
    // Sorting the days by their own key would put a month of finished parties
    // above tonight the moment somebody looked at the archive.
    const days = [...m.entries()];
    // Invitations at the very top: they are the only rows on the board that
    // cannot move without the reader, and everything else will still be there
    // once they have answered.
    return [
      ...(invited.length ? [[INVITED, invited]] : []),
      ...(mine.length ? [[MINE, mine]] : []),
      ...(asked.length ? [[ASKED, asked]] : []),
      ...days,
    ] as [string, Party[]][];
  }, [shown, standing]);

  /*
   * A filter for something nothing on the board has is a control that can only
   * ever empty the list.
   *
   * Progress and loot belong to a handful of kinds -- loot to savage and
   * extreme alone -- so on an evening of hunt trains and photo shoots both
   * controls are questions about nothing. They come back the moment somebody
   * puts up a fight, and are counted from what is actually listed rather than
   * from what the model allows, so they follow the board rather than the code.
   */
  // A filter left set on a control that has just gone away would keep filtering
  // invisibly, which is the worst way for a list to be empty.
  useEffect(() => {
    if ((!anyProgress && adv.prog) || (!anyLoot && adv.loot)) {
      setAdv((v) => ({
        ...v,
        prog: anyProgress ? v.prog : "",
        loot: anyLoot ? v.loot : "",
      }));
    }
  }, [anyProgress, anyLoot, adv.prog, adv.loot]);

  const advCount = (adv.role ? 1 : 0) + (adv.when ? 1 : 0)
    + (adv.openOnly ? 1 : 0) + (adv.prog ? 1 : 0)
    + (adv.loot ? 1 : 0) + (adv.status ? 1 : 0) + (adv.free ? 1 : 0);

  const sel = "rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-[23.5px] font-semibold">
            {t("party.title")}
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            {t("party.times")}
          </p>
        </div>
        {!writing && (
          <button onClick={() => setWriting(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-accent bg-accent/15 py-1.5 pl-2.5 pr-3.5 text-[14.5px] text-accent hover:bg-accent/25">
            {/* The game's own party badge. A plus said "something is being
                added" about a page whose whole subject is parties being
                arranged, and the Duty Finder hexagon was already the Dungeon
                tab's — this says the one thing the button does. */}
            <PartyIcon size={17} />
            {t("party.new")}
          </button>
        )}
      </header>

      {/*
        * The same form, writing a new one or changing one that exists.
        *
        * One component because it is one set of questions, and two would be
        * two places for the loot rules to disagree about which content allows
        * what. Which of the two it is doing is the `editing` party.
        */}
      {(writing || amending) && me && userId && (
        <PartyCreate content={content} people={people} me={me} userId={userId}
                     busy={saving} suggest={suggest} labels={labels}
                     mine={me ? parties.filter((x) => placeOf(x, me.id)) : []}
                     editing={amending ?? undefined}
                     onCancel={() => { setWriting(false); setAmending(null); }}
                     onAdd={async (p) => {
                       setSaving(true);
                       setErr(null);
                       const r = amending
                         ? await updateParty(supabase!, amending.id, p)
                         : await createParty(supabase!, userId, p);
                       /*
                        * And the one row of the roster this form may write.
                        *
                        * After the listing, not with it: the party's own
                        * details are what the save is for, and a seat that
                        * cannot be had should not cost somebody the start
                        * time they came here to fix.
                        */
                       if (amending && !("error" in r && r.error)) {
                         const s = await setOwnSeat(
                           supabase!, userId, amending.id,
                           { characterId: me.id, name: me.name, avatar: me.avatar },
                           placeOf(amending, me.id), placeOf(p, me.id));
                         if (s.error) { setSaving(false); setErr(s.error); return; }
                         if (s.taken) {
                           setSaving(false);
                           setErr(t("party.seatGone", { seat: s.taken }));
                           await refresh();
                           return;
                         }

                         /*
                          * And anybody the lead has just added.
                          *
                          * Told apart by having no row id: everybody the form
                          * was opened with came out of the database with one,
                          * and the form locks them. What is left is new, and
                          * goes in as an invitation for them to answer.
                          */
                         const fresh = [
                           ...Object.entries(p.seats).map(([seat, w]) => ({ ...w, seat })),
                           ...(p.floating ?? []).map((f) => ({ ...f, seat: null })),
                         ].filter((w) => w.seatRowId == null
                                      && w.characterId !== me.id);
                         if (fresh.length) {
                           const a = await inviteMembers(supabase!, userId, amending.id, fresh);
                           if (a.error) { setSaving(false); setErr(a.error); return; }
                         }
                       }
                       setSaving(false);
                       // Truthiness, not the key: an update reports success as
                       // an object with an absent error, and "error" in r is
                       // true for a type that merely allows one.
                       if ("error" in r && r.error) { setErr(r.error); return; }
                       setWriting(false);
                       setAmending(null);
                       // Read it back rather than dropping the local copy in:
                       // the row that matters is the one the database kept, and
                       // it is the only one with a real id to comment against.
                       await refresh();
                     }} />
      )}

      {err && (
        <p className="rounded-lg border border-chili/50 bg-chili/10 px-3 py-2 text-[14px] text-chili">
          {err}
        </p>
      )}

      {/* ── The chip row, as on the member board ──────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {KIND_ORDER.map((k) => {
          const on = kinds.has(k);
          const n = kindCounts[k] ?? 0;
          return (
            <button key={k}
                    onClick={() => setKinds((v) => {
                      const next = new Set(v);
                      if (!next.delete(k)) next.add(k);
                      return next;
                    })}
                    style={on ? { borderColor: KIND_COLOR[k], color: KIND_COLOR[k],
                                  background: `color-mix(in srgb, ${KIND_COLOR[k]} 12%, transparent)` }
                              : undefined}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[14px] transition-colors ${
                      on ? "" : "border-line text-muted hover:border-muted hover:text-ink"} ${
                      !n && !on ? "opacity-45" : ""}`}>
              {KIND_ICON[k] && <TagIcon tag={KIND_ICON[k]!} size={14} />}
              {kindSay(k, t)}
              <small className="ml-1.5 font-data opacity-70">{n}</small>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
               placeholder={t("party.search")}
               aria-label={t("party.search")}
               className={`${sel} min-w-[200px] flex-1 placeholder:text-muted`} />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
                aria-label={t("party.sortSoon")} className={sel}>
          <option value="soon">{t("party.sortSoon")}</option>
          <option value="new">{t("party.sortNew")}</option>
          <option value="open">{t("party.sortOpen")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5">
        {advCount > 0 && (
          <button onClick={() => setAdv(EMPTY)}
                  className="self-end text-[14px] text-muted underline hover:text-ink">
            {t("party.clearN", { n: advCount })}
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          {/*
            * Where the five states live.
            *
            * First, because it is the one control that decides whether a party
            * is on the board at all rather than which of them are — and because
            * "where did Tuesday's raid go" is answered by the setting a reader
            * meets first.
            */}
          <span className="font-data text-[12px] uppercase tracking-[0.14em] text-muted">
            {t("party.status")}
          </span>
          <select value={adv.status}
                  onChange={(e) => setAdv({ ...adv, status: e.target.value as StatusPick })}
                  className={sel} aria-label={t("party.status")}>
            <option value="">{t("party.stOpenOnly")}</option>
            <option value="done">{t("party.stDone")}</option>
          </select>

          <span className="font-data text-[12px] uppercase tracking-[0.14em] text-muted">
            {t("party.needs")}
          </span>
          <select value={adv.role}
                  onChange={(e) => setAdv({ ...adv, role: e.target.value as SlotRole | "" })}
                  className={sel} aria-label={t("party.anyRole")}>
            <option value="">{t("party.anyRole")}</option>
            {(Object.keys(ROLE_LABEL) as SlotRole[]).map((r) => (
              <option key={r} value={r}>{t("party.wantsRole", { role: ROLE_LABEL[r] })}</option>
            ))}
          </select>

          {anyProgress && (
            <>
              <span className="font-data text-[12px] uppercase tracking-[0.14em] text-muted">
                {t("party.progress")}
              </span>
              <select value={adv.prog}
                      onChange={(e) => setAdv({ ...adv, prog: e.target.value as ProgressAt | "" })}
                      className={sel} aria-label={t("party.progress")}>
                <option value="">{t("party.anyProgress")}</option>
                {(Object.keys(PROGRESS_LABEL) as ProgressAt[]).map((k) => (
                  <option key={k} value={k}>{PROGRESS_LABEL[k]}</option>
                ))}
              </select>
            </>
          )}

          {anyLoot && (
            <>
              <span className="font-data text-[12px] uppercase tracking-[0.14em] text-muted">
                {t("party.loot")}
              </span>
              <select value={adv.loot}
                      onChange={(e) => setAdv({ ...adv, loot: e.target.value as LootRule | "" })}
                      className={sel} aria-label={t("party.loot")}>
                <option value="">{t("party.anyLoot")}</option>
                {(Object.keys(LOOT_LABEL) as LootRule[]).map((k) => (
                  <option key={k} value={k}>{LOOT_LABEL[k]}</option>
                ))}
              </select>
            </>
          )}

          <span className="font-data text-[12px] uppercase tracking-[0.14em] text-muted">
            {t("party.when")}
          </span>
          <select value={adv.when}
                  onChange={(e) => setAdv({ ...adv, when: e.target.value as When })}
                  className={sel} aria-label={t("party.when")}>
            <option value="">{t("party.anyTime")}</option>
            <option value="today">{t("party.within1")}</option>
            <option value="3d">{t("party.within3")}</option>
            <option value="week">{t("party.within7")}</option>
          </select>

          <label className="flex items-center gap-1.5 text-[14px] text-muted">
            <input type="checkbox" checked={adv.openOnly}
                   onChange={(e) => setAdv({ ...adv, openOnly: e.target.checked })} />
            {t("party.hasRoom")}
          </label>
          {/*
            * Offered even to somebody who has not filled the grid in, because
            * a control that is simply absent is a feature nobody finds. It
            * cannot be switched on, and it says why.
            */}
          <label className={`flex items-center gap-1.5 text-[14px] ${
            myHours ? "text-muted" : "text-muted/50"}`}
                 title={myHours ? undefined : t("party.setHours")}>
            <input type="checkbox" checked={adv.free} disabled={!myHours}
                   onChange={(e) => setAdv({ ...adv, free: e.target.checked })} />
            {t("party.whenIPlay")}
            {!myHours && (
              <Link href="/profile" className="underline hover:text-ink">
                {t("party.setHoursShort")}
              </Link>
            )}
          </label>
        </div>
      </div>

      <p className="text-[14px] text-muted">
        {shown.length === 1 ? t("party.countOne")
                            : t("party.countMany", { n: shown.length })}
      </p>

      {/* ── The list, by day ─────────────────────────────────────────────── */}
      {loading && (
        <p className="px-4 py-10 text-center text-[14.5px] text-muted">{t("party.loading")}</p>
      )}

      {!loading && sections.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[14.5px] text-muted">
          {t("party.none")}
        </p>
      )}

      {sections.map(([key, list]) => (
        <section key={key} className="flex flex-col gap-2">
          <h2 className={`font-data text-[12.5px] uppercase tracking-[0.14em] ${
            key === INVITED ? "text-gold"
            : key === MINE ? "text-accent"
            : key === ASKED ? "text-jade" : "text-muted"}`}>
            {key === INVITED ? t("party.invitedHeading", { n: list.length })
              : key === MINE ? t("party.mineHeading", { n: list.length })
              : key === ASKED ? t("party.askedHeading", { n: list.length })
              : fmtDay(list[0].startsAt)}
          </h2>
          {list.map((p) => {
            const c = byKey[p.contentKey];
            const tint = c ? KIND_COLOR[c.kind] : "#8b93a1";
            const open = openId === p.id;
            const res = resolveParty(p);
            const inIt = [...Object.values(res.seats), ...res.loose];
            // Whoever put it up, wherever they ended up -- seated, or still
            // floating between two seats they offered for.
            const owner = inIt.find((m) => m.characterId === p.ownerCharacterId);
            return (
              <article key={p.id}
                       className="overflow-hidden rounded-xl border border-line bg-surface">
                {/*
                  * A poster rather than a line of chips.
                  *
                  * The picture is the left rail at full height, and a row with
                  * no picture gets a block in its kind's colour with the game's
                  * own badge on it — so every title starts at the same x. The
                  * old row could not manage that: a thumbnail on some rows and
                  * not others gave a column of eight rows two title columns.
                  *
                  * The time goes on the rail, over the art, where a poster puts
                  * it. Everything that used to be a coloured chip is one muted
                  * line of dots underneath, because those are the terms of the
                  * evening rather than five separate alarms — and the only
                  * coloured thing left is what the party is short of, which is
                  * the one fact a reader is actually deciding on.
                  */}
                <button onClick={() => setOpenId(open ? null : p.id)}
                        className="flex w-full items-stretch text-left hover:bg-card/30">
                  <span style={{
                          backgroundImage: c?.art ? `url(${c.art})` : undefined,
                          backgroundPosition: c?.focus ?? "center",
                          backgroundColor: c?.art ? undefined
                            : `color-mix(in srgb, ${tint} 22%, var(--color-bg))`,
                        }}
                        className="relative flex w-[100px] shrink-0 items-end bg-cover bg-center p-2 sm:w-[124px]">
                    <span aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-black/85 to-black/25" />
                    {!c?.art && c && (c.icon || KIND_ICON[c.kind]) && (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90">
                        <TagIcon tag={c.icon ?? KIND_ICON[c.kind]!} size={34} />
                      </span>
                    )}
                    <span className="relative z-[1] flex flex-col">
                      <span className="font-data text-[19.5px] font-semibold tabular-nums text-white drop-shadow">
                        {fmtTime(p.startsAt)}
                      </span>
                      {/*
                        * The answer to the question the time only poses.
                        * "20:00" says when and not whether that is soon, which
                        * is the arithmetic people do badly across a day
                        * boundary — a party reading "tomorrow 20:00" on a
                        * Tuesday night is one nobody registers is nine hours
                        * away.
                        */}
                      <WhenLine party={p} now={now}
                                className="font-data text-[12px] text-white/80 drop-shadow" />
                    </span>
                  </span>

                  {/*
                    * Beside each other where there is width, stacked where
                    * there is not.
                    *
                    * The right-hand column holds what the party is short of,
                    * and three chips reading "needs 2 tank" is three hundred
                    * pixels that will not shrink — on a 360px phone that left
                    * the title about forty pixels to wrap in, so "The Epic of
                    * Alexander" came out one word per line with the chips
                    * printed over the top of it.
                    */}
                  <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-stretch">
                  <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3.5 pb-1.5 pt-3 sm:py-3">
                    <span className="flex flex-wrap items-baseline gap-2">
                      {c && (c.icon || KIND_ICON[c.kind]) && (
                        <TagIcon tag={c.icon ?? KIND_ICON[c.kind]!} size={17} />
                      )}
                      <span className="font-display text-[17.5px] font-semibold text-ink">
                        {c?.duty ?? c?.name ?? p.contentKey}
                      </span>
                      {/* The shorthand as a badge beside the name rather than
                          instead of it: the old row printed "Hunt train Hunt
                          train" wherever a content had no separate short form. */}
                      {c?.badge && c.badge !== c.duty && (
                        <span style={{ color: tint,
                                       borderColor: `color-mix(in srgb, ${tint} 45%, transparent)` }}
                              className="rounded border px-1.5 font-data text-[12.5px] font-bold">
                          {c.badge}
                        </span>
                      )}
                      {/* Last, after the fight has finished naming itself.
                          The badge is part of the title — EX6 and UCOB are what
                          people call these — and a status word wedged between
                          the name and its own shorthand breaks the name in
                          half. */}
                      <StatusPill status={partyStatus(p, now)} />
                    </span>

                    {/* The date and the two clock times, written out once.
                        The stamp on the left is the start alone and the line
                        under it is relative — neither is the thing you copy
                        into a Discord post when you tell people to be there. */}
                    <span className="font-data text-[12.5px] tabular-nums text-muted">
                      {whenFull(p)}
                    </span>

                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-muted">
                      <span className="flex items-center gap-1"
                            title={whyEstimate(p, c?.kind, t)}>
                        {/* A map night has no end anybody chose — it runs until
                            the maps are done, and that is a dice roll. Saying
                            so is better than a time that quietly turns out to
                            have been a guess. Same for a party counted in
                            runs, which said as much on purpose. */}
                        {lengthIsEstimate(p, c?.kind) && <span className="opacity-70">~</span>}
                        {p.lengthUnit === "food" && (
                          <FoodIcon size={11} className="text-gold" />
                        )}
                        {lengthSay(p, t)}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{headSay(p, c?.kind, t)}</span>
                      {progressText(p.progress) && (
                        <><span className="opacity-40">·</span>
                          <span>{progressText(p.progress)}</span></>
                      )}
                      {lootLine(p.loot, t) && (
                        <><span className="opacity-40">·</span>
                          <span>{lootLine(p.loot, t)}</span></>
                      )}
                      {p.oneOfEachJob && (
                        <><span className="opacity-40">·</span>
                          <span>{t("party.onePerJob")}</span></>
                      )}
                      {mapsText(p.maps, mapLabel) && (
                        <><span className="opacity-40">·</span>
                          <span>🗺 {mapsText(p.maps, mapLabel)}</span></>
                      )}
                      {/* Which roulettes, which is the whole of what one
                          roulette listing says that another does not. */}
                      {!!p.roulettes?.length && (
                        <><span className="opacity-40">·</span>
                          <span>{p.roulettes.join(", ")}</span></>
                      )}
                      {worldText(p.spot) && (
                        <><span className="opacity-40">·</span>
                          <span>🌐 {worldText(p.spot)}</span></>
                      )}
                      {spotText(p.spot) && (
                        <><span className="opacity-40">·</span>
                          <span>📍 {spotText(p.spot)}</span></>
                      )}
                    </span>

                    {p.note && (
                      <span className="truncate text-[14.5px] text-ink/70">{p.note}</span>
                    )}
                  </span>

                  <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 pb-3 sm:flex-col sm:items-end sm:justify-center sm:gap-2 sm:px-0 sm:py-3 sm:pr-3.5">
                    <span className="flex flex-wrap items-center gap-2.5">
                      {/* Who is already in it. The strongest reason to join a
                          party is that other people have, and the row said
                          nothing at all about that before. */}
                      <span className="hidden -space-x-2 sm:flex">
                        {inIt.slice(0, 6).map((m, i) => {
                          const src = face(m.characterId, m.avatar);
                          return src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt={m.name} title={m.name}
                                 width={34} height={34}
                                 className="size-[34px] rounded-full border-2 border-surface object-cover" />
                          ) : (
                            <span key={i} title={m.name}
                                  className={`grid size-[34px] place-items-center rounded-full border-2 border-surface text-[13.5px] text-muted ${
                                    m.characterId == null ? "bg-bg" : "bg-card"}`}>
                              {m.characterId == null ? "?" : ""}
                            </span>
                          );
                        })}
                        {inIt.length > 6 && (
                          <span className="grid size-[34px] place-items-center rounded-full border-2 border-surface bg-card font-data text-[12.5px] text-muted">
                            +{inIt.length - 6}
                          </span>
                        )}
                      </span>
                      <NeedLine party={p} />
                    </span>

                    <span className="flex items-center gap-2">
                      {/* Somebody is waiting on an answer. Shown on the closed
                          row because a request nobody sees is a request that
                          goes unanswered, and the lead is the one person who
                          has to notice without being told twice. */}
                      {pendingAsks(p) > 0 && (
                        <span className="rounded-full border border-gold/50 bg-gold/10 px-1.5 font-data text-[12px] text-gold">
                          ✋ {pendingAsks(p)}
                        </span>
                      )}
                      {!!p.comments?.length && (
                        <span className="font-data text-[13px] text-muted">
                          💬 {p.comments.length}
                        </span>
                      )}
                      {owner && face(owner.characterId, owner.avatar) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={face(owner.characterId, owner.avatar)!} alt=""
                             width={32} height={32}
                             className="size-8 rounded-full border border-line object-cover" />
                      )}
                      <span className="text-[14px] text-muted">{owner?.name}</span>
                    </span>
                  </span>
                  </span>
                </button>

                {/* The row is a summary now; the party itself opens over it.
                    See PartyDetail. */}
              </article>
            );
          })}
        </section>
      ))}

      {/*
        * Whichever party is open, over the board.
        *
        * One window for the whole page rather than one per row: only ever one
        * is open, and mounting thirty dialogs to keep twenty-nine of them shut
        * is thirty comment threads and thirty seat grids built for nothing.
        */}
      {openId && (() => {
        const p = shown.find((x) => x.id === openId)
          ?? parties.find((x) => x.id === openId);
        if (!p) return null;
        return (
          <PartyDetail party={p} def={byKey[p.contentKey]} now={now}
                       parties={parties}
                       people={people} me={me} userId={userId} supabase={supabase}
                       refresh={refresh} setErr={setErr} setParties={setParties}
                       /* Theirs to change. The policy says the same thing and
                          is the one that counts; this decides whether the
                          buttons are worth drawing. */
                       onEdit={userId && p.owner === userId
                         ? () => { setOpenId(null); setAmending(p); } : undefined}
                       onClose={() => setOpenId(null)} />
        );
      })()}
    </div>
  );
}
