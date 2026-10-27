/**
 * The Popoto Casino as a room of the town (the owner, 2026-10-27: "สามารถเดินผ่านแมพเข้าไปในเกมเลยได้ไหม โดยไม่ต้องเปลี่ยน
 * url", the door "โรงเก็บของ kura ก็ได้"): the casino's own interior (lib/town/casino-map, 16 × 12 tiles, five machines
 * along its back wall, the stools before them, the sofa, the counter), laid far off in the same tile space as the
 * clothes shop is (lib/town/shop-room), so that which map somebody is on is where they stand. In by the kura's door in
 * the editor's town (lib/town/town2's T2_CASINO_DOOR), out by the carpet at the foot of the room, where the steps went
 * up to the old map's village.
 *
 * Who may go in is the database's (casino_live_settings.access, v299): nobody, the admins, or everybody; the page keeps
 * the door shut to whoever may not (lib/town/world's setCasinoDoor), and every spin is asked of the database again.
 */
import { CASINO_MACHINE_X, CASINO_MACHINE_Y, CASINO_MAP, CASINO_SPAWN, casinoWalkable } from "./casino-floor";
import { CASINO_FURNITURE } from "./casino-scenery";
import type { Vec } from "./world";

/** Where the room lies in the tile space: east of the clothes shop (320 to 330), clear of every other map. */
export const CASINO_ROOM = { x: 340, y: 112, w: CASINO_MAP.width, h: CASINO_MAP.height };
/** Whether a point is in the room. */
export const inCasino = (x: number, y: number) => x >= CASINO_ROOM.x && y >= CASINO_ROOM.y && x < CASINO_ROOM.x + CASINO_ROOM.w && y < CASINO_ROOM.y + CASINO_ROOM.h;
/** A point of the room's own (lib/town/casino-map's tiles) in the tile space, and back. */
export const casinoOut = (p: Vec): Vec => ({ x: CASINO_ROOM.x + p.x, y: CASINO_ROOM.y + p.y });
export const casinoIn = (p: Vec): Vec => ({ x: p.x - CASINO_ROOM.x, y: p.y - CASINO_ROOM.y });
/** Whether a tile of the room is open to stand on (the interior's own collision: the machines, the sofa, the counter, the plants). */
export const casinoOpen = (tx: number, ty: number) => inCasino(tx, ty) && casinoWalkable({ x: tx - CASINO_ROOM.x + 0.5, y: ty - CASINO_ROOM.y + 0.5 });

/** The stool before each machine, where one sits to play it (machine 1 to 5, left to right). */
export const CASINO_STOOLS: Vec[] = CASINO_MACHINE_X.map((x, i) => casinoOut({ x, y: CASINO_MACHINE_Y[i] + 1 }));
/** Which machine's stool a point is on (1 to 5), or 0. */
export const stoolAt = (p: Vec) => CASINO_STOOLS.findIndex((s) => Math.abs(s.x - p.x) < 0.1 && Math.abs(s.y - p.y) < 0.1) + 1;

/**
 * The sofas' places (the owner, 2026-10-27: "ช่วยทำให้ โซฟาในแมพ คาซิโน นั่งได้จริงด้วย"): three a sofa, each sat from the floor
 * before it (`stand`, where the walker stops: the sofa itself is not walked on) and drawn on its cushion (`at`), facing
 * the room; `sofa` is the sofa's place among the furniture, `depth` where the sitter is drawn, just over the sofa.
 */
export const CASINO_SOFA_SEATS = CASINO_FURNITURE.flatMap((f, sofa) => f.kind !== "sofa" ? [] : [0, 1, 2].map((i) => ({
  sofa, stand: casinoOut({ x: f.x + i + 0.5, y: f.y + f.h + 0.5 }), at: casinoOut({ x: f.x + i + 0.55, y: f.y + 1.2 }),
  depth: CASINO_ROOM.x + CASINO_ROOM.y + f.x + f.y + f.w + f.h - 0.4,
})));
/** Which sofa place a point is the standing spot of (1 on), or 0. */
export const sofaSeatAt = (p: Vec) => CASINO_SOFA_SEATS.findIndex((s) => Math.abs(s.stand.x - p.x) < 0.1 && Math.abs(s.stand.y - p.y) < 0.1) + 1;

/** The way out: the carpet at the room's foot, where the steps were; stepping onto it takes one back to the kura's door. */
export const CASINO_EXIT = { tiles: [[CASINO_ROOM.x + CASINO_MAP.width / 2, CASINO_ROOM.y + 11]] as Array<[number, number]>, at: casinoOut({ x: CASINO_MAP.width / 2 + .5, y: 11.7 }) };
/** Where one comes in: the interior's own spawn, two rows up from the way out, on the carpet. */
export const CASINO_IN: Vec = casinoOut(CASINO_SPAWN);
