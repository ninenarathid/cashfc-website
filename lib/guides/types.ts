/**
 * A fight, written as data rather than as a page.
 *
 * Everything a guide shows comes from these shapes: the diagram, the step-through,
 * and the quiz. That is the whole point of the format. A mechanic says where the
 * danger is and where each role should be standing, and "here is what to do" and
 * "show me you know" are then two ways of drawing the same fact — which is why
 * they can never disagree with each other.
 *
 * Coordinates are arena units, centre at 0,0, edge at 10, and y points up the way
 * it does in maths rather than down the way it does in SVG. Authoring a mechanic
 * should feel like describing a room, not like writing a drawing.
 *
 * Ten is the edge whatever the room actually is, so a mechanic written for a
 * circle reads the same as one written for a square and a fight that changes
 * shape halfway through does not change its arithmetic.
 */

/**
 * The eight seats in a party, as Japanese strategies name them.
 *
 * Not roles. A strategy says "MT takes the north tower and ST takes the south",
 * and there is no way to say that in a vocabulary that only knows "tank" — both
 * tanks are tanks, and which of them goes north is the entire instruction. Every
 * guide worth copying is written this way, so this is written this way too.
 */
export type Slot = "MT" | "ST" | "H1" | "H2" | "D1" | "D2" | "D3" | "D4";

/** Half the arena across, in the units everything here is authored in. */
export const ARENA_R = 10;

export const SLOTS: Slot[] = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"];

/**
 * A piece of guide text, in one language or both.
 *
 * A bare string is the same in either — a cast name, a waymark letter, "MT" —
 * and stays a bare string so the common case costs nothing to write. Anything a
 * reader actually has to understand takes a pair.
 *
 * Missing halves fall back rather than showing a blank: a guide half translated
 * is more useful than a guide that hides the sentences nobody has got to yet,
 * and an English reader seeing one Thai line knows what to do about it in a way
 * that an empty box does not tell them.
 */
export type Text = string | { th?: string; en?: string };

export function say(t: Text | undefined, lang: "th" | "en"): string {
  if (t == null) return "";
  if (typeof t === "string") return t;
  return t[lang] ?? t.en ?? t.th ?? "";
}

/** The roles the site already recruits by, so a guide speaks the board's language. */
export type GuideRole = "tank" | "pure" | "barrier" | "melee" | "pranged" | "mranged";

/**
 * What each seat usually is, for colouring a marker and for guessing somebody's
 * seat from the job they play. Conventional rather than binding: D3 is the
 * physical ranged in most groups and nothing breaks if it is not in yours.
 */
export const SLOT_ROLE: Record<Slot, GuideRole> = {
  MT: "tank", ST: "tank",
  H1: "pure", H2: "barrier",
  D1: "melee", D2: "melee", D3: "pranged", D4: "mranged",
};

/**
 * The two light parties, as Japanese strategies split them.
 *
 * A great many mechanics are "MT group north, ST group south", and the grouping
 * is the same in every strategy that uses it, so it is written down once here
 * rather than restated in each guide that leans on it.
 */
export const MT_GROUP: Slot[] = ["MT", "H1", "D1", "D3"];
export const ST_GROUP: Slot[] = ["ST", "H2", "D2", "D4"];

export const slotGroup = (s: Slot): "MT" | "ST" =>
  (MT_GROUP as string[]).includes(s) ? "MT" : "ST";

export const SLOT_LABEL: Record<Slot, string> = {
  MT: "MT", ST: "ST", H1: "H1", H2: "H2",
  D1: "D1", D2: "D2", D3: "D3", D4: "D4",
};

export interface Spot { x: number; y: number }

/**
 * Somewhere you should not be standing.
 *
 * Angles are degrees clockwise from north, because that is how a raid calls them
 * out loud — "the cleave is going north-east" — and a format nobody has to
 * translate is a format nobody gets wrong.
 */
export type Danger =
  | { kind: "circle"; at: Spot; r: number; note?: string }
  /** Safe in the middle, hit at the edges. */
  | { kind: "donut"; at: Spot; r: number; note?: string }
  | { kind: "cone"; at: Spot; facing: number; angle: number; note?: string }
  | { kind: "rect"; at: Spot; w: number; h: number; facing?: number; note?: string }
  /** Everything on one side of a line through the middle. */
  | { kind: "half"; facing: number; note?: string };

