"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY } from "@/lib/gallery";
import GalleryGrid, { useGallery } from "@/components/gallery/GalleryGrid";
import GalleryUpload from "@/components/gallery/GalleryUpload";

/**
 * The gallery, while it is still admins only.
 *
 * The gate is a site setting rather than a rule in the database: everybody may
 * read the rows, and whether the page is linked and reachable is a decision the
 * FC can reverse from /admin without a migration. That does mean somebody who
 * guesses the URL and knows a post id could read one — these are screenshots
 * people chose to publish to their own FC, not secrets, and treating them as
 * secrets would have meant giving up the shareable link that is half the point.
 */
export default function GalleryPage({ openId }: { openId?: number | null }) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const { posts, authors, ready, reload } = useGallery();

  useEffect(() => {
    void (async () => {
      if (!supabase) { setAllowed(false); return; }
      const { data: setting } = await supabase
        .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY).maybeSingle();
      if ((setting as { value?: string } | null)?.value === "on") { setAllowed(true); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setAllowed(false); return; }
      const { data: prof } = await supabase
        .from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
      setAllowed(!!(prof as { is_admin?: boolean } | null)?.is_admin);
    })();
  }, [supabase]);

  if (allowed === null) {
    return <main className="pt-7 text-muted">{t("common.loading")}</main>;
  }
  if (!allowed) notFound();

  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent">
        {t("gallery.eyebrow")}
      </div>
      <h1 className="font-display text-3xl font-bold">{t("gallery.title")}</h1>
      <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        {t("gallery.intro")}
      </p>

      <div className="mt-5">
        <GalleryUpload onPosted={reload} />
      </div>

      {ready && (
        <GalleryGrid posts={posts} authors={authors} onChanged={reload}
                     initialOpen={openId ?? null} />
      )}
    </main>
  );
}
