import type { Metadata } from "next";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import GalleryPage from "@/components/gallery/GalleryPage";
import { everyone } from "@/lib/people";

/**
 * One contest, by link: the gallery, opened on that contest.
 *
 * Its own address rather than /gallery?contest=12 for the metadata, which is
 * built on the server for the same reason the gallery's is: a link pasted
 * into Discord is read by an unfurler that runs no JavaScript, and a contest
 * announced with a link should arrive as its name and poster rather than as
 * the site's own description. Drafts are not sent to a reader with no session
 * (v98), so a draft's link unfurls as the plain page and opens the gallery.
 *
 * The picture is opengraph-image beside this file — the poster with the name,
 * the stage and the dates set beside it — so none is named here.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = { title: "Glamour Contest — Cafe And SHabu" };
  const supabase = await createClient();
  if (!supabase) return fallback;

  const { data } = await supabase.from("contests")
    .select("title, body")
    .eq("id", Number(id) || -1)
    .maybeSingle();
  const c = data as { title?: string; body?: string | null } | null;
  if (!c?.title) return fallback;

  const title = `${c.title} · Cafe And SHabu`;
  const description = c.body?.trim().slice(0, 200) || "Glamour contest — Cafe And SHabu";
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = raw as unknown as BoardData;
  return <GalleryPage contestId={Number(id) || null} memberOptions={everyone(data)} />;
}
