import { DUNGEONS } from "@/lib/dungeons";
import { LEGACY } from "@/lib/legacy";

/**
 * The shape of a party, and the things a party is for.
 *
 * Nothing here talks to the database yet — this is the model on its own, so the
 * shape can be argued about before any of it is written down in a table. What
 * the FC agrees to here is what the schema will have to hold.
 *
 * Three ideas, kept apart on purpose:
 *
 *   A *shape* is how many people stand in it and what they are called. The game
 *   decides this, not us: four is Tank/Heal/D1/D2, eight is MT/ST/H1/H2/D1-D4,
 *   and an alliance is three eights called A, B and C.
 *
 *   A *content* is what the party is going to do. It carries the shape it is
 *   normally run at, so picking M12S already knows it is eight people.
 *
 *   A *party* is one of those, at a time, with names in some of the seats and
 *   the rest still open. The open ones are the whole point: which positions are
 *   missing is the question this board exists to answer.
 */

import { artFocus, dutySlug, type DutyKind } from "@/lib/duty";
import { FC_WORLD } from "@/lib/world";

export type SlotRole = "tank" | "healer" | "dps";
export type Shape = "light" | "full" | "eight" | "alliance" | "open";
/** Which of the three eights, in an alliance. */
export type Wing = "A" | "B" | "C";

export interface SlotDef {
  /** Unique within the party: "MT", or "B-D3" in an alliance. */
  id: string;
  /** What the game calls the seat. */
  label: string;
  role: SlotRole;
  wing?: Wing;
  /**
   * A seat with no role attached to it.
   *
   * A FATE farm and a treasure night are eight people and nothing more: there
   * is no tank, nobody is healing, and turning up on whatever you happen to be
   * on is the whole arrangement. They still want eight seats — a count is how
   * anybody tells whether there is room — so this is a party of eight with the
   * composition taken out rather than a party with no seats.
   *
   * The role underneath is a placeholder nothing user-facing reads.
   */
  free?: boolean;
}

const LIGHT: [string, SlotRole][] = [
  ["Tank", "tank"], ["Heal", "healer"], ["D1", "dps"], ["D2", "dps"],
];
const FULL: [string, SlotRole][] = [
  ["MT", "tank"], ["ST", "tank"], ["H1", "healer"], ["H2", "healer"],
  ["D1", "dps"], ["D2", "dps"], ["D3", "dps"], ["D4", "dps"],
];

/**
 * Every seat in a party of the given shape, in party-list order.
 *
 * An alliance is not a fourth arrangement, it is the eight-player one three
 * times over — so it is built from the same list rather than written out again,
 * and a seat's id carries its wing so "B-H2" is a different seat from "A-H2".
 */
export function slotsOf(shape: Shape): SlotDef[] {
  if (shape === "open") return [];
  // Numbered, because there is nothing else to call them. "1" through "8" is
  // what a party list looks like when nobody is filling a role.
  if (shape === "eight") {
    return Array.from({ length: 8 }, (_, i) => ({
      id: String(i + 1), label: String(i + 1), role: "dps" as const, free: true,
    }));
  }
  if (shape === "light") {
    return LIGHT.map(([label, role]) => ({ id: label, label, role }));
  }
  if (shape === "full") {
    return FULL.map(([label, role]) => ({ id: label, label, role }));
  }
  return (["A", "B", "C"] as Wing[]).flatMap((wing) =>
    FULL.map(([label, role]) => ({ id: `${wing}-${label}`, label, role, wing })));
}

/**
 * Whether a party could be this shape without losing anybody.
 *
 * Asked when a listing is being changed rather than written. A party of eight
 * with six people in it cannot become a party of four — two of them would have
 * nowhere to be — and that is not something to discover after saving. The same
 * goes the other way for an alliance: twenty-four people do not fit in eight.
 *
 * Two conditions, and the first is the one that is easy to miss. Everybody
 * already sitting has to still have their chair: an eight-man's seats are MT
 * and H1, an alliance's are A-MT and A-H1, and a light party's are Tank and
 * Heal — so "the new shape is bigger" is not enough, because the bigger shape
 * may not contain a single seat anybody is currently in. Then the count: the
 * seats left over have to hold whoever is still standing between them.
 *
 * A party with no seats holds everybody, so it is a fit only if nobody is
 * sitting — there would be no seat left to sit in.
 *
 * What this permits is the thing people actually want: changing an extreme to
 * a savage tier, which is eight people either way.
 */
export function shapeFits(
  shape: Shape,
  seats: Record<string, unknown>,
  floating: readonly unknown[] = [],
): boolean {
  const ids = new Set(slotsOf(shape).map((s) => s.id));
  const sitting = Object.keys(seats);
  if (!ids.size) return sitting.length === 0;
  if (sitting.some((id) => !ids.has(id))) return false;
  return ids.size >= sitting.length + floating.length;
}

export const SHAPE_SIZE: Record<Shape, number> = {
  light: 4, full: 8, eight: 8, alliance: 24, open: 0,
};

/*
 * The English fallback, for anything rendered outside the dictionary. See
 * shapeSay in lib/party-i18n.ts, which is what the pages actually use.
 *
 * The seat count without the word "full": the game's name for the arrangement
 * collides with the other thing this board says about a party — that it has no
 * room left — and a listing cannot afford two meanings for one word.
 */
export const SHAPE_LABEL: Record<Shape, string> = {
  light: "4 players",
  full: "8 players",
  // The same eight, with nothing said about who plays what.
  eight: "8 players",
  alliance: "Alliance · 24",
  // Never shown as-is: three different situations end up with no seats, and
  // openLabel below says which one this is. Kept only as the fallback for a
  // kind nobody has thought about yet.
  open: "No fixed party",
};

/* ── What a party is for ──────────────────────────────────────────────────── */

export type ContentKind =
  | "extreme" | "savage" | "ultimate"
  | "alliance" | "treasure" | "fate" | "hunt" | "criterion" | "pvp"
  | "community" | "field" | "dungeon" | "mentor" | "roulette" | "legacy"
  | "other";

export interface ContentDef {
  key: string;
  kind: ContentKind;
  name: string;
  /**
   * A second level of sorting, where one kind has more rows than a grid can
   * usefully show at once.
   *
   * The dungeons need it and nothing else does yet: a hundred and three cards
   * in one pane is not a picker, it is a scroll. Grouped by expansion they are
   * six panes of about fifteen, which is a grid somebody can read.
   */
  group?: string;
  /** What people actually say. "M12S", "FRU". */
  short?: string;
  shape: Shape;
  /**
   * Whether the size is the game's decision or the party's.
   *
   * A savage fight is eight people and there is nothing to ask; a treasure map
   * run is four or eight depending on how many turned up. Offering the choice
   * on the first kind is a question with one right answer, which is a question
   * somebody can still get wrong.
   */
  fixedShape?: boolean;
  /** EX1, M11S, FRU — the short label people say out loud. */
  badge?: string;
  /** The duty as the game lists it, which is what you queue for. */
  duty?: string;
  /**
   * Its own game badge, where the kind's is too broad.
   *
   * Community Events covers a photo shoot, a scene and a concert, and the game
   * has a separate playstyle icon for each of the three. The kind's icon still
   * marks the category chip; this marks the thing itself.
   */
  icon?: string;
  /** A still from the fight, where one has been filed. */
  art?: string;
  /** Where that still is anchored when it is cropped. */
  focus?: string;
}

/** One fight the picture files can be looked up by. */
export interface ContentSeed {
  /** The name the artwork is filed under — the boss, as FF Logs reports it. */
  name: string;
  /** What people say instead, if that differs. */
  short?: string;
  /** EX1, M11S. */
  badge?: string;
  /** The duty as the game lists it. */
  duty?: string;
}

/**
 * The kinds, in the order they are offered.
 *
 * The three the FC asked for first are first, and the rest are the things
 * people organise anyway and currently do in Discord scrollback. Dungeons and
 * roulettes are deliberately absent until the top of this list works.
 */
export const KIND_LABEL: Record<ContentKind, string> = {
  extreme: "Extreme",
  savage: "Savage",
  ultimate: "Ultimate",
  alliance: "Alliance raid",
  treasure: "Treasure hunt",
  fate: "FATE farm",
  hunt: "Hunt train",
  criterion: "Criterion / Variant",
  pvp: "PvP",
  community: "Community Events",
  field: "Field Operations",
  dungeon: "Dungeon",
  legacy: "Older raids & trials",
  mentor: "Find Mentor",
  roulette: "Roulette",
  other: "Other",
};

export const KIND_ORDER: ContentKind[] = [
  "extreme", "savage", "ultimate",
  "alliance", "treasure", "criterion", "legacy", "dungeon", "field", "pvp",
  "community",
  "fate", "hunt", "roulette", "mentor", "other",
];

/**
 * The game's own badge for each kind, by the name TagIcon files it under.
 *
 * The same art the member board puts on a tag, because a member who has learned
 * that orange maw means savage should not have to learn a second symbol for it
 * one page over. Kinds the game has no badge for get none rather than a
 * borrowed one: an invented icon is worse than a word.
 */
