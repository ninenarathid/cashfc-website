import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import GalleryPage from "@/components/gallery/GalleryPage";

export const metadata = { title: "Gallery — Cafe And SHabu" };

export default function Page() {
  // Names only, from the roster already baked into the build: an admin posting
  // on somebody's behalf needs to find them, and shipping the whole members
  // file to the browser to do it would cost half a megabyte.
  const data = raw as unknown as BoardData;
  const memberOptions = data.members.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar ?? null }));
  return <GalleryPage memberOptions={memberOptions} />;
}
