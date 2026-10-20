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
/** The pasture's things. */
export const PASTURE_ART = {
  barn: "pa_barn", barnFront: ["pa_barn", "pa_barnFront1", "pa_barnFront2", "pa_barnFront3"],
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
/** The pasture's own sheet as it came (for a panel's picture of one of its pieces). */
let own: { image: string; size: [number, number]; props: Record<string, number[]>; scale?: Record<string, number> } | null = null;
/**
 * The pasture's sheet (public/town/pasture.json, the fc-cash-town skill's build-scenery.mjs with `--set pasture`),
 * fetched once per tab by whoever comes onto the farm and added to the town's scenery, as the lamps' and the works' are
 * (so its pieces are drawn by the same kit); null while there is none (the stand-ins are drawn then).
 */
export function loadPastureArt(): Promise<SceneryKit | null> {
  sheet ??= (async () => {
    try {
      const into = await loadScenery();
      const r = await fetch("/town/pasture.json");
      if (!r.ok) return null;
      const json = await r.json() as Parameters<SceneryKit["add"]>[0] & { image: string; size: [number, number]; props: Record<string, number[]>; scale?: Record<string, number> };
      const img = await new Promise<HTMLImageElement>((ok, no) => {
        const i = new Image();
        i.decoding = "async";
        i.onload = () => ok(i);
        i.onerror = () => no(new Error("pasture picture did not load"));
        i.src = `/town/${json.image}`;
      });
      into.add(json, img);
      own = json;
      return into;
    } catch { return null; }
  })();
  return sheet;
}
/**
 * How much larger than its kind's pictures a piece of the pasture's sheet is drawn (1 for most): a sheet cut on a finer
 * grid drew its animal in more pixels, and a young one the model drew as large as a grown one is drawn smaller.
 */
export const pastureScale = (name: string): number => own?.scale?.[name] ?? 1;
/** A picture of the pasture's sheet for a panel (a talk's portrait, a card), or null while there is none. */
export function pastureSprite(kit: SceneryKit | null, name: string): Sprite | null {
  const p = kit && own?.props[name];
  return p && own ? { src: `/town/${own.image}`, sheet: own.size, at: [p[0], p[1], p[2], p[3]] } : null;
}