export const KIND_ICON: Partial<Record<ContentKind, string>> = {
  extreme: "extreme",
  savage: "tier-clear",
  ultimate: "ultimate",
  alliance: "alliance",
  criterion: "criterion",
  dungeon: "dungeon",
  // The extreme maw, because that is what most of this list used to be and
  // what people still call a trial's hard mode.
  legacy: "extreme",
  roulette: "roulette",
  mentor: "mentor",
  field: "field",
  fate: "fate",
  hunt: "hunt",
  community: "community",
  pvp: "pvp",
  treasure: "treasure",
};

/**
 * What "no seats" means, which depends on why there are none.
 *
 * Three quite different situations end up at the same shape and one sentence
 * cannot serve all three. PvP genuinely cannot be entered as a party —
 * everybody queues alone and the game builds the teams. A hunt train is a party
 * in every ordinary sense that simply has no roles. And a photograph is not a
 * party at all; calling that a queue would be nonsense on a listing whose whole
 * content is "come and stand here".
 */
export function openLabel(kind: ContentKind | undefined): string {
  if (kind === "pvp") return "Everyone queues separately";
  if (kind === "community") return "Anyone can join";
  return "No fixed party";
}

/** The size, said the way this particular kind of listing needs it said. */
export const shapeLabel = (shape: Shape, kind: ContentKind | undefined): string =>
  shape === "open" ? openLabel(kind) : SHAPE_LABEL[shape];

/** A colour per kind, so a long list is scannable before it is read. */
export const KIND_COLOR: Record<ContentKind, string> = {
  extreme: "#d98b3a",
  savage: "#d14b3a",
  ultimate: "#a87fd8",
  alliance: "#7ea6c9",
  treasure: "#c9a227",
  fate: "#6aa84f",
  hunt: "#4fb8a8",
  criterion: "#c96f9e",
  pvp: "#c74a4a",
  community: "#d47fb8",
  field: "#a1734a",
  dungeon: "#5f9ea0",
  // A duller version of the extreme orange: the same kind of fight, a patch or
  // six ago, and the two chips have to be tellable apart in a row of fifteen.
  legacy: "#b08b5e",
  // The crown's own colour, paler than the treasure gold so the two chips do
  // not read as the same thing at a glance.
  mentor: "#e8c86a",
  roulette: "#8f7fd4",
  other: "#8b93a1",
};

/**
 * The catalogue.
 *
 * Extremes and the savage tier are read from the board rather than typed here,
 * because they change with the patch and the board is already kept current by
 * the pipeline — a hand-written list would be wrong the week a tier lands, and
 * wrong in the one place people would be trying to use it.
 */
export function catalogue(
  { extremes = [], savage = [], ultimates = [], alliances = [], criterions = [],
    art }: {
    extremes?: ContentSeed[];
    savage?: ContentSeed[];
    ultimates?: ContentSeed[];
    alliances?: ContentSeed[];
    criterions?: ContentSeed[];
    /** kind -> slug -> path, straight from dutyArtMap(). */
    art?: Partial<Record<DutyKind, Record<string, string>>>;
  },
): ContentDef[] {
  const out: ContentDef[] = [];

  /*
   * The pictures are the ones already on the member pages.
   *
   * Looked up by the fight's own name rather than by the label over it, because
   * that is how they are filed and how every other page finds them — "M12S-2"
   * is what the FC calls it and "Lindwurm II" is what the file is called, and
   * only one of those is a fact about the game.
   */
  const shot = (kind: DutyKind, name: string) => {
    const slug = dutySlug(name);
    return { art: art?.[kind]?.[slug], focus: artFocus(slug) };
  };

  for (const e of extremes) {
    out.push({
      key: `ex:${e.name}`, kind: "extreme", name: e.name, short: e.short,
      badge: e.badge, duty: e.duty,
      shape: "full", fixedShape: true, ...shot("extreme", e.name),
    });
  }
  for (const sv of savage) {
    out.push({
      key: `sav:${sv.short ?? sv.name}`, kind: "savage",
      name: sv.name, short: sv.short, badge: sv.badge, duty: sv.duty,
      shape: "full", fixedShape: true, ...shot("savage", sv.name),
    });
  }
  for (const u of ultimates) {
    out.push({
      key: `ult:${u.name}`, kind: "ultimate", name: u.name, short: u.short,
      badge: u.badge ?? u.short, duty: u.duty ?? u.name,
      shape: "full", fixedShape: true, ...shot("ultimate", u.name),
    });
  }

  // The rest are not a list of bosses, they are a list of things to do — one
  // entry each, and the party says which one in its own words. Only the ones
  // the game fixes are marked fixed: a map run is four or eight depending on
  // who turned up, and a FATE farm is however many.
  // Named, not lumped. "Alliance raid" as a single row was the same mistake the
  // extremes would have been: three different evenings behind one label, and
  // nobody able to say which one they were going to without writing it in the
  // note.
  for (const a of alliances) {
    out.push({
      key: `all:${a.name}`, kind: "alliance", name: a.name, short: a.short,
      badge: a.badge, duty: a.duty ?? a.name,
      shape: "alliance", fixedShape: true, ...shot("alliance", a.name),
    });
  }

  // Every Variant and Criterion dungeon, not only this expansion's: unlike a
  // savage tier these do not go stale, and Aloalo runs are still put together
  // for the mount years after the patch.
  for (const c of criterions) {
    out.push({
      key: `cri:${c.name}`, kind: "criterion", name: c.name, short: c.short,
      badge: c.badge, duty: c.duty ?? c.name,
      shape: "light", fixedShape: true, ...shot("criterion", c.name),
    });
  }

  out.push(
    /*
     * No seats, for either of them.
     *
     * This had a five-player grid for Crystalline Conflict and a light party
     * for Frontline, which was wrong about how PvP is entered: you do not queue
     * as a party at all -- everybody queues on their own, at the same time, and
     * the game builds the teams. So what a PvP listing is for is agreeing on
     * the time and seeing who else is going, and a seat chart would be
     * describing something that cannot happen.
     */
    { key: "pvp:cc", kind: "pvp", name: "Crystalline Conflict",
      badge: "CC", duty: "Crystalline Conflict", shape: "open", fixedShape: true },
    { key: "pvp:fl", kind: "pvp", name: "Frontline",
      badge: "FL", duty: "Frontline", shape: "open", fixedShape: true },
    /*
     * Eight, and no composition.
     *
     * A map night is eight people opening portals. What comes out of a portal
     * does not care what anybody is playing, and a party list reading MT and
     * H1 was asking eight people to agree something that never came up.
     */
    { key: "treasure", kind: "treasure", name: "Treasure maps",
      shape: "eight", fixedShape: true },
    /*
     * The things the FC does together that are not a fight.
     *
     * However many turn up, all three of them. A photograph is not a party and
     * capping it at eight would turn away the ninth person, which is the
     * opposite of what a group photo is for; the same goes for an audience and
     * for a scene with however many characters in it.
     *
     * Three rows rather than one "Community" row, for the reason the alliance
     * raids are three rather than one: they are different evenings, and
     * somebody scrolling past should be able to tell whether tonight is a photo
     * shoot or a concert without opening it.
     */
    { key: "comm:gpose", kind: "community", name: "Group pose",
      icon: "gpose", shape: "open" },
    { key: "comm:rp", kind: "community", name: "Role-playing",
      badge: "RP", icon: "roleplay", shape: "open" },
    { key: "comm:perf", kind: "community", name: "Performance",
      icon: "performance", shape: "open" },
    /*
     * Three rows rather than one, for the same reason the alliance raids are
     * three: they are different evenings. Somebody scrolling past should be
     * able to tell whether tonight is Occult Crescent or a Hydatos NM train
     * without opening it.
     *
     * Which zone within each is left to the map picker, which already knows
     * every one of them — Anemos and Hydatos are the same idea forty levels
     * apart, and a row per zone would be seven rows saying almost nothing.
     *
     * Eight seats, because eight is what a field party actually forms. The
     * instance holds dozens and the queue is not the point; the eight who
     * agreed a time are.
     */
    /*
     * Every dungeon in the game, from the Duty Finder's own table.
     *
     * The level is the badge because it is what tells two similar names apart
     * and what decides whether somebody can come — "Sohm Al" and "Sohm Al
     * (Hard)" are thirty levels apart and read almost identically.
     *
     * Four seats, always. Every one of the hundred and three is a light party,
     * which is a fact about the game rather than a choice this listing offers.
     */
    /*
     * Every trial and eight-player raid the game will still let you walk into
     * unsynced.
     *
     * Which is most of what people actually arrange an evening of: eight
     * people, one mount or one book, and however many runs it takes. This
     * patch's extreme and savage are not here — they are on the board under
     * Extreme and Savage while they are still being progressed — and neither
     * are the Ultimates or the alliance raids, which have headings of their
     * own.
     *
     * Eight seats, always, and the level is the badge for the same reason it
     * is on a dungeon: "the Bowl of Embers" and "the Bowl of Embers (Extreme)"
     * are thirty levels apart and read almost identically.
     */
    ...LEGACY.map((t) => ({
      key: `leg:${t.id}`,
      kind: "legacy" as const,
      name: t.name,
      duty: t.name,
      group: t.expansion,
      badge: `Lv${t.level}`,
      shape: "full" as const,
      fixedShape: true,
    })),
    ...DUNGEONS.map((d) => ({
      key: `dun:${d.id}`,
      kind: "dungeon" as const,
      name: d.name,
      duty: d.name,
      group: d.expansion,
      badge: `Lv${d.level}`,
      shape: "light" as const,
      fixedShape: true,
    })),
    { key: "field:occult", kind: "field", name: "Occult Crescent",
      icon: "field", shape: "full" },
    { key: "field:bozja", kind: "field", name: "Bozja", icon: "field",
      shape: "full" },
    { key: "field:eureka", kind: "field", name: "Eureka", icon: "field",
      shape: "full" },
    /*
     * Eight, because that is what a FATE party is.
     *
     * Not a composition — no job is being agreed and nothing is advertised per
     * seat — but a count somebody can look at and tell whether there is room.
     * "Everybody turn up" left a night with fourteen people in it and no way
     * to have known that before arriving.
     */
    { key: "fate", kind: "fate", name: "FATE farm",
      shape: "eight", fixedShape: true },
    { key: "hunt", kind: "hunt", name: "Hunt train", shape: "open" },
    /*
     * Somebody to learn from, or somebody offering to teach.
     *
     * Free text like "Something else", and for the same reason: the useful
     * version of this is "first time in M1S, can somebody walk me through the
     * tower phase", and there is no list of fights or roles that says it. What
     * the evening is for goes in the note, which is where a sentence belongs.
     *
     * One row rather than the game's three kinds of mentor. Battle, Trade and
     * PvP are what the crown you wear is called; what somebody needs help with
     * is a sentence, and picking one of three crowns first would be a question
     * asked before the one that matters.
     */
    /*
     * The dailies, as an evening.
     *
     * Which roulettes are being run is the whole content of the listing —
     * "Expert and Alliance" and "Leveling with the new person" are different
     * nights — so they are ticked off a list rather than written in prose.
     *
     * Four seats to start with. A roulette is queued as a party of four or of
     * eight depending on which one, and four is both the commoner answer and
     * the one that fits every roulette on the list.
     */
    { key: "roulette", kind: "roulette", name: "Duty Roulette", shape: "light" },
    { key: "mentor", kind: "mentor", name: "Find Mentor", shape: "open" },
    { key: "other", kind: "other", name: "Something else", shape: "open" },
  );
  return out;
}