/**
 * One way a mechanic can come out.
 *
 * A fight that always resolved the same way would be a video. Variants are what
 * make the quiz a question rather than a memory test, so a mechanic with a left
 * and a right needs both written out — and that, not the code, is where the work
 * in building these guides actually is.
 */
/**
 * One beat inside a mechanic.
 *
 * A mechanic is rarely a single picture. Ether Letting is "take your marker to
 * the edge", then "come back to the middle" — two different places to stand,
 * thirty seconds apart, and drawing only the second is how a guide ends up
 * technically correct and no use. So a mechanic is a short sequence, and each
 * beat gets its own diagram.
 */
export interface Step {
  id: string;
  /** What this beat is. "1 — place", "2 — regroup". */
  label: Text;
  /** What is happening, for everybody. */
  say: Text;
  danger: Danger[];
  /** Where each seat stands. A seat left out has nowhere special to be. */
  safe: Partial<Record<Slot, Spot>>;
  /**
   * What this particular seat does, in their own words.
   *
   * The half a diagram cannot draw. A position says where to stand; it does not
   * say "swap after this one", "hold your invuln for the second set", "you are
   * the one who breaks the ball". Written per seat because that is the only
   * scale at which it is true — and because a reader who has said which seat
   * they are should be told their job, not the whole party's.
   */
  per?: Partial<Record<Slot, Text>>;
  /** Said when somebody answers wrongly — the correction, not just a cross. */
  wrong?: Text;
}

export interface Variant {
  id: string;
  /** What tells you it is this one. "Left arm glows", "towers spawn north". */
  tell: Text;
  steps: Step[];
}

/**
 * What kind of thing a skill is, for reading a timeline at a glance.
 *
 * A raid does not remember a fight as a list of names. It remembers "the
 * tankbuster, then the stack, then the one you have to memorise", and a
 * timeline that says only what each cast is called makes everybody translate
 * that back every time they look at it.
 */
/**
 * What kind of skill this is, in the categories the raid tools use.
 *
 * Six colours rather than a description each, because a timeline is read at a
 * glance and a raid already thinks in them: this one is raidwide, that one is
 * aimed at somebody, this one is adds. The names and the palette follow the
 * timeline this guide was built from, so anybody holding both sees the same
 * fight in the same colours.
 */
export type MechTag =
  | "raid" | "tank" | "shared" | "pattern" | "targeted" | "adds";

export const TAG_LABEL: Record<MechTag, string> = {
  raid: "Raid damage", tank: "Tank damage", shared: "Shared damage",
  pattern: "Pattern AoE", targeted: "Targeted AoE", adds: "Adds",
};

export const TAG_TONE: Record<MechTag, string> = {
  raid: "border-[#e06c75]/50 bg-[#e06c75]/10 text-[#e06c75]",
  tank: "border-[#d19a66]/50 bg-[#d19a66]/10 text-[#d19a66]",
  shared: "border-[#e5c07b]/50 bg-[#e5c07b]/10 text-[#e5c07b]",
  pattern: "border-[#98c379]/50 bg-[#98c379]/10 text-[#98c379]",
  targeted: "border-[#61afef]/50 bg-[#61afef]/10 text-[#61afef]",
  adds: "border-[#c678dd]/50 bg-[#c678dd]/10 text-[#c678dd]",
};

/** The same six as plain colours, for anything that cannot take a class. */
export const TAG_COLOR: Record<MechTag, string> = {
  raid: "#e06c75", tank: "#d19a66", shared: "#e5c07b",
  pattern: "#98c379", targeted: "#61afef", adds: "#c678dd",
};

