"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "@/lib/i18n";
import { GALLERY_PUBLIC_KEY, type Roster } from "@/lib/gallery";
import { isLive, listContests, phaseOf, type Contest } from "@/lib/contest";
import type { PersonOption } from "@/lib/people";
import GalleryGrid, { LoadMore, useGallery, type Sort } from "@/components/gallery/GalleryGrid";
import PollCard from "@/components/gallery/PollCard";
import HotExplainer from "@/components/gallery/HotExplainer";
import GalleryUpload from "@/components/gallery/GalleryUpload";
import ContestView, { STAGE_TONE } from "@/components/contest/ContestView";
import { ContestIcon } from "@/components/ui/NavIcons";

/**
 * The gallery.
 *
 * Open to the FC unless an admin closes it, which is a site setting rather than
 * a rule in the database: whether a page is linked and reachable is a product
 * decision the FC can reverse from /admin without a migration. Individual
 * pictures are a different matter — a hidden one is enforced in the read policy,
 * so it does not leave the database for anybody but an admin.
 *
 * The glamour contest lives here too, as a second view of the same page: a
 * contest is pictures members post and everybody reacts to, which is what the
 * gallery already is, and it is where Aqua asked for it ("post pictures in
 * that category"). The switch between the two only appears once there is a
 * contest this reader may see — which, until one is published, means admins
 * looking at a draft and nobody else. So a member sees the gallery exactly as
 * it was until the day a contest goes out.
 */

