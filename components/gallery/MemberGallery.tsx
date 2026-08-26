"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY } from "@/lib/gallery";
import GalleryGrid, { LoadMore, useGallery } from "@/components/gallery/GalleryGrid";

/**
 * Somebody's own pictures, on their own page.
 *
 * Hidden entirely while the gallery is admins only, and hidden when they have
 * posted nothing — an empty "Screenshots" heading on four hundred member pages
 * would be worse than the feature not existing.
 */
export default function MemberGallery({ characterId }: { characterId: number }) {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);
  const { posts, authors, counts, isAdmin, ready, hasMore, loading, loadMore, reload } =
    useGallery({ characterId });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data: setting } = await supabase
        .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY).maybeSingle();
      if ((setting as { value?: string } | null)?.value !== "off") { setVisible(true); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: prof } = await supabase
        .from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
      setVisible(!!(prof as { is_admin?: boolean } | null)?.is_admin);
    })();
  }, []);

  if (!visible || !ready || posts.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex flex-wrap items-baseline gap-3 font-display text-lg font-semibold">
        {t("gallery.byMember")}
        <Link href="/gallery"
              className="text-[12.5px] font-normal text-accent no-underline hover:underline">
          {t("nav.gallery")} →
        </Link>
      </h2>
      <GalleryGrid posts={posts} authors={authors} counts={counts}
                   isAdmin={isAdmin} onChanged={reload} />
      <LoadMore onVisible={loadMore} active={hasMore && !loading} />
    </section>
  );
}
