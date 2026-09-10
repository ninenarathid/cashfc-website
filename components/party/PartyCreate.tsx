"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ContentDef, Flex, Floater, LengthUnit, Loot, MapPlan, Party, PartyBlock,
  Progress, SeatRule, Shape, SlotDef, SlotRole, Spot,
} from "@/lib/party";
import {
  DEFAULT_AMOUNT, DEFAULT_LENGTH, DEFAULT_LOOT, FOOD_MINUTES, ROLE_LABEL,
  canFlex, endsAt, flexLabel, lengthUnitsFor, mapsToMinutes, runsToMinutes,
  foodToMinutes, fmtTime, hasLoot, hasMaps, hasRoulettes, hasSpot, isFight,
  lootRulesFor,
  shapeLabel,
  slotsOf, whoKey,
} from "@/lib/party";
import type { PersonOption } from "@/lib/people";
import PartySeats from "@/components/party/PartySeats";
import ContentPicker from "@/components/party/ContentPicker";
import JobRule, { jobsForRole } from "@/components/party/JobRule";
import JobIcon from "@/components/JobIcon";
import FoodIcon from "@/components/party/FoodIcon";
import { BodyEditor } from "@/components/party/PartyBody";
import ProgressTrack from "@/components/party/ProgressTrack";
import LootPlan from "@/components/party/LootPlan";
import WherePicker from "@/components/party/WherePicker";
import MapPicker from "@/components/party/MapPicker";
import RoulettePicker from "@/components/party/RoulettePicker";
import SeatSuggest from "@/components/party/SeatSuggest";
import type { SuggestRow } from "@/lib/suggest";
import { jobsWantedBy } from "@/lib/suggest";
import { createClient } from "@/lib/supabase/client";
import Modal, { Sheet } from "@/components/ui/Modal";
import { useAvatarOverrides } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";
import { shapeSay } from "@/lib/party-i18n";

/**
 * Putting a party on the board.
 *
 * The form is the party. Rather than ask for a size and then a list of missing
 * roles in words, it draws the seats and lets them be filled in — because which
 * positions are missing is answered by looking at which ones are still empty,
 * and any other way of asking it is a second description of the same thing that
 * can disagree with the first.
 *
 * So: pick what you are doing, pick when, then click seats. The creator is
 * placed first and cannot be removed, since a party with nobody in it is a
 * listing nobody can join.
 */

/**
 * An instant, written the way a datetime-local input wants to read it.
 *
 * The field has no timezone, and the reader's browser may not be in Bangkok:
 * shift so that what it shows is the Thai wall clock, then shift back when it
 * is read. Bangkok is UTC+7 all year, so this is a constant rather than a
 * seasonal case.
 */
function asBangkokLocal(at: Date): string {
  const shifted = new Date(at.getTime() + (7 * 60 + at.getTimezoneOffset()) * 60_000);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getFullYear()}-${two(shifted.getMonth() + 1)}-${two(shifted.getDate())}`
       + `T${two(shifted.getHours())}:${two(shifted.getMinutes())}`;
}

/** The next half hour, which is the earliest anybody realistically means. */
function defaultStart(): string {
  const t = new Date(Date.now() + 60 * 60_000);
  t.setMinutes(t.getMinutes() < 30 ? 30 : 60, 0, 0);
  return asBangkokLocal(t);
}

/**
 * The earliest the field will accept: now.
 *
 * A party in the past is not a party, it is a typo — and the shape of the
 * mistake is always the same, somebody setting next Tuesday and leaving the
 * date on today. `min` stops the picker offering it, and the check on the
 * button catches it being typed anyway, because `min` is a hint to the widget
 * rather than a rule about the value.
 */
const earliest = () => asBangkokLocal(new Date());

/** What the field says is Thai wall-clock time; this is the instant it means. */
function fromBangkokLocal(value: string): string {
  const [date, time] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 7, mm)).toISOString();
}

/**
 * What else the person in this seat can play.
 *
 * Three controls because there are three ways people say it, and flattening
 * them into one would lose the difference: "I will play anything" is not the
 * same offer as "I can tank", and "I can take MT or D2" is narrower still.
 */
function FlexEditor(
  { shape, seatId, value, onChange }: {
    shape: Shape; seatId: string;
    value: Flex; onChange: (f: Flex) => void;
  },
) {
  const { t } = useLang();
  const roles: SlotRole[] = ["tank", "healer", "dps"];
  // Labels, not ids: in an alliance "MT" means any of the three parties' MT,
  // because which of the three you stand in is the one thing nobody minds.
  // Their own seat is not something they can flex to. Called with no seat at
  // all for somebody who has not taken one, and then every seat is on offer.
  const mine = seatId.replace(/^[ABC]-/, "");
  const seats = [...new Set(slotsOf(shape).map((s) => s.label))]
    .filter((l) => l !== mine);

  const toggle = <T,>(list: T[] | undefined, v: T): T[] => {
    const set = new Set(list ?? []);
    if (!set.delete(v)) set.add(v);
    return [...set];
  };
  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-[3px] text-[11.5px] transition-colors ${
      on ? "border-accent bg-accent/15 text-accent"
         : "border-line text-muted hover:border-muted hover:text-ink"}`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-data text-[10px] uppercase tracking-[0.12em] text-muted">
          {t("pf.canAlsoPlay")}
        </span>
        <button type="button" className={chip(!!value.all)}
                onClick={() => onChange(value.all ? {} : { all: true })}>
          {t("pf.anything")}
        </button>
      </div>

      {/* Hidden once "Anything" is on: it already covers every one of these,
          and leaving them clickable invites somebody to build a narrower
          answer underneath a wider one that overrules it. */}
      {!value.all && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <button key={r} type="button"
                      className={chip(!!value.roles?.includes(r))}
                      onClick={() => onChange({ ...value, roles: toggle(value.roles, r) })}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {seats.map((l) => (
              <button key={l} type="button"
                      className={chip(!!value.seats?.includes(l))}
                      onClick={() => onChange({ ...value, seats: toggle(value.seats, l) })}>
                {l}
              </button>
            ))}
          </div>
        </>
      )}

      {canFlex(value) && (
        <span className="text-[11.5px] text-jade">{flexLabel(value)}</span>
      )}
    </div>
  );
}

