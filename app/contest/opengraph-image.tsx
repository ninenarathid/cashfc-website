import { contestCard, plainCard, renderContestCard } from "@/lib/contest-card";

/**
 * /contest, as Discord draws it: the newest contest anybody may see, which is
 * the one the page opens on. See lib/contest-card.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A glamour contest at Cafe And SHabu";
// With no id in the address this would be drawn once, at build, and show that
// day's contest until the next deploy. Drawn again at most every ten minutes
// instead, so it catches up with the stage and the count the same evening.
export const revalidate = 600;

export default async function Image() {
  const card = await contestCard("current");
  return card ? renderContestCard(card) : plainCard();
}
