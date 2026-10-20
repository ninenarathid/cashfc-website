import { loadScenery, type SceneryKit, type Sprite } from "./scenery";

/**
 * Every picture of the pasture, by one name each: the ONE mapping the art piece drops its pictures into
 * (docs/plans/animals/ART-NEEDED.md lists them all, with sizes, frames and facings). Until a picture is in the
 * pasture's sheet (public/town/pasture.json, made by the fc-cash-town skill's scenery script as `--set pasture`), the
 * page draws a plain stand-in for it (components/town/pasture-draw.ts, each marked `// ART:`).
 *
 * The names:
 * - an animal: `an_<breed>_<stage>_<facing>_<frame>` for a grown one of a breed, `an_<species>_<stage>_<facing>_<frame>`
 *   for the young (a baby and a young one look alike within a species, whatever their breed);
 * - the pasture's things: `pa_<thing>`; Uncle Popoto on the map `pp_<frame>`, in a talk `tk_popoto` / `tk_popoto_o`;
 * - the three games' scenes and pieces: `mg_<game>_<piece>`;
 * - an item's icon: the item's own id in the icon atlas (lib/town/icon-atlas.json), as every item's is.
 */
export type Facing = "SE" | "SW" | "NE" | "NW";
export type AnimalFrame = "idle" | "walk1" | "walk2" | "eat" | "sleep" | "happy" | "swim";
export type ArtStage = "baby" | "young" | "adult";

/** An animal's picture: the breed's own when grown, the species' while young. */
export function animalSprite(species: string, breed: string, stage: ArtStage, facing: Facing, frame: AnimalFrame): string {
  return stage === "adult" ? `an_${breed}_adult_${facing}_${frame}` : `an_${species}_${stage}_${facing}_${frame}`;
}
/** A sheep that has been shorn (its fleece grows back over its round): its own pictures, by breed. */
export const shornSprite = (breed: string, facing: Facing, frame: AnimalFrame) => `an_${breed}_shorn_${facing}_${frame}`;
/**
 * A grown male of a breed (a rooster, a drake, a ram, a bull: the owner, 2026-10-20, sexes chosen at the stall): its own
 * pictures; the young of either sex look alike. A shorn ram is `an_<breed>_male_shorn_<facing>_<frame>`.
 */
export const maleSprite = (breed: string, facing: Facing, frame: AnimalFrame, shorn = false) => `an_${breed}_male_${shorn ? "shorn_" : ""}${facing}_${frame}`;
/** The pasture's things. */
export const PASTURE_ART = {
  // (a barn of the animal farm, 8 x 4 tiles, its walls and roof as seen from outside: the old barn's picture fits it; its
  // inside, its open door and its fronts as the next art round draws them, lib/town/pasture's BARNS)
  barn: "pa_barn", barnFront: ["pa_barn", "pa_barnFront1", "pa_barnFront2", "pa_barnFront3"],
  barnInside: "pa_barnInside", barnDoorOpen: "pa_barnDoorOpen", farmGate: "pa_farmGate", penFence: "pa_penFence",
  coop: "pa_coop", nursery: "pa_nursery",
  trough: "pa_trough", troughFed: "pa_troughFed", villageTrough: "pa_villageTrough",
  nest: "pa_nest", nestEgg: "pa_nestEgg",
  stall: "pa_stall", table: "pa_table",
  gateShut: "pa_gateShut", gateOpen: "pa_gateOpen",
  wagon: "pa_wagon", wagonStop: "pa_wagonStop", ox: ["pa_ox_walk1", "pa_ox_walk2", "pa_ox_idle"],
  eggOutside: "pa_eggOutside", eggGlint: "pa_eggGlint",
  forage: "pa_forage", forageTaken: "pa_forageTaken",
  bubbleHungry: "pa_bubbleHungry", bubbleReady: "pa_bubbleReady", bubbleReadyMilk: "pa_bubbleReadyMilk", bubbleReadyWool: "pa_bubbleReadyWool", bubbleCare: "pa_bubbleCare",
  ram: ["pa_ram_walk1", "pa_ram_walk2", "pa_ram_idle"],
  harpNotes: "pa_harpNotes", windGust: "pa_windGust",
} as const;
/**
 * How each building's picture stands on its footprint (lib/town/pasture's BARN, COOP, NURSERY): `corner` is the front
 * corner of its walls' foot (the footprint's lowest point on the screen) from the picture's ground point, in its own
 * pixels, and `base` how wide its walls' foot is from the left corner to the right; the map draws it at the scale that
 * makes that the footprint's width. Measured on the pictures (the README's "The pasture"); a front is the barn repainted.
 */
