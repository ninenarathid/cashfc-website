import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import GalleryPage from "@/components/gallery/GalleryPage";

/**
 * One picture, by link.
 *
 * The metadata is what a Discord paste actually shows, and it is built on the
 * server so the unfurler — which runs no JavaScript and holds no session — gets
 * a real title and a real image instead of the empty shell a client-rendered
 * page would hand it. summary_large_image is the card type that gives a
 * screenshot the width it deserves rather than a thumbnail beside a paragraph.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const fallback: Metadata = { title: "Gallery — Cafe And SHabu" };
  if (!supabase) return fallback;

  const { data } = await supabase
    .from("gallery_posts")
    .select("image_url, caption, width, height, character_id")
    .eq("id", Number(id) || -1)
    .maybeSingle();
  const post = data as {
    image_url?: string; caption?: string | null;
    width?: number | null; height?: number | null;
  } | null;
  if (!post?.image_url) return fallback;

  const title = post.caption?.trim() || "Cafe And SHabu — Gallery";
  return {
    title,
    description: "Posted to the Cafe And SHabu gallery",
    openGraph: {
      title,
      description: "Posted to the Cafe And SHabu gallery",
      images: [{
        url: post.image_url,
        width: post.width ?? undefined,
        height: post.height ?? undefined,
      }],
      type: "article",
    },
    twitter: { card: "summary_large_image", title, images: [post.image_url] },
  };
}

export default async function Page(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // The same gallery, opened on this picture — so closing it leaves you
  // somewhere useful rather than on a dead end.
  return <GalleryPage openId={Number(id) || null} />;
}