export interface Mechanic {
  id: string;
  /** The name on the cast bar, which is what people search for. */
  name: string;
  /**
   * When it resolves, for finding it against a video or a log.
   *
   * Separate from the cast because those are different moments and a raid calls
   * both: "the cast is at 0:05" is when to press mitigation, "it lands at 0:10"
   * is when to already be standing somewhere.
   */
  at?: string;
  /** When the cast begins, where there is one. */
  cast?: string;
  /**
   * What to do, in one or two lines.
   *
   * Left out while the mechanic is only on the timeline. Plenty of a fight is
   * "an AoE lands, mitigate it" and needs no more than its name and its time;
   * the rest wants somebody who has actually done it to say how, and until they
   * have, an empty entry is more honest than an invented one.
   */
  what?: Text;
  /**
   * Why people die here.
   *
   * The most valuable line in any guide and the one almost nobody writes,
   * because the person writing it has already stopped dying to this and has
   * forgotten what was confusing. Ask somebody who wiped last night.
   */
  dies?: Text;
  /** What kind of skill this is, for the timeline. */
  tags?: MechTag[];
  /**
   * How it is resolved, if anybody has written that down yet.
   *
   * Absent means the skill is known and its strategy is not: it takes its place
   * on the timeline with its name, its time and its kind, and says plainly that
   * the detail is still to come. A fight can be laid out completely this way and
   * filled in mechanic by mechanic, which is the order the knowledge actually
   * arrives in.
   */
  variants?: Variant[];
  /** Six seconds, no sound, one mechanic. Served from /public. */
  clip?: string;
  image?: string;
}

export interface Phase {
  id: string;
  name: Text;
  /** What moves the fight into it: a percentage, a cast, a timer. */
  enter?: Text;
  note?: Text;
  mechanics: Mechanic[];
}

/** The eight marks, in the order the game lists them. */
export type Waymark = "A" | "B" | "C" | "D" | "1" | "2" | "3" | "4";

/**
 * The floor this fight happens on.
 *
 * Per fight, because no two are the same: a circle, a square, a square with the
 * corners cut off, a platform that loses a third of itself at fifty percent. And
 * the marks move with it — a set placed for one arena is meaningless in another,
 * and a guide that draws the wrong ones is worse than a guide that draws none,
 * because somebody will stand on them.
 */
export interface Arena {
  shape: "circle" | "square";
  /**
   * A picture of the real floor, drawn underneath the diagram.
   *
   * Optional and always optional: the mechanics are described in coordinates, so
   * everything works without it. It is there to make the arena recognisable at a
   * glance — the moment somebody sees the room they were standing in, they stop
   * translating the diagram and start reading it.
   */
  image?: string;
  /**
   * Tiles across, when the floor is visibly divided into them.
   *
   * Drawn faintly under everything else, because on an arena like this the tiles
   * are what a party actually calls out — "north-west tile", "two in from the
   * corner" — and a diagram that hides the grid makes people translate
   * coordinates back into it in their heads.
   */
  grid?: number;
  /**
   * Half the floor across, in the game's own units.
   *
   * Only needed to read a preset. The game writes marks as absolute map
   * coordinates and this is the one number that turns them into the arena's
   * own — measure it once by standing in the middle and walking to the wall.
   */
  radius?: number;
  /** Where the middle of the floor sits on the map, if not the usual 100, 100. */
  center?: { x: number; z: number };
  /** Where the marks are put for this fight. Left out means none are used. */
  waymarks?: Partial<Record<Waymark, Spot>>;
  /**
   * The sets a party might actually use.
   *
   * More than one because a fight rarely has only one: a group brings the
   * preset its strategy was written for, and a guide that draws somebody
   * else's marks is a guide that quietly moves every position in it. When
   * there is more than one the reader picks, and the diagram follows.
   */
  plans?: Plan[];
  /** Pictures for the markers, when there are any. See ICONS below. */
  icons?: Icons;
}

/** One mark of a preset, as the game writes it out. */
export interface PresetPoint {
  X: number;
  /** Height. Ignored: these diagrams are a floor plan. */
  Y?: number;
  Z: number;
  ID?: number;
  Active?: boolean;
}

/**
 * A waymark preset, in the shape the game's own exporters hand you.
 *
 * Taken verbatim on purpose. Somebody who has a set they like already has this
 * text in their clipboard, and asking them to convert eight pairs of numbers by
 * hand is asking them to make a mistake — the conversion is arithmetic, so the
 * computer does it. Field names are the game's: `One` through `Four` rather
 * than `1` through `4`, and `Active` marks the ones actually placed.
 */
