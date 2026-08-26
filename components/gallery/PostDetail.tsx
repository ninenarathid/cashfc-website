"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { postPath, type GalleryComment, type GalleryPost } from "@/lib/gallery";

interface Author { id: string; name: string; characterId: number | null; avatar: string | null }

/**
 * One picture, everything attached to it, and the ways to react.
 *
 * The same component fills the lightbox on the gallery grid and the body of the
 * shareable page. A shared link has to show what the person who sent it was
 * looking at, and two implementations of "a picture with its comments" would
 * have drifted apart by the second change.
 *
 * Popoto is the FC's own currency, already used to thank people on their member
 * page — here it counts per picture rather than per person per day. One each,
 * enforced by the table's primary key rather than by the button.
 */
export default function PostDetail(
  { post, authors, onDeleted, onChanged, compact = false }: {
    post: GalleryPost;
    authors: Record<string, Author>;
    onDeleted?: (id: number) => void;
    onChanged?: () => void;
    compact?: boolean;
  },
) {
  const { t, lang } = useLang();
  const [supabase] = useState(createClient);
  const [likes, setLikes] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption ?? "");

  const load = useCallback(async () => {
    if (!supabase) return;
    const [{ data: user }, likeRows, commentRows] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("gallery_likes").select("profile_id").eq("post_id", post.id),
      supabase.from("gallery_comments")
        .select("id, post_id, author_id, body, created_at")
        .eq("post_id", post.id).order("created_at", { ascending: true }),
    ]);
    const uid = user.user?.id ?? null;
    setMe(uid);
    const ids = (likeRows.data ?? []).map((r) => r.profile_id as string);
    setLikes(ids.length);
    setLiked(!!uid && ids.includes(uid));
    setComments((commentRows.data as GalleryComment[]) ?? []);
    if (uid) {
      const { data: prof } = await supabase
        .from("profiles").select("is_admin").eq("id", uid).maybeSingle();
      setIsAdmin(!!(prof as { is_admin?: boolean } | null)?.is_admin);
    }
  }, [supabase, post.id]);

  useEffect(() => { void load(); }, [load]);

  const author = authors[post.author_id];
  const mine = !!me && me === post.author_id;
  const canDelete = mine || isAdmin;
  // The author owns their words; an admin can fix a caption that has to go
  // without taking the picture down over it.
  const canEditCaption = mine || isAdmin;

  async function saveCaption() {
    if (!supabase) return;
    setBusy(true);
    const next = caption.trim().slice(0, 300);
    const { error } = await supabase.from("gallery_posts")
      .update({ caption: next || null }).eq("id", post.id);
    setBusy(false);
    if (!error) { setEditing(false); onChanged?.(); }
  }

  async function toggleLike() {
    if (!supabase || !me || busy) return;
    setBusy(true);
    // Moved before the request so the button answers immediately; a failure puts
    // it back rather than leaving a number nobody can trust.
    const next = !liked;
    setLiked(next);
    setLikes((n) => (n ?? 0) + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("gallery_likes").insert({ post_id: post.id, profile_id: me })
      : await supabase.from("gallery_likes").delete()
          .eq("post_id", post.id).eq("profile_id", me);
    if (error) { setLiked(!next); setLikes((n) => (n ?? 0) + (next ? -1 : 1)); }
    setBusy(false);
  }

  async function addComment() {
    if (!supabase || !me || !draft.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("gallery_comments")
      .insert({ post_id: post.id, author_id: me, body: draft.trim().slice(0, 500) });
    setBusy(false);
    if (!error) { setDraft(""); await load(); }
  }

  async function share() {
    const url = `${location.origin}${postPath(post.id)}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* dismissed the sheet */ }
  }

  async function remove() {
    if (!supabase || !canDelete) return;
    setBusy(true);
    const { error } = await supabase.from("gallery_posts").delete().eq("id", post.id);
    setBusy(false);
    if (!error) onDeleted?.(post.id);
  }

  const when = new Date(post.created_at).toLocaleDateString(
    lang === "th" ? "th-TH" : "en-GB",
    { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={post.image_url} alt={post.caption ?? ""}
           width={post.width ?? undefined} height={post.height ?? undefined}
           className="max-h-[78vh] w-full rounded-xl border border-line bg-bg object-contain" />

      {/* Held to a readable measure under a picture that may be very wide —
          comments running the full width of a 1600px screenshot are a chore. */}
      <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {author?.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar} alt="" className="size-8 rounded-full border border-line" />
          )}
          <div className="min-w-0 flex-1">
            {author?.characterId ? (
              <Link href={`/member/${author.characterId}`}
                    className="font-data text-[13.5px] font-semibold text-ink no-underline hover:text-accent">
                {author.name}
              </Link>
            ) : (
              <span className="font-data text-[13.5px] font-semibold text-ink">
                {author?.name ?? "—"}
              </span>
            )}
            <div className="text-[11.5px] text-muted">{when}</div>
          </div>
        </div>

        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea value={caption} rows={3}
                      onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                      placeholder={t("gallery.captionPlaceholder")}
                      className="rounded-lg border border-line bg-card px-3 py-2 text-[13.5px] text-ink placeholder:text-muted" />
            <div className="flex flex-wrap gap-2">
              <button onClick={saveCaption} disabled={busy}
                      className="rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-50">
                {t("gallery.save")}
              </button>
              <button onClick={() => { setCaption(post.caption ?? ""); setEditing(false); }}
                      className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:border-muted hover:text-ink">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink/85">
              {post.caption || (
                <span className="text-muted">{t("gallery.noCaption")}</span>
              )}
            </p>
            {canEditCaption && (
              <button onClick={() => setEditing(true)}
                      title={t("gallery.editCaption")}
                      className="shrink-0 rounded-md border border-line px-2 py-0.5 text-[11.5px] text-muted hover:border-accent hover:text-accent">
                {t("common.edit")}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={toggleLike} disabled={!me || busy}
                  title={me ? undefined : t("gallery.signInToReact")}
                  className={`rounded-lg border px-3.5 py-1.5 text-[13px] transition-colors disabled:opacity-50 ${
                    liked ? "border-accent bg-accent/15 text-accent"
                          : "border-line text-muted hover:border-accent hover:text-accent"}`}>
            🥔 {t("gallery.popoto")}{likes != null ? ` · ${likes}` : ""}
          </button>
          <button onClick={share}
                  className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent">
            {copied ? t("gallery.copied") : t("gallery.share")}
          </button>
          {/* Hiding first, because it is almost always the right one: the
              picture comes off the site now and nothing is destroyed while
              somebody talks to whoever posted it. */}
          {isAdmin && (
            <button onClick={async () => {
                      if (!supabase) return;
                      setBusy(true);
                      await supabase.from("gallery_posts")
                        .update({ hidden: !post.hidden }).eq("id", post.id);
                      setBusy(false);
                      onChanged?.();
                    }}
                    disabled={busy}
                    className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:border-chili hover:text-chili disabled:opacity-50">
              {post.hidden ? t("gallery.restore") : t("gallery.hide")}
            </button>
          )}
          {canDelete && (
            <button onClick={remove} disabled={busy}
                    className="rounded-lg border border-chili/50 px-3.5 py-1.5 text-[13px] text-chili hover:bg-chili/10 disabled:opacity-50">
              {t("common.delete")}
            </button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
            {t("gallery.comments")} {comments.length > 0 && `· ${comments.length}`}
          </div>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-line bg-card px-3 py-2">
                <div className="text-[12px] text-muted">
                  {authors[c.author_id]?.name ?? "—"}
                </div>
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink/90">
                  {c.body}
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-[12.5px] text-muted">{t("gallery.noComments")}</p>
            )}
          </div>

          {me ? (
            <div className="flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                     onKeyDown={(e) => { if (e.key === "Enter") void addComment(); }}
                     placeholder={t("gallery.writeComment")}
                     className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink placeholder:text-muted" />
              <button onClick={addComment} disabled={busy || !draft.trim()}
                      className="rounded-lg border border-accent bg-accent/15 px-3.5 py-2 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-40">
                {t("gallery.send")}
              </button>
            </div>
          ) : (
            <Link href="/profile"
                  className="text-[12.5px] text-accent no-underline hover:underline">
              {t("gallery.signInToReact")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
