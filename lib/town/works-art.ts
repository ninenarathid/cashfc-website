"use client";

import { loadScenery, type SceneryKit } from "./scenery";

let works: Promise<SceneryKit> | null = null;

/**
 * The village's works' own pictures (public/town/works.json, from the fc-cash-town skill's build-scenery.mjs with
 * `--set works`): the pile of stone by the uncle's shop, the same pile under its cloth, a stone as it is carried in
 * two hands, and the sign at the bridge's foot (`stonePile`, `stonePileCloth`, `stoneHeld`, `bridgeSign`); and what
 * its building is seen by: the mark on the road where a row would stand and the banner at the foot (`standMark`,
 * `bridgeBanner`), the stones of the course that grows at the foot with its scaffold, hoist and arch (`courseA` to
 * `courseC`, `siteScaffold`, `siteHoist`, `siteArch`), what a stone may have in it and a glint (`findShell`,
 * `findCoin`, `findRune`, `findPearl`, `findStar`, `findLeaf`, `glint`), and a span's feast (`feastBunting`,
 * `feastLantern`, `feastConfetti`, `feastWreath`). A picture
 * of their own, fetched once per tab by whoever is shown the works and added to the scenery, as the forest's is: so
 * the town's own picture is as it was, and nobody the game is shut to pays for it. Gives the scenery it was added to.
 */
export function loadWorksArt(): Promise<SceneryKit> {
  works ??= (async () => {
    const into = await loadScenery();
    const r = await fetch("/town/works.json");
    if (!r.ok) throw new Error(`works.json ${r.status}`);
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
  works.catch(() => { works = null; });
  return works;
}
