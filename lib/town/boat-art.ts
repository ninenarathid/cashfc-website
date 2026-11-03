import { loadScenery, type SceneryKit } from "./scenery";

/**
 * The lotus-leaf boat's own pictures (the owner, 2026-11-04: "Gen ภาพใหม่"): public/town/boat.json, the fc-cash-town skill's
 * build-scenery.mjs `--set boat`, fetched the first time a dock or a boat is drawn. `boatLeaf` at rest, `boatLeafSail`
 * the same leaf with its petal sail open (pixel for pixel the same hull), `boatJetty` and `boatSign` at a dock,
 * `boatPads` and `boatLotus` about the anchor. Each stands on its own lowest row.
 */

/** Map pixels to one of its own: the dolls' own 0.67, as it was drawn beside them. */
export const BOAT_K = 0.67;
/** How far above its lowest row (the leaf's near rim) the middle of the leaf is, in its own pixels: where the boat's point is. */
export const BOAT_MID = 37;
/** How far up off the water whoever is aboard stands, in map pixels: on the leaf, inside its rim. */
export const BOAT_LIFT = 2;
/** The boat's gentle rise and fall on the water, in map pixels, by the wall clock (so a boat and whoever is in it rise together on every page). */
export const boatBob = (ms: number, still: boolean) => (still ? 0 : Math.round(Math.sin(ms / 600)));

let sheet: Promise<SceneryKit | null> | null = null, kit: SceneryKit | null = null;
/** The boat's sheet added to the town's scenery; null while it comes, or when it cannot be had (the code's drawing stands in). */
export function boatKit(): SceneryKit | null {
  sheet ??= (async () => {
    try {
      const into = await loadScenery();
      const r = await fetch("/town/boat.json");
      if (!r.ok) return null;
      const json = await r.json();
      const img = await new Promise<HTMLImageElement>((ok, no) => {
        const i = new Image();
        i.decoding = "async";
        i.onload = () => ok(i);
        i.onerror = () => no(new Error("boat picture did not load"));
        i.src = `/town/${json.image}`;
      });
      into.add(json, img);
      kit = into;
      return into;
    } catch { return null; }
  })();
  return kit;
}
