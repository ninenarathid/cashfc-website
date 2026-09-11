"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ContentDef, Flex, Floater, LengthUnit, Loot, MapPlan, Party, PartyBlock,
  Progress, SeatRule, Shape, SlotDef, SlotRole, Spot,
} from "@/lib/party";
import {
  DEFAULT_AMOUNT, DEFAULT_LENGTH, DEFAULT_LOOT, FOOD_MINUTES, ROLE_LABEL,
  canFlex, endsAt, flexLabel, lengthUnitsFor, mapsToMinutes, runsToMinutes,
  defaultUnitFor,
  foodToMinutes, fmtTime, hasLoot, hasMaps, hasRoulettes, hasSpot, isFight,
  minutesToFood,
  jobMatters,
  lootRulesFor,
  shapeFits,
  shapeLabel,
  slotsOf, whoKey,
} from "@/lib/party";
import type { PersonOption } from "@/lib/people";
import PartySeats from "@/components/party/PartySeats";
import ContentPicker from "@/components/party/ContentPicker";
import JobRule, { jobsForRole } from "@/components/party/JobRule";
import JobIcon from "@/components/JobIcon";
import PartyIcon from "@/components/party/PartyIcon";
import ConfirmDialog from "@/components/ConfirmDialog";
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
import DateTime from "@/components/ui/DateTime";
import { useAvatarOverrides } from "@/lib/avatars";
import { useLang } from "@/lib/i18n";
import { FC_DC, FC_WORLD } from "@/lib/world";
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
    `rounded-full border px-2.5 py-[3px] text-[13px] transition-colors ${
      on ? "border-accent bg-accent/15 text-accent"
         : "border-line text-muted hover:border-muted hover:text-ink"}`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-data text-[11.5px] uppercase tracking-[0.12em] text-muted">
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
        <span className="text-[13px] text-jade">{flexLabel(value)}</span>
      )}
    </div>
  );
}

