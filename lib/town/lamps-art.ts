"use client";

import { loadScenery, type SceneryKit } from "./scenery";

let lamps: Promise<SceneryKit> | null = null;

/**
 * The lamp relay's own pictures (public/town/lamps.json, from the fc-cash-town skill's build-scenery.mjs with
 * `--set lamps`): a wooden lamp post with its paper lantern dark and lit (`lampPost`, `lampPostLit`), the farm's
 * brazier cold and burning (`brazier`, `brazierLit`) and the board that stands by each fire (`lampBoard`); a flame
 * in a clay bowl as it is carried, and the embers of the ring round whoever bears one, glowing and burnt out
 * (`flameHeld`, `ember`, `emberOut`); what the night brings out: a moth with its wings open and half folded, a
 * firefly, a sky lantern (`moth`, `mothShut`, `firefly`, `skyLantern`), the evening flowers round a farm post shut
 * and open (`bloomShut`, `bloomOpen`), the mushrooms round a forest post plain and glowing, one glowing mushroom for
 * the trail and a wisp of the great tree's light (`shroom`, `shroomGlow`, `shroomOne`, `wisp`); and for the night
 * every lamp of a map is lit, a string of lanterns, one big lantern and a twinkle (`feteString`, `feteLantern`,
 * `twinkle`). A picture of their own, fetched once per tab by whoever is shown the lamps and added to the scenery, as
 * the works' is: so the town's own picture is as it was, and nobody the game is shut to pays for it. Gives the
 * scenery it was added to.
 */
export function loadLampsArt(): Promise<SceneryKit> {
  lamps ??= (async () => {
    const into = await loadScenery();
    const r = await fetch("/town/lamps.json");
    if (!r.ok) throw new Error(`lamps.json ${r.status}`);
    const json = await r.json() as Parameters<SceneryKit["add"]>[0];
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => ok(i);
      i.onerror = () => no(new Error(`${json.image} did not load`));
      i.src = `/town/${json.image}`;
    });
    into.add(json, img);
    return into;
  })();
  lamps.catch(() => { lamps = null; });
  return lamps;
}