/* ── Time ─────────────────────────────────────────────────────────────────── */

/**
 * One food, in minutes.
 *
 * Not a joke — it is how the FC already measures a raid night. Well-Fed lasts
 * thirty minutes, so "three food" is a length everybody can picture without
 * doing arithmetic, and it is the unit people reach for when they say how long
 * they are staying up.
 */
export const FOOD_MINUTES = 30;

export const foodToMinutes = (food: number) => Math.round(food * FOOD_MINUTES);
export const minutesToFood = (min: number) => min / FOOD_MINUTES;

/**
 * How long an evening is said to be.
 *
 *   hours  A time. "We are on until ten."
 *   food   The same, in the unit the FC actually uses.
 *   runs   A count of goes, for an evening whose length nobody can honestly
 *          predict. "Four dungeons" is a real plan; "four dungeons, which is
 *          two hours" is a guess wearing a plan's clothes, and the party gets
 *          judged for overrunning something it never said.
 *   maps   Not a length at all: a treasure night ends when everybody's maps
 *          are done, and how long that takes is a dice roll nobody controls.
 *          The listing already says how many each, so there is no second
 *          number to give — the evening's end is the sentence.
 */
export type LengthUnit = "hours" | "food" | "runs" | "maps";

/**
 * Which of the three this kind of content can honestly be measured in.
 *
 * Hours everywhere, because every evening has a length. The other two are
 * claims about the content and are false for most of it:
 *
 * Food is Well-Fed, and Well-Fed is a thing you keep up because a wipe costs
 * you the buff. That is a savage tier, an extreme, an ultimate or a criterion
 * dungeon. Nobody eats for a photo shoot, and "three food of Group pose" is a
 * unit borrowed from an evening it has nothing to do with.
 *
 * Runs need something countable that ends. A fight, a dungeon, a match — you
 * can say four of those and mean it. A hunt train and a FATE farm have no
 * discrete go to count, and a treasure night already says how many maps.
 *
 * Hours is first because it is the one that always applies and the one a new
 * listing opens on.
 */
export const lengthUnitsFor = (kind: ContentKind | undefined): LengthUnit[] =>
  unitsFor(kind);

/**
 * What a fresh listing of this kind opens on.
 *
 * Hours where nothing better applies, since it is the one unit every evening
 * has. The rest is the content answering for itself:
 *
 *   maps   A treasure night ends when the maps do, and nothing else.
 *   runs   A legacy trial is however many goes it takes — you are there until
 *          the mount drops or until everybody has had enough, and "two hours
 *          of the Bowl of Embers" is a number nobody would say out loud.
 *   food   An extreme, a savage tier and an ultimate are measured in Well-Fed,
 *          because that is the clock everybody in the party is watching. One,
 *          which is thirty minutes and the shortest honest answer.
 */
export const defaultUnitFor = (kind: ContentKind | undefined): LengthUnit =>
  kind === "treasure" ? "maps"
    : kind === "legacy" ? "runs"
      : (kind === "extreme" || kind === "savage" || kind === "ultimate")
          ? "food"
          : "hours";

function unitsFor(kind: ContentKind | undefined): LengthUnit[] {
  // A map night has one honest answer and it is not a number. Offering hours
  // beside it would be offering somebody the chance to promise a time the
  // content cannot keep.
  if (kind === "treasure") return ["maps"];
  const fed = kind === "extreme" || kind === "savage" || kind === "ultimate"
    || kind === "criterion";
  const countable = fed || kind === "dungeon" || kind === "pvp"
    || kind === "alliance" || kind === "legacy";
  return [
    "hours",
    ...(fed ? ["food" as const] : []),
    ...(countable ? ["runs" as const] : []),
  ];
}

/**
 * What a fresh listing is set to.
 *
 * An hour, because it is the only unit every kind of content can use and the
 * shortest evening anybody actually arranges. Anything longer is the form
 * holding an opinion about a party nobody has described yet.
 */
export const DEFAULT_LENGTH: { unit: LengthUnit; amount: number } = {
  unit: "hours", amount: 1,
};

/**
 * One of whatever it is, every time.
 *
 * The digit does not carry across a change of unit — four hours and four runs
 * are different evenings, and a number that survived the switch is a number
 * nobody chose for the unit it landed in. It resets to one rather than to a
 * guess at what that unit usually means, for the same reason the form opens on
 * one hour: the smallest honest answer asks the question instead of holding an
 * opinion about an evening nobody has described yet.
 */
export const DEFAULT_AMOUNT: Record<LengthUnit, number> = {
  hours: 1, food: 1, runs: 1, maps: 1,
};

/**
 * What the board privately assumes a run takes.
 *
 * Only so the board can work out when an evening is over — which it has to
 * know, because a party that never ends never leaves the list. It is never
 * shown as a time and never presented as the plan: a listing measured in runs
 * says "3 runs" and is marked as an estimate wherever a length appears.
 *
 * The numbers are deliberately generous. Over-running the guess costs an hour
 * of a finished party sitting on the board; under-running it files a party as
 * history while people are still in it.
 */
export const RUN_MINUTES: Partial<Record<ContentKind, number>> = {
  extreme: 20, savage: 30, ultimate: 45, alliance: 30, criterion: 40,
  dungeon: 40, treasure: 25, fate: 30, hunt: 45, pvp: 25,
};
export const DEFAULT_RUN_MINUTES = 30;

export const runsToMinutes = (runs: number, kind: ContentKind | undefined) =>
  Math.max(15, Math.min(1440,
    Math.round(runs * ((kind && RUN_MINUTES[kind]) ?? DEFAULT_RUN_MINUTES))));

export const minutesToRuns = (min: number, kind: ContentKind | undefined) =>
  Math.max(1, Math.round(min / ((kind && RUN_MINUTES[kind]) ?? DEFAULT_RUN_MINUTES)));

/**
 * How long the board privately assumes a map night runs.
 *
 * Never shown, and never presented as the plan — the listing says "until
 * everybody's maps are done", which is the truth. This exists only so the
 * board knows when the evening is over, because a party that never ends never
 * leaves the list.
 *
 * Scaled by how many each person brings, generously. Over-running the guess
 * costs an hour of a finished party sitting on the board; under-running it
 * files a party as history while people are still portalling.
 */
export const mapsToMinutes = (each: number | undefined) =>
  Math.max(60, Math.min(1440, (each ?? 2) * 45));

