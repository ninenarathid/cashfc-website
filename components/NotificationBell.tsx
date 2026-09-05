"use client";

import { useCallback, useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang, type Key } from "@/lib/i18n";
import { postPath } from "@/lib/gallery";
import { fmtDateTime } from "@/lib/dates";

interface Note {
  id: number;
  kind: string;
  actor_name: string | null;
  post_id: number | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
  /** A question that has been answered. It stays; its buttons do not. */
  answered_at?: string | null;
}

/** Enough to be worth scrolling, few enough to arrive instantly. */
const SHOW = 20;

/**
 * Where each kind of notification leads, and what it looks like.
 *
 * Named rather than chained, because the chain that used to do this ended in
 * "there is a new announcement" and so every kind nobody had added a branch for
 * -- feedback among them -- announced itself as an announcement and linked
 * nowhere. Somebody then went looking through the announcements for a message
 * that was never there. An unknown kind now says only that something happened,
 * which is true, and a new kind is one row here.
 */
const KIND: Record<string, { say: Key; icon: string; href: string }> = {
  tag: { say: "notif.tagged", icon: "🏷️", href: "" },
  comment: { say: "notif.commented", icon: "💬", href: "" },
  popoto: { say: "notif.popoto", icon: "🥔", href: "/profile" },
  popoto_post: { say: "notif.popotoPost", icon: "🥔", href: "" },
  announcement: { say: "notif.announced", icon: "📣", href: "/" },
  feedback: { say: "notif.feedback", icon: "✉️", href: "/feedback" },
};
/** A bell nobody is looking at can afford to be a minute and a half behind. */
const POLL_MS = 90_000;

/**
 * What happened while you were away.
 *
 * A tag is the reason this exists. Somebody putting your name on a picture is a
 * question addressed to you, and before this the only way to find out it had been
 * asked was to happen to open your own profile page. It now comes to you, with
 * the picture attached — nobody should have to go hunting for a photograph to
 * decide whether they want to be named in it — and both answers are here, so the
 * whole exchange is one place and two clicks.
 *
 * Everything else is a sentence and a link: an announcement, somebody talking
 * under a picture of yours. Popoto is deliberately not in here. Five hundred
 * members pressing a button is not five hundred things anybody needs told.
 *
 * The count is what the badge is for; opening the panel marks what is in it as
 * read, because having looked at something is what read means and asking somebody
 * to also click "mark as read" is asking them to do the same thing twice.
 */
