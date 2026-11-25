import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import GuideScreen from "@/components/guides/GuideScreen";

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
  const { data } = await supabase.from("guides").select("name, short")
    .eq("slug", slug.slice(0, 40)).maybeSingle();
  const g = data as { name?: string; short?: string | null } | null;
  if (!g?.name) return fallback;
  return { title: `${g.short ? `${g.short} — ` : ""}${g.name} · Cafe And SHabu` };
}

export default async function Page(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return <GuideScreen slug={slug.slice(0, 40)} />;
}
