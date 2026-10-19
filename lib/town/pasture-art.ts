import { SceneryKit, type Sprite } from "./scenery";

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
  bubbleHungry: "pa_bubbleHungry", bubbleReady: "pa_bubbleReady", bubbleCare: "pa_bubbleCare",
  ram: ["pa_ram_walk1", "pa_ram_walk2", "pa_ram_idle"],
  harpNotes: "pa_harpNotes", windGust: "pa_windGust",
} as const;
/** Uncle Popoto on the map, his round of frames (as the uncle's: standing, waving, holding up a chick, laughing). */
export const POPOTO_FRAMES = ["pp_stand", "pp_wave", "pp_show", "pp_laugh"] as const;
export const POPOTO_TALK: [quiet: string, talking: string] = ["tk_popoto", "tk_popoto_o"];
/** The three games' pictures. */
export const GAME_ART = {
  milk: { scene: "mg_milk_barn", cow: "mg_milk_cow", cowShift: "mg_milk_cowShift", pail: "mg_milk_pail", handleL: "mg_milk_handleL", handleR: "mg_milk_handleR", gauge: "mg_milk_gauge", needle: "mg_milk_needle", splash: "mg_milk_splash" },
  eggs: { scene: "mg_eggs_coop", box: "mg_eggs_box", hen: "mg_eggs_hen", egg: "mg_eggs_egg", basket: "mg_eggs_basket", crack: "mg_eggs_crack", straw: "mg_eggs_straw" },
  shear: { scene: "mg_shear_pen", sheep: "mg_shear_sheep", fleece: "mg_shear_fleece", shears: "mg_shear_shears", nick: "mg_shear_nick", tuft: "mg_shear_tuft" },
} as const;

let sheet: Promise<SceneryKit | null> | null = null;
/**
 * The pasture's sheet, fetched once per tab by whoever comes onto the farm; null while there is none (the stand-ins
 * are drawn then). A sheet that comes later is used the next time a page is loaded.
 */
export function loadPastureArt(): Promise<SceneryKit | null> {
  sheet ??= (async () => {
    try {
      const r = await fetch("/town/pasture.json", { cache: "force-cache" });
      if (!r.ok) return null;
      const json = await r.json();
      const img = await new Promise<HTMLImageElement>((ok, no) => {
        const i = new Image();
        i.decoding = "async";
        i.onload = () => ok(i);
        i.onerror = () => no(new Error("pasture picture did not load"));
        i.src = `/town/${json.image}`;
      });
      return new SceneryKit(json, img);
    } catch { return null; }
  })();
  return sheet;
}
/** A picture of the sheet for a panel (a talk's portrait, a card), or null while there is none. */
export function pastureSprite(kit: SceneryKit | null, name: string): Sprite | null {
  if (!kit?.has(name)) return null;
  const json = (kit as unknown as { json: { image: string; size: [number, number]; props: Record<string, number[]> } }).json;
  const p = json?.props?.[name];
  return p ? { src: `/town/${json.image}`, sheet: json.size, at: [p[0], p[1], p[2], p[3]] } : null;
}
