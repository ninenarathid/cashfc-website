// Playing the town's games from a check script, by way of the handle each game leaves for scripts in `next dev`
// (window.__townGame, components/town/TownGame): with a steady hand, or badly on purpose.
//
//   weeding   the patch (what stands in each place) and a touch            lib/town/weeding
//   timing    the round (where the marker is) and a press                  lib/town/timing   (tilling)
//   stirring  the pot, and a pace for the ladle to go round at by itself   lib/town/stirring
//   pouring   the water, the button held or not, and a hand that lets go at a share of the way between the marks
//   steady    the hands, a hand that holds over the middle by itself, and a shove
import { sleep, until } from "./cdp.mjs";

const G = "window.__townGame";
/** Which game is up, if one is. */
export const gameUp = (X) => X.evaluate(`${G}?.kind ?? null`);
/** Wait for a game to come up, and say which. */
export const awaitGame = (X, ms = 4000) => until("a game is up", () => gameUp(X), ms, 40);
/** Wait until no game is up. */
export const gameGone = (X, ms = 5000) => until("the game is gone", async () => (await gameUp(X)) === null, ms, 40);
/** What the game that is up has to show of itself. */
export const gameState = (X) => X.evaluate(`(() => { const g = ${G}; if (!g) return null;
  return g.kind === "weeding" ? { kind: g.kind, ...g.patch() } : g.kind === "timing" ? { kind: g.kind, ...g.round() } : { kind: g.kind, ...g.state() }; })()`);
/** The marks on the board: how many parts are done of how many, and how many misses tired hands have left (null where it cannot be lost). */
export const board = (X) => X.evaluate(`(() => { const b = document.querySelector("[data-town-game]"); if (!b) return null;
  const h = b.querySelector("[data-hits]"), m = b.querySelector("[data-misses-left]");
  return { hits: Number(h?.dataset.hits ?? -1), need: Number(h?.dataset.need ?? -1), left: m ? Number(m.dataset.missesLeft) : null, title: b.getAttribute("aria-label"), look: b.querySelector("[data-look]")?.dataset.look ?? null }; })()`);

/** Play whatever game is up with a steady hand, until it is gone. Says which game it was; null if none came up or it never ended. */
export async function play(X, ms = 60000) {
  const kind = await awaitGame(X).catch(() => null);
  if (!kind) return null;
  if (kind === "stirring") await X.evaluate(`${G}.drive(0.9)`);
  if (kind === "steady") await X.evaluate(`${G}.hold(true)`);
  if (kind === "pouring") await X.evaluate(`${G}.steady(0.5)`);
  // (a roast: the stick is turned as each face turned to the fire is done, and at once when the next would burn)
  if (kind === "roasting") {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const done = await X.evaluate(`(() => { const g = ${G}; if (!g || g.kind !== "roasting") return true;
        const r = g.roast(), d = g.done(); if (r.faces[r.down] >= d + 0.04) g.turn(); return false; })()`);
      if (done) return kind;
      await sleep(25);
    }
    return null;
  }
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const done = await X.evaluate(`(() => { const g = ${G}; if (!g || g.kind !== ${JSON.stringify(kind)}) return true;
      if (g.kind === "timing") { const r = g.round(); if (r.at > r.lo + r.width * 0.2 && r.at < r.lo + r.width * 0.8) g.press(); }
      else if (g.kind === "weeding" && !g.stirring()) { const i = g.patch().cells.findIndex((c) => c?.kind === "weed"); if (i >= 0) g.touch(i); }
      return false; })()`);
    if (done) return kind;
    await sleep(8);
  }
  return null;
}

/** Make one miss at the game that is up, on purpose. Says whether one was made. */
export async function fumble(X) {
  const kind = await gameUp(X);
  if (kind === "weeding") return X.evaluate(`(() => { const g = ${G}, p = g.patch(), i = p.cells.findIndex((c) => c?.kind === "stone"); g.touch(i >= 0 ? i : p.cells.findIndex((c) => c === null)); return true; })()`);
  if (kind === "timing") {
    return until("the marker is well away from the stretch", () => X.evaluate(`(() => { const g = ${G}; if (!g || g.kind !== "timing") return true; const r = g.round();
      if (r.at < r.lo - 0.08 || r.at > r.lo + r.width + 0.08) { g.press(); return true; } return false; })()`), 5000, 20);
  }
  if (kind === "pouring") {
    // held a moment and let go far short of the marks
    const was = (await gameState(X)).misses;
    await X.evaluate(`${G}.hold(true)`);
    await sleep(120);
    await X.evaluate(`${G}.hold(false)`);
    return until("a pour that fell short", async () => { const s = await gameState(X); return !s || s.misses > was; }, 3000, 30);
  }
  if (kind === "steady") {
    // shoved out of the ring and left there
    const was = (await gameState(X)).misses;
    await X.evaluate(`${G}.shove(1.3, 0)`);
    return until("a hand left outside the ring", async () => { const s = await gameState(X); return !s || s.kind !== "steady" || s.misses > was; }, 4000, 40);
  }
  if (kind === "stirring") {
    const was = (await gameState(X)).misses;
    await X.evaluate(`${G}.drive(3.2)`);
    const r = await until("a pot stirred too fast", async () => { const s = await gameState(X); return !s || s.misses > was; }, 6000, 40);
    await X.evaluate(`${G}?.drive?.(0.9)`);
    return r;
  }
  return false;
}
