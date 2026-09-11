"use client";

import type {
  ContentKind, Floater, Party, Resolved, SlotDef, SlotRole, Wing,
} from "@/lib/party";
import {
  ROLE_COLOR, ROLE_LABEL, canFlex, flexLabel, resolveParty, slotsOf,
} from "@/lib/party";
import JobIcon from "@/components/JobIcon";
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

function Seat(
  { slot, party, res, onPick, compact }: {
    slot: SlotDef;
    party: Party;
    res: Resolved;
    /** Given by the create form, where clicking a seat fills or empties it. */
    onPick?: (slot: SlotDef) => void;
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

  const Tag = onPick ? "button" : "div";
  return (
    <Tag
      {...(onPick ? { onClick: () => onPick(slot), type: "button" as const } : {})}
      style={ring}
      className={`flex min-w-0 items-stretch gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
        compact ? "" : "min-h-[4.6rem]"} ${
        state === "open" ? "border-dashed border-line/80 hover:border-accent/60"
        : state === "shut" ? "border-dashed border-line/40 opacity-40"
        : "border"} ${onPick ? "cursor-pointer" : ""}`}>

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

      {canFlex(who?.flex) && (
        <span className="truncate font-data text-[12.5px] uppercase tracking-[0.1em] text-jade">
          {flexLabel(who?.flex)}
        </span>
      )}
      </span>

      {/* Whoever else could end up here, down the right-hand edge. A face on
          ST and the same face on D2 is the whole idea said in one picture:
          one of those will happen and nobody has decided which. */}
      <Maybes who={maybe} />
    </Tag>
  );
}

/** One block of up to eight, in the game's two-row arrangement. */
function Block(
  { slots, party, res, onPick, wing }: {
    slots: SlotDef[]; party: Party; res: Resolved;
    onPick?: (slot: SlotDef) => void; wing?: Wing;
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
          <Seat key={s.id} slot={s} party={party} res={res} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

export default function PartySeats(
  { party, onPick, kind }: {
    party: Party;
    onPick?: (slot: SlotDef) => void;
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

  if (party.shape !== "alliance") {
    return <Block slots={slots} party={party} res={res} onPick={onPick} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {(["A", "B", "C"] as Wing[]).map((wing) => (
        <Block key={wing} wing={wing} party={party} res={res} onPick={onPick}
               slots={slots.filter((s) => s.wing === wing)} />
      ))}
    </div>
  );
}

/** A one-line summary of what is missing, for the collapsed row. */
export function NeedLine({ party }: { party: Party }) {
  const { t } = useLang();

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

  const need: Record<SlotRole, number> = { tank: 0, healer: 0, dps: 0 };
  // Roleless seats fall through to "wants N more" below, which is the true
  // answer for a FATE farm: it is short of people, not short of healers.
  for (const s of res.uncovered) if (!s.free) need[s.role] += 1;
  const parts = (Object.keys(need) as SlotRole[]).filter((r) => need[r] > 0);

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {parts.length ? parts.map((r) => (
        <span key={r}
              style={{ color: ROLE_COLOR[r],
                       borderColor: `color-mix(in srgb, ${ROLE_COLOR[r]} 55%, transparent)` }}
              className="looking rounded-full border px-2.5 py-[3px] font-data text-[13.5px] uppercase tracking-[0.1em]">
          {t("pf.needRole", { n: need[r], role: ROLE_LABEL[r] })}
        </span>
      )) : (
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
