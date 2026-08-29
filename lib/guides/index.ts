import type { Guide } from "./types";
import { m9s } from "./m9s";

/**
 * Every guide the site has, and the shelves they sit on.
 *
 * A plain array rather than a database: a guide is a thing one person writes and
 * everybody reads, it changes when somebody edits a file, and it wants to be
 * reviewed in a pull request rather than in a form. The pages built from these
 * are static, so a guide costs nothing to serve however many people read it.
 */
export const GUIDES: Guide[] = [m9s];

export const CATEGORIES = ["extreme", "savage", "ultimate"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  extreme: "Extreme", savage: "Savage", ultimate: "Ultimate",
};

/** Newest first, because the tier people are on is the one they are reading about. */
export const EXPANSIONS = ["Dawntrail"] as const;

export const guideBySlug = (slug: string) =>
  GUIDES.find((g) => g.slug === slug) ?? null;

export const guidesIn = (expansion: string, category: Category) =>
  GUIDES.filter((g) => g.expansion === expansion && g.category === category);
