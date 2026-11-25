import type { Metadata } from "next";
import GuideShelf from "@/components/guides/GuideShelf";

export const metadata: Metadata = { title: "Guides — Cafe And SHabu" };

/**
 * The shelf. Guides live in the database (v344) and are read in the browser,
 * where the session decides whether drafts come with them.
 */
export default function GuidesPage() {
  return <GuideShelf />;
}
