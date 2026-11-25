import { catalogue } from "@/lib/party";
import { partySeeds } from "@/lib/party-seeds";
import type { DutyOption } from "@/lib/guides";

/** The kinds a guide is written for: fights with a strategy, not map runs. */
const KINDS = new Set(["extreme", "savage", "ultimate", "chaotic", "alliance", "criterion"]);

/**
 * The duties a guide can be tied to, in the party finder's own words and keys.
 *
 * Built from the same seeds the party page builds its picker from, so a
 * guide's duty is always one the party finder knows and the two pages match
 * on a key rather than on a name somebody typed.
 */
export function guideDuties(): DutyOption[] {
  const seeds = partySeeds();
  return catalogue(seeds)
    .filter((c) => KINDS.has(c.kind))
    .map((c) => ({
      key: c.key,
      label: [c.badge && c.badge !== c.name ? c.badge : null, c.name].filter(Boolean).join(" · "),
    }));
}