export default function GalleryPage(
  { openId, memberOptions = [], contestId = null }: {
    openId?: number | null;
    memberOptions?: PersonOption[];
    /**
     * Which contest to open on: a number from /contest/[id], "current" from
     * /contest, or nothing for the gallery — in which case ?contest=12 in the
     * address still opens one, for a reload after switching.
     */
    contestId?: number | "current" | null;
  },
) {
  const roster: Roster = useMemo(() => {
    const out: Roster = {};
    for (const o of memberOptions) out[o.id] = { name: o.name, avatar: o.avatar ?? null };
    return out;
  }, [memberOptions]);
  const { t, lang } = useLang();
  const [supabase] = useState(createClient);
  // The site setting, separately from whether this particular reader gets in.
  // Kept apart because the switch that decides the second arrives a moment after
  // the first: folding them together in an effect would have settled the answer
  // while the admin flag was still false and never revisited it.
  const [open, setOpen] = useState<boolean | null>(null);
  // The poster starts folded away. Somebody arriving here is far more likely
  // to be looking than posting, and a form above the fold pushes the pictures —
  // the entire reason for the page — below it.
  const [posting, setPosting] = useState(false);
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("hot");

  // Typing runs ahead of the database, so the request waits for a pause rather
  // than firing on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(typed), 300);
    return () => clearTimeout(id);
  }, [typed]);

  const { posts, authors, counts, images, tagged, isAdmin, ready, hasMore, loading,
          loadMore, reload } = useGallery({ sort, query });

  const pathname = usePathname();
  const router = useRouter();

  /*
   * The contests this reader may see, newest first — published ones, and
   * drafts as well for an admin (v98 decides which) — and which of them, if
   * any, is on screen instead of the gallery.
   *
   * The first view is read from the address while the state is made. Only
   * the browser has an address to read, but nothing about it is drawn until
   * the site setting below has answered, so the server's loading screen and
   * the browser's first frame are the same either way.
   */
  const [contests, setContests] = useState<Contest[] | null>(null);
  const [view, setView] = useState<number | null>(() => {
    if (typeof contestId === "number") return contestId;
    if (typeof window === "undefined") return null;
    return Number(new URLSearchParams(window.location.search).get("contest")) || null;
  });

  useEffect(() => {
    if (!supabase) return;
    let live = true;
    void listContests(supabase).then((list) => {
      if (!live) return;
      setContests(list);
      setView((v) => {
        // /contest with no number: whichever is newest, if there is one.
        if (contestId === "current" && v == null) return list[0]?.id ?? null;
        // A number this reader cannot see — a draft, or one since deleted —
        // is the gallery, not an empty page.
        return v != null && list.some((c) => c.id === v) ? v : null;
      });
    });
    return () => { live = false; };
  }, [supabase, contestId]);

  /*
   * Switching keeps the address in step so a reload or a copied link opens
   * the same view. On /gallery that is the query string alone, and the page
   * stays put. On a /contest address — somebody arrived from a link in
   * Discord — the gallery's own address is the right one to move to, so that
   * is a real navigation.
   */
  function switchTo(id: number | null) {
    setView(id);
    if (pathname.startsWith("/gallery")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("look");
      if (id != null) url.searchParams.set("contest", String(id));
      else url.searchParams.delete("contest");
      window.history.replaceState(null, "", url.pathname + url.search);
    } else {
      router.replace(id != null ? `/gallery?contest=${id}` : "/gallery", { scroll: false });
    }
  }

  useEffect(() => {
    void (async () => {
      if (!supabase) { setOpen(false); return; }
      const { data: setting } = await supabase
        .from("site_settings").select("value").eq("key", GALLERY_PUBLIC_KEY).maybeSingle();
      setOpen((setting as { value?: string } | null)?.value !== "off");
    })();
  }, [supabase]);

  // The site setting or the reader's own standing; either lets them in.
  const allowed = open === null ? null : (open || isAdmin);
  if (allowed === null) {
    return <main className="pt-7 text-muted">{t("common.loading")}</main>;
  }
  if (!allowed) notFound();

  // The switch shows the newest contest, and the one on screen if that is an
  // older one somebody picked from the list at the foot of a contest.
  const newest = contests?.[0] ?? null;
  const tabs = newest
    ? [newest, ...(view != null && view !== newest.id
        ? (contests ?? []).filter((c) => c.id === view) : [])]
    : [];
  const tabCls = (on: boolean) =>
    `flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-read transition-colors ${
      on ? "border-accent bg-accent/15 text-accent"
         : "border-line text-muted hover:border-muted hover:text-ink"}`;

  return (
    <main className="pt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-data text-meta uppercase tracking-[0.22em] text-accent">
            {t("gallery.eyebrow")}
          </div>
          <h1 className="font-display text-3xl font-bold">{t("gallery.title")}</h1>
        </div>
        {view == null && (
          <button onClick={() => setPosting((v) => !v)}
                  className={`rounded-lg border px-4 py-2 text-read transition-colors ${
                    posting ? "border-line text-muted hover:border-muted hover:text-ink"
                            : "border-accent bg-accent/15 text-accent hover:bg-accent/25"}`}>
            {posting ? t("gallery.closePoster") : `+ ${t("gallery.openPoster")}`}
          </button>
        )}
      </div>

      {tabs.length > 0 && (
        <div role="tablist" aria-label={t("contest.tabs")}
             className="no-bar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
          <button role="tab" aria-selected={view == null} onClick={() => switchTo(null)}
                  className={tabCls(view == null)}>
            {t("contest.tabAll")}
          </button>
          {tabs.map((c) => {
            const p = phaseOf(c);
            const on = view === c.id;
            return (
              <button key={c.id} role="tab" aria-selected={on} onClick={() => switchTo(c.id)}
                      className={tabCls(on)}>
                <ContestIcon size={16} className="shrink-0" />
                <span className="max-w-[12rem] truncate sm:max-w-[20rem]">
                  {lang === "en" && c.title_en ? c.title_en : c.title}
                </span>
                {/* The stage is the first line of the contest itself, so a
                    phone, short of room, leaves it off the tab. */}
                <span className={`hidden shrink-0 rounded-full border px-1.5 py-px text-label sm:inline ${STAGE_TONE[p.stage]}`}>
                  {t(`contest.stage.${p.stage}` as Key)}
                </span>
                {/* Something is happening in there right now. */}
                {isLive(c) && (
                  <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-jade" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {view != null && (
        <ContestView key={view} contestId={view} memberOptions={memberOptions}
                     others={(contests ?? []).filter((c) => c.id !== view)}
                     onPick={switchTo} />
      )}

      {view == null && (<>
      {posting && (
        <div className="mt-4">
          <GalleryUpload onPosted={() => { setPosting(false); void reload(); }}
                         memberOptions={memberOptions} />
        </div>
      )}

      {/* Stays within reach while scrolling, because a feed is long and going
          back to the top to change the sort is the kind of small friction that
          stops somebody browsing. */}
      {(posts.length > 0 || typed) && (
        <div className="sticky top-[var(--nav-h)] z-30 -mx-4 mt-4 flex flex-wrap gap-2.5 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur">
          <input type="search" value={typed} onChange={(e) => setTyped(e.target.value)}
                 placeholder={t("gallery.search")} aria-label={t("gallery.search")}
                 className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted" />
          <div className="flex overflow-hidden rounded-lg border border-line"
               role="group" aria-label={t("gallery.sortHot")}>
            {([["hot", "gallery.sortHot"], ["new", "gallery.sortNew"],
               ["top", "gallery.sortTop"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSort(key)}
                      aria-pressed={sort === key}
                      className={`px-3 py-2 text-read transition-colors ${
                        sort === key ? "bg-accent/15 text-accent"
                                     : "text-muted hover:bg-card hover:text-ink"}`}>
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && posts.length === 0 && (
        <div className="mt-8 flex items-center justify-center gap-2.5 text-read text-muted">
          <span aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          {t("common.loading")}
        </div>
      )}

      {ready && !(loading && posts.length === 0) && (
        posts.length === 0 && query ? (
          <div className="mt-4 rounded-xl border border-dashed border-line p-10 text-center text-read text-muted">
            {t("gallery.nothingFound")}
          </div>
        ) : (
          <>
            {sort === "hot" && <HotExplainer />}
            <PollCard />
            <GalleryGrid posts={posts} authors={authors} counts={counts}
                         images={images} tagged={tagged} roster={roster} memberOptions={memberOptions}
                         isAdmin={isAdmin}
                         onChanged={reload} initialOpen={openId ?? null} />
            <LoadMore onVisible={loadMore} active={hasMore && !loading} />
            {loading && (
              <p className="py-4 text-center text-ui text-muted">
                {t("gallery.loadingMore")}
              </p>
            )}
          </>
        )
      )}
      </>)}
    </main>
  );
}
