"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY } from "@/lib/gallery";
import GalleryGrid, { LoadMore, useGallery } from "@/components/gallery/GalleryGrid";
import type { Roster } from "@/lib/gallery";
import type { MemberOption } from "@/components/gallery/MemberPicker";

/**
 * Somebody's own pictures, on their own page.
 *
 * Hidden entirely while the gallery is admins only, and hidden when they have
 * posted nothing — an empty "Screenshots" heading on four hundred member pages
 * would be worse than the feature not existing.
 */
export default function MemberGallery(
  { characterId, name, avatar, memberOptions = [] }:
  { characterId: number; name?: string; avatar?: string | null;
    memberOptions?: MemberOption[] },
) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const { posts, authors, counts, images, tagged, isAdmin, ready, hasMore, loading,
          loadMore, reload } = useGallery({ characterId });
  // Only one member appears on this page, so the roster it needs is one entry.
  const roster: Roster = name
    ? { [characterId]: { name, avatar: avatar ?? null } } : {};

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const { data: setting } = await supabase
        .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY).maybeSingle();
      setOpen((setting as { value?: string } | null)?.value !== "off");
    })();
  }, []);

  // Read at render rather than settled in the effect: the admin switch resolves
  // a moment later, and an effect with no dependencies would never hear about it.
  if (!(open || isAdmin) || !ready || posts.length === 0) return null;

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
                   images={images} tagged={tagged} roster={roster} memberOptions={memberOptions}
                   isAdmin={isAdmin} onChanged={reload} />
      <LoadMore onVisible={loadMore} active={hasMore && !loading} />
    </section>
  );
}
