import { GUIDE_CARD, renderShelfCard } from "@/lib/guide-card";

/** /guides, as Discord draws it: the title and the guides open to read. */
export const size = GUIDE_CARD;
export const contentType = "image/png";
export const alt = "Raid guides at Cafe And SHabu";
// Without an id this would be drawn once at build; a new guide should show.
export const revalidate = 600;

export default async function Image() {
  return renderShelfCard();
}
