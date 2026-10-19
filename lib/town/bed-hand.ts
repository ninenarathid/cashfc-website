/**
 * A bed's owner's say over it (the owner, 2026-10-19: "ช่วยทำให้แปลงปลูกผัก เจ้าของสามารถจัดการได้ ย้ายสิทธิให้คนอื่น
 * (คนนั้นต้องมีไม่เกิน 2 หลังจากแลก) ยกเลิกแปลงตัวเองได้ ผักทั้งหมด จะหายไป ขึ้นเตือนก่อนด้วย ให้กด ยืนยันทุกครั้ง
 * เพราะเป็นคำสั่ง สำคัญ"; and, asked: the plants go with a bed handed on, it is handed to somebody standing near, and a
 * house in a bed given up goes back into its owner's bag).
 *
 * - **Handing a bed on** (`giveBed`): my bed, to another member who stands near me (BED_NEAR: the page's to hold to,
 *   as a deal's opening is) and holds fewer than BEDS.each other beds, so as many as that at the most after it. Every
 *   plant in it and its insect house become theirs, each kept as it is but for whose it is (`by`: its Quality, its
 *   house's keep and the rest go with it); the bed is theirs from that moment, tended then.
 * - **Giving a bed up** (`leaveBed`): my bed; every plant in it is gone, each plot left as its soil is; its insect house
 *   lifted into my bag, as a hoe lifts it (the insects in its rooms fly off: refused while the bag has no room for it);
 *   and the bed is nobody's.
 * Neither costs stamina; each is asked twice on the page (TownBedHand). The database does the same (v288:
 * town_bed_give, town_bed_leave), which is what counts.
 */
import { BEDS, ownerOf, type Bed, type Plot } from "./farm";
import { put, roomFor, type Purse } from "./trade";
import { bedOf } from "./world";

/** How near (tiles, either way) somebody stands for a bed to be handed to them: as near as a deal is opened from. */
export const BED_NEAR = 3;
/** Why a bed was not handed on or given up: nobody to hand it to, not my bed, they hold as many as one may, no room in my bag for its house. */
export type BedRefusal = "none" | "theirs" | "beds" | "full";
type No = { ok: false; why: BedRefusal };
const no = (why: BedRefusal): No => ({ ok: false, why });

/** The plots of a bed, by their keys, of the plots told. */
const ofBed = (bed: number, plots: Readonly<Record<string, Plot>>) =>
  Object.entries(plots).filter(([key]) => { const [x, y] = key.split(",").map(Number); return bedOf(x, y) === bed; });
/** How many plants a bed has: one for a plant over several plots (its root's). */
export const plantsIn = (bed: number, plots: Readonly<Record<string, Plot>>) =>
  ofBed(bed, plots).filter(([key, p]) => !!p.plant && (!p.plant.root || p.plant.root === key)).length;
/** Whether a bed has an insect house standing in it. */
export const houseIn = (bed: number, plots: Readonly<Record<string, Plot>>) => ofBed(bed, plots).some(([, p]) => !!p.house);

/** Hand my bed on to `to`, who holds `toHolds` other beds now. Gives the bed as it is then, and its plots that changed. */
export function giveBed(bed: number, kept: Bed | undefined, plots: Readonly<Record<string, Plot>>, me: string, to: string | null, toHolds: number, now: number):
  { ok: true; bed: Bed; plots: Record<string, Plot> } | No {
  const mine = ofBed(bed, plots), planted = mine.some(([, p]) => !!p.plant);
  if (bed < 0 || !to || to === me) return no("none");
  if (ownerOf(kept, planted, now) !== me) return no("theirs");
  if (toHolds >= BEDS.each) return no("beds");
  const changed: Record<string, Plot> = {};
  for (const [key, p] of mine) {
    if (!p.plant && !p.house) continue;
    changed[key] = { ...p, ...(p.plant ? { plant: { ...p.plant, by: to } } : {}), ...(p.house ? { house: { ...p.house, by: to } } : {}) };
  }
  return { ok: true, bed: { by: to, tended: now, empty: planted ? 0 : now }, plots: changed };
}

/** Give my bed up. Gives my purse (its house back in the bag, if it had one) and its plots that changed. */
export function leaveBed(bed: number, kept: Bed | undefined, plots: Readonly<Record<string, Plot>>, purse: Purse, me: string, now: number):
  { ok: true; purse: Purse; plots: Record<string, Plot> } | No {
  const mine = ofBed(bed, plots), planted = mine.some(([, p]) => !!p.plant);
  if (bed < 0) return no("none");
  if (ownerOf(kept, planted, now) !== me) return no("theirs");
  const house = mine.some(([, p]) => !!p.house);
  if (house && roomFor(purse.bag, "insectHouse") < 1) return no("full");
  const changed: Record<string, Plot> = {};
  for (const [key, p] of mine) {
    if (p.house) changed[key] = { soil: "tilled", plant: null };
    else if (p.plant) changed[key] = { ...p, plant: null };
  }
  return { ok: true, purse: house ? { ...purse, bag: put(purse.bag, "insectHouse", 1) } : purse, plots: changed };
}