export const BUILDING_FIT: Readonly<Record<string, { corner: readonly [number, number]; base: number }>> = {
  pa_barn: { corner: [80, 0], base: 458 }, pa_barnFront1: { corner: [80, 0], base: 458 }, pa_barnFront2: { corner: [80, 0], base: 458 }, pa_barnFront3: { corner: [80, 0], base: 458 },
  pa_coop: { corner: [55, -3], base: 263 }, pa_nursery: { corner: [12, 0], base: 152 },
};
/**
 * How large the pasture's things are drawn: map pixels to one of their own, each to the size ART-NEEDED gives it (a
 * trough two tiles long, the nest a tile, the stall three tiles across, the wagon about 70 long). The model drew them at
 * its own pixel size, so these lie between the dolls' 0.67 and the town's buildings' 1.
 */
export const PROP_K: Readonly<Record<string, number>> = {
  pa_trough: 0.9, pa_troughFed: 0.9, pa_villageTrough: 0.9, pa_nest: 0.6, pa_nestEgg: 0.6, pa_stall: 0.7, pa_table: 0.6,
  pa_wagon: 0.6, pa_wagonStop: 0.55, pa_gateShut: 1.1, pa_gateOpen: 1.1, pa_eggOutside: 0.45, pa_forageTaken: 0.45,
  pa_bubbleHungry: 1, pa_bubbleReady: 1, pa_bubbleReadyMilk: 1, pa_bubbleReadyWool: 1, pa_bubbleCare: 1,
  pp_stand: 0.8, pp_wave: 0.8, pp_show: 0.8, pp_laugh: 0.8,
  pa_ox_idle: 0.5, pa_ox_walk1: 0.5, pa_ox_walk2: 0.5, pa_ram_idle: 0.5, pa_ram_walk1: 0.5, pa_ram_walk2: 0.5,
};
/**
 * A barn's one trough (lib/town/pasture's troughOf: half a tile an end, a whole tile a slot), in pieces the art round
 * draws to be laid end to end along the back wall, each standing by its middle on the wall's foot: the left end, the
 * right end, an empty slot, and a slot with a species' sack in it, half or full. The names are the art round's to
 * settle; the page draws its stand-in while the sheet has none.
 */
export const TROUGH_ART = {
  left: "pa_troughLeft", right: "pa_troughRight", empty: "pa_troughSlot",
  feed: (species: string, level: "half" | "full") => `pa_troughSlot_${species}_${level}`,
} as const;
/** Uncle Popoto on the map, his round of frames (as the uncle's: standing, waving, holding up a chick, laughing). */
export const POPOTO_FRAMES = ["pp_stand", "pp_wave", "pp_show", "pp_laugh"] as const;
export const POPOTO_TALK: [quiet: string, talking: string] = ["tk_popoto", "tk_popoto_o"];
/**
 * The three games' pictures: each its own scene (a 4:3 window of its middle is the board) and its pieces on the icon
 * template's grid. The animal on a board is its breed's own picture (a Highland cow is milked as herself), so the games
 * have no cow, hen or sheep of their own.
 */
export const GAME_ART = {
  milk: { scene: "mg_milk_barn", machine: "mg_milk_machine", handleUp: "mg_milk_handleUp", handleDown: "mg_milk_handleDown", pail: ["mg_milk_pail", "mg_milk_pailHalf", "mg_milk_pailFull"], gauge: "mg_milk_gauge", needle: "mg_milk_needle", splash: "mg_milk_splash" },
  eggs: { scene: "mg_eggs_coop", box: "mg_eggs_box", egg: "mg_eggs_egg", basket: "mg_eggs_basket", crack: "mg_eggs_crack", straw: "mg_eggs_straw" },
  shear: { scene: "mg_shear_pen", shears: "mg_shear_shears", nick: "mg_shear_nick", tuft: "mg_shear_tuft" },
} as const;

let sheet: Promise<SceneryKit | null> | null = null;
type PastureJson = Parameters<SceneryKit["add"]>[0] & { image: string; size: [number, number]; props: Record<string, number[]>; scale?: Record<string, number> };
/** The pasture's own sheets as they came (for a panel's picture of one of its pieces, and each piece's scale). */
const own: PastureJson[] = [];
/**
 * The pasture's animals, a picture a species (build-scenery.mjs `--set pasture-<species>`: every look in two views with
 * its loops would be one picture too large for a phone to draw from).
 */