export default function PartyCreate(
  { content, people, me, userId, busy = false, suggest, labels, onAdd,
    onCancel }: {
    content: ContentDef[];
    people: PersonOption[];
    /** The creator, who takes the first seat they choose. */
    me: PersonOption;
    /** Their account, which the pictures are filed under. */
    userId: string;
    /** True while the board is writing it down. */
    busy?: boolean;
    /** Who plays what, for the seat suggestions. See lib/suggest.ts. */
    suggest?: SuggestRow[];
    /** The tier's labels, which is how the savage clears are indexed. */
    labels?: string[];
    onAdd: (p: Party) => void | Promise<void>;
    onCancel: () => void;
  },
) {
  const { t } = useLang();
  const overrides = useAvatarOverrides();
  const face = (id: number | null | undefined, fallback: string | null) =>
    (id != null && overrides[id]) || fallback || null;

  /*
   * Nothing, until somebody says.
   *
   * The form used to open on whatever happened to be first in the catalogue —
   * EX1, because that is where the list starts — so a party put up in a hurry
   * was a party advertising Valigarmanda, and the one field nobody had touched
   * was the one the whole listing is about. An empty picker asks the question
   * instead of answering it wrongly.
   */
  const [contentKey, setContentKey] = useState("");
  const chosen = content.find((c) => c.key === contentKey);
  const [note, setNote] = useState("");
  const [shape, setShape] = useState<Shape | "">("");
  const [start, setStart] = useState(defaultStart);
  const [unit, setUnit] = useState<LengthUnit>(DEFAULT_LENGTH.unit);
  const [amount, setAmount] = useState(DEFAULT_LENGTH.amount);

  /*
   * The size is the content's, unless the content does not fix one.
   *
   * A savage fight is eight people; being asked is being given a chance to be
   * wrong about something the game already decided. A treasure map run really
   * is four or eight, so that one is asked.
   */
  const useShape: Shape = chosen?.fixedShape
    ? chosen.shape
    : ((shape || chosen?.shape || "full") as Shape);

  const [seats, setSeats] = useState<Party["seats"]>({});
  const [closed, setClosed] = useState<string[]>([]);
  const [rules, setRules] = useState<Record<string, SeatRule>>({});
  const [oneEach, setOneEach] = useState(false);
  const [floating, setFloating] = useState<Floater[]>([]);
  const [body, setBody] = useState<PartyBlock[]>([]);
  const [progress, setProgress] = useState<Progress>({ at: "fresh" });
  const [loot, setLoot] = useState<Loot>({ rule: DEFAULT_LOOT });

  /*
   * A rule the new content cannot use is dropped rather than carried over.
   *
   * Picking a savage fight, choosing Book run, then changing to an extreme
   * would otherwise leave the party advertising a rule about tokens that
   * trial does not drop — set once, invisible afterwards, and wrong.
   */
  const okRules = lootRulesFor(chosen?.kind);
  const safeLoot: Loot = okRules.length && !okRules.includes(loot.rule)
    ? { rule: okRules[0] } : loot;
  const [spot, setSpot] = useState<Spot | undefined>(undefined);
  const [maps, setMaps] = useState<MapPlan | undefined>(undefined);
  const [roulettes, setRoulettes] = useState<string[] | undefined>(undefined);
  /** The person being added as a floater, before their positions are set. */
  const [adding, setAdding] = useState<Floater | null>(null);
  const [fq, setFq] = useState("");
  const [picking, setPicking] = useState<SlotDef | null>(null);
  const lastPicked = useRef<SlotDef | null>(null);
  /** Seats whose convention has already been offered once. See below. */
  const preset = useRef<Set<string>>(new Set());
  const [q, setQ] = useState("");

  /*
   * When everybody said they usually play.
   *
   * One query when the form opens, rather than one per seat: sixty rows of a
   * 168-character string is nothing, and asking again every time somebody
   * clicks a seat would be sixty rows a click. Failure is silent and means the
   * suggestions simply do not mention time, which is what they did before this
   * existed.
   */
  const [when, setWhen] = useState<Record<number, string | null>>({});
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.from("profiles")
      .select("character_id, availability")
      .not("character_id", "is", null)
      .not("availability", "is", null)
      .then(({ data }) => {
        if (!data) return;
        setWhen(Object.fromEntries((data as unknown as
          { character_id: number; availability: string | null }[])
          .map((r) => [r.character_id, r.availability])));
      });
  }, []);

  /*
   * The length in minutes, which the board needs whatever the party said.
   *
   * A party has to have an end or it never leaves the list. Where the length
   * was given in runs that end is the board's own assumption about how long a
   * run takes — never shown as a time, and the listing is marked as an
   * estimate wherever a length appears.
   */
  /*
   * Only the units this content can honestly use.
   *
   * Food is Well-Fed and runs are a countable go, and most content has
   * neither — "three food of Group pose" is a unit borrowed from an evening it
   * has nothing to do with. See lengthUnitsFor.
   */
  const units = lengthUnitsFor(chosen?.kind);
  // Falls back to whatever this content does allow rather than to hours: a map
  // night has no hours to fall back to, and the effect below is a render late.
  const useUnit: LengthUnit = units.includes(unit) ? unit : (units[0] ?? "hours");

  const minutes = useUnit === "maps" ? mapsToMinutes(maps?.each)
    : useUnit === "food" ? foodToMinutes(amount)
      : useUnit === "runs" ? runsToMinutes(amount, chosen?.kind)
        : Math.round(amount * 60);

  // Recomputed on every render rather than held in state: "now" moves, and a
  // floor captured when the form opened would let a slow form-filler set a
  // time that had quietly become the past.
  const min = earliest();
  const past = !!start && start < min;

  /*
   * Seats that no longer exist.
   *
   * The grid is drawn from the shape, so switching from a full party to a
   * light one simply stops drawing D2 to D4 — and anybody sitting in one of
   * them stayed in the form's state, invisible, and went to the database on
   * save. A party of four with three people in seats nobody could see.
   *
   * Reachable before this because changing content changes the shape; reachable
   * more often now that the form opens with nothing chosen, since the grid is
   * on screen before the size is known.
   */
  /*
   * A unit the new content cannot use is dropped rather than carried over.
   *
   * Picking a savage fight, saying "4 food", then changing to a hunt train
   * would otherwise leave the party measured in a buff nobody eats for — set
   * once, invisible afterwards, and wrong. The same rule the loot rule
   * follows, for the same reason.
   */
  useEffect(() => {
    if (units.includes(unit)) return;
    // Whatever this content does allow, which for a map night is the sentence
    // rather than a number.
    const next = units[0] ?? "hours";
    setUnit(next);
    setAmount(DEFAULT_AMOUNT[next]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units.join(",")]);

  useEffect(() => {
    const live = new Set(slotsOf(useShape).map((sl) => sl.id));
    setSeats((v) => {
      const kept = Object.fromEntries(Object.entries(v).filter(([id]) => live.has(id)));
      return Object.keys(kept).length === Object.keys(v).length ? v : kept;
    });
    setClosed((v) => (v.every((id) => live.has(id)) ? v : v.filter((id) => live.has(id))));
    setRules((v) => {
      const kept = Object.fromEntries(Object.entries(v).filter(([id]) => live.has(id)));
      return Object.keys(kept).length === Object.keys(v).length ? v : kept;
    });
    preset.current = new Set([...preset.current].filter((id) => live.has(id)));
  }, [useShape]);

  /*
   * Every seat asking for what it conventionally asks for, from the start.
   *
   * H1 is a pure healer and D3 is a physical ranged; every static says so out
   * loud, and a grid where that only appeared once you opened a seat was a
   * grid that looked empty and was not. Now it is on the seats as soon as the
   * shape is known, which is where the lead is looking.
   *
   * Once per seat, tracked rather than inferred from the rule itself: an empty
   * job list is the answer "any job at all", and re-filling it would make that
   * answer impossible to give.
   *
   * Only where the convention exists. A light party's D1 is any DPS, and
   * pre-ticking melee there would advertise a rule nobody meant.
   */
  useEffect(() => {
    if (useShape !== "full" && useShape !== "alliance") return;
    const fresh = slotsOf(useShape).filter((sl) => !preset.current.has(sl.id));
    if (!fresh.length) return;
    for (const sl of fresh) preset.current.add(sl.id);
    setRules((v) => {
      const next = { ...v };
      let changed = false;
      for (const sl of fresh) {
        if (next[sl.id]?.jobs?.length) continue;
        const want = jobsWantedBy(sl, jobsForRole(sl.role));
        if (!want.length) continue;
        next[sl.id] = { ...next[sl.id], jobs: want };
        changed = true;
      }
      return changed ? next : v;
    });
  }, [useShape]);

  const draft: Party = useMemo(() => ({
    id: "draft",
    contentKey, note: note.trim() || undefined, body,
    // Only where there is a fight to be partway through.
    progress: isFight(chosen?.kind) ? progress : undefined,
    loot: hasLoot(chosen?.kind) ? safeLoot : undefined,
    spot: hasSpot(chosen?.kind) ? spot : undefined,
    maps: hasMaps(chosen?.kind) ? maps : undefined,
    roulettes: hasRoulettes(chosen?.kind) ? roulettes : undefined,
    shape: useShape,
    startsAt: fromBangkokLocal(start),
    lengthMinutes: minutes, lengthUnit: useUnit,
    ...(useUnit === "runs" ? { runs: Math.max(1, Math.round(amount)) } : {}),
    ownerCharacterId: me.id,
    seats, closed, rules, oneOfEachJob: oneEach, floating,
    createdAt: new Date().toISOString(),
  }), [contentKey, note, useShape, start, minutes, unit, me.id, seats, closed,
       rules, oneEach, floating, body, progress, safeLoot, spot, maps,
       roulettes, useUnit, minutes, chosen?.kind]);

  const mySeat = Object.entries(seats).find(([, v]) => v.characterId === me.id)?.[0];
  const iAmFloating = floating.some((f) => f.characterId === me.id);

  /*
   * You are in the party you are putting up.
   *
   * Pressing a button to say you are coming to your own hunt train is asking
   * somebody to confirm the reason they opened the form. A party with no seats
   * has nothing to decide, so it simply contains its lead.
   *
   * A party with seats is not filled in for them, on purpose. Which seat the
   * lead is in is the one everybody else's plan is built around — a party of
   * eight whose lead has not said what they are playing has a hole in the
   * middle that nobody can see — so that one is asked, and the button stays
   * grey until it is answered one way or the other.
   */
  useEffect(() => {
    if (useShape !== "open" || !chosen) return;
    if (mySeat || iAmFloating) return;
    setFloating((v) => [...v, {
      characterId: me.id, name: me.name, avatar: me.avatar,
      flex: { all: true }, confirmedAt: new Date().toISOString(),
    }]);
  }, [useShape, chosen, mySeat, iAmFloating, me.id, me.name, me.avatar]);

  /**
   * Somebody who is not on this site, added by typing their name.
   *
   * Offered only once the search has come back with nothing useful, so it is
   * the answer to "they are not here" rather than a shortcut past looking. A
   * name and no id: no page to link to, no picture, and nothing that pretends
   * otherwise.
   */
  const outsider = (name: string) => ({
    characterId: null, name: name.trim(), avatar: null,
    confirmedAt: new Date().toISOString(),
  });

  /** Everybody already in, seated or floating — nobody joins twice. */
  const inParty = useMemo(() => new Set([
    ...Object.values(seats).map(whoKey),
    ...floating.map(whoKey),
  ]), [seats, floating]);

  const suggestions = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return people.filter((p) => !inParty.has(`c${p.id}`)
                    && p.name.toLowerCase().includes(s)).slice(0, 8);
  }, [q, people, inParty]);

  const floatSuggestions = useMemo(() => {
    const s = fq.trim().toLowerCase();
    if (s.length < 2) return [];
    return people.filter((p) => !inParty.has(`c${p.id}`)
                    && p.name.toLowerCase().includes(s)).slice(0, 8);
  }, [fq, people, inParty]);

  /*
   * Put somebody in a seat, or ask them about one.
   *
   * The lead takes a seat outright — it is their party and their decision. For
   * anybody else this is a question, and a question must not hold the seat: a
   * lead who wants three people asked about D4 could otherwise ask exactly one
   * of them and then wait, and asking the wrong one costs the evening.
   *
   * So an invitation is somebody in the party who has not sat down, with a
   * flex naming the seat they were asked about. The grid already draws people
   * hovering over the seats they could take, so all three show up on D4 and
   * the seat stays open until one of them actually sits in it.
   */
  function place(slot: SlotDef, p: PersonOption) {
    if (p.id === me.id) {
      setSeats((v) => ({
        ...v,
        [slot.id]: {
          characterId: p.id, name: p.name, avatar: p.avatar,
          confirmedAt: new Date().toISOString(),
        },
      }));
      setQ("");
      return;
    }
    setFloating((v) => [
      ...v.filter((f) => f.characterId !== p.id),
      {
        characterId: p.id, name: p.name, avatar: p.avatar,
        flex: { seats: [slot.id] },
        confirmedAt: null,
      },
    ]);
    setQ("");
  }

  function seatOutsider(slot: SlotDef, name: string) {
    if (!name.trim()) return;
    setSeats((v) => ({ ...v, [slot.id]: outsider(name) }));
    setQ("");
  }

  function setFlex(slotId: string, f: Flex) {
    setSeats((v) => ({ ...v, [slotId]: { ...v[slotId], flex: f } }));
  }

  const ready = !!chosen && !!start && !past && minutes > 0
    && (!!mySeat || iAmFloating);
  // Which of the two is missing, so the button says why it is grey rather than
  // leaving somebody to work it out.
  const wants = !chosen ? "pf.pickContentFirst" as const
    : (!mySeat && !iAmFloating) ? "pf.takeSeatFirst" as const : null;
  const sel = "rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink";

  /*
   * Picked is added.
   *
   * There was a Done button here, and a Cancel beside it, for a step that was
   * never in doubt: nobody searches the roster, finds the person they meant,
   * and then decides against them. What it did instead was let somebody fill
   * the flex in, look away, and lose it — the party went up without the person
   * they had just added.
   *
   * So the row appears straight away and what they can play is edited on it.
   * Getting it wrong costs the same click it always did: remove.
   */
  function addFloater(f: Floater) {
    setFloating((v) => [...v.filter((x) => whoKey(x) !== whoKey(f)), f]);
    setAdding(f);
    setFq("");
  }

  /** Editing one floater's flex writes through to the list it is drawn in. */
  function editFlex(f: Floater, fx: Flex) {
    const next = { ...f, flex: fx };
    setAdding(next);
    setFloating((v) => v.map((x) => (whoKey(x) === whoKey(f) ? next : x)));
  }
  /*
   * The seat the sheet is about, held one beat past its closing.
   *
   * Dismissing it sets picking to null, and a sheet whose contents vanish on
   * the first frame of a 300ms slide is an empty panel gliding off the screen.
   * The last one stays until the next one replaces it.
   */
  if (picking) lastPicked.current = picking;
  const seat = picking ?? lastPicked.current;
  const sitting = seat ? seats[seat.id] : undefined;

  return (
    /*
     * A window rather than a slab at the top of the board.
     *
     * Inline, this form ran to 1,541px on a desktop and 2,801px on a phone —
     * three and a third screens before the button — and it pushed the board it
     * belongs to entirely off the bottom while still rendering it underneath.
     * A window scrolls itself, closes on Escape, gives focus back to the button
     * that opened it, and leaves the board exactly where the reader left it.
     */
    <Modal open sticky onOpenChange={(v) => { if (!v) onCancel(); }} title={t("pf.new")}>
    <div className="flex flex-col gap-3.5">
      <ContentPicker content={content} value={contentKey}
                     onChange={(k) => { setContentKey(k); setShape(""); }} />

      {/*
        * Nothing until the fight is chosen.
        *
        * Every question below depends on the answer to this one: how many
        * seats there are, whether loot is worth asking about, whether a length
        * is counted in hours or in food. Drawn all at once, the form asked
        * twenty things of somebody who had not yet said what they were doing,
        * and the first thing it asked them to fill in was the last thing that
        * would still be right afterwards.
        */}
      {!chosen ? (
        <p className="pb-1 text-[12.5px] text-muted">{t("pf.pickContentFirst")}</p>
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-2.5">
        {chosen?.fixedShape ? (
          // Stated, not offered. The size is a fact about the fight, and the
          // form says which fact it has taken rather than leaving a dead
          // control that cannot be moved.
          <span className="rounded-lg border border-line bg-bg/40 px-3 py-2 text-[13px] text-muted">
            {shapeSay(useShape, chosen?.kind, t)}
            <span className="ml-1.5 opacity-70">· {t("pf.setByContent")}</span>
          </span>
        ) : (
          <select value={useShape} onChange={(e) => setShape(e.target.value as Shape)}
                  className={sel} aria-label={t("pf.size")}>
            {/* "cc" was here until the five-seat Crystalline Conflict shape
                came out: PvP is queued alone, so both PvP entries are open
                parties. It left a dead option behind that rendered as a blank
                line, because SHAPE_LABEL has nothing under that key. */}
            {(["light", "full", "alliance", "open"] as Shape[]).map((s) => (
              <option key={s} value={s}>{shapeSay(s, chosen?.kind, t)}</option>
            ))}
          </select>
        )}

        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 140))}
               placeholder={t("pf.note")}
               className={`${sel} min-w-[16rem] flex-1 placeholder:text-muted`} />
      </div>

      {isFight(chosen?.kind) && (
        <ProgressTrack value={progress} onChange={setProgress} />
      )}

      {/* Asked whatever the progress is: a prog night that unexpectedly kills
          the boss still has to answer this, and one in the morning with a chest
          already open is the worst time to start. */}
      {hasLoot(chosen?.kind) && (
        <LootPlan value={safeLoot} onChange={setLoot} kind={chosen?.kind} />
      )}

      {hasRoulettes(chosen?.kind) && (
        <RoulettePicker value={roulettes} onChange={setRoulettes} />
      )}

      {hasMaps(chosen?.kind) && <MapPicker value={maps} onChange={setMaps} />}

      {hasSpot(chosen?.kind) && <WherePicker value={spot} onChange={setSpot} />}

      <BodyEditor body={body} onChange={setBody} userId={userId} />

      {/* ── When, in Thai time, and for how long ──────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
            {t("pf.starts")}
          </span>
          <input type="datetime-local" value={start} min={min}
                 onChange={(e) => setStart(e.target.value)}
                 className={`${sel} ${past ? "border-chili/60" : ""}`} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
            {t("pf.for")}
          </span>
          <span className="flex items-stretch gap-1.5">
            {/* A map night is not a number of anything. How many each person
                brings is asked once, in the map picker, and the evening ends
                when those are done. */}
            {useUnit !== "maps" && (
              <input type="number" min={useUnit === "hours" ? 0.5 : 1}
                     step={useUnit === "hours" ? 0.5 : 1} value={amount}
                     onChange={(e) => setAmount(Number(e.target.value) || 0)}
                     className={`${sel} w-20`} />
            )}
            {/* Food is first because it is the unit the FC already uses. */}
            <span className="flex items-center gap-1.5">
              {useUnit === "food" && <FoodIcon size={16} className="text-gold" />}
              {/* One unit is not a choice. A select with a single option is a
                  control that cannot be moved, so it is said as a word. */}
              {units.length === 1 ? (
                <span className="flex items-center px-1 text-[13.5px] text-muted">
                  {t(useUnit === "maps" ? "pf.untilMapsDone" : "pf.hours")}
                </span>
              ) : (
                <select value={useUnit}
                        onChange={(e) => {
                          const next = e.target.value as LengthUnit;
                          setUnit(next);
                          // Four hours and four runs are different evenings, and
                          // a number carried across the change is a number
                          // nobody chose for the unit it lands in.
                          setAmount(DEFAULT_AMOUNT[next]);
                        }}
                        className={sel} aria-label={t("pf.unit")}>
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u === "food" ? "food"
                        : t(u === "hours" ? "pf.hours"
                          : u === "runs" ? "pf.runs" : "pf.untilMapsDone")}
                    </option>
                  ))}
                </select>
              )}
            </span>
          </span>
        </label>

        <p className={`pb-2 text-[12px] ${past ? "text-chili" : "text-muted"}`}>
          {past ? t("pf.past")
            : useUnit === "maps"
              // No end time, for the same reason a run count has none — and
              // the sentence beside the control has already said it.
              ? <>{fmtTime(draft.startsAt)} · {t("party.estimateWhy")}</>
              : useUnit === "runs"
              // No arrow and no end time, because that is the whole point of
              // saying it in runs. Putting "→ 21:30" here would be the form
              // making up the number the party declined to give.
              ? <>{fmtTime(draft.startsAt)} · {t("pf.runsWhy")}</>
              : <>
                  {useUnit === "food" && (
                    <>
                      <FoodIcon size={12} className="text-gold" /> 1 food
                      {" "}= {FOOD_MINUTES} min ·{" "}
                    </>
                  )}
                  {fmtTime(draft.startsAt)} → {fmtTime(endsAt(draft))}
                </>}
        </p>
      </div>

      {/* ── Who ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
            {t(mySeat ? "pf.seatsHint" : "pf.pickOwnSeat")}
          </span>
          {/* One switch for the party, not one per seat. Whichever seat was
              left unticked is where the duplicate would land, so a rule that
              is not everywhere is not a rule. */}
          {useShape !== "open" && (
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <input type="checkbox" checked={oneEach}
                     onChange={(e) => setOneEach(e.target.checked)} />
              {t("pf.onePerJob")}
              <span className="opacity-70">{t("pf.onePerJobWhy")}</span>
            </label>
          )}
        </div>
        <PartySeats party={draft} onPick={setPicking} kind={chosen?.kind} />
      </div>

      {/* ── People who have not picked a seat ─────────────────────────────── */}
      {/* An open party has no seats, so this list is not "the flexible ones",
          it is everybody. Same control, different question. */}
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-muted">
              {t(useShape === "open" ? "pf.whoIsComing" : "pf.flexibleNoSeat")}
            </span>
            <span className="text-[11.5px] text-muted">
              {t(useShape === "open" ? "pf.openNoParty" : "pf.flexHint")}
            </span>
          </div>

          {floating.map((f) => (
            <div key={f.characterId ?? f.name}
                 className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5">
              {face(f.characterId, f.avatar) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={face(f.characterId, f.avatar)!} alt="" width={34} height={34}
                     className="size-[34px] rounded-full border border-line object-cover" />
              ) : (
                <span className={`grid size-[34px] place-items-center rounded-full text-[13px] text-muted ${
                        f.characterId == null
                          ? "border border-dashed border-line" : "border border-line"}`}>
                  {f.characterId == null ? "?" : ""}
                </span>
              )}
              <span className="text-[13px] text-ink">{f.name}</span>
              {f.characterId == null && (
                <span className="font-data text-[9.5px] uppercase tracking-[0.1em] text-muted">
                  {t("pf.outsider")}
                </span>
              )}
              <span className="font-data text-[10px] uppercase tracking-[0.1em] text-jade">
                {useShape === "open" ? "" : flexLabel(f.flex) ?? t("pf.noPositionsYet")}
              </span>
              {/* A toggle, because the editor it opens has no button of its
                  own to shut it with any more. */}
              <button onClick={() => setAdding(
                        adding && whoKey(adding) === whoKey(f) ? null : f)}
                      className="ml-auto text-[11.5px] text-muted underline hover:text-ink">
                {t("pf.changeLower")}
              </button>
              <button onClick={() => setFloating((v) => v.filter((x) => x !== f))}
                      className="text-[11.5px] text-chili hover:underline">
                {t("pf.removeLower")}
              </button>
            </div>
          ))}

          {adding ? (
            <div className="flex flex-col gap-2">
              {useShape !== "open" && (
                <>
                  <span className="text-[12.5px] text-ink">
                    {t("pf.whatCanPlay", { name: adding.name })}
                  </span>
                  <FlexEditor shape={useShape} seatId=""
                              value={adding.flex}
                              onChange={(fx) => editFlex(adding, fx)} />
                </>
              )}
              {useShape !== "open" && !canFlex(adding.flex) && (
                <span className="text-[11.5px] text-muted">
                  {t("pf.pickOneThing")}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-2">
                {/* Only where there is a choice to make. A party with no
                    seats already contains its lead by the time this is
                    drawn. */}
                {useShape !== "open" && !mySeat && !iAmFloating && (
                  <button onClick={() => addFloater({
                            characterId: me.id, name: me.name, avatar: me.avatar,
                            flex: {},
                            confirmedAt: new Date().toISOString(),
                          })}
                          className="rounded-lg border border-accent bg-accent/15 px-3 py-1 text-[12.5px] text-accent">
                    {t("pf.iWillFlex")}
                  </button>
                )}
              </div>
              <input value={fq} onChange={(e) => setFq(e.target.value)}
                     placeholder={t("pf.addFlexer")}
                     className={`${sel} w-full placeholder:text-muted`} />
              {fq.trim().length >= 2 && !floatSuggestions.length && (
                <button onClick={() => addFloater({
                          ...outsider(fq),
                          flex: useShape === "open" ? { all: true } : {},
                        })}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-line px-2.5 py-2 text-left hover:border-accent/60">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-line text-[13px] text-muted">
                    ?
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] text-ink">
                      {t("pf.addNamed", { name: fq.trim() })}
                    </span>
                    <span className="text-[11.5px] text-muted">
                      {t("pf.outsiderHint")}
                    </span>
                  </span>
                </button>
              )}
              {floatSuggestions.map((p) => (
                <button key={p.id}
                        onClick={() => {
                          addFloater({
                            characterId: p.id, name: p.name, avatar: p.avatar,
                            flex: useShape === "open" ? { all: true } : {},
                            confirmedAt: null,
                          });
                        }}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface">
                  {face(p.id, p.avatar) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={face(p.id, p.avatar)!} alt="" width={36} height={36}
                         className="size-9 rounded-full border border-line object-cover" />
                  ) : <span className="size-9 rounded-full border border-line" />}
                  <span className="text-[13px] text-ink">{p.name}</span>
                </button>
              ))}
            </div>
          )}
      </div>

      {/*
        * Beside the grid, not underneath it.
        *
        * Everything about one seat — who is in it, what they are playing, who
        * to ask — is a step within putting the party up rather than a second
        * task, and the grid it is about has to still be visible while you work
        * on it. As a panel below the grid it pushed the rest of the form down
        * the page every time it opened.
        */}
      <Sheet open={!!picking} onOpenChange={(v) => { if (!v) setPicking(null); }}
             title={seat ? (sitting ? sitting.name : t("pf.whoIsIn", { seat: seat.label }))
                         : ""}
             subtitle={seat ? `${seat.label} · ${ROLE_LABEL[seat.role]}` : undefined}>
        {seat && (
        <div className="flex flex-col gap-2.5 pt-1">
          {sitting ? (
            <>
              {/* Which job they are on. Needed before "one player per job"
                  means anything: a party where nobody has said what they are
                  playing has no duplicates to avoid. */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-data text-[10px] uppercase tracking-[0.12em] text-muted">
                  {t("pf.playing")}
                </span>
                {jobsForRole(seat.role).map((job) => (
                  <button key={job} type="button"
                          onClick={() => setSeats((v) => ({
                            ...v,
                            [seat.id]: {
                              ...v[seat.id],
                              job: v[seat.id].job === job ? null : job,
                            },
                          }))}
                          title={job}
                          className={`rounded-full border p-1 transition-colors ${
                            sitting.job === job ? "border-accent bg-accent/15"
                              : "border-line opacity-60 hover:opacity-100"}`}>
                    <JobIcon job={job} size={22} />
                  </button>
                ))}
              </div>

              <FlexEditor shape={useShape} seatId={seat.id}
                          value={sitting.flex ?? {}}
                          onChange={(f) => setFlex(seat.id, f)} />
              {sitting.characterId !== me.id && (
                <button onClick={() => {
                          setSeats((v) => { const n = { ...v }; delete n[seat.id]; return n; });
                          setPicking(null);
                        }}
                        className="self-start rounded-lg border border-chili/50 px-3 py-1 text-[12.5px] text-chili hover:bg-chili/10">
                  {t("pf.takeOut")}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {/* With their own face on it: this is the one button in the
                    panel that names a particular person, and the list below it
                    identifies everybody by their picture. */}
                {!mySeat && (
                  <button onClick={() => place(seat, me)}
                          className="flex items-center gap-1.5 rounded-lg border border-accent bg-accent/15 py-1 pl-1 pr-3 text-[12.5px] text-accent">
                    {face(me.id, me.avatar) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={face(me.id, me.avatar)!} alt="" width={22} height={22}
                           className="size-[22px] rounded-full border border-accent/40 object-cover" />
                    ) : <span className="size-[22px] rounded-full border border-accent/40" />}
                    {t("pf.thatIsMe")}
                  </button>
                )}
                {closed.includes(seat.id) ? (
                  <button onClick={() => setClosed((v) => v.filter((id) => id !== seat.id))}
                          className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted hover:text-ink">
                    {t("pf.lookAgain")}
                  </button>
                ) : (
                  <button onClick={() => { setClosed((v) => [...v, seat.id]); setPicking(null); }}
                          className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted hover:text-ink">
                    {t("pf.notLooking")}
                  </button>
                )}
              </div>
              {/* What the seat is advertising for. On an empty seat only:
                  a rule about who may sit here is a question about the seat,
                  and once somebody is in it the answer is their name. */}
              <JobRule party={draft} slot={seat}
                       value={rules[seat.id] ?? {}}
                       onChange={(r) => setRules((v) => ({ ...v, [seat.id]: r }))} />

              {/* Who to ask, before the box for looking somebody up. The
                  order is the point: a lead who has to type a name has
                  already decided, and the whole feature is for the moment
                  before that. */}
              {!!suggest?.length && (
                <SeatSuggest slot={seat} def={chosen} rows={suggest}
                             labels={labels ?? []} startsAt={draft.startsAt}
                             when={when} people={people}
                             exclude={new Set([
                               ...Object.values(seats)
                                 .map((v) => v.characterId)
                                 .filter((x): x is number => x != null),
                               ...floating
                                 .map((f) => f.characterId)
                                 .filter((x): x is number => x != null),
                             ])}
                             onPick={(p) => place(seat, p)} />
              )}

              <input value={q} onChange={(e) => setQ(e.target.value)}
                     placeholder={t("pf.searchRoster")}
                     className={`${sel} w-full placeholder:text-muted`} />
              {suggestions.map((p) => (
                <button key={p.id} onClick={() => place(seat, p)}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface">
                  {face(p.id, p.avatar) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={face(p.id, p.avatar)!} alt="" width={36} height={36}
                         className="size-9 rounded-full border border-line object-cover" />
                  ) : <span className="size-9 rounded-full border border-line" />}
                  <span className="text-[13px] text-ink">{p.name}</span>
                  {p.guest && <span className="text-[11px] text-muted">guest</span>}
                </button>
              ))}
              {/* Nobody on the site by that name. Offered after the search
                  rather than beside it, so it reads as the answer to "they are
                  not in here" instead of a way round looking. */}
              {q.trim().length >= 2 && !suggestions.length && (
                <button onClick={() => seatOutsider(seat, q)}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-line px-2.5 py-2 text-left hover:border-accent/60">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-line text-[13px] text-muted">
                    ?
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] text-ink">
                      {t("pf.addNamed", { name: q.trim() })}
                    </span>
                    <span className="text-[11.5px] text-muted">
                      {t("pf.outsiderHint")}
                    </span>
                  </span>
                </button>
              )}

              <p className="text-[11.5px] text-muted">
                {t("pf.invitedNotBooked")}
              </p>
            </>
          )}
        </div>
        )}
      </Sheet>
        </>
      )}

      <div className="flex items-center gap-2">
        {chosen && (
          <>
            <button disabled={!ready || busy}
                    onClick={() => void onAdd({ ...draft, id: "new" })}
                    className="rounded-lg border border-accent bg-accent/15 px-4 py-1.5 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-40">
              {busy ? t("pf.putting") : t("pf.putUp")}
            </button>
            {wants && (
              <span className="text-[12px] text-muted">{t(wants)}</span>
            )}
          </>
        )}
        <button onClick={onCancel}
                className="ml-auto text-[12.5px] text-muted hover:text-ink">
          {t("pf.cancel")}
        </button>
      </div>
    </div>
    </Modal>
  );
}
