"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { postPath } from "@/lib/gallery";

interface Pending {
  postId: number;
  image: string;
  caption: string | null;
}

/**
 * Pictures somebody has put your name on, waiting for your answer.
 *
 * The tag exists the moment it is written, but the picture does not reach your
 * page until you say yes here. That is the whole reason confirmation exists:
 * being named in a screenshot is somebody else's decision, and whether it lives
 * on your page is yours.
 *
 * Silence is a valid answer. A tag left alone stays pending forever and the
 * picture stays off your page, so nobody has to be told to come and refuse it.
 */
export default function PendingTags() {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [mine, setMine] = useState<number | null>(null);
  const [rows, setRows] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) { setReady(true); return; }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setReady(true); return; }
    const { data: prof } = await supabase.from("profiles")
      .select("character_id, character_verified_at").eq("id", user.user.id).maybeSingle();
    const p = prof as {
      character_id?: number | null; character_verified_at?: string | null;
    } | null;
    // Unverified means there is nothing to answer for: the tag points at a
    // character nobody has proved is yours.
    if (!p?.character_id || !p.character_verified_at) { setReady(true); return; }
    setMine(p.character_id);

    const { data: tags } = await supabase.from("gallery_tags")
      .select("post_id").eq("character_id", p.character_id).is("confirmed_at", null);
    // One question per post, however many pins of you it holds.
    const ids = [...new Set((tags ?? []).map((r) => (r as { post_id: number }).post_id))];
    if (!ids.length) { setRows([]); setReady(true); return; }

    const { data: posts } = await supabase.from("gallery_posts")
      .select("id, image_url, caption").in("id", ids)
      .order("created_at", { ascending: false });
    setRows(((posts ?? []) as { id: number; image_url: string; caption: string | null }[])
      .map((r) => ({ postId: r.id, image: r.image_url, caption: r.caption })));
    setReady(true);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function answer(postId: number, yes: boolean) {
    if (!supabase || mine == null || busy) return;
    setBusy(true);
    if (yes) {
      await supabase.from("gallery_tags")
        .update({ confirmed_at: new Date().toISOString() })
        .eq("post_id", postId).eq("character_id", mine);
    } else {
      await supabase.from("gallery_tags")
        .delete().eq("post_id", postId).eq("character_id", mine);
    }
    setBusy(false);
    // Gone from the list either way — accepted tags belong on the member page
    // now, and refused ones no longer exist.
    setRows((v) => v.filter((r) => r.postId !== postId));
  }

  // Nothing to answer is the normal state, and an empty box on every profile
  // would be noise on a page that is already long.
  if (!ready || mine == null || rows.length === 0) return null;

  return (
    <section className="mt-3 rounded-xl border border-accent/40 bg-accent/5 p-4">
      <div className="font-display font-semibold">{t("gallery.pendingTitle")}</div>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
        {t("gallery.pendingHint")}
      </p>
      <div className="mt-3 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.postId}
               className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card p-2.5">
            <Link href={postPath(r.postId)} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.image} alt=""
                   className="size-16 rounded-md border border-line object-cover" />
            </Link>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink/85">
              {r.caption || <span className="text-muted">{t("gallery.noCaption")}</span>}
            </p>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => answer(r.postId, true)} disabled={busy}
                      className="rounded-lg border border-jade bg-jade/15 px-3 py-1.5 text-[13px] text-jade hover:bg-jade/25 disabled:opacity-50">
                {t("gallery.tagConfirm")}
              </button>
              <button onClick={() => answer(r.postId, false)} disabled={busy}
                      className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted hover:border-chili hover:text-chili disabled:opacity-50">
                {t("gallery.tagDecline")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
