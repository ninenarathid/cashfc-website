import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import GalleryPage from "@/components/gallery/GalleryPage";
import { everyone } from "@/lib/people";

export const metadata = { title: "Glamour Contest — Cafe And SHabu" };

/**
 * The contest that matters now, which is a view of the gallery (see
 * GalleryPage): the newest one this reader may see, or the gallery itself
 * when there is none — which is what a member sees until one is published.
 */
export default function Page() {
  const data = raw as unknown as BoardData;
  return <GalleryPage contestId="current" memberOptions={everyone(data)} />;
}
