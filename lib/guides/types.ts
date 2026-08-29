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

export const SLOTS: Slot[] = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"];

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
  /** What this beat is. "1 — วางลำแสง", "2 — รวมกลาง". */
  label: string;
  /** What is happening, for everybody. */
  say: string;
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
  per?: Partial<Record<Slot, string>>;
  /** Said when somebody answers wrongly — the correction, not just a cross. */
  wrong?: string;
}

export interface Variant {
  id: string;
  /** What tells you it is this one. "Left arm glows", "towers spawn north". */
  tell: string;
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
export type MechTag =
  | "aoe" | "tankbuster" | "spread" | "stack"
  | "tower" | "cleave" | "adds" | "memo" | "enrage";

export const TAG_LABEL: Record<MechTag, string> = {
  aoe: "AoE ทั้งสนาม", tankbuster: "Tankbuster", spread: "แยก", stack: "รวม",
  tower: "หอคอย", cleave: "หลบทิศ", adds: "มอนเสริม",
  memo: "ต้องจำ", enrage: "Enrage",
};

/** Chip colours, reusing the palette the rest of the site already reads by. */
export const TAG_TONE: Record<MechTag, string> = {
  aoe: "border-chili/50 bg-chili/10 text-chili",
  tankbuster: "border-steel/50 bg-steel/10 text-steel",
  spread: "border-copper/50 bg-copper/10 text-copper",
  stack: "border-jade/50 bg-jade/10 text-jade",
  tower: "border-gold/50 bg-gold/10 text-gold",
  cleave: "border-[#a87fd8]/50 bg-[#a87fd8]/10 text-[#c0a2e6]",
  adds: "border-[#6aa84f]/50 bg-[#6aa84f]/10 text-[#93c47d]",
  memo: "border-accent/50 bg-accent/10 text-accent",
  enrage: "border-chili bg-chili/20 text-chili",
};

export interface Mechanic {
  id: string;
  /** The name on the cast bar, which is what people search for. */
  name: string;
  /** Roughly when, for finding it against a video or a log. */
  at?: string;
  /** What to do, in one or two lines. */
  what: string;
  /**
   * Why people die here.
   *
   * The most valuable line in any guide and the one almost nobody writes,
   * because the person writing it has already stopped dying to this and has
   * forgotten what was confusing. Ask somebody who wiped last night.
   */
  dies: string;
  /** What kind of skill this is, for the timeline. */
  tags?: MechTag[];
  variants: Variant[];
  /** Six seconds, no sound, one mechanic. Served from /public. */
  clip?: string;
  image?: string;
}

export interface Phase {
  id: string;
  name: string;
  /** What moves the fight into it: a percentage, a cast, a timer. */
  enter?: string;
  note?: string;
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
  /** Where the marks are put for this fight. Left out means none are used. */
  waymarks?: Partial<Record<Waymark, Spot>>;
  /** Pictures for the markers, when there are any. See ICONS below. */
  icons?: Icons;
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
