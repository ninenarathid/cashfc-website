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
/**
 * Whether they are on its back now: while they walk or stand. Sat down (a bench, a table of the yard, the ground),
 * they have got off, and the stag stands by like any familiar.
 */
export const rides = (pet: string | null | undefined, sitting: boolean): boolean => hasStag(pet) && !sitting;
/** How many times as fast somebody walks for their familiar: twice, with a stag to ride; as anybody, with any other or none. */
export const paceOf = (pet: string | null | undefined): number => (hasStag(pet) ? STAG_PACE : 1);