const ANIMAL_SHEETS = ["pasture-chicken", "pasture-duck", "pasture-sheep", "pasture-cow"] as const;
async function fetchSheet(file: string): Promise<{ json: PastureJson; img: HTMLImageElement } | null> {
  const r = await fetch(`/town/${file}.json`);
  if (!r.ok) return null;
  const json = await r.json() as PastureJson;
  const img = await new Promise<HTMLImageElement>((ok, no) => {
    const i = new Image();
    i.decoding = "async";
    i.onload = () => ok(i);
    i.onerror = () => no(new Error(`${file} picture did not load`));
    i.src = `/town/${json.image}`;
  });
  return { json, img };
}
/**
 * The pasture's sheets (public/town/pasture.json and pasture-<species>.json, the fc-cash-town skill's build-scenery.mjs
 * with `--set pasture` and `--set pasture-<species>`), fetched once per tab by whoever comes onto the farm and added to
 * the town's scenery, as the lamps' and the works' are (so their pieces are drawn by the same kit); null while there is
 * none (the stand-ins are drawn then). A species' sheet that is not there yet leaves its animals to the stand-ins.
 */
export function loadPastureArt(): Promise<SceneryKit | null> {
  sheet ??= (async () => {
    try {
      const into = await loadScenery();
      const [main, ...animals] = await Promise.all(["pasture", ...ANIMAL_SHEETS].map((f) => fetchSheet(f).catch(() => null)));
      if (!main) return null;
      for (const s of [main, ...animals]) if (s) { into.add(s.json, s.img); own.push(s.json); }
      return into;
    } catch { return null; }
  })();
  return sheet;
}
/**
 * How much larger than its kind's pictures a piece of the pasture's sheets is drawn (1 for most): a sheet cut on a finer
 * grid drew its animal in more pixels, and a young one the model drew as large as a grown one is drawn smaller.
 */
export const pastureScale = (name: string): number => own.find((j) => j.scale?.[name])?.scale?.[name] ?? 1;
/** A picture of the pasture's sheets for a panel (a talk's portrait, a card), or null while there is none. */
export function pastureSprite(kit: SceneryKit | null, name: string): Sprite | null {
  const j = kit ? own.find((x) => x.props[name]) : undefined, p = j?.props[name];
  return p && j ? { src: `/town/${j.image}`, sheet: j.size, at: [p[0], p[1], p[2], p[3]] } : null;
}

/* ── round 2: every look in two views, its walk and its idle as loops ──
 *
 * The owner, 2026-10-20: "ช่วยใช้ pixellab ในการทำท่า idle ของทุกสัตว์ ทุกช่วงวัย และ ตอนหันหน้าหันหลัง animation ตอนเดิน ด้วย", and
 * a male of each breed drawn as his own. A look's pictures (the pasture-<species> sheets) are named
 * `<prefix>_<SE|NE>_<walk|idle>_<i>`, where the prefix is the look's:
 *   an_<breed>_adult  a grown female            an_<breed>_male        a grown male (rooster, drake, ram, bull)
 *   an_<breed>_shorn  a shorn ewe               an_<breed>_male_shorn  a shorn ram
 *   an_<species>_baby, an_<species>_young  the young, alike whatever their breed or sex     pa_ram  the cloud ram
 * SE faces the viewer to the lower right, NE turns its back to the upper right; SW and NW are those mirrored. Round 1's
 * names (`<prefix>_<SE|NE>_idle`, `_walk1`, `_walk2`) are kept on the same pictures, and its eat, sleep, happy and swim
 * stay where they were drawn (`<prefix>_SE_<pose>`).
 */
export type ArtView = "SE" | "NE";
export type ArtAction = "idle" | "walk" | "eat" | "sleep" | "happy" | "swim";
export interface AnimalArtAsk {
  species: string; breed: string; stage: ArtStage;
  /** Its sex ("m" a rooster, drake, ram or bull once grown); a female's pictures when not said. */
  sex?: "m" | "f";
  /** A sheep shorn, its fleece not grown back. */
  shorn?: boolean;
  /** The way it faces: SE and SW toward the viewer, NE and NW away; W is drawn mirrored. */
  facing: Facing;
  action: ArtAction;
  /** The clock the loops run by (ms); give each animal its own offset so a herd does not step as one. */
  now: number;
}
/** How long each picture of a loop is shown (ms): a bird's quick step, a cow's slow one; a breath. */
export const LOOP_MS: { walk: Readonly<Record<string, number>>; idle: number } = { walk: { chicken: 110, duck: 120, sheep: 140, cow: 170 }, idle: 260 };
/**
 * The looks an animal may be drawn as, the nearest first (the coordinator's order, 2026-10-20: a back view missing is the
 * front, a male missing is the female, a shorn one missing is the fleeced): a grown male shorn, then his fleeced self, then
 * the ewe shorn and fleeced; the young by their species and stage alone.
 */
