import { BOAT_K, BOAT_MID, boatBob, boatKit } from "@/lib/town/boat-art";
import type { BOAT_ROUTES } from "@/lib/town/lotus-boats";
import type { Vec } from "@/lib/town/world";
import type { FarmFrame } from "./TownFarm";

/**
 * The lotus-leaf boat on the forest's map (lib/town/boat-art's pictures; the code's own drawing only while they come):
 * at every dock its jetty out over the water and its sign behind, lotus pads about the anchor in the stream, and each
 * boat on the water with its petal sail furled at rest and open while it sails, rising and falling a pixel.
 */
type Route = (typeof BOAT_ROUTES)[number];

/** A dock's jetty and sign, and the lotus about its anchor, laid among the map's things by depth. */
export function drawBoatDock(f: FarmFrame, r: Route, dock: Vec, anchor: Vec) {
  const { ctx, s, things } = f, kit = boatKit(), k = BOAT_K * s;
  if (!kit?.has("boatJetty")) {
    // (the stand-in: a plank and its post)
    things.push({ depth: r.dock[0] + r.dock[1] + .9, draw: () => { ctx.fillStyle = "#544331"; ctx.fillRect(Math.round(dock.x - 6 * s), Math.round(dock.y - 9 * s), Math.round(12 * s), Math.round(3 * s)); ctx.fillStyle = "#b69b64"; ctx.fillRect(Math.round(dock.x - 5 * s), Math.round(dock.y - 10 * s), Math.round(10 * s), Math.max(1, Math.round(s))); } });
    return;
  }
  // the jetty under whoever stands on the dock, half a tile out towards the anchor; the sign at the dock's back corner
  const out = { x: dock.x + (anchor.x - dock.x) * 0.16, y: dock.y + (anchor.y - dock.y) * 0.16 };
  things.push({ depth: r.dock[0] + r.dock[1] + 0.4, draw: () => kit.drawProp(ctx, "boatJetty", out.x, out.y + 14 * s, k * 0.8) });
  things.push({ depth: r.dock[0] + r.dock[1] + 0.15, draw: () => kit.drawProp(ctx, "boatSign", dock.x - 22 * s, dock.y - 4 * s, k * 0.62) });
  // the lotus about the anchor, flat on the water (under everything that floats there)
  things.push({ depth: r.anchor[0] + r.anchor[1] - 0.6, draw: () => { kit.drawProp(ctx, "boatPads", anchor.x + 34 * s, anchor.y + 6 * s, k * 0.55); kit.drawProp(ctx, "boatLotus", anchor.x - 38 * s, anchor.y - 8 * s, k * 0.5); } });
}

/** A boat at its point on the water (the middle of its leaf): its sail open while it sails. */
export function drawLotusBoat(ctx: CanvasRenderingContext2D, c: Vec, s: number, sailing: boolean, now: number, still: boolean, light?: FarmFrame["light"]) {
  const kit = boatKit(), bob = boatBob(Date.now(), still) * s;
  // a ring going out on the water about it, and a short wake while it sails
  const ring = still ? 0.4 : (now / 1400) % 1;
  ctx.save();
  ctx.strokeStyle = `rgba(225,245,240,${(0.45 * (1 - ring)).toFixed(3)})`;
  ctx.lineWidth = Math.max(1, s);
  ctx.beginPath(); ctx.ellipse(c.x, c.y + 6 * s, (44 + 14 * ring) * s, (16 + 5 * ring) * s, 0, 0, Math.PI * 2); ctx.stroke();
  if (sailing && !still) for (let n = 0; n < 3; n++) { const d = ((now / 500 + n / 3) % 1); ctx.fillStyle = `rgba(220,245,238,${(0.55 * (1 - d)).toFixed(3)})`; ctx.fillRect(Math.round(c.x - (30 + 26 * d) * s), Math.round(c.y + (10 + 8 * d) * s), Math.round((10 - 4 * d) * s), Math.max(1, Math.round(s))); }
  ctx.restore();
  if (kit?.has("boatLeaf")) {
    const k = BOAT_K * s;
    kit.drawProp(ctx, sailing ? "boatLeafSail" : "boatLeaf", c.x, c.y + BOAT_MID * k + bob, k);
    // (its lotus bud lantern lights a little at night)
    light?.(c.x - 56 * k, c.y - 36 * k + bob, 26, "255,170,200", 0.5);
    return;
  }
  // the stand-in while the pictures come: the leaf as the code drew it before
  ctx.fillStyle = "#335847"; ctx.beginPath(); ctx.ellipse(c.x, c.y + bob, 40 * s, 17 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#68955c"; ctx.beginPath(); ctx.ellipse(c.x, c.y - 2 * s + bob, 36 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#9daf70"; ctx.beginPath(); ctx.ellipse(c.x, c.y - 2 * s + bob, 26 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
}
