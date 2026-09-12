"use client";

import type {
  ContentKind, Flex, Floater, Party, Resolved, SlotDef, SlotRole, Wing,
} from "@/lib/party";
import {
  ROLE_COLOR, ROLE_LABEL, flexBits, headcount, openTo, resolveParty,
  shortfallOf,
  slotsOf,
} from "@/lib/party";
import { Fragment, useState } from "react";
import JobIcon, { jobLabel } from "@/components/JobIcon";
import { jobsForSlot } from "@/components/party/JobRule";
import { Popover } from "@/components/ui/Popover";
import { RuleMark } from "@/components/party/JobRule";
import { useAvatarOverrides } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";

/**
 * The face to draw for somebody.
 *
 * What they chose, then what the Lodestone gave them, then nothing — the same
 * order the rest of the site uses. members.json is written by the nightly
 * crawler and cannot know about a picture uploaded this afternoon, so the
 * override is laid over the top rather than baked in.
 */
/** One face, at whatever size, with the outsider's dashed question mark. */
function Face(
  { who, size }: {
    who: { characterId: number | null; name: string; avatar: string | null };
    size: number;
  },
) {
  const src = useFace()(who.characterId, who.avatar);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={size} height={size} style={{ width: size, height: size }}
           className="shrink-0 rounded-full border border-line object-cover" />
    );
  }
  return (
    <span title={who.characterId == null ? "Not on this site" : undefined}
          style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
          className={`grid shrink-0 place-items-center rounded-full text-muted ${
            who.characterId == null
              ? "border border-dashed border-line" : "border border-line bg-card"}`}>
      {who.characterId == null ? "?" : ""}
    </span>
  );
}

function useFace() {
  const overrides = useAvatarOverrides();
  return (characterId: number | null | undefined, fallback: string | null) =>
    (characterId != null && overrides[characterId]) || fallback || null;
}

/**
 * The party list, drawn the way the game draws one.
 *
 * Eight seats in two rows of four, tanks and healers on the top row and the
 * four DPS underneath — which is not a design choice so much as the arrangement
 * every player already has burned in from the party list itself. An alliance is
 * the same block three times with a letter over each, because that is what an
 * alliance is.
 *
 * A seat is in one of four states and each has to be told apart at a glance,
 * since the whole page is people scanning for the one word that concerns them:
 *
 *   taken     somebody is in it and has said yes
 *   waiting   somebody was put in it and has not answered
 *   open      nobody, and the party wants somebody — this is the advert
 *   shut      nobody, and the party does not want anybody
 *
 * "Waiting" is deliberately not drawn as filled. A party of five friends where
 * three have not replied is a party with three seats that may yet open, and
 * showing it as full is how somebody decides not to ask.
 */

export type SeatState = "taken" | "waiting" | "open" | "shut";

export function seatState(p: Party, id: string, r?: Resolved): SeatState {
  const who = (r ?? resolveParty(p)).seats[id];
  if (who) return who.confirmedAt ? "taken" : "waiting";
  return (p.closed ?? []).includes(id) ? "shut" : "open";
}

/**
 * The people hovering over a seat, drawn down its right-hand edge.
 *
 * Small, and cut off at three with a count after them: a seat somebody might
 * take is a smaller fact than a seat somebody is in, and four faces down the
 * side of a card that is mostly a name would say the opposite.
 */
function Maybes({ who }: { who: Floater[] }) {
  const face = useFace();
  if (!who.length) return null;
  const show = who.slice(0, 3);
  return (
    <span title={`Could take this seat: ${who.map((f) => f.name).join(", ")}`}
          className="flex shrink-0 flex-col items-center gap-0.5 self-center">
      <span className="flex -space-x-2">
        {show.map((f) => {
          const src = face(f.characterId, f.avatar);
          return src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img key={f.characterId ?? f.name} src={src} alt={f.name} width={34} height={34}
                   className="size-[34px] rounded-full border border-jade/50 object-cover opacity-85" />
            : <span key={f.characterId ?? f.name} title={f.name}
                    className={`grid size-[34px] place-items-center rounded-full text-[16.5px] text-muted opacity-85 ${
                      f.characterId == null
                        ? "border border-dashed border-jade/50"
                        : "border border-jade/50 bg-card"}`}>
                {f.characterId == null ? "?" : ""}
              </span>;
        })}
      </span>
      <span className="font-data text-[11.5px] uppercase tracking-[0.08em] text-jade/80">
        {who.length > 3 ? `+${who.length - 3} maybe` : "maybe"}
      </span>
    </span>
  );
}

