import type { Metadata } from "next";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
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
interface Profile {
  character_name?: string | null;
  display_name?: string | null;
  discord_username?: string | null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const fallback: Metadata = { title: "Gallery — Cafe And SHabu" };
  if (!supabase) return fallback;

  // The author comes along so the card can be headed by a person rather than
  // by boilerplate. credited_name wins outright when it is set: a picture an
  // admin put up for somebody is that person's picture, and the uploading
  // account is a record rather than a byline.
  //
  // The relationship is named in full because there are two of them. A post
  // reaches profiles directly through author_id, and again through gallery_likes
  // — everybody who ever pressed popoto on it. PostgREST will not guess between
  // the two: it answered 300 and the whole select failed, which is why every
  // gallery link in Discord had lost its picture and was showing the site's own
  // description instead. Nothing to do with the post; the query never returned.
  const { data } = await supabase
    .from("gallery_posts")
    .select("image_url, caption, width, height, character_id, credited_name, image_count, profiles!gallery_posts_author_id_fkey(character_name, display_name, discord_username)")
    .eq("id", Number(id) || -1)
    .maybeSingle();
  const post = data as {
    image_url?: string; caption?: string | null;
    width?: number | null; height?: number | null;
    credited_name?: string | null; image_count?: number | null;
    profiles?: Profile | Profile[] | null;
  } | null;
  if (!post?.image_url) return fallback;

  // An embedded relation comes back as an object or as a one-element array
  // depending on the PostgREST version, and getting it wrong here would only
  // show up as a card quietly missing its name.
  const prof: Profile | null = Array.isArray(post.profiles)
    ? post.profiles[0] ?? null
    : post.profiles ?? null;
  const who = post.credited_name
    ?? prof?.character_name
    ?? prof?.display_name
    ?? prof?.discord_username
    ?? null;

  // The heading names who it is by; the caption is what they actually wrote and
  // belongs in the body, where Discord gives it room and does not shorten it to
  // a single bold line.
  const title = who ? `${who} · Cafe And SHabu` : "Cafe And SHabu — Gallery";
  const extra = (post.image_count ?? 1) > 1
    ? `${post.image_count} pictures` : null;
  const description = [post.caption?.trim() || null, extra]
    .filter(Boolean).join(" · ")
    || "A screenshot from the Cafe And SHabu gallery";

  // One picture goes as itself: it is larger and sharper than any card drawn
  // around it, and cropping somebody's screenshot to fit a frame would be a
  // strange thing to do to the thing they wanted shown. Several go as a collage,
  // because an embed shows one image and a post of eight deserves better than
  // its first one standing in for the rest.
  const many = (post.image_count ?? 1) > 1;
  const image = many
    ? { url: `/gallery/${id}/opengraph-image`, width: 1200, height: 630 }
    : {
        url: post.image_url,
        width: post.width ?? undefined,
        height: post.height ?? undefined,
      };

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Cafe And SHabu",
      images: [{ ...image, alt: post.caption ?? undefined }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image", title, description, images: [image.url],
    },
  };
}

export default async function Page(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // The same gallery, opened on this picture — so closing it leaves you
  // somewhere useful rather than on a dead end.
  const data = raw as unknown as BoardData;
  return (
    <GalleryPage
      openId={Number(id) || null}
      memberOptions={data.members.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar ?? null }))}
    />
  );
}
