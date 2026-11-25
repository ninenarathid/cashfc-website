import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import GuideScreen from "@/components/guides/GuideScreen";
import { guideDuties } from "@/lib/guides/duties";

/**
 * One guide, by its address.
 *
 * The title is read on the server so a link pasted into Discord arrives as the
 * fight's name. Only a published guide has one to give: a draft is not sent to
 * a reader with no session (v344), so its link unfurls as the plain page.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const fallback: Metadata = { title: "Guide — Cafe And SHabu" };
  const supabase = await createClient();
  if (!supabase) return fallback;
  const { data } = await supabase.from("guides").select("name, short, req_level, req_ilvl, req_party")
    .eq("slug", slug.slice(0, 40)).maybeSingle();
  const g = data as { name?: string; short?: string | null; req_level?: number | null; req_ilvl?: number | null; req_party?: number | null } | null;
  if (!g?.name) return fallback;
  const title = `${g.short ? `${g.short} — ` : ""}${g.name} · Cafe And SHabu`;
  // The line under the picture in a Discord channel: what it is and what it asks.
  const description = [
    g.req_level ? `Lv ${g.req_level}` : null, g.req_ilvl ? `IL ${g.req_ilvl}+` : null,
    g.req_party ? `${g.req_party} คน` : null].filter(Boolean).join(" · ");
  // Named by hand as the party page does, so Discord draws the large picture.
  const image = `/guides/${encodeURIComponent(slug.slice(0, 40))}/opengraph-image`;
  return {
    title, description,
    openGraph: { title, description, type: "article", images: [{ url: image, width: 1200, height: 630, alt: g.name }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function Page(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  // The party finder's fights, for the editor's "which fight" and nothing
  // else: a reader never sees the list, only the button it leads to.
  return <GuideScreen slug={slug.slice(0, 40)} duties={guideDuties()} />;
}
