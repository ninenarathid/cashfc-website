import { contestCard, plainCard, renderContestCard } from "@/lib/contest-card";

/** A contest's link, as Discord draws it. See lib/contest-card. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A glamour contest at Cafe And SHabu";

export default async function Image(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const card = await contestCard(Number(id));
  return card ? renderContestCard(card) : plainCard();
}
