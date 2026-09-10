import data from "@/data/housing.json";

/**
 * Where each housing plot is, on the map of its own district.
 *
 * Read from the game's own marker table by scripts/fetch-housing.mjs and
 * converted there to the coordinates the rest of this site speaks.
 *
 * Two maps per district. Plots 1 to 30 are the main ward and 31 to 60 are the
 * subdivision, which is a separate picture — a pin placed on the wrong one of
 * the two lands in a field. Every ward has the same sixty plots in the same
 * places, so the ward number decides which instance you walk into and nothing
 * about where on the map it is.
 */

export interface Plot {
  plot: number;
  /** The map picture this plot is on, main ward or subdivision. */
  map: string;
  size: number;
  x: number;
  y: number;
}

const DISTRICTS = (data as { districts: Record<string, Plot[]> }).districts;

/** How many wards each district has, for what the form will accept. */
export const WARDS: number = (data as { wards: number }).wards;

export const plotsIn = (district: string | undefined | null): Plot[] =>
  DISTRICTS[(district ?? "").trim()] ?? [];

export const plotAt = (
  district: string | undefined | null, plot: number | undefined | null,
): Plot | undefined =>
  plot == null ? undefined : plotsIn(district).find((p) => p.plot === plot);
