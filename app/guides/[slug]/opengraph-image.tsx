import { GUIDE_CARD, renderGuideCard } from "@/lib/guide-card";

/** A guide, as Discord draws it when the link is pasted. See lib/guide-card. */
export const size = GUIDE_CARD;
export const contentType = "image/png";
export const alt = "A raid guide at Cafe And SHabu";
// Drawn again at most every ten minutes, so an edit shows on the next share.
export const revalidate = 600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderGuideCard(slug);
}
