import atlas from "./icon-atlas.json";
import { ANIMAL_ITEMS, ANIMAL_SCROLL_ITEMS, BREED_SCROLL_ITEMS, FAMILY } from "./animal-items";

/**
 * ART: what the pasture's things are drawn with until their own icons are in the atlas (the art piece makes them:
 * docs/plans/animals/ART-NEEDED.md, "Icons"). Each stands in by an icon of a thing like it (every egg the egg, every
 * milk the milk, a sack the sack), so that no slot, card or button of the line is ever an empty square meanwhile.
 * An id the atlas has is its own picture, always.
 */
const ICONS = atlas.icons as Record<string, unknown>;
const BY_ID: Record<string, string> = {
  cream: "milk", butter: "cheese", farmCheese: "cheese", yarn: "thingSack", woolScarf: "thingSack", rainbowScarf: "thingSack", starScarf: "thingSack", goldenScarf: "thingSack",
  prism: "crystalLens", chickFeed: "thingSack", duckFeed: "thingSack", sheepFeed: "thingSack", cowFeed: "thingSack",
  chickGrow: "bottle", duckGrow: "bottle", lambGrow: "bottle", calfGrow: "bottle", dewGrow: "bowl", packedRation: "thingSack",
  milker: "bucket", woolShears: "shears", eggBasket: "basket", churn: "bucketIron", cheesePress: "cheese", spindle: "floatQuill", knittingNeedles: "floatQuill",
  // the gifts of the line (lib/town/gifts)
  charmHerdBell: "charmBell", thingBarnCat: "thingBasket", thingWarmBottle: "bottle", charmStarCollar: "charmGloves", thingCradle: "basket",
  famCloudRam: "famCloud", thingTwinCradle: "thingBasket", thingHarp: "thingFlute", thingSpringWind: "charmWind", thingHayWagon: "waterCart", cowBell: "charmBell",
};
const FAMILY_ICON: Record<string, string> = { egg: "egg", milk: "milk", wool: "feather", cheese: "cheese" };
const WILD = "clover";
/** The icon a thing of the pasture is drawn with: its own once the atlas has it, else its stand-in; any other thing, its own. */
export function animalIcon(id: string): string {
  if (id in ICONS) return id;
  if (BY_ID[id] && BY_ID[id] in ICONS) return BY_ID[id];
  if (id === "wool") return "feather";
  if (FAMILY[id] && FAMILY_ICON[FAMILY[id]]) return FAMILY_ICON[FAMILY[id]];
  if (id in ANIMAL_SCROLL_ITEMS || id in BREED_SCROLL_ITEMS) return "scroll";
  const it = (ANIMAL_ITEMS as Record<string, { kind: string }>)[id];
  if (it?.kind === "wild") return WILD;
  if (it?.kind === "dish") return "bowl";
  return id;
}
