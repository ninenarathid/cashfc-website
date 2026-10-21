/**
 * The garden's ground an animal out of its barn may roam (the owner, 2026-10-22: "ช่วยทำให้ สัตว์เดินออกไปที่แปลงผักมากขึ้น
 * ตอนนี้เหมือนเดินเฉพาะทางเดิน ช่วยทำให้เดินมั่วเลย เดินเข้าไปในแปลงผักด้วยก็ได้"): every tile of the garden a walker may
 * stand on as it is laid out, beds and all, but for the lamps' posts and braziers (only drawn: members walk through them,
 * an animal goes round). Laid into lib/town/pasture when this is imported, since pasture cannot import world or lamps;
 * whoever places the animals imports it (components/town/TownPasture, and the tests).
 */
import { LAMPS } from "./lamps";
import { roamGarden } from "./pasture";
import { FARM, placeOf, thingAt } from "./world";

const lit = new Set([...LAMPS.maps.farm.fires, ...LAMPS.maps.farm.posts].map(([x, y]) => `${x},${y}`));
const free = new Uint8Array(FARM.w * FARM.h);
for (let y = FARM.y; y < FARM.y + FARM.h; y++) for (let x = FARM.x; x < FARM.x + FARM.w; x++)
  free[(y - FARM.y) * FARM.w + x - FARM.x] = placeOf(x, y) === "farm" && thingAt(x, y) === null && !lit.has(`${x},${y}`) ? 1 : 0;

/** Whether an animal may stand on a tile of the garden (as it was laid out when the page began: what members build later does not move it). */
export const gardenFree = (x: number, y: number): boolean =>
  x >= FARM.x && x < FARM.x + FARM.w && y >= FARM.y && y < FARM.y + FARM.h && free[(y - FARM.y) * FARM.w + x - FARM.x] === 1;

roamGarden(gardenFree);
