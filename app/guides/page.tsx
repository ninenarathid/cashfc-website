import type { Metadata } from "next";
import GuideShelf from "@/components/guides/GuideShelf";
import { guideDuties } from "@/lib/guides/duties";

const TITLE = "ไกด์คอนเทนต์ — Cafe And SHabu";
const DESCRIPTION = "ไกด์ Extreme / Savage / Ultimate ตำแหน่งยืนตาม role ภาษาไทยและอังกฤษ";
// Named by hand as the party page does, so Discord draws the large picture.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE, description: DESCRIPTION, type: "website",
    images: [{ url: "/guides/opengraph-image", width: 1200, height: 630, alt: "Raid guides at Cafe And SHabu" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/guides/opengraph-image"] },
};

/**
 * The shelf. Guides live in the database (v344) and are read in the browser,
 * where the session decides whether drafts come with them.
 */
export default function GuidesPage() {
  // The duties' banners, so a guide's card wears its fight's picture the way
  // a party does on the party finder.
  return <GuideShelf duties={guideDuties()} />;
}