/**
 * What pressing a seat does, where pressing one does anything.
 *
 * The grid already says which seats are free, so a row of buttons underneath
 * repeating them was the same list said twice. `ask` returns the question to
 * put to this reader about this seat — null where there is nothing to ask,
 * which is most seats most of the time — and answering it takes the seat.
 */
export interface SeatPick {
  ask: (slot: SlotDef) => string | null;
  take: (slot: SlotDef, job: string | null) => void;
  /** The same for standing up: a question, or null where they are not sitting. */
  benchAsk?: string | null;
  bench?: () => void;
  busy?: boolean;
}

/**
 * "Flex MT, ST" with the seats that are gone crossed off.
 *
 * The whole offer stays on the card. A person who said they could tank said
 * it, and quietly deleting half the sentence when somebody else took MT would
 * leave the line changing under the reader with nothing on the page to explain
 * why — and would hide, from the lead reading the grid, that this healer is
 * the reason the party never needed a second tank.
 *
 * So the dead parts are struck through and dimmed, and what is left in plain
 * text is exactly what is still in play. Read at a glance it says one thing:
 * this is where she might end up instead.
 */
function FlexLine(
  { flex, open, seat }: {
    flex?: Flex | null; open: readonly SlotDef[]; seat: string;
  },
) {
  const parts = flexBits(flex, open, seat);
  if (!parts) return null;
  return (
    <span className="truncate font-data text-[12.5px] uppercase tracking-[0.1em] text-jade">
      {parts.flex && "Flex "}
      {/* The separator sits outside the crossed-out span on purpose: a line
          through the text runs through everything inside it, commas included,
          and a struck comma reads as part of the word next to it. */}
      {parts.bits.map((b, i) => (
        <Fragment key={b.text}>
          {i > 0 && ", "}
          <span className={b.live ? "" : "text-muted/70 line-through"}>
            {b.text}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

function Seat(
  { slot, party, res, onPick, pick, compact }: {
    slot: SlotDef;
    party: Party;
    res: Resolved;
    /** Given by the create form, where clicking a seat fills or empties it. */
    onPick?: (slot: SlotDef) => void;
    /** Given by the open party, where pressing one asks to sit in it. */
    pick?: SeatPick;
    compact?: boolean;
  },
) {
  const { t } = useLang();
  const state = seatState(party, slot.id, res);
  const who = res.seats[slot.id];
  const maybe = res.maybe[slot.id] ?? [];
  const src = useFace()(who?.characterId, who?.avatar ?? null);
  // A seat with no role has no colour to take from one. Grey, so the grid
  // still reads as a party without claiming somebody has to tank it.
  const tint = slot.free ? "#8b93a1" : ROLE_COLOR[slot.role];

  const ring =
    state === "taken" ? { borderColor: `color-mix(in srgb, ${tint} 55%, transparent)`,
                          background: `color-mix(in srgb, ${tint} 10%, transparent)` }
    : state === "waiting" ? { borderColor: "color-mix(in srgb, #c9a227 60%, transparent)",
                              background: "color-mix(in srgb, #c9a227 8%, transparent)" }
    : {};

  const ask = pick && !onPick ? pick.ask(slot) : null;
  const Tag = onPick || ask ? "button" : "div";
  const cell = (
    <Tag
      {...(onPick ? { onClick: () => onPick(slot), type: "button" as const } : {})}
      {...(ask ? { type: "button" as const } : {})}
      style={ring}
      className={`flex min-w-0 items-stretch gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
        compact ? "" : "min-h-[4.6rem]"} ${
        state === "open" ? "border-dashed border-line/80 hover:border-accent/60"
        : state === "shut" ? "border-dashed border-line/40 opacity-40"
        : "border"} ${onPick || ask ? "cursor-pointer" : ""} ${
        ask ? "hover:border-accent/60" : ""}`}>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
      {/* The seat's name is the constant thing — it is there whether or not
          anybody is in it, which is what makes the grid readable as a party
          rather than as a list of names that happens to be eight long. */}
      <span className="flex items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-full"
              style={{ background: tint, opacity: state === "shut" ? 0.4 : 1 }} />
        <span className="font-data text-[13px] uppercase tracking-[0.12em] text-muted">
          {slot.label}
        </span>
      </span>

      {state === "taken" || state === "waiting" ? (
        <span className="flex min-w-0 items-center gap-1.5">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" width={44} height={44}
                 className="size-[44px] shrink-0 rounded-full border border-line object-cover" />
          ) : (
            // Dashed and with a question mark for somebody who is not on this
            // site: a member who simply has no picture is a solid circle, and
            // the two are different facts that should not look the same.
            <span title={who?.characterId == null ? t("pf.notOnSite") : undefined}
                  className={`grid size-[44px] shrink-0 place-items-center rounded-full text-[19px] text-muted ${
                    who?.characterId == null
                      ? "border border-dashed border-line" : "border border-line bg-card"}`}>
              {who?.characterId == null ? "?" : ""}
            </span>
          )}
          {/* The job, or the offer. Somebody who said "White Mage or Sage"
              has not been placed on either yet, and drawing one of them would
              be the board deciding for the party. */}
          {who?.job ? <JobIcon job={who.job} size={28} />
            : who?.jobs?.length ? (
              <span className="flex shrink-0 -space-x-1.5" title={who.jobs.join(", ")}>
                {who.jobs.slice(0, 3).map((j) => (
                  <JobIcon key={j} job={j} size={26} />
                ))}
                {who.jobs.length > 3 && (
                  <span className="pl-2 font-data text-[12.5px] text-muted">
                    +{who.jobs.length - 3}
                  </span>
                )}
              </span>
            ) : null}
          <span className={`truncate text-[16px] ${
            state === "waiting" ? "text-ink/60" : "text-ink"}`}>
            {who?.name}
          </span>
        </span>
      ) : (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={`text-[14.5px] ${
            state === "open" ? "text-accent/80" : "text-muted"}`}>
            {state === "open" ? t("pf.open") : "—"}
          </span>
          {/* What it is asking for, where it asks for anything in particular.
              An unrestricted seat says nothing, which is what makes a
              restricted one worth noticing. */}
          {state === "open" && <RuleMark party={party} slot={slot} />}
        </span>
      )}

      {state === "waiting" && (
        <span className="font-data text-[12.5px] uppercase tracking-[0.1em] text-gold">
          {t("pf.awaitingReply")}
        </span>
      )}

      {/* What else they could play. Drawn on the seat they are in rather than
          on the seats they could move to, because it is a fact about the
          person: one line under their name, not four hints scattered across
          the grid saying the same thing. */}
      {state !== "open" && state !== "shut" && who?.characterId == null && (
        <span className="font-data text-[12.5px] uppercase tracking-[0.1em] text-muted">
          {t("pf.outsideFc")}
        </span>
      )}

      {/* What else they could play, with whatever has since been taken struck
          out rather than dropped. See flexBits. */}
      <FlexLine flex={who?.flex} open={res.open} seat={slot.id} />
      </span>

      {/* Whoever else could end up here, down the right-hand edge. A face on
          ST and the same face on D2 is the whole idea said in one picture:
          one of those will happen and nobody has decided which. */}
      <Maybes who={maybe} />
    </Tag>
  );

  if (!ask || !pick) return cell;
  return <SeatAsk slot={slot} party={party} pick={pick} ask={ask} cell={cell} />;
}

/**
 * The question a seat asks when it is pressed, and the answer.
 *
 * A popover rather than a dialog, anchored to the seat itself: what is being
 * confirmed is *this* chair, and a box in the middle of the screen makes the
 * reader hold which one in their head while they read it.
 *
 * The job is offered and not required. Which job somebody brings is a thing
 * they often decide on the night, and a picker that insisted would be a
 * question standing between them and a seat that is free right now — so it is
 * chips they may ignore, and the seat is taken either way.
 */
function SeatAsk(
  { slot, party, pick, ask, cell }: {
    slot: SlotDef; party: Party; pick: SeatPick; ask: string;
    cell: React.ReactNode;
  },
) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<string | null>(null);
  // Only what this seat will actually take, which is the seat's own rule
  // narrowed by whatever the party has said about duplicate jobs.
  const jobs = openTo(party, slot.id, jobsForSlot(slot));

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setJob(null); }}
             trigger={cell}>
      <div className="flex flex-col gap-2.5">
        <p className="text-[15px] text-ink">{ask}</p>
        {jobs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-data text-[12px] uppercase tracking-[0.12em] text-muted">
              {t("party.jobOptional")}
            </span>
            <div className="flex flex-wrap gap-1">
              {jobs.map((j: string) => (
                <button key={j} type="button" title={jobLabel(j)}
                        onClick={() => setJob(job === j ? null : j)}
                        className={`grid size-8 place-items-center rounded-lg border transition-colors ${
                          job === j ? "border-accent bg-accent/15"
                                    : "border-line hover:border-muted"}`}>
                  <JobIcon job={j} size={20} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button type="button" disabled={pick.busy}
                  onClick={() => { setOpen(false); pick.take(slot, job); }}
                  className="rounded-lg border border-jade/60 bg-jade/15 px-3 py-1.5 text-[15px] text-jade hover:bg-jade/25 disabled:opacity-50">
            {t("party.confirmSeat")}
          </button>
          <button type="button" onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-1.5 text-[14.5px] text-muted hover:text-ink">
            {t("pf.cancel")}
          </button>
        </div>
      </div>
    </Popover>
  );
}

/** One block of up to eight, in the game's two-row arrangement. */
function Block(
  { slots, party, res, onPick, pick, wing }: {
    slots: SlotDef[]; party: Party; res: Resolved;
    onPick?: (slot: SlotDef) => void; pick?: SeatPick; wing?: Wing;
  },
) {
  const { t } = useLang();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {wing && (
        <span className="font-data text-[13px] uppercase tracking-[0.14em] text-muted">
          {t("pf.partyWing", { wing })}
        </span>
      )}
      <div className={`grid gap-1.5 ${
        slots.length > 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>
        {slots.map((s) => (
          <Seat key={s.id} slot={s} party={party} res={res} onPick={onPick}
                pick={pick} />
        ))}
      </div>
    </div>
  );
}

export default function PartySeats(
  { party, onPick, pick, kind }: {
    party: Party;
    onPick?: (slot: SlotDef) => void;
    /** What pressing a seat does. See SeatPick. */
    pick?: SeatPick;
    /** Only so a seatless party can say why it has no seats. */
    kind?: ContentKind;
  },
) {
  const { t } = useLang();
  const slots = slotsOf(party.shape);
  const res = resolveParty(party);

  if (!slots.length) {
    /*
     * No seats, and there never were any: a hunt train, a FATE farm, a PvP
     * queue. Nobody is missing from anything, so there is nothing to advertise
     * — but there is still a list, and it is the only thing anybody wants from
     * one of these. Who else is going.
     */
    const going = party.floating ?? [];
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-line px-3 py-2.5">
        <p className="text-[15.5px] text-muted">
          {t(kind === "community" ? "pf.openCommunityWhy"
            : kind === "pvp" ? "pf.openPvpWhy"
            : "pf.openTurnUp")}
        </p>
        {going.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {going.map((f) => (
              <span key={f.characterId ?? f.name}
                    className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1">
                <Face who={f} size={24} />
                <span className={`text-[15.5px] ${
                  f.confirmedAt ? "text-ink" : "text-ink/60"}`}>
                  {f.name}
                </span>
                {!f.confirmedAt && (
                  <span className="font-data text-[12px] uppercase tracking-[0.1em] text-gold">
                    {t("pf.askedShort")}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const grid = party.shape !== "alliance"
    ? <Block slots={slots} party={party} res={res} onPick={onPick} pick={pick} />
    : (
      <div className="flex flex-col gap-3">
        {(["A", "B", "C"] as Wing[]).map((wing) => (
          <Block key={wing} wing={wing} party={party} res={res} onPick={onPick}
                 pick={pick} slots={slots.filter((s) => s.wing === wing)} />
        ))}
      </div>
    );

  if (!pick && !res.loose.length) return grid;
  return (
    <div className="flex flex-col gap-2">
      {grid}
      <Bench who={res.loose} pick={pick} />
    </div>
  );
}

/**
 * In the party, no chair yet.
 *
 * Its own row under the grid rather than a gap in it, because that is what it
 * is: somebody who said yes and has not picked, which is a normal place to
 * stand and not a seat going spare. The resolver already hovers them over the
 * seats they could take — this says how many of them there are and gives them
 * somewhere to be.
 *
 * Pressable where the reader is sitting somewhere, because standing up is the
 * other half of sitting down and there was nowhere to do it from.
 */
function Bench(
  { who, pick }: { who: readonly Floater[]; pick?: SeatPick },
) {
  const { t } = useLang();
  const face = useFace();
  const ask = pick?.benchAsk ?? null;
  if (!who.length && !ask) return null;

  const row = (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line/70 px-2.5 py-2 text-left ${
      ask ? "hover:border-accent/60" : ""}`}>
      <span className="font-data text-[12.5px] uppercase tracking-[0.12em] text-muted">
        {t("party.bench")}
      </span>
      {who.map((f) => {
        const src = face(f.characterId, f.avatar);
        return (
          <span key={f.seatRowId ?? f.name} className="flex items-center gap-1.5">
            {src
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={src} alt="" width={24} height={24}
                     className="size-6 rounded-full border border-line object-cover" />
              : <span className="size-6 rounded-full border border-dashed border-line" />}
            <span className="text-[14.5px] text-ink/85">{f.name}</span>
          </span>
        );
      })}
      {!who.length && (
        <span className="text-[14.5px] text-muted">{t("party.benchEmpty")}</span>
      )}
    </div>
  );

  if (!ask || !pick?.bench) return row;
  return (
    <Popover trigger={<button type="button" className="text-left">{row}</button>}>
      <div className="flex flex-col gap-2.5">
        <p className="text-[15px] text-ink">{ask}</p>
        <button type="button" disabled={pick.busy}
                onClick={() => pick.bench?.()}
                className="self-start rounded-lg border border-jade/60 bg-jade/15 px-3 py-1.5 text-[15px] text-jade hover:bg-jade/25 disabled:opacity-50">
          {t("party.confirmSeat")}
        </button>
      </div>
    </Popover>
  );
}

/** A one-line summary of what is missing, for the collapsed row. */
export function NeedLine({ party }: { party: Party }) {
  const { t } = useLang();

  /*
   * How many are in it, beside what it is short of.
   *
   * The two answer different halves of the same question and the row only ever
   * carried one: "needs 2 healers" says what is missing and nothing about
   * whether this is a party of three or of seven. Quiet and uncoloured, since
   * the chips beside it are the ones somebody is meant to act on — this is the
   * fact they are read against.
   */
  const { here, seats } = headcount(party);
  const count = seats ? (
    <span title={t("pf.headcount", { n: String(here), of: String(seats) })}
          className="rounded-full border border-line px-2.5 py-[3px] font-data text-[13.5px] tabular-nums text-muted">
      {here}/{seats}
    </span>
  ) : null;

  /*
   * Looking, or not.
   *
   * The one fact on a row somebody can act on, and until now it looked exactly
   * like the six rows they could not: a party short of a healer and a party
   * that filled up yesterday were the same shape in the same place. So the
   * open ones carry a light travelling across them and the full ones are told
   * in plain words.
   *
   * The full case deliberately gets no mark at all. A badge saying "full" is
   * the board drawing attention to the rows with nothing left in them, which
   * is the opposite of what a row of badges is for.
   */
  // A hunt train has no seats and never fills, so "Full" would be the wrong
  // word twice over -- it has nothing to fill, and it is the one kind of party
  // anybody can always join.
  if (party.shape === "open") {
    return (
      <span className="looking rounded-full border border-jade/50 px-2.5 py-[3px] font-data text-[13.5px] uppercase tracking-[0.1em] text-jade">
        {t("pf.openToAll")}
      </span>
    );
  }

  const res = resolveParty(party);
  if (!res.wanted) {
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        {count}
        <span className="text-[15.5px] text-muted">{t("pf.full")}</span>
        {res.loose.length > 0 && (
          // Full, but not settled: the seats are spoken for and who sits where
          // is still being worked out between the people already in.
          <span title={t("pf.stillSettling")}
                className="rounded-full border border-jade/45 px-2 py-[2px] font-data text-[13.5px] uppercase tracking-[0.1em] text-jade">
            {t("pf.flexingN", { n: res.loose.length })}
          </span>
        )}
      </span>
    );
  }

  /*
   * What it is short of, from the one place that works it out. Roleless seats
   * fall through to "wants N more" below, which is the true answer for a FATE
   * farm: it is short of people, not short of healers.
   */
  const cut = shortfallOf(party);
  const parts = (Object.keys(cut.need) as SlotRole[]).filter((r) => cut.need[r] > 0);

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {count}
      {parts.map((r) => (
        <span key={r}
              style={{ color: ROLE_COLOR[r],
                       borderColor: `color-mix(in srgb, ${ROLE_COLOR[r]} 55%, transparent)` }}
              className="looking rounded-full border px-2.5 py-[3px] font-data text-[13.5px] uppercase tracking-[0.1em]">
          {t("pf.needRole", { n: cut.need[r], role: ROLE_LABEL[r] })}
        </span>
      ))}
      {/* The rest, whose role is not settled: somebody inside the party will
          move to suit whoever turns up. Uncoloured, because it is not a chip
          about one role — and where every role is still going it stops naming
          them and says so, which is shorter and says more. */}
      {cut.either && (
        <span className="looking rounded-full border border-accent/55 px-2.5 py-[3px] font-data text-[13.5px] uppercase tracking-[0.1em] text-accent">
          {cut.either.roles.length === 3
            ? t("pf.wantMore", { n: cut.either.n })
            : t("pf.needRole", {
                n: cut.either.n,
                role: cut.either.roles.map((r) => ROLE_LABEL[r]).join("/"),
              })}
        </span>
      )}
      {!parts.length && !cut.either && (
        // Every empty seat has somebody hovering over it, so there is no role
        // to name -- but only one of the seats each of them hovers over will
        // actually be theirs. What the party wants is bodies, any role.
        <span className="looking rounded-full border border-accent/55 px-2.5 py-[3px] font-data text-[13.5px] uppercase tracking-[0.1em] text-accent">
          {t("pf.wantMore", { n: res.wanted })}
        </span>
      )}
      {res.loose.length > 0 && (
        <span title={t("pf.flexingWhy", { n: res.loose.length })}
              className="rounded-full border border-jade/45 px-2 py-[2px] font-data text-[13.5px] uppercase tracking-[0.1em] text-jade">
          {t("pf.flexingN", { n: res.loose.length })}
        </span>
      )}
    </span>
  );
}
