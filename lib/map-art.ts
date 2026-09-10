import data from "@/data/map-art.json";

/**
 * Where a zone's map picture lives, and how to put a pin on it.
 *
 * The pictures stay on XIVAPI and are fetched by the browser when a party
 * actually draws one — six hundred zones at half a megabyte each is not
 * something to carry in a repository for the handful a board ever shows.
 * scripts/fetch-map-art.mjs keeps the two numbers you cannot work out without
 * the game files.
 */

interface Art { id: string; size: number }

const BASE = (data as { base: string }).base;
const ART = (data as { art: Record<string, Art> }).art;

export const mapArt = (zone: string | undefined | null): Art | undefined =>
  ART[(zone ?? "").trim()];

export const mapImage = (art: Art): string => `${BASE}${art.id}`;

/**
 * Where on the picture a coordinate lands, as a percentage.
 *
 * A zone's coordinates run from 1 to about 42 at a size factor of 100, and to
 * half that at 200 — which is why the factor is worth carrying: without it a
 * pin lands in the wrong half of every large zone.
 *
 * Clamped, because somebody typing 60 into a zone that stops at 42 should get
 * a pin on the edge rather than one floating outside the picture.
 */
export const pinAt = (coord: number, size: number): number =>
  Math.max(0, Math.min(100, (coord - 1) * (size / 100) / 41 * 100));

/**
 * And back: what somebody clicked, as a coordinate.
 *
 * The inverse of pinAt, to one decimal place, because that is the precision
 * the game itself reports and the precision people type into Discord. Any more
 * would be pretending a click on a 220-pixel picture knows where it is to a
 * hundredth of a malm.
 */
export const coordAt = (fraction: number, size: number): number =>
  Math.round((fraction * 41 / (size / 100) + 1) * 10) / 10;