export function lookPrefixes(a: Pick<AnimalArtAsk, "species" | "breed" | "stage" | "sex" | "shorn">): string[] {
  if (a.stage !== "adult") return [`an_${a.species}_${a.stage}`];
  const female = a.shorn ? [`an_${a.breed}_shorn`, `an_${a.breed}_adult`] : [`an_${a.breed}_adult`];
  return a.sex === "m" ? [...(a.shorn ? [`an_${a.breed}_male_shorn`] : []), `an_${a.breed}_male`, ...female] : female;
}
/**
 * The picture to draw an animal with now: its own look if drawn, else the nearest (lookPrefixes); its view if drawn,
 * else SE; the loop's picture for the moment `now`, or for a pose with no loop (eat, sleep, happy, swim) round 1's
 * picture of it, else the animal standing. `mirror` when it faces west. Null while no sheet has the animal (its stand-in).
 */
export function animalFrame(kit: SceneryKit | null, a: AnimalArtAsk): { name: string; mirror: boolean } | null {
  if (!kit) return null;
  const view: ArtView = a.facing === "NE" || a.facing === "NW" ? "NE" : "SE", mirror = a.facing === "SW" || a.facing === "NW";
  const views: ArtView[] = view === "NE" ? ["NE", "SE"] : ["SE"];
  const loop = (prefix: string, v: ArtView, act: "walk" | "idle") => {
    const n = ANIMAL_LOOPS[prefix]?.[v]?.[act];
    if (!n) return null;
    const ms = act === "walk" ? LOOP_MS.walk[a.species] ?? 130 : LOOP_MS.idle, name = `${prefix}_${v}_${act}_${Math.floor(a.now / ms) % n}`;
    return kit.has(name) ? name : null;
  };
  for (const prefix of lookPrefixes(a)) for (const v of views) {
    if (a.action === "walk" || a.action === "idle") { const name = loop(prefix, v, a.action) ?? loop(prefix, v, "idle"); if (name) return { name, mirror }; }
    else {
      const pose = `${prefix}_${v}_${a.action}`;
      if (kit.has(pose)) return { name: pose, mirror };
    }
    // (round 1's names, for a look drawn before the loops)
    for (const old of a.action === "walk" ? [`${prefix}_${v}_walk1`, `${prefix}_${v}_idle`] : [`${prefix}_${v}_idle`]) if (kit.has(old)) return { name: old, mirror };
  }
  // a pose with no picture of its own: the animal standing (the page draws the pose's sign about it)
  return a.action === "idle" ? null : animalFrame(kit, { ...a, action: "idle" });
}
/**
 * The barn's one trough, laid end to end from pieces (the pasture sheet, pasture-trough.mjs; the names are
 * TROUGH_ART's: pa_troughLeft, pa_troughRight, pa_troughSlot, pa_troughSlot_<species>_<half|full>). Every piece stands
 * on its place's point (where the compartment's front wall meets the floor, at its middle). A trough of n places: place
 * i's point is the first's moved i steps (`step`, in the pieces' own pixels, so `step` times the scale on the map: up
 * to the right as drawn, mirrored for a trough the other way); each place's slot is drawn at its point, the left end at
 * the first place's and the right end at the last's, the ends after the slots. At `k` map pixels a picture pixel a
 * place is one tile long (a tile's step along the row is 32 x -16 map px; the pieces' is 32 x -16.8, so lay them by
 * their own step, not the tiles'). The trough is about half a tile deep, from its front wall back to the wall it stands
 * against.
 */
export const TROUGH_FIT = { step: [38, -20] as const, k: 0.842 } as const;

// ── built: what each look has drawn (pasture-frames.mjs --table writes this; do not edit by hand) ──
export const ANIMAL_LOOPS: Readonly<Record<string, Partial<Record<ArtView, Partial<Record<"walk" | "idle", number>>>>>> = {
  an_barnHen_adult: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_barnHen_male: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_chicken_baby: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_chicken_young: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_cow_baby: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_cow_young: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_dairyCow_adult: { SE: { walk: 4, idle: 1 }, NE: { walk: 4, idle: 1 } },
  an_dairyCow_male: { SE: { walk: 4, idle: 1 }, NE: { walk: 4, idle: 1 } },
  an_duck_baby: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_duck_young: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_meadowSheep_adult: { SE: { walk: 4, idle: 4 }, NE: { walk: 4, idle: 4 } },
  an_meadowSheep_male: { SE: { walk: 4, idle: 4 }, NE: { walk: 4, idle: 4 } },
  an_puddleDuck_adult: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_puddleDuck_male: { SE: { walk: 4, idle: 5 }, NE: { walk: 4, idle: 5 } },
  an_sheep_baby: { SE: { walk: 4, idle: 4 }, NE: { walk: 4, idle: 4 } },
  an_sheep_young: { SE: { walk: 4, idle: 4 }, NE: { walk: 4, idle: 4 } },
};
// ── end built ──