/** "2h 30m" */
export function fmtLength(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** The same length said the other way. */
export const fmtFood = (minutes: number): string => {
  const f = minutesToFood(minutes);
  return `${Number.isInteger(f) ? f : f.toFixed(1)} food`;
};

/** "3 runs" — the length of an evening nobody can put a clock on. */
export const fmtRuns = (n: number): string => `${n} ${n === 1 ? "run" : "runs"}`;

/**
 * Bangkok, always, whoever is reading.
 *
 * The FC is Thai and arranges everything in Thai time, and the one thing a
 * meeting time must never do is quietly follow the reader's own clock — a
 * member in Japan reading "20:00" as their own evening would arrive two hours
 * late. So the zone is fixed here and named in the interface.
 */
export const TZ = "Asia/Bangkok";

const bkk = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts });

/** "20:00" */
export const fmtTime = (iso: string): string =>
  bkk({ hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

/** "Sat 13/09" */
export const fmtDay = (iso: string): string =>
  bkk({ weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(iso));

/** The day a party falls on in Bangkok, as a sortable key. */
export const dayKey = (iso: string): string =>
  bkk({ year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso)).split("/").reverse().join("-");

/* ── A party ──────────────────────────────────────────────────────────────── */

/**
 * What else somebody in a seat could play.
 *
 * A party of eight rarely comes together in the order people sign up. Somebody
 * says "I have taken D2 but I can tank if you need it", and until now the board
 * had no way to hold that — so the party looked like it needed a tank when it
 * had one sitting in a DPS seat, and the person who could have joined as a DPS
 * went elsewhere.
 *
 * Three ways to say it, because people say it three ways:
 *
 *   all      "I will play whatever is left"
 *   roles    "I can tank or heal" — the whole role, whichever seat
 *   seats    "I can take MT or D2" — those exact seats and no others
 *
 * Roles and seats can both be set; together they are the union. Empty means
 * what it says: this person is in this seat and staying there.
 */
export interface Flex {
  all?: boolean;
  roles?: SlotRole[];
  seats?: string[];
}

export const canFlex = (f: Flex | undefined | null): boolean =>
  !!f && (!!f.all || !!f.roles?.length || !!f.seats?.length);

/**
 * The seat somebody was invited to think about.
 *
 * An invitation names one seat and does not hold it — three people can be
 * asked about D4 at once, and whoever says yes first sits in it. The seat is
 * carried in the flex because "I could take D4" is what a flex naming one seat
 * already means everywhere else here, and because a held seat is exactly what
 * an invitation must not be.
 */
export const askedAbout = (m: { seat?: string; flex?: Flex } | undefined):
  string | undefined =>
  (!m?.seat && m?.flex?.seats?.length === 1 && !m.flex.all && !m.flex.roles?.length)
    ? m.flex.seats[0] : undefined;

/** Whether somebody could move into this seat. Their own seat never counts. */
export function coversSeat(f: Flex | undefined | null, slot: SlotDef): boolean {
  if (!f) return false;
  if (f.all) return true;
  if (f.roles?.includes(slot.role)) return true;
  // Written without a wing in an alliance: "I can MT" means any party's MT,
  // since which of the three you stand in is the one thing nobody minds.
  return !!f.seats?.some((id) => id === slot.id || id === slot.label);
}

/** "Flex any", "Flex Healer", "Flex MT, D2" — or just "D2". See below. */
export function flexLabel(f: Flex | undefined | null): string | null {
  if (!canFlex(f)) return null;
  if (f!.all) return "Flex any";
  const bits = [
    ...(f!.roles ?? []).map((r) => ROLE_LABEL[r]),
    ...(f!.seats ?? []),
  ];
  // One seat named and nothing else is not flexing at all: it is the seat
  // somebody was asked about, which is what askedAbout reads out of the same
  // shape. "Flex D2" reads as a choice made between options when there was
  // only ever the one. A single *role* stays a flex, because that is a range.
  if (f!.seats?.length === 1 && bits.length === 1) return bits[0];
  return `Flex ${bits.join(", ")}`;
}

/**
 * People already in the party who could move into a seat that is still open.
 *
 * The reason flex is worth recording. A party with an empty MT and a DPS who
 * can tank is not a party that needs a tank — it needs one more body, and the
 * seat it ends up advertising is whichever one is left over.
 *
 * Counted as people, not as seats. The first version of this returned the open
 * seats a flexible member could cover, which read "flex 4" for one person who
 * had said they would play anything — four seats they could each take, one at
 * a time, drawn as though four people were waiting to move. Somebody can only
 * sit in one chair.
 */
export function flexersOf(p: Party): SlotTaken[] {
  const open = openSeats(p);
  if (!open.length) return [];
  return Object.entries(p.seats)
    .filter(([id, v]) => canFlex(v.flex)
      && open.some((s) => s.id !== id && coversSeat(v.flex, s)))
    .map(([, v]) => v);
}

/** Somebody in a seat. Mirrors a gallery tag: proposed, then agreed to. */
export interface SlotTaken {
  /** Null for somebody who is not on this site. See Floater. */
  characterId: number | null;
  name: string;
  avatar: string | null;
  job?: string | null;
  /** What else they could play, if they said. */
  flex?: Flex;
  /**
   * Null until they say yes.
   *
   * Putting a friend in a seat is an invitation, not a fact about their
   * evening, and a board that counts unanswered invitations as filled seats
   * tells everybody else the party is full when it is not. Same rule as a
   * photograph tag, for the same reason.
   */
  /**
   * Which way round this seat happened.
   *
   * "owner" — the lead put them here, and `confirmedAt` is their answer.
   * "self"  — they asked to join, and `confirmedAt` is the lead's answer.
   *
   * Both end up as an unconfirmed seat and both are settled by the same field,
   * which is why one word is enough to carry the difference. Without it the
   * board cannot tell whose turn it is: the same grey seat means "waiting on
   * them" in one direction and "waiting on you" in the other, and showing the
   * lead a Confirm button on a seat that is waiting on somebody else is how a
   * party ends up with a member who never agreed to be in it.
   *
   * Absent means "owner", which is what every seat made before joining
   * existed was.
   */
  by?: "owner" | "self";
  /**
   * The row this seat is, so it can be confirmed or taken back.
   *
   * The one place the model knows a database exists, and it earns it: answering
   * a seat means naming the row, and the alternative is matching on party and
   * character and hoping — which stops working the moment the party contains
   * two people from off this site, who both have no character id at all.
   */
  seatRowId?: number;
  /**
   * Every job they offered, where they offered more than one.
   *
   * `job` is what they will be on and is the one the seat draws; this is what
   * they said they could be on. The two are the same thing when somebody names
   * one job, which is why `job` stays the field everything reads — a party
   * that has settled is described by `job` alone, and this is only the record
   * of what was on the table before it did.
   */
  jobs?: string[];
  confirmedAt: string | null;
}

/**
 * What one seat will accept.
 *
 * The party saying what it wants in this particular chair: a group with no
 * raise is looking for one specific thing, and "Healer" is not a precise enough
 * advert. Empty means the seat takes any job its role can play, which is the
 * ordinary case.
 *
 * No-duplicate-jobs is deliberately not here. It reads like a property of a
 * seat and is not one: a rule that stopped D2 repeating a job while D3 was free
 * to repeat it would not prevent anything, because the duplicate would simply
 * arrive in D3. It is a fact about the whole party, so it lives on the party —
 * see `oneOfEachJob`.
 */
export interface SeatRule {
  /** Jobs this seat will take. Empty or absent means anything the role allows. */
  jobs?: string[];
}

/** Jobs held by people already in the party. Unanswered invitations count. */
export function jobsTaken(p: Party, exceptSeat?: string): string[] {
  return Object.entries(p.seats)
    .filter(([id, v]) => id !== exceptSeat && v.job)
    .map(([, v]) => v.job as string);
}

/**
 * Which of these jobs the seat is actually open to, right now.
 *
 * `candidates` arrives already cut down to the jobs that can play the seat's
 * role, because which job is a healer is a fact about the game and belongs
 * with the icons rather than in here.
 *
 * The word "now" is the point of this function. A seat marked one-per-job is
 * open to a different set of jobs this afternoon than it was this morning,
 * because somebody joined in between — so this is worked out at the moment it
 * is drawn rather than stored.
 */
export function openTo(
  p: Party, slotId: string, candidates: string[],
): string[] {
  const want = p.rules?.[slotId]?.jobs;
  let out = want?.length ? candidates.filter((j) => new Set(want).has(j)) : candidates;
  if (p.oneOfEachJob) {
    const taken = new Set(jobsTaken(p, slotId));
    out = out.filter((j) => !taken.has(j));
  }
  return out;
}

/** Whether a seat has been narrowed at all, for deciding whether to say so. */
export const hasRule = (r: SeatRule | undefined): boolean => !!r?.jobs?.length;

export interface Party {
  id: string;
  contentKey: string;
  /** One line, shown on the collapsed row. The headline. */
  note?: string;
  /** The write-up: paragraphs and pictures, shown when the row is opened. */
  body?: PartyBlock[];
  /** How far in, and what is being drilled. Fights only. */
  progress?: Progress;
  /** Who gets what. See hasLoot for where it applies. */
  loot?: Loot;
  /** Where in the game to meet. See hasSpot. */
  spot?: Spot;
  /** Which map, and how many each. Treasure hunts only. See hasMaps. */
  maps?: MapPlan;
  /** Which roulettes are being run. See hasRoulettes. */
  roulettes?: string[];
  /** Replies. */
  comments?: PartyComment[];
  shape: Shape;
  /** An instant. Displayed in Bangkok; stored as a moment in time. */
  startsAt: string;
  lengthMinutes: number;
  /** How the length was typed in, so it can be shown back the same way. */
  lengthUnit: LengthUnit;
  /**
   * How many goes, where the length is a count of them.
   *
   * Kept alongside lengthMinutes rather than derived back out of it, because
   * the minutes are the board's own assumption about how long a run takes and
   * dividing by that assumption to recover the number somebody actually typed
   * is a round trip through a guess.
   */
  runs?: number;
  ownerCharacterId: number;
  /**
   * The account that put it up, which is what may change it.
   *
   * Kept alongside the character because they answer different questions: the
   * character is who the party is run by and is drawn on the row, and the
   * account is who the policies let edit it. A lead can hold the first without
   * the second — a verified character is a claim about a person, not a login.
   */
  owner?: string;
  /** Seat id -> who is in it. Absent means open. */
  seats: Record<string, SlotTaken>;
  /**
   * People in the party who have not been pinned to a seat.
   *
   * Kept apart from `seats` on purpose: a floater is not in a seat, and writing
   * them into one would be the site inventing a decision nobody made. Where
   * they end up is worked out by resolveParty every time the party is drawn,
   * from the seats actually free at that moment.
   */
  floating?: Floater[];
  /**
   * Seats the party is not looking to fill.
   *
   * Five friends running an eight-man with three seats they mean to leave
   * empty is a real thing, and without this the board would advertise three
   * openings nobody wanted.
   */
  closed?: string[];
  /** Seat id -> what that seat will take. Absent means it will take anything. */
  rules?: Record<string, SeatRule>;
  /**
   * No two people on the same job.
   *
   * One switch for the whole party, because that is the size of the idea. Set
   * per seat it could not do its job: whichever seat was left unticked is where
   * the duplicate would land, so a rule that is not everywhere is not a rule.
   *
   * Applied when a seat is drawn rather than stored as a list of jobs, because
   * what it allows changes every time somebody joins.
   */
  oneOfEachJob?: boolean;
  createdAt: string;
  /**
   * When the listing was last changed, kept honest by a trigger.
   *
   * Worth saying out loud on a board people read once and come back to: a
   * party that moved from nine to ten is the same row in the same place, and
   * somebody who read it this morning has no way of knowing it moved unless
   * the row says so.
   */
  updatedAt?: string;
}

/**
 * Somebody in the party who has not been pinned to a seat yet.
 *
 * The point of the whole idea. Saying "I can play ST or D2" used to mean
 * picking one of them and hoping — which is a decision nobody wanted to make,
 * made at the worst possible moment, by the person with the least information.
 * A floater says what they can play and nothing else; the seat sorts itself out
 * as the party fills.
 *
 * They show on the right of every seat they could take, so somebody reading the
 * board sees a face on ST and a face on D2 and understands that only one of
 * those will happen.
 */
export interface Floater {
  /**
   * Null for somebody who is not on this site.
   *
   * A raid night is not made only of people with accounts here — a friend from
   * another FC, somebody's static partner on Light, a mate who has never
   * touched the website. Refusing to list them would mean the board could not
   * describe a real party, which is the one thing it has to do; so an outsider
   * is a name and nothing else, and everything that needs an id checks first.
   */
  characterId: number | null;
  name: string;
  avatar: string | null;
  /** Optional, and often decided last: somebody playing "whatever is left"
   *  cannot know their job until they know their seat. */
  job?: string | null;
  /** What they can play. `all` is the widest offer there is. */
  flex: Flex;
  /**
   * Which way round this seat happened.
   *
   * "owner" — the lead put them here, and `confirmedAt` is their answer.
   * "self"  — they asked to join, and `confirmedAt` is the lead's answer.
   *
   * Both end up as an unconfirmed seat and both are settled by the same field,
   * which is why one word is enough to carry the difference. Without it the
   * board cannot tell whose turn it is: the same grey seat means "waiting on
   * them" in one direction and "waiting on you" in the other, and showing the
   * lead a Confirm button on a seat that is waiting on somebody else is how a
   * party ends up with a member who never agreed to be in it.
   *
   * Absent means "owner", which is what every seat made before joining
   * existed was.
   */
  by?: "owner" | "self";
  /**
   * The row this seat is, so it can be confirmed or taken back.
   *
   * The one place the model knows a database exists, and it earns it: answering
   * a seat means naming the row, and the alternative is matching on party and
   * character and hoping — which stops working the moment the party contains
   * two people from off this site, who both have no character id at all.
   */
  seatRowId?: number;
  /**
   * Every job they offered, where they offered more than one.
   *
   * `job` is what they will be on and is the one the seat draws; this is what
   * they said they could be on. The two are the same thing when somebody names
   * one job, which is why `job` stays the field everything reads — a party
   * that has settled is described by `job` alone, and this is only the record
   * of what was on the table before it did.
   */
  jobs?: string[];
  confirmedAt: string | null;
}

/** How a party's seats actually come out, once the floaters are worked in. */
export interface Resolved {
  /** Seat id -> whoever ends up in it. */
  seats: Record<string, SlotTaken>;
  /** Seat id -> floaters who could still take it, for the faces on the right. */
  maybe: Record<string, Floater[]>;
  /** Floaters still not pinned to anything. */
  loose: Floater[];
  /** Every seat still empty after the floaters have been worked in. */
  open: SlotDef[];
  /**
   * Empty seats nobody has even offered for.
   *
   * Not the same as `open`, and the difference matters. A seat with a floater
   * hovering over it will probably be filled by them — but only one of the
   * seats they hover over will be, so the others are still empty chairs.
   * `open` counts the chairs; this names the ones where the party has no
   * candidate at all, which is what the role chips should be about.
   */
  uncovered: SlotDef[];
  /**
   * How many more people the party actually needs.
   *
   * Chairs minus the people already offering to sit in one of them. A party of
   * seven with somebody who will take ST or D2 needs one more person, not two —
   * which is what the board was saying before this existed, and why it read
   * "Full" for a party that was one short.
   */
  wanted: number;
}

/**
 * A stable shuffle.
 *
 * Two people who will both play anything have to be told apart somehow, and the
 * rule agreed was to pick at random. Random per render would be worse than
 * useless — the board would deal them different seats every second — so the
 * draw is seeded by the party and by exactly who is in it. It only changes when
 * something about the party changes, which is when it should.
 */
function shuffled<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A handle that works for everybody in a party.
 *
 * Ids are the right key for members and there is no id for a friend from
 * another FC, so the name stands in. Two guests called the same thing would
 * collide, which costs them a shuffled seat order and nothing else.
 */
export const whoKey = (p: { characterId: number | null; name: string }): string =>
  p.characterId != null ? `c${p.characterId}` : `n${p.name.toLowerCase()}`;

/** How wide somebody's offer is. Widest goes last, and "anything" is widest. */
const breadth = (f: Floater, open: SlotDef[]): number =>
  f.flex.all ? Number.MAX_SAFE_INTEGER
             : open.filter((s) => coversSeat(f.flex, s)).length;

/**
 * Work the floaters into the seats.
 *
 * Two passes, and the difference between them is what the FC actually asked
 * for.
 *
 * The first pass only places somebody when they have no choice left. If you
 * offered ST or D2 and somebody else takes D2, you are the ST — there is
 * nothing to decide and no reason to wait. This repeats, because pinning one
 * person can force the next.
 *
 * The second pass runs only when the party is exactly full: as many floaters as
 * seats left, so everybody has to land somewhere. Narrow offers are placed
 * first and "anything" last, which is what makes an open offer generous rather
 * than a way to grab the seat you wanted — you get what nobody else could take.
 * Ties among equally open offers are drawn from a hat.
 *
 * Placement uses augmenting paths rather than taking the first seat that fits,
 * because greed strands people: two floaters who can both only play ST and D2
 * are fine, and a greedy pass that hands the first of them D2 leaves the second
 * looking at a seat somebody else is in. This finds an arrangement whenever one
 * exists.
 */
export function resolveParty(p: Party): Resolved {
  const shut = new Set(p.closed ?? []);
  const openSlots = slotsOf(p.shape)
    .filter((s) => !p.seats[s.id] && !shut.has(s.id));
  const byId = new Map(openSlots.map((s) => [s.id, s]));

  const seats: Record<string, SlotTaken> = { ...p.seats };
  let loose = [...(p.floating ?? [])];
  let free = new Set(openSlots.map((s) => s.id));

  const pin = (f: Floater, seatId: string) => {
    seats[seatId] = {
      characterId: f.characterId, name: f.name, avatar: f.avatar,
      job: f.job ?? null, flex: f.flex, confirmedAt: f.confirmedAt,
    };
    free.delete(seatId);
    loose = loose.filter((x) => x !== f);
  };

  // ── Pass one: anybody with exactly one place left to go ──────────────────
  for (let guard = 0; guard < 64; guard++) {
    const forced = loose
      .map((f) => ({
        f, seats: [...free].filter((id) => coversSeat(f.flex, byId.get(id)!)),
      }))
      .find((x) => x.seats.length === 1);
    if (!forced) break;
    pin(forced.f, forced.seats[0]);
  }

  // ── Pass two: the party is exactly full, so everybody lands ──────────────
  if (loose.length > 0 && loose.length === free.size) {
    const order = [...loose].sort(
      (a, b) => breadth(a, openSlots) - breadth(b, openSlots));
    const seed = `${p.id}|${[...free].sort().join(",")}|`
      + loose.map(whoKey).sort().join(",");

    const taken = new Map<string, Floater>();
    const tryPlace = (f: Floater, seen: Set<string>): boolean => {
      // Shuffled, so two people who will play anything are not both handed the
      // seats in party-list order every time.
      for (const id of shuffled([...free], seed + whoKey(f))) {
        if (seen.has(id) || !coversSeat(f.flex, byId.get(id)!)) continue;
        seen.add(id);
        const sitting = taken.get(id);
        if (!sitting || tryPlace(sitting, seen)) {
          taken.set(id, f);
          return true;
        }
      }
      return false;
    };
    for (const f of order) tryPlace(f, new Set());
    for (const [id, f] of taken) pin(f, id);
  }

  // ── Whoever is still floating shows on every seat they could take ────────
  const maybe: Record<string, Floater[]> = {};
  for (const id of free) {
    const slot = byId.get(id)!;
    const who = loose.filter((f) => coversSeat(f.flex, slot));
    if (who.length) maybe[id] = who;
  }

  const open = openSlots.filter((s) => free.has(s.id));
  return {
    seats, maybe, loose, open,
    uncovered: open.filter((s) => !maybe[s.id]),
    wanted: Math.max(0, open.length - loose.length),
  };
}

/**
 * How far into a fight a party is, and what it is drilling.
 *
 * The single most useful thing a listing can say, and the thing Discord posts
 * always bury in prose. "M11S" tells you nothing about whether you can join:
 * a group on their first night and a group farming the kill are running the
 * same fight and want completely different people.
 *
 * The ladder is the one the game community already uses and it is the same
 * shape for every fight:
 *
 *   fresh   nobody here has seen it. Explanations expected, deaths expected.
 *   prog    working through it. Most of a tier's life is spent on this rung.
 *   a2c     the whole fight is known and the party is going for the kill.
 *   farm    it dies. This is about loot, or a mount, or somebody's weapon.
 *
 * "Prog" rather than "In progress", because it is the word the FC already uses
 * — a prog party is a thing people say out loud, and a board that renames it
 * would be teaching a second vocabulary for something everybody can already
 * name.
 *
 * The middle rung carries no phase number yet. Numbering the phases means
 * knowing how many each boss has, which is a table nobody has written; asking
 * each party to invent its own would have two groups on the same fight
 * disagreeing about whether it has four phases or five, on a board whose whole
 * job is to make them understand each other. `phase` and `phases` stay in the
 * shape for the day that table exists.
 *
 * `mech` is what actually answers the question in the meantime, and it is free
 * text on purpose: the party knows what it is drilling and can say it in its
 * own words — "second Wroth Flames", "adds into cleaves" — which is more use
 * than any number. A picked-from-a-list version comes later; it does not have
 * to come first.
 */
export type ProgressAt = "fresh" | "prog" | "a2c" | "farm";

export interface Progress {
  at: ProgressAt;
  /** 1-based. Unused until there is a table of phases per boss. */
  phase?: number;
  /** How many phases the party reckons the fight has. */
  phases?: number;
  /** The mechanic being drilled, in the party's own words. */
  mech?: string;
}

export const PROGRESS_LABEL: Record<ProgressAt, string> = {
  fresh: "Fresh start",
  prog: "Prog",
  a2c: "A2C",
  farm: "Farm",
};

export const PROGRESS_HELP: Record<ProgressAt, string> = {
  fresh: "Nobody has seen it. Everything gets explained.",
  prog: "Working through the fight. Say what we are drilling.",
  a2c: "The whole fight is known — going for the clear.",
  farm: "It dies. This is for the loot.",
};

/** Warm for a first night, cool for a farm: how much learning is left. */
export const PROGRESS_COLOR: Record<ProgressAt, string> = {
  fresh: "#d98b3a", prog: "#c96f9e", a2c: "#7ea6c9", farm: "#6aa84f",
};

/** How many phases to offer before anybody has said. */
export const DEFAULT_PHASES = 4;

/** "P3 · Wroth Flames", "A2C", "Fresh start" — the whole thing in one line. */
export function progressText(p: Progress | undefined): string | null {
  if (!p) return null;
  const head = p.at === "prog" && p.phase
    // Only where a phase number has been set, which nothing offers yet.
    ? `P${p.phase}${p.phases ? `/${p.phases}` : ""}`
    : PROGRESS_LABEL[p.at];
  return p.mech?.trim() ? `${head} · ${p.mech.trim()}` : head;
}

/**
 * Whether this kind of content has a fight to make progress through.
 *
 * A hunt train has no phases and a treasure map run cannot be farmed in the
 * sense meant here, so asking would be asking a question with no answer.
 */
export const isFight = (kind: ContentKind | undefined): boolean =>
  kind === "extreme" || kind === "savage" || kind === "ultimate"
  || kind === "alliance" || kind === "criterion";

/**
 * A place in the game, with the coordinates players give each other.
 *
 * Needed by two kinds of listing and for the same reason: a photo shoot and a
 * FATE farm are both an agreement to stand somewhere specific, and the zone
 * alone is not specific. "Kozama'uka" is a place the size of a county.
 *
 * Coordinates are optional. "Somewhere in the Crystarium" is a real plan, and
 * refusing it until somebody types 12.4 pushes that plan back into Discord.
 */
export interface Spot {
  /** The zone, by the name the game gives it. */
  map: string;
  /** The region it is in, carried along so a row can say which Camp it means. */
  region?: string;
  x?: number;
  y?: number;
  /**
   * Which world, and its data centre.
   *
   * The other half of an address since world visiting. A board read by one
   * Free Company will assume Tonberry every time, and the one night that is
   * wrong is the night somebody has travelled — which is exactly the night it
   * needed saying.
   */
  dc?: string;
  world?: string;
  /** A housing district is addressed by ward and plot, not by coordinates. */
  ward?: number;
  plot?: number;
}

/**
 * The five residential districts.
 *
 * Nowhere else in the game is addressed this way, and inside one of them a
 * coordinate is useless: nobody says "meet me at 22.4, 11.9 in the Goblet",
 * they say Ward 12, Plot 30. The apartment wings answer to the same pair.
 */
const HOUSING = new Set([
  "Mist", "The Lavender Beds", "The Goblet", "Shirogane", "Empyreum",
  // What the zone list happens to call them, where it differs.
  "Lavender Beds", "Goblet",
]);

export const isHousing = (map: string | undefined | null): boolean =>
  HOUSING.has((map ?? "").trim());

/** "Elemental · Tonberry", where the party said which. */
export const worldText = (s: Spot | undefined): string | null =>
  s?.world ? `${s.dc ? `${s.dc} · ` : ""}${s.world}` : null;

/** "Kozama'uka (12.4, 30.1)", or "Gilgamesh · Kozama'uka" when away. */
export function spotText(s: Spot | undefined): string | null {
  if (!s?.map) return null;
  const at = isHousing(s.map)
    // Plot first, which is how the FC says it out loud. Either half alone is
    // still worth saying: a plot number is what somebody has to hand, and
    // "Ward 12" narrows a district to somewhere you can walk.
    ? [s.plot != null ? `P${s.plot}` : null, s.ward != null ? `W${s.ward}` : null]
        .filter(Boolean).join(" ").replace(/^(.)/, " $1")
    : s.x != null && s.y != null
      ? ` (${s.x.toFixed(1)}, ${s.y.toFixed(1)})` : "";
  // Only when it is somewhere else. Every member of this Free Company is on
  // Tonberry, so printing it on every row is printing the same word forever
  // and burying the one row where it is not.
  const away = s.world && s.world !== FC_WORLD ? `${s.world} · ` : "";
  return `${away}${s.map}${at}`;
}

/**
 * Whether this kind of thing happens somewhere in particular.
 *
 * A raid happens inside an instance and saying where it is would be saying its
 * own name back; a photo shoot, a FATE farm and a hunt train are all about a
 * spot on a map, and are useless without one.
 */
/**
 * Whether joining has to say which job.
 *
 * A raid is a composition and the job is half of what the party is deciding.
 * A photo shoot, a FATE farm, a hunt train and a night in Bozja are not: you
 * turn up on whatever you happen to be on, and asking somebody to commit to a
 * job before they can press Join is a form standing in front of an evening
 * that has no form.
 *
 * Treasure and PvP stay on the asking side. A map night wants to know it has a
 * healer before it opens the first portal, and PvP is queued alone but on a
 * particular job, which is the thing people are agreeing about.
 */
export const jobMatters = (kind: ContentKind | undefined): boolean =>
  !(kind === "community" || kind === "fate" || kind === "hunt"
    || kind === "field" || kind === "treasure");

export const hasSpot = (kind: ContentKind | undefined): boolean =>
  kind === "community" || kind === "fate" || kind === "hunt"
  || kind === "treasure" || kind === "field";

/**
 * Who gets what, agreed before anybody walks in.
 *
 * The one thing a party absolutely must settle in advance and the one thing
 * Discord posts most often leave out — and it is the argument that ends static
 * groups. Three rules, which are the three the FC already uses:
 *
 *   ffa    Everybody rolls on everything. First, and what a party gets by
 *          saying nothing, because it is what the FC actually runs — the
 *          others are the arrangements somebody has to have decided on.
 *   ltr    Left to right down the party list. Whoever gets theirs leaves, so
 *          the next person moves up. Slow, and completely unarguable.
 *   merc   Somebody is paying for the clear. The lead pays each person a
 *          stated amount for the kill or for a rare drop, and the loot is
 *          theirs. Said in numbers here rather than "negotiable", because a
 *          price nobody has stated is a price two people have assumed
 *          differently — and said with a trigger, because "paid for the
 *          clear" and "paid when the mount drops" are two different deals
 *          wearing one word.
 *   owner  Treasure maps. Whoever opened the map takes what came out of it,
 *          and everybody else came to help. The other honest answer to a map
 *          night, and one that has to be said before anybody portals in.
 *
 * Set on every party whatever the progress is: a prog night that unexpectedly
 * kills the boss still has to answer the question, and answering it at 1am
 * after a first clear is the worst possible time.
 *
 * Only savage and extreme. Those are the two where the FC actually negotiates
 * this — a weekly tier with a limited number of drops, and a trial farmed for
 * a mount that only one person can win at a time. Everything else either
 * shares out differently or has never needed a rule written down, and offering
 * these three answers there would be offering three wrong ones. The rest get
 * their own when somebody says what they should be.
 */
export type LootRule = "ltr" | "ffa" | "merc" | "book" | "owner";

/**
 * What the mercenary is paying for.
 *
 * A wage and a bet, and the FC has run both. Paying for the clear is a wage:
 * everybody is paid at the end of the night whether or not anything dropped.
 * Paying on a rare mount is a bet, and on a bad night it pays nobody — which is
 * a perfectly normal arrangement and a terrible thing to discover at 1am. A
 * party that has not said which one it means has two people who each assumed
 * the other.
 */
export type PayOn = "clear" | "mount" | "both";

export interface Loot {
  rule: LootRule;
  /** Gil per person, when the rule is `merc`. */
  pay?: number;
  /** What has to happen before that is paid. Only meaningful under `merc`. */
  payOn?: PayOn;
}

export const PAY_ON_LABEL: Record<PayOn, string> = {
  clear: "on the clear",
  mount: "on a rare mount",
  both: "on the clear or a rare mount",
};

/** What each trigger means, spelled out where somebody is choosing one. */
export const PAY_ON_HELP: Record<PayOn, string> = {
  clear: "Paid when the boss dies, whatever dropped.",
  mount: "Paid only if the rare mount drops. Some nights that is nobody.",
  both: "Paid for the clear, and again if the mount drops.",
};

/** The default, because a wage is what people mean when they say nothing. */
export const DEFAULT_PAY_ON: PayOn = "clear";

/**
 * What a party is set to before anybody chooses.
 *
 * Everybody rolls. It is what the FC runs unless somebody has decided
 * otherwise, and the rules it sits in front of — a party list worked down in
 * order, a wage, a weekly book run — are all arrangements that were arrived at
 * rather than fallen into. A form that opens on one of those has quietly put
 * words in the lead's mouth.
 */
export const DEFAULT_LOOT: LootRule = "ffa";

export const LOOT_LABEL: Record<LootRule, string> = {
  ffa: "FFA",
  ltr: "L to R",
  merc: "Mercenary",
  book: "Book run",
  owner: "Map owner takes all",
};

export const LOOT_HELP: Record<LootRule, string> = {
  ltr: "Left to right down the party list — whoever gets theirs leaves.",
  ffa: "Free for all. Everybody rolls on everything.",
  merc: "The lead pays everyone for a clear or a rare drop, and keeps the loot.",
  book: "Here for the weekly books. Nobody is fighting over the gear.",
  owner: "Whoever opened the map keeps what came out of it. The rest are helping.",
};

export const LOOT_COLOR: Record<LootRule, string> = {
  ltr: "#7ea6c9", ffa: "#6aa84f", merc: "#c9a227", book: "#9a7fd4",
  owner: "#c96f9e",
};

/**
 * Which rules this kind of content can use.
 *
 * Only savage drops the weekly tokens, so "book run" is a sentence that means
 * nothing about an extreme trial. Offering it there would be offering an answer
 * that could only ever be wrong.
 */
export function lootRulesFor(kind: ContentKind | undefined): LootRule[] {
  if (kind === "savage") return ["ffa", "ltr", "merc", "book"];
  if (kind === "extreme") return ["ffa", "ltr", "merc"];
  // A map night has its own two answers and none of the raid ones fits: there
  // is no party list to work down, and nothing to pay a wage for. Either
  // everybody rolls on everything, or each chest belongs to whoever opened the
  // map and the rest of us are there for the portals.
  if (kind === "treasure") return ["ffa", "owner"];
  return [];
}

/** "L to R", "Mercenary · 2,000,000 gil on a rare mount". */
export function lootText(l: Loot | undefined): string | null {
  if (!l) return null;
  if (l.rule !== "merc") return LOOT_LABEL[l.rule];
  const when = l.payOn ? ` ${PAY_ON_LABEL[l.payOn]}` : "";
  if (!l.pay) return `${LOOT_LABEL.merc}${when}`;
  return `${LOOT_LABEL.merc} · ${l.pay.toLocaleString("en-US")} gil${when}`;
}

/**
 * Whether this kind of content has loot worth writing a rule about.
 *
 * Narrower than isFight on purpose: a criterion dungeon drops for the party
 * rather than to a roll, so the three rules above do not describe it. It is
 * left out until somebody says what its rule should be, which is better than
 * offering three answers that are all wrong.
 */
export const hasLoot = (kind: ContentKind | undefined): boolean =>
  kind === "savage" || kind === "extreme" || kind === "treasure";

/**
 * A party's write-up: paragraphs and pictures, in the order they were put down.
 *
 * The one-line note was never going to be enough. What a raid lead actually
 * wants to post is a plan — where we are starting from, a screenshot of the
 * strat, what to bring, another picture of the uptime spot — and that is
 * paragraphs with pictures between them rather than a caption.
 *
 * A list of blocks rather than rich text with images embedded in it. Rich text
 * means a parser, a sanitiser and a decision about what happens when somebody
 * pastes formatted HTML from Discord; blocks mean the picture is either between
 * two paragraphs or it is not. The FC is writing raid plans, not typesetting.
 */
export interface PartyBlock {
  /** Stable across edits, so React does not shuffle the list while typing. */
  id: string;
  kind: "text" | "image";
  text?: string;
  /**
   * A public URL in the party bucket. Uploaded when the picture is dropped
   * rather than when the party is saved, so the wait happens while somebody is
   * still writing rather than after they have finished.
   */
  url?: string;
  caption?: string;
}

/**
 * A reaction on a reply.
 *
 * Who, not how many. A count alone cannot answer either question anybody
 * actually has about one — "have I already" and "who agreed with that" — and a
 * board where you cannot tell whether the tick is yours is a board where people
 * press it twice to find out.
 */
export interface Reaction {
  emoji: string;
  by: { characterId: number | null; name: string }[];
}

/**
 * The reactions on offer.
 *
 * A short fixed row rather than a picker of every emoji there is. This is for
 * the three things people actually say under a raid plan — yes, nice, that is
 * funny — and a search box for a thousand symbols turns a one-tap
 * acknowledgement back into a decision. The potato is here because it is the
 * Free Company's own currency and it belongs anywhere the FC agrees with
 * something.
 */
export const REACTIONS = ["👍", "❤️", "😂", "🎉", "🥔"] as const;

/** Somebody's reply on a party. */
export interface PartyComment {
  /**
   * Taken back, and when.
   *
   * The row stays rather than the message disappearing: an answer to a
   * question nobody can see reads as a non sequitur, so the conversation keeps
   * its shape and the line says what happened to it. Nothing else of it
   * survives — the database blanks the body on the way out.
   */
  /**
   * The characters named in it with an @.
   *
   * Kept rather than parsed on the way out: who is on the roster changes, and
   * a message means what it meant when it was written. It is also what decides
   * who is told — being named is a question addressed to somebody, and the
   * notification for it is not the same as "somebody spoke".
   */
  mentions?: number[];
  /** The message this one answers, where it answers one. */
  replyTo?: string | null;
  deletedAt?: string | null;
  /**
   * Last changed, where it has been.
   *
   * A conversation people read for instructions is one where "he said nine"
   * matters. A line that changed says so; rewriting what somebody has already
   * read, silently, is the one thing an edit must not do.
   */
  editedAt?: string | null;
  id: string;
  author: { characterId: number | null; name: string; avatar: string | null };
  text: string;
  /** Pictures on the reply itself — the same idea as a feedback attachment. */
  images?: string[];
  reactions?: Reaction[];
  at: string;
}

/**
 * Whether two replies in a row are one person still talking.
 *
 * Somebody who says three things in a minute has not had three conversations,
 * and drawing their face and name three times says they have. Grouped, the
 * second and third are just more of the first — which is how every chat anybody
 * uses already reads, and how these were always meant to be read.
 *
 * Ten minutes, because past that they came back to say something rather than
 * carried on saying it, and the gap is worth seeing.
 */
export const GROUP_MS = 600_000;

export function sameSpeaker(a: PartyComment, b: PartyComment | undefined): boolean {
  if (!b) return false;
  // Two people off this site both have a null character id and are not the
  // same person, so the name has to agree as well.
  if (a.author.characterId !== b.author.characterId) return false;
  if (a.author.characterId == null && a.author.name !== b.author.name) return false;
  return new Date(a.at).getTime() - new Date(b.at).getTime() < GROUP_MS;
}

export const blockId = (): string =>
  `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Whether there is anything worth drawing. */
export const hasBody = (b: PartyBlock[] | undefined): boolean =>
  !!b?.some((x) => (x.kind === "text" && x.text?.trim()) || (x.kind === "image" && x.url));

/** Only the two fields it reads, so a draft or a row can be handed to it. */
export const endsAt = (p: { startsAt: string; lengthMinutes: number }): string =>
  new Date(new Date(p.startsAt).getTime() + p.lengthMinutes * 60_000).toISOString();

/* ── A map night ──────────────────────────────────────────────────────────── */

/**
 * What a treasure party is opening, and how much of it.
 *
 * Two questions that decide whether somebody can come, and neither is answered
 * by the time or the party size. A G18 night is not a G12 night — the maps are
 * different items, gathered at different levels, and turning up with the wrong
 * one means standing about while everybody else portals. And "bring one" and
 * "bring five" are different evenings: one is twenty minutes, the other is most
 * of the night.
 *
 * Both optional. "Maps, tonight, bring what you have" is a real plan and the
 * board should not refuse it until somebody has picked a G number.
 */
export interface MapPlan {
  /** The map, by its item name: "Timeworn Gargantuaskin Map". */
  kind?: string;
  /** How many each person brings. */
  each?: number;
}

export const hasMaps = (kind: ContentKind | undefined): boolean =>
  kind === "treasure";

/**
 * Whether this listing is a list of roulettes.
 *
 * Only the one kind, and it is most of what that kind says: a roulette night
 * with no roulettes named is an invitation to guess.
 */
export const hasRoulettes = (kind: ContentKind | undefined): boolean =>
  kind === "roulette";

/**
 * Whether the length shown is a guess rather than a plan.
 *
 * A savage night runs from eight until ten because somebody decided it would.
 * A map night runs until the maps are done, and how long that takes depends on
 * how many portals open — which is a dice roll nobody controls. Two hours of
 * maps can be forty minutes or it can be four hours.
 *
 * So the board says so rather than pretending, and the party is not judged for
 * overrunning something it never promised.
 */
export const timeIsEstimate = (kind: ContentKind | undefined): boolean =>
  kind === "treasure";

/**
 * Whether this particular party's length is a guess.
 *
 * Two ways to get there: the content is one whose length nobody controls, or
 * the party said its length in runs, which is the same admission made
 * deliberately.
 */
export const lengthIsEstimate = (
  p: { lengthUnit: LengthUnit }, kind: ContentKind | undefined,
): boolean => p.lengthUnit === "runs" || p.lengthUnit === "maps"
  || timeIsEstimate(kind);

/** "G18 · 3 each", "G18", "2 each". */
export function mapsText(m: MapPlan | undefined, gOf?: (name: string) => string | undefined): string | null {
  if (!m) return null;
  const which = m.kind ? (gOf?.(m.kind) ?? m.kind) : null;
  const each = m.each ? `${m.each} each` : null;
  const parts = [which, each].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/* ── Where a party is in its own evening ──────────────────────────────────── */

/**
 * The five states of a listing, which are the five different things a member
 * wants from it.
 *
 *   upcoming    Later. There is time to sort a job out and ask questions.
 *   soon        Within the hour. Stop reading and log in.
 *   live        Happening. Joining now means joining something already going.
 *   justEnded   Finished within the last hour. Still worth showing: this is
 *               where "how did it go" and the screenshots land, and a board
 *               that files a party under history the second it ends throws
 *               away the hour it is most talked about.
 *   done        Over. Off the board unless somebody goes looking.
 *
 * An hour on each side. Long enough to be a real warning and to catch the
 * conversation afterwards; short enough that "soon" still means soon.
 *
 * Worked out from the clock every time rather than stored, because a stored
 * status is a second copy of the truth that needs a job to keep it honest —
 * and the moment that job is late the board is lying about which parties are
 * running.
 */
export type PartyStatus = "upcoming" | "soon" | "live" | "justEnded" | "done";

/** The width of the warning, and of the grace afterwards. */
export const SOON_MS = 3_600_000;

export function partyStatus(p: Party, now: number = Date.now()): PartyStatus {
  const start = new Date(p.startsAt).getTime();
  const end = new Date(endsAt(p)).getTime();
  if (now < start - SOON_MS) return "upcoming";
  if (now < start) return "soon";
  if (now < end) return "live";
  if (now < end + SOON_MS) return "justEnded";
  return "done";
}

export const STATUS_LABEL: Record<PartyStatus, string> = {
  upcoming: "Not started",
  soon: "Starting soon",
  live: "In progress",
  justEnded: "Just ended",
  done: "Ended",
};

/** Cool while it waits, warm as it nears, green while it runs, grey after. */
export const STATUS_COLOR: Record<PartyStatus, string> = {
  upcoming: "#7ea6c9",
  soon: "#d98b3a",
  live: "#6aa84f",
  justEnded: "#a87fd8",
  done: "#8b93a1",
};

/** The order the filter chips sit in, which is the order an evening happens. */
export const STATUS_ORDER: PartyStatus[] = [
  "upcoming", "soon", "live", "justEnded", "done",
];

/** Whether a party in this state is still part of tonight. */
export const isOver = (st: PartyStatus): boolean => st === "done";

/**
 * How long until it starts, broken into parts.
 *
 * Parts rather than a formatted string, because the two languages put them in
 * different orders and neither should be assembled here. Negative once the
 * thing has started, so a caller can tell "in five minutes" from "five minutes
 * ago" without a second call.
 */
export interface Span {
  /** Signed. Negative once the moment has passed. */
  ms: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function spanTo(iso: string, now: number = Date.now()): Span {
  const ms = new Date(iso).getTime() - now;
  // Rounded down towards zero from the absolute value, so "1 minute" means a
  // minute is left rather than a minute has nearly gone. A countdown that
  // reads 0:00 for a whole second before it fires is a countdown people stop
  // trusting.
  const a = Math.abs(ms);
  return {
    ms,
    days: Math.floor(a / 86_400_000),
    hours: Math.floor(a / 3_600_000) % 24,
    minutes: Math.floor(a / 60_000) % 60,
    seconds: Math.floor(a / 1000) % 60,
  };
}

/**
 * How often a countdown needs redrawing to look alive.
 *
 * Seconds only inside the last hour. Above that the seconds digit is noise
 * nobody reads, and redrawing every listing on the board once a second so that
 * "in 3 days" can stay "in 3 days" is a fan spinning for nothing.
 */
export const tickMs = (ms: number): number =>
  Math.abs(ms) < SOON_MS ? 1000 : 60_000;


/** Seats with nobody in them and not deliberately shut. What is missing. */
export function openSeats(p: Party): SlotDef[] {
  const shut = new Set(p.closed ?? []);
  return slotsOf(p.shape).filter((s) => !p.seats[s.id] && !shut.has(s.id));
}

/** Seats with somebody in them who has said yes. */
export function filledSeats(p: Party): SlotDef[] {
  return slotsOf(p.shape).filter((s) => p.seats[s.id]?.confirmedAt);
}

/** Seats with somebody in them who has not answered yet. */
export function pendingSeats(p: Party): SlotDef[] {
  return slotsOf(p.shape).filter((s) => p.seats[s.id] && !p.seats[s.id].confirmedAt);
}

/** How many of each role are still wanted — what the chips filter on. */
export function needsByRole(p: Party): Record<SlotRole, number> {
  const out: Record<SlotRole, number> = { tank: 0, healer: 0, dps: 0 };
  // Seats nobody has offered for. A seat a floater is hovering over is not
  // something the party is asking a stranger for.
  //
  // A seat with no role is not a DPS seat going spare: a FATE farm short of
  // three people is not short of three DPS, and filing it under one would put
  // it in front of somebody filtering for a job to bring.
  for (const s of resolveParty(p).uncovered) if (!s.free) out[s.role] += 1;
  return out;
}

export const ROLE_LABEL: Record<SlotRole, string> = {
  tank: "Tank", healer: "Healer", dps: "DPS",
};
export const ROLE_COLOR: Record<SlotRole, string> = {
  tank: "#7ea6c9", healer: "#6aa84f", dps: "#d14b3a",
};