export interface WaymarkPreset {
  Name?: string;
  MapID?: number;
  A?: PresetPoint; B?: PresetPoint; C?: PresetPoint; D?: PresetPoint;
  One?: PresetPoint; Two?: PresetPoint; Three?: PresetPoint; Four?: PresetPoint;
}

const PRESET_KEYS: [keyof WaymarkPreset, Waymark][] = [
  ["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"],
  ["One", "1"], ["Two", "2"], ["Three", "3"], ["Four", "4"],
];

/**
 * Game coordinates in, arena coordinates out.
 *
 * Two things are happening. The map's origin is somewhere off in the zone, so
 * the arena's middle is subtracted off; and the game's Z grows southward while
 * these diagrams have y growing north, so that axis flips. The scale is
 * whatever makes the wall land at ten.
 *
 * Marks that are switched off are left out rather than drawn at the origin,
 * which is where an unplaced mark's coordinates otherwise put it.
 */
export function fromPreset(
  preset: WaymarkPreset,
  arena: Pick<Arena, "radius" | "center">,
): Partial<Record<Waymark, Spot>> {
  const half = arena.radius ?? 20;
  const cx = arena.center?.x ?? 100;
  const cz = arena.center?.z ?? 100;
  const scale = ARENA_R / half;
  const out: Partial<Record<Waymark, Spot>> = {};
  for (const [field, mark] of PRESET_KEYS) {
    const p = preset[field] as PresetPoint | undefined;
    if (!p || typeof p !== "object" || p.Active === false) continue;
    out[mark] = {
      x: Math.round((p.X - cx) * scale * 100) / 100,
      y: Math.round((cz - p.Z) * scale * 100) / 100,
    };
  }
  return out;
}

/** One named set of marks a party might play with. */
export interface Plan {
  id: string;
  name: Text;
  /** Who uses it, or what it is for. */
  note?: Text;
  /** The preset, pasted in as the game exported it. */
  preset: WaymarkPreset;
}

/**
 * The marks to draw: the chosen plan, else the first one, else whatever the
 * arena spells out by hand. An arena with neither draws none, which is correct
 * for the fights that use none.
 */
export function planMarks(
  arena: Arena, planId?: string | null,
): Partial<Record<Waymark, Spot>> {
  const plans = arena.plans ?? [];
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  return plan ? fromPreset(plan.preset, arena) : (arena.waymarks ?? {});
}

/**
 * Pictures to use for the markers instead of the shapes drawn for them.
 *
 * Every one is optional and every one falls back: the drawn marker is rendered
 * first and the picture goes over it, so a file that is missing, slow or
 * mistyped leaves a diagram that still works rather than a diagram with holes
 * in it. A guide can override any of them; most will use the defaults.
 */
export interface Icons {
  waymarks?: Partial<Record<Waymark, string>>;
  boss?: string;
  slots?: Partial<Record<Slot, string>>;
}

/**
 * Where the shared marker art lives.
 *
 * Drop a PNG at each of these paths and every guide picks it up. Nothing has to
 * be edited to turn them on, and nothing breaks while they are missing.
 */
export const ICONS: Icons = {
  waymarks: Object.fromEntries(
    (["A", "B", "C", "D", "1", "2", "3", "4"] as Waymark[])
      .map((w) => [w, `/guides/icons/${w}.png`]),
  ) as Partial<Record<Waymark, string>>,
  boss: "/guides/icons/boss.png",
  slots: Object.fromEntries(
    (["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"] as Slot[])
      .map((s) => [s, `/guides/icons/${s}.png`]),
  ) as Partial<Record<Slot, string>>,
};

export interface Guide {
  slug: string;
  /** The duty as the game names it. */
  name: string;
  /** The boss, when that is a different word from the duty. */
  boss?: string;
  short?: string;
  category: "extreme" | "savage" | "ultimate";
  expansion: string;
  patch: string;
  arena: Arena;
  /**
   * Where the knowledge came from. Not optional: these guides are read from
   * somebody else's work and saying so is the price of using it.
   */
  source: { name: string; url: string };
  /** True while the mechanics are scaffolding rather than the real fight. */
  draft?: boolean;
  phases: Phase[];
}
