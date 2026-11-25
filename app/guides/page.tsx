import type { Metadata } from "next";
import GuideShelf from "@/components/guides/GuideShelf";
import { guideDuties } from "@/lib/guides/duties";

export const metadata: Metadata = { title: "Guides — Cafe And SHabu" };

/**
 * The shelf. Guides live in the database (v344) and are read in the browser,
 * where the session decides whether drafts come with them.
 */
export default function GuidesPage() {
  // The duties' banners, so a guide's card wears its fight's picture the way
  // a party does on the party finder.
  return <GuideShelf duties={guideDuties()} />;
}
