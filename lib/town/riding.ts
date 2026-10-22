/**
 * Riding a moss stag (the forest's sixth rank: lib/town/gifts' famStag; the owner's ladder of 2026-10-07: "ridden on
 * every map, twice as fast"). A familiar that follows is told to the room by its gift's name (lib/town/session's
 * `pet`), and each page walks everybody it draws by itself: so the one fact the room has, that a stag follows
 * somebody, is all that is needed for every page to walk them at a rider's pace and draw them on its back. A walk is
 * told as where it goes, never as steps, and whoever hears it walks the rider there at the same pace as the rider's
 * own page does: they arrive on every screen when they arrive on their own.
 *
 * Pure, and with nothing brought in (the room's own code reads it, on every page of the site a stay in town lasts
 * over): the stag's number is written here and held to the gift's by riding.test.ts. Nothing of the game is judged
 * here: where somebody stands is theirs to say, as it always was.
 */
export const STAG = "famStag";
/** How many times as fast a stag's rider walks: the gift's own number (lib/town/gifts: `by`). */
export const STAG_PACE = 2;
/** Whether somebody whose familiar the room was told of has a stag to ride. */
export const hasStag = (pet: string | null | undefined): boolean => pet === STAG;
/** Whether their familiar is one to ride: a moss stag or a cloud ram. */
export const hasSteed = (pet: string | null | undefined): boolean => hasStag(pet) || hasRam(pet);
/**
 * Whether they are on its back now: while they walk or stand, unless they have got down to walk beside it (`afoot`,
 * lib/town/room: what they told the room; the owner, 2026-10-22: "เมื่อใส่จะยังไม่ขี่ แต่มีปุ่ม hotkey ขึ้นมาให้กดขี่ได้").
 * Sat down (a bench, a table of the yard, the ground), they have got off, and the stag stands by like any familiar.
 * A browser older than getting down tells nothing of it, and rides as it always did.
 */
export const rides = (pet: string | null | undefined, sitting: boolean, afoot = false): boolean => hasSteed(pet) && !sitting && !afoot;
/** How many times as fast somebody walks for their familiar: twice, with a stag to ride; half as fast again on a cloud ram; as anybody, with any other or none, or walking beside it. */
export const paceOf = (pet: string | null | undefined, afoot = false): number => (afoot ? 1 : hasStag(pet) ? STAG_PACE : hasRam(pet) ? RAM_PACE : 1);

// ── the pasture ── (the cloud ram, the pasture's sixth rank: lib/town/gifts' famCloudRam; the owner: "เป็น สัตว์ขี่ เหมือน
// กวาง ความเร็วน้อยกว่ากวาง ซัก 150% ก็ได้ แต่นั่งได้สองคน")
export const RAM = "famCloudRam";
/** How many times as fast a cloud ram's rider walks: the gift's own number (held to it by riding.test.ts). */
export const RAM_PACE = 1.5;
export const hasRam = (pet: string | null | undefined): boolean => pet === RAM;
/**
 * The ram's second seat, as the room is told it by whoever sits there (lib/town/room's `seat`): "r:" and the rider's
 * id. Every page puts them where the rider is, behind them on its back, for as long as the rider rides; a rider who
 * has gone, got off or sat down lets them down where they are.
 */
export const ramSeat = (rider: string) => `r:${rider}`;
export const riderOf = (seat: string | null | undefined): string | null => (seat && seat.startsWith("r:") ? seat.slice(2) || null : null);
/** The hay wagon's seat (lib/town/seats): "w:" and the run's id. */
export const wagonSeat = (run: string) => `w:${run}`;
export const runOf = (seat: string | null | undefined): string | null => (seat && seat.startsWith("w:") ? seat.slice(2) || null : null);