export default function NotificationBell() {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [me, setMe] = useState<string | null>(null);
  const [character, setCharacter] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [covers, setCovers] = useState<Record<number, string>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id ?? null;
    setMe(uid);
    if (!uid) { setNotes([]); return; }

    const { data: prof } = await supabase.from("profiles")
      .select("character_id, character_verified_at").eq("id", uid).maybeSingle();
    const p = prof as {
      character_id?: number | null; character_verified_at?: string | null;
    } | null;
    setCharacter(p?.character_verified_at ? p.character_id ?? null : null);

    const { data } = await supabase.from("notifications")
      .select("id, kind, actor_name, post_id, body, created_at, read_at, answered_at")
      .order("created_at", { ascending: false }).limit(SHOW);
    const rows = (data as Note[]) ?? [];
    setNotes(rows);

    // The picture is the answer to "which one?", so it travels with the question.
    const ids = [...new Set(rows.map((n) => n.post_id).filter(Boolean) as number[])];
    if (!ids.length) { setCovers({}); return; }
    // The small copy, not the picture. These are drawn at 48 pixels square and
    // were being fetched at full size — four notifications open in a dropdown
    // pulled about fourteen megabytes of PNG to fill four thumbnails, on the
    // same connection as whatever the reader clicked next.
    const { data: posts } = await supabase.from("gallery_posts")
      .select("id, image_url, thumb_url").in("id", ids);
    const map: Record<number, string> = {};
    for (const r of (posts ?? []) as
         { id: number; image_url: string; thumb_url?: string | null }[]) {
      map[r.id] = r.thumb_url || r.image_url;
    }
    setCovers(map);
  }, [supabase]);

  useEffect(() => {
    void load();
    const id = setInterval(() => { if (!document.hidden) void load(); }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Clicking anywhere else puts it away, which is what everybody expects of a
  // panel hanging off a button.
  const unread = notes.filter((n) => !n.read_at).length;

  async function reveal() {
    const next = !open;
    setOpen(next);
    if (!next || !supabase || !unread) return;
    const now = new Date().toISOString();
    setNotes((v) => v.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications")
      .update({ read_at: now }).is("read_at", null);
  }

  async function answerTag(postId: number, yes: boolean) {
    if (!supabase || character == null || busy) return;
    setBusy(true);
    if (yes) {
      await supabase.from("gallery_tags")
        .update({ confirmed_at: new Date().toISOString() })
        .eq("post_id", postId).eq("character_id", character);
    } else {
      await supabase.from("gallery_tags")
        .delete().eq("post_id", postId).eq("character_id", character);
    }
    setBusy(false);
    // The database marks it answered; this is only the screen catching up
    // without waiting for a round trip.
    const now = new Date().toISOString();
    setNotes((v) => v.map((n) => (n.kind === "tag" && n.post_id === postId
      ? { ...n, answered_at: now } : n)));
    void load();
  }

  async function clearAll() {
    if (!supabase || !notes.length) return;
    setNotes([]);
    await supabase.from("notifications").delete().not("id", "is", null);
  }

  if (!supabase || !me) return null;

  const when = (iso: string) => fmtDateTime(iso);

  return (
    // A Popover, not a DropdownMenu: the contents are a list of things to read
    // with buttons inside them, and a menu's arrow keys would fight the links
    // and the yes/no buttons on a tag request for control of the same keys.
    <Popover.Root open={open} onOpenChange={(v) => (v ? reveal() : setOpen(false))}>
      <Popover.Trigger aria-label={t("notif.title")}
              className={`relative grid size-9 place-items-center rounded-lg border transition-colors ${
                open ? "border-accent text-accent" : "border-line text-muted hover:border-muted hover:text-ink"}`}>
        <svg viewBox="0 0 24 24" aria-hidden width="18" height="18"
             fill="none" stroke="currentColor" strokeWidth="1.8"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
          <path d="M10.3 20a2 2 0 003.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[17px] place-items-center rounded-full bg-chili px-1 font-data text-[10px] font-semibold text-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={10}
          className="pop-in z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <span className="font-display text-[13.5px] font-semibold">
              {t("notif.title")}
            </span>
            {notes.length > 0 && (
              <button onClick={clearAll}
                      className="text-[12px] text-muted underline hover:text-ink">
                {t("notif.clear")}
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {notes.length === 0 && (
              <p className="px-3.5 py-6 text-center text-[12.5px] text-muted">
                {t("notif.empty")}
              </p>
            )}

            {notes.map((n) => {
              const cover = n.post_id ? covers[n.post_id] : null;
              const kind = KIND[n.kind];
              // A picture is its own address; everything else has one written
              // down, and a kind nobody has taught this has none rather than a
              // link to the front page that pretends to be an answer.
              const href = n.post_id ? postPath(n.post_id) : (kind?.href || null);
              // Answered tags keep their line and their picture and lose their
            // buttons. Taking the whole notification away took the photograph
            // with it, which is the thing somebody who has just agreed to be
            // named in one is most likely to want next.
            const asking = n.kind === "tag" && character != null && !n.answered_at;
              return (
                <div key={n.id}
                     className={`flex gap-2.5 border-b border-line px-3.5 py-2.5 last:border-0 ${
                       n.read_at ? "" : "bg-accent/5"}`}>
                  {cover && href ? (
                    <Link href={href} onClick={() => setOpen(false)} className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cover} alt=""
                           className="size-12 rounded-md border border-line object-cover" />
                    </Link>
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-md border border-line text-[15px]">
                      {kind?.icon ?? "🔔"}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-ink/90">
                      {kind ? t(kind.say, { who: n.actor_name ?? "—" })
                            : t("notif.something")}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">
                        {n.body}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-muted">{when(n.created_at)}</span>
                      {/* Not only for pictures. A notification that names a
                          thing and then leaves you to find it is the reason
                          somebody went hunting through the wrong page. */}
                      {!asking && href && (
                        <Link href={href} onClick={() => setOpen(false)}
                              className="text-[11.5px] text-accent no-underline hover:underline">
                          {t("notif.open")}
                        </Link>
                      )}
                    </div>

                    {asking && n.post_id && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <button onClick={() => answerTag(n.post_id!, true)} disabled={busy}
                                className="rounded-md border border-jade bg-jade/15 px-2.5 py-0.5 text-[12px] text-jade hover:bg-jade/25 disabled:opacity-50">
                          {t("gallery.tagConfirm")}
                        </button>
                        <button onClick={() => answerTag(n.post_id!, false)} disabled={busy}
                                className="rounded-md border border-line px-2.5 py-0.5 text-[12px] text-muted hover:border-chili hover:text-chili disabled:opacity-50">
                          {t("gallery.tagDecline")}
                        </button>
                        {href && (
                          <Link href={href} onClick={() => setOpen(false)}
                                className="px-1 py-0.5 text-[12px] text-accent no-underline hover:underline">
                            {t("notif.look")}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}