export default function PartyCreate(
  { content, people, me, userId, busy = false, suggest, labels, onAdd,
    onCancel, editing }: {
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
    /**
     * The party being changed, where this is an edit rather than a new one.
     *
     * Every field starts on what it already says, the roster sections come off
     * — who is in a party is settled through the seat controls, not by
     * retyping the list — and the button asks before it saves, because a
     * listing people have already read is a thing other people have made plans
     * around.
     */
    editing?: Party;
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
  const [contentKey, setContentKey] = useState(editing?.contentKey ?? "");
  const chosen = content.find((c) => c.key === contentKey);
  const [note, setNote] = useState(editing?.note ?? "");
  const [shape, setShape] = useState<Shape | "">(editing?.shape ?? "");
  const [start, setStart] = useState(
    () => (editing ? asBangkokLocal(new Date(editing.startsAt)) : defaultStart()));
  const [unit, setUnit] = useState<LengthUnit>(
    editing?.lengthUnit ?? DEFAULT_LENGTH.unit);
  /*
   * The number in whatever unit the party used.
   *
   * Stored as minutes, which is one number for three questions — three food is
   * ninety minutes and so is an hour and a half, and only the unit says which
   * one the lead meant. So it is read back through the same conversion the
   * form writes with.
   */
  const [amount, setAmount] = useState(() => {
    if (!editing) return DEFAULT_LENGTH.amount;
    if (editing.lengthUnit === "runs") return editing.runs ?? 1;
    if (editing.lengthUnit === "food") return minutesToFood(editing.lengthMinutes);
    if (editing.lengthUnit === "maps") return DEFAULT_LENGTH.amount;
    return editing.lengthMinutes / 60;
  });

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

  // The roster is carried through untouched so the draft still describes the
  // whole party -- the seat grid still draws, and nothing about who is in it
  // is rewritten by a save. See updateParty.
  const [seats, setSeats] = useState<Party["seats"]>(editing?.seats ?? {});
  const [closed, setClosed] = useState<string[]>(editing?.closed ?? []);
  const [rules, setRules] = useState<Record<string, SeatRule>>(editing?.rules ?? {});
  const [oneEach, setOneEach] = useState(!!editing?.oneOfEachJob);
  const [floating, setFloating] = useState<Floater[]>(editing?.floating ?? []);
  const [body, setBody] = useState<PartyBlock[]>(editing?.body ?? []);
  const [progress, setProgress] = useState<Progress>(
    editing?.progress ?? { at: "fresh" });
  const [loot, setLoot] = useState<Loot>(editing?.loot ?? { rule: DEFAULT_LOOT });

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
  // Starts on this Free Company's own world rather than empty: the picker
  // shows Elemental and Tonberry from the first render, and a form that
  // displays an answer it has not stored is a form that lies quietly.
  const [spot, setSpot] = useState<Spot | undefined>(
    editing?.spot ?? { map: "", dc: FC_DC, world: FC_WORLD });
  const [maps, setMaps] = useState<MapPlan | undefined>(editing?.maps);
  const [roulettes, setRoulettes] = useState<string[] | undefined>(editing?.roulettes);
  /** The person being added as a floater, before their positions are set. */
  const [adding, setAdding] = useState<Floater | null>(null);
  const [fq, setFq] = useState("");
  const [picking, setPicking] = useState<SlotDef | null>(null);
  const lastPicked = useRef<SlotDef | null>(null);
  /*
   * Seats whose convention has already been offered once. See below.
   *
   * An edit starts with every seat in the set: whatever the rules say now is
   * what the lead decided when they put it up, and pre-ticking over the top of
   * that would rewrite an answer somebody already gave.
   */
  const preset = useRef<Set<string>>(
    new Set(editing ? Object.keys(editing.rules ?? {}) : []));
  /** And which shape that was for, since a seat id means different things. */
  const presetFor = useRef<Shape | "">(editing?.shape ?? "");
  const [q, setQ] = useState("");
  /** Whether the "save these changes?" question is on screen. */
  const [asking, setAsking] = useState(false);
  /** The content whose default unit has already been applied. See below. */
  const unitFor = useRef<string | null>(editing ? editing.contentKey : null);

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
  /*
   * On an edit, the floor is whatever the listing already says.
   *
   * A party that has already started is not a typo, it is a party — and the
   * form was treating the two the same, so a lead who came in at half past to
   * fix the loot rule or add a note was told to pick a later time first. The
   * only way to save anything was to move the start, which is the one field
   * they had not come to change and the one everybody else had made plans
   * around.
   *
   * Going earlier than it already starts is still a typo, and still refused.
   * What is allowed is leaving it where it is.
   */
  const wasStart = editing ? asBangkokLocal(new Date(editing.startsAt)) : "";
  const floor = editing && wasStart && wasStart < min ? wasStart : min;
  const past = !!start && start < floor;
  /** Under way already, which is a thing to say rather than a thing to stop. */
  const running = !past && !!start && start < min;

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
    /*
     * Not over the top of an answer somebody already gave.
     *
     * An edit opens on the unit the party was put up with, and this effect
     * runs on mount — so without this it would reset a two-hour ultimate to
     * one food before the lead had touched anything.
     *
     * Keyed on the content rather than counted as "the first run", because
     * there is no such thing as one run: React invokes effects twice in
     * development, and a one-shot flag was spent on the first invocation and
     * clobbered on the second. Changing the content while editing does move
     * the unit, which is right — the old one may not be a unit the new
     * content allows at all.
     */
    if (unitFor.current === contentKey) return;
    unitFor.current = contentKey;
    // What this content is normally counted in, where it has an answer of its
    // own — a legacy trial in runs, a map night in maps — and hours otherwise.
    const want = defaultUnitFor(chosen?.kind);
    if (units.includes(want)) {
      if (want === unit) return;
      setUnit(want);
      setAmount(DEFAULT_AMOUNT[want]);
      return;
    }
    if (units.includes(unit)) return;
    // Whatever this content does allow, which for a map night is the sentence
    // rather than a number.
    const next = units[0] ?? "hours";
    setUnit(next);
    setAmount(DEFAULT_AMOUNT[next]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units.join(","), contentKey]);

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
   * What is asked for depends on the shape: an eight-man's D3 is a physical
   * ranged, and a light party's D1 is any DPS there is.
   */
  useEffect(() => {
    // Only where a job is part of what the party is deciding. A FATE farm is
    // eight people and no composition — advertising "D3 wants a Bard" for one
    // would be a rule about an evening that has none.
    if (!contentKey || useShape === "open" || !jobMatters(chosen?.kind)) return;
    /*
     * Per shape, not per seat.
     *
     * "D1" means one thing in an eight-man and another in a light party — two
     * melee against any DPS in the game — so a record of which seats have been
     * offered their convention has to know which party it was offering it for.
     * Without that, a form that started as an eight-man kept its melee-only D1
     * when the content turned out to be a four-man roulette.
     */
    const shapeChanged = presetFor.current !== useShape;
    if (shapeChanged) { preset.current = new Set(); presetFor.current = useShape; }

    const fresh = slotsOf(useShape).filter((sl) => !preset.current.has(sl.id));
    if (!fresh.length) return;
    for (const sl of fresh) preset.current.add(sl.id);
    setRules((v) => {
      const next = { ...v };
      let changed = false;
      for (const sl of fresh) {
        // Left alone once the lead has answered for it — unless the shape
        // itself changed underneath, in which case the old answer was about a
        // seat that no longer means the same thing.
        if (!shapeChanged && next[sl.id]?.jobs?.length) continue;
        const all = jobsForRole(sl.role);
        // A light party has no D1-to-D4 convention: its four seats are one of
        // each, and any DPS at all is a D1. So it advertises the whole role,
        // where an eight-man's D1 means the two melee.
        const want = useShape === "light" ? all : jobsWantedBy(sl, all);
        if (!want.length) continue;
        next[sl.id] = { ...next[sl.id], jobs: want };
        changed = true;
      }
      return changed ? next : v;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useShape, contentKey]);

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

  /*
   * The lead's own place, on an edit.
   *
   * Three moves and they all start by taking the reader out of wherever they
   * are: seats and floaters are two lists, and somebody who is in both is the
   * duplicate that used to lose a whole roster on save.
   *
   * Whether they had already said yes is carried across rather than restamped.
   * A lead moving from MT to ST has not just joined their own party, and the
   * seat grid draws an unconfirmed member differently — so restamping would
   * make a move look like a fresh arrival to everybody reading it.
   */
  const myConfirmedAt = () => {
    const seated = Object.values(seats).find((v) => v.characterId === me.id);
    const afloat = floating.find((f) => f.characterId === me.id);
    return seated?.confirmedAt ?? afloat?.confirmedAt ?? new Date().toISOString();
  };
  const liftMe = () => {
    setSeats((v) => Object.fromEntries(
      Object.entries(v).filter(([, w]) => w.characterId !== me.id)));
    setFloating((v) => v.filter((f) => f.characterId !== me.id));
  };
  const sitAt = (slotId: string) => {
    const at = myConfirmedAt();
    setSeats((v) => {
      const out = Object.fromEntries(
        Object.entries(v).filter(([, w]) => w.characterId !== me.id));
      out[slotId] = {
        characterId: me.id, name: me.name, avatar: me.avatar, confirmedAt: at,
      };
      return out;
    });
    setFloating((v) => v.filter((f) => f.characterId !== me.id));
  };
  const floatMe = () => {
    const at = myConfirmedAt();
    liftMe();
    setFloating((v) => [...v.filter((f) => f.characterId !== me.id), {
      characterId: me.id, name: me.name, avatar: me.avatar,
      flex: { all: true }, confirmedAt: at,
    }]);
  };

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

  // The seat is asked for when a party is being put up, because a party of
  // eight whose lead has not said what they are playing has a hole in the
  // middle nobody can see. It is not asked again on an edit: who is in it is
  // not what this form is changing, and a lead who never took a seat — which
  // is a real thing leads do — would otherwise be unable to fix their own
  // start time.
  const ready = !!chosen && !!note.trim() && !!start && !past && minutes > 0
    && (!!editing || !!mySeat || iAmFloating);
  // Which of the two is missing, so the button says why it is grey rather than
  // leaving somebody to work it out.
  const wants = editing ? null
    : !chosen ? "pf.pickContentFirst" as const
    // The one line the whole board is read by. Twelve rows that all say
    // "AAC Heavyweight M3 (Savage)" are twelve rows nobody can tell apart, and
    // the difference between them — prog, farm, first timers welcome — is
    // exactly what this field is for.
    : !note.trim() ? "pf.titleFirst" as const
      : (!mySeat && !iAmFloating) ? "pf.takeSeatFirst" as const : null;
  const sel = "rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink";

  /*
   * What this party could still be, once it has people in it.
   *
   * Only a question for an edit. A new party has nobody in it yet, so every
   * size is open and every content is pickable — which is why this is measured
   * against the listing as it stands rather than against the draft: the draft's
   * seats are the ones being drawn, and they move as the shape does.
   */
  const fits = (s: Shape) =>
    !editing || shapeFits(s, editing.seats, editing.floating ?? []);
  const fitsContent = (c: ContentDef) => !c.fixedShape || fits(c.shape);

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
    <Modal open sticky onOpenChange={(v) => { if (!v) onCancel(); }}
           title={editing ? t("pf.editing") : t("pf.new")}
           icon={<PartyIcon size={18} />}>
    <div className="flex flex-col gap-3.5">
      {/*
        * While editing, only the fights this party could actually become.
        *
        * Changing an extreme to a savage tier is eight people either way and
        * is the thing people want. Changing it to a four-player dungeon is
        * two of them with nowhere to be, and finding that out after saving is
        * finding out too late.
        */}
      <ContentPicker content={content} value={contentKey}
                     allow={editing ? fitsContent : undefined}
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
        <p className="pb-1 text-[14px] text-muted">{t("pf.pickContentFirst")}</p>
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-2.5">
        {chosen?.fixedShape ? (
          // Stated, not offered. The size is a fact about the fight, and the
          // form says which fact it has taken rather than leaving a dead
          // control that cannot be moved.
          <span className="rounded-lg border border-line bg-bg/40 px-3 py-2 text-[14.5px] text-muted">
            {shapeSay(useShape, chosen?.kind, t)}
            <span className="ml-1.5 opacity-70">· {t("pf.setByContent")}</span>
          </span>
        ) : (
          <select value={useShape} onChange={(e) => setShape(e.target.value as Shape)}
                  className={sel} aria-label={t("pf.size")}
                  title={editing ? t("pf.sizeLocked") : undefined}>
            {/* "cc" was here until the five-seat Crystalline Conflict shape
                came out: PvP is queued alone, so both PvP entries are open
                parties. It left a dead option behind that rendered as a blank
                line, because SHAPE_LABEL has nothing under that key.

                A size the people already in this party would not fit into is
                offered and refused rather than left out: a dropdown that
                silently loses the option somebody is looking for is a
                dropdown they will go on looking in. */}
            {(["light", "full", "alliance", "open"] as Shape[]).map((s) => (
              <option key={s} value={s} disabled={!fits(s)}>
                {shapeSay(s, chosen?.kind, t)}
                {fits(s) ? "" : ` — ${t("pf.wontFit")}`}
              </option>
            ))}
          </select>
        )}

        {/* Required, and marked so before somebody reaches a grey button and
            has to work out which of six fields it meant. */}
        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 140))}
               required aria-required
               placeholder={t("pf.note")}
               className={`${sel} min-w-[16rem] flex-1 placeholder:text-muted ${
                 note.trim() ? "" : "border-accent/50"}`} />
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
          <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
            {t("pf.starts")}
          </span>
          <DateTime value={start} min={floor} invalid={past} onChange={setStart} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
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
                <span className="flex items-center px-1 text-[15px] text-muted">
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

        <p className={`pb-2 text-[13.5px] ${past ? "text-chili" : "text-muted"}`}>
          {past ? t("pf.past")
            // Said plainly, not in red: it is already true, and the lead is
            // here to change something else.
            : running ? t("pf.alreadyStarted")
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
      {/* Only when it is being written. Who is in a party is settled by the
          people in it — asking, accepting, leaving — and a form that rewrote
          that list on save would be the lead retyping other people's answers.
          The seat grid is on the party itself, where those decisions are. */}
      {!editing && (<>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
            {t(mySeat ? "pf.seatsHint" : "pf.pickOwnSeat")}
          </span>
          {/* One switch for the party, not one per seat. Whichever seat was
              left unticked is where the duplicate would land, so a rule that
              is not everywhere is not a rule. */}
          {useShape !== "open" && (
            <label className="flex items-center gap-2 text-[14px] text-muted">
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
            <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
              {t(useShape === "open" ? "pf.whoIsComing" : "pf.flexibleNoSeat")}
            </span>
            <span className="text-[13px] text-muted">
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
                <span className={`grid size-[34px] place-items-center rounded-full text-[14.5px] text-muted ${
                        f.characterId == null
                          ? "border border-dashed border-line" : "border border-line"}`}>
                  {f.characterId == null ? "?" : ""}
                </span>
              )}
              <span className="text-[14.5px] text-ink">{f.name}</span>
              {f.characterId == null && (
                <span className="font-data text-[11px] uppercase tracking-[0.1em] text-muted">
                  {t("pf.outsider")}
                </span>
              )}
              <span className="font-data text-[11.5px] uppercase tracking-[0.1em] text-jade">
                {useShape === "open" ? "" : flexLabel(f.flex) ?? t("pf.noPositionsYet")}
              </span>
              {/* A toggle, because the editor it opens has no button of its
                  own to shut it with any more. */}
              <button onClick={() => setAdding(
                        adding && whoKey(adding) === whoKey(f) ? null : f)}
                      className="ml-auto text-[13px] text-muted underline hover:text-ink">
                {t("pf.changeLower")}
              </button>
              {/* And the editor under them goes with them. Taking somebody out
                  while their flex panel is open left "What can Garnet Rebel
                  play?" on screen with no Garnet Rebel above it — a question
                  about a person who is no longer in the party. */}
              <button onClick={() => {
                        setFloating((v) => v.filter((x) => x !== f));
                        setAdding((a) => (a && whoKey(a) === whoKey(f) ? null : a));
                      }}
                      className="text-[13px] text-chili hover:underline">
                {t("pf.removeLower")}
              </button>
            </div>
          ))}

          {adding ? (
            <div className="flex flex-col gap-2">
              {useShape !== "open" && (
                <>
                  <span className="text-[14px] text-ink">
                    {t("pf.whatCanPlay", { name: adding.name })}
                  </span>
                  <FlexEditor shape={useShape} seatId=""
                              value={adding.flex}
                              onChange={(fx) => editFlex(adding, fx)} />
                </>
              )}
              {useShape !== "open" && !canFlex(adding.flex) && (
                <span className="text-[13px] text-muted">
                  {t("pf.pickOneThing")}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <input value={fq} onChange={(e) => setFq(e.target.value)}
                     placeholder={t("pf.addFlexer")}
                     className={`${sel} w-full placeholder:text-muted`} />
              {fq.trim().length >= 2 && !floatSuggestions.length && (
                <button onClick={() => addFloater({
                          ...outsider(fq),
                          flex: useShape === "open" ? { all: true } : {},
                        })}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-line px-2.5 py-2 text-left hover:border-accent/60">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-line text-[14.5px] text-muted">
                    ?
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[14.5px] text-ink">
                      {t("pf.addNamed", { name: fq.trim() })}
                    </span>
                    <span className="text-[13px] text-muted">
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
                  <span className="text-[14.5px] text-ink">{p.name}</span>
                </button>
              ))}
            </div>
          )}
      </div>

      </>)}

      {/* ── Your own place, on an edit ────────────────────────────────────── */}
      {/* The roster stays out of this form, and this is not the roster: it is
          one row, the reader's own. A lead who never took a seat had nowhere
          to say so from — the seat controls are on the party itself, and the
          lead is the one person the party page had no controls for. */}
      {editing && chosen && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-data text-[11.5px] uppercase tracking-[0.14em] text-muted">
              {t("pf.yourSpot")}
            </span>
            <span className="text-[13px] text-muted">{t("pf.yourSpotWhy")}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {useShape !== "open" && slotsOf(useShape).map((sl) => {
              const sat = seats[sl.id];
              const isMine = sat?.characterId === me.id;
              // Somebody else's seat is not an offer. A shut one is not either,
              // and the lead shutting a seat and then sitting in it would be
              // the listing disagreeing with itself.
              const free = !sat && !closed.includes(sl.id);
              return (
                <button key={sl.id} type="button"
                        disabled={!free && !isMine}
                        onClick={() => sitAt(sl.id)}
                        className={`rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                          isMine ? "border-accent bg-accent/15 text-accent"
                          : free ? "border-line text-muted hover:border-muted hover:text-ink"
                          : "border-line/40 text-muted/40"}`}>
                  {sl.label}
                </button>
              );
            })}
            <button type="button" onClick={floatMe}
                    className={`rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                      iAmFloating ? "border-jade bg-jade/15 text-jade"
                        : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {t(useShape === "open" ? "pf.imComing" : "pf.flexibleSpot")}
            </button>
            <button type="button" onClick={liftMe}
                    className={`rounded-full border px-3 py-[3px] text-[14px] transition-colors ${
                      !mySeat && !iAmFloating
                        ? "border-chili bg-chili/15 text-chili"
                        : "border-line text-muted hover:border-muted hover:text-ink"}`}>
              {t("pf.notInParty")}
            </button>
          </div>
        </div>
      )}

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
                <span className="font-data text-[11.5px] uppercase tracking-[0.12em] text-muted">
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
                        className="self-start rounded-lg border border-chili/50 px-3 py-1 text-[14px] text-chili hover:bg-chili/10">
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
                          className="flex items-center gap-1.5 rounded-lg border border-accent bg-accent/15 py-1 pl-1 pr-3 text-[14px] text-accent">
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
                          className="rounded-lg border border-line px-3 py-1 text-[14px] text-muted hover:text-ink">
                    {t("pf.lookAgain")}
                  </button>
                ) : (
                  <button onClick={() => { setClosed((v) => [...v, seat.id]); setPicking(null); }}
                          className="rounded-lg border border-line px-3 py-1 text-[14px] text-muted hover:text-ink">
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
                  <span className="text-[14.5px] text-ink">{p.name}</span>
                  {p.guest && <span className="text-[12.5px] text-muted">guest</span>}
                </button>
              ))}
              {/* Nobody on the site by that name. Offered after the search
                  rather than beside it, so it reads as the answer to "they are
                  not in here" instead of a way round looking. */}
              {q.trim().length >= 2 && !suggestions.length && (
                <button onClick={() => seatOutsider(seat, q)}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-line px-2.5 py-2 text-left hover:border-accent/60">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-line text-[14.5px] text-muted">
                    ?
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[14.5px] text-ink">
                      {t("pf.addNamed", { name: q.trim() })}
                    </span>
                    <span className="text-[13px] text-muted">
                      {t("pf.outsiderHint")}
                    </span>
                  </span>
                </button>
              )}

              <p className="text-[13px] text-muted">
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
            {/* An edit is a change to something people have already read and
                made plans around, so it asks. Putting a new one up does not:
                nothing depends on it yet, and the listing is editable the
                moment it exists. */}
            <button disabled={!ready || busy}
                    onClick={() => (editing ? setAsking(true)
                                            : void onAdd({ ...draft, id: "new" }))}
                    className="rounded-lg border border-accent bg-accent/15 px-4 py-1.5 text-[14.5px] text-accent hover:bg-accent/25 disabled:opacity-40">
              {busy ? t("pf.putting")
                    : editing ? t("pf.saveEdit") : t("pf.putUp")}
            </button>
            {wants && (
              <span className="text-[13.5px] text-muted">{t(wants)}</span>
            )}
          </>
        )}
        <button onClick={onCancel}
                className="ml-auto text-[14px] text-muted hover:text-ink">
          {t("pf.cancel")}
        </button>
      </div>

      {/* Above the window it is asked from. See ConfirmDialog's z. */}
      {asking && (
        <ConfirmDialog z={120}
                       message={t("pf.saveAsk")}
                       confirmLabel={t("pf.saveEdit")}
                       onCancel={() => setAsking(false)}
                       onConfirm={() => {
                         setAsking(false);
                         void onAdd({ ...draft, id: editing!.id });
                       }} />
      )}
    </div>
    </Modal>
  );
}
