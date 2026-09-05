"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import {
  postPath, uploadOne, TAG_COLUMNS,
  type GalleryComment, type GalleryImage, type GalleryPost, type GalleryTag,
  type Roster,
} from "@/lib/gallery";
import Carousel from "@/components/gallery/Carousel";
import PostTags from "@/components/gallery/PostTags";
import PhotoTagLayer from "@/components/gallery/PhotoTagLayer";
import { useAvatarOverrides } from "@/lib/avatars";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAdmin } from "@/lib/admin";
import type { MemberOption } from "@/components/gallery/MemberPicker";
import { fmtDate } from "@/lib/dates";

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
  { post, authors, roster = {}, memberOptions = [],
    onDeleted, onChanged, compact = false }: {
    post: GalleryPost;
    authors: Record<string, Author>;
    roster?: Roster;
    /** The roster to search when tagging. Empty where tagging is not offered. */
    memberOptions?: MemberOption[];
    onDeleted?: (id: number) => void;
    onChanged?: () => void;
    compact?: boolean;
  },
) {
  const { t } = useLang();
  const chosen = useAvatarOverrides();
  const [supabase] = useState(createClient);
  const [likes, setLikes] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [iHaveCharacter, setIHaveCharacter] = useState(false);
  const { isAdmin } = useAdmin();
  // Only a verified character counts here: confirming a tag is a statement that
  // you are that person, so an unproven claim to the name cannot make it.
  const [myCharacter, setMyCharacter] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption ?? "");
  /**
   * What the grid already knew, standing in until the real list arrives.
   *
   * The pictures of a post live in their own table and are fetched when it
   * opens, so this began as an empty list — and an empty list is no frame at
   * all, which is why opening a picture grew the dialog under whatever was
   * already on screen. The tile that was clicked knows the shape and has the
   * thumbnail in cache, which is enough to stand the frame up on the first
   * frame and fill it with something to look at.
   *
   * No `url` on purpose: the carousel draws the thumbnail and leaves the big
   * picture alone until the real row says which file it is, so the original
   * is never fetched only to be replaced by the lighter copy a moment later.
   */
  const seed = useCallback((): GalleryImage[] => (
    post.thumb_url || post.image_url
      ? [{ id: -1, post_id: post.id, url: "",
           thumb_url: post.thumb_url ?? post.image_url ?? null,
           width: post.width, height: post.height, position: 0 }]
      : []
  ), [post.id, post.thumb_url, post.image_url, post.width, post.height]);
  const [images, setImages] = useState<GalleryImage[]>(seed);
  const addInput = useRef<HTMLInputElement | null>(null);
  // The tags live here rather than in the list under the picture, because the
  // pins drawn on the photograph and the names written below it are the same
  // rows and must never disagree about what is there.
  const [tags, setTags] = useState<GalleryTag[]>([]);
  const [picking, setPicking] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  // Anything that takes a picture off the wall asks first. Held here rather than
  // at each button so there is one dialog on the page and one place that decides
  // what it says.
  const [ask, setAsk] = useState<
    { message: string; label: string; danger?: boolean; run: () => void } | null>(null);
  const [placing, setPlacing] = useState<
    { imageId: number; x: number; y: number } | null>(null);

  const loadTags = useCallback(async () => {
    if (!supabase) return;
    // The read policy decides what comes back: a pin nobody has agreed to
    // reaches only the poster, an admin, and the person it names.
    const { data } = await supabase.from("gallery_tags")
      .select(TAG_COLUMNS).eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setTags((data as GalleryTag[]) ?? []);
  }, [supabase, post.id]);

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
    if (uid) {
      const { data: mine } = await supabase.from("profiles")
        .select("character_id").eq("id", uid).maybeSingle();
      setIHaveCharacter((mine as { character_id?: number | null } | null)
        ?.character_id != null);
    }

    const { data: imgs } = await supabase.from("gallery_images")
      .select("id, post_id, url, width, height, position")
      .eq("post_id", post.id).order("position", { ascending: true });
    // A post written before pictures had their own table still has its cover, so
    // fall back to that rather than showing an empty frame.
    setImages(((imgs ?? []) as GalleryImage[]).length
      ? (imgs as GalleryImage[])
      : [{ id: -1, post_id: post.id, url: post.image_url,
           width: post.width, height: post.height, position: 0 }]);
    const ids = (likeRows.data ?? []).map((r) => r.profile_id as string);
    setLikes(ids.length);
    setLiked(!!uid && ids.includes(uid));
    setComments((commentRows.data as GalleryComment[]) ?? []);
    if (uid) {
      const { data: prof } = await supabase.from("profiles")
        .select("character_id, character_verified_at")
        .eq("id", uid).maybeSingle();
      const row = prof as {
        character_id?: number | null; character_verified_at?: string | null;
      } | null;
      setMyCharacter(row?.character_verified_at ? row.character_id ?? null : null);
    }
  }, [supabase, post.id]);

  // Back to the stand-in, once, when the picture being looked at changes.
  //
  // This used to sit at the top of `load`, which runs again whenever its own
  // dependencies change and twice on mount under React's development checks —
  // so the real picture was torn down and put back moments after it arrived,
  // which is the single flicker you could see on opening one. Keyed to the
  // post and nothing else, it happens before the fetch and never again.
  useEffect(() => { setImages(seed()); }, [post.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadTags(); }, [loadTags]);

  const author = authors[post.author_id];
  // The character this picture belongs to, whether or not its owner has an
  // account here. Falls back to the uploading account only when the post is not
  // tied to a character at all — a guest with nothing linked.
  const character = post.character_id ? roster[post.character_id] : undefined;
  const shownName = post.credited_name ?? character?.name ?? author?.name ?? "—";
  const shownAvatar = (post.character_id ? chosen[post.character_id] : null)
    ?? character?.avatar
    ?? (post.credited_name ? null : author?.avatar ?? null);
  // Names and faces for the pin cards: the roster passed down, with the picker's
  // list filling in anybody it does not cover.
  const faces: Record<number, { name: string; avatar: string | null }> = {};
  for (const o of memberOptions) faces[o.id] = { name: o.name, avatar: o.avatar ?? null };
  for (const [id, r] of Object.entries(roster)) faces[Number(id)] = r;
  // A picture somebody chose wins over the Lodestone's, here as everywhere.
  for (const [id, url] of Object.entries(chosen)) {
    faces[Number(id)] = { name: faces[Number(id)]?.name ?? "—", avatar: url };
  }

  // The uploading account is not always the person the picture is of: an admin
  // posts for a member who never signs in, and that member owns their own
  // photograph as much as the account that carried it here does.
  const credited = post.character_id != null && post.character_id === myCharacter;
  // credited_name is set only when an admin posted on somebody else's behalf, and
  // it is the line between two very different claims. Having uploaded your own
  // picture makes it yours. Having uploaded somebody else's makes you the person
  // who carried it here, which is a job, not a claim — so it comes with the admin
  // powers and goes away with them. Switch them off and the picture is theirs
  // alone, which is what the switch is supposed to show you.
  const onBehalf = !!post.credited_name;
  const uploaded = !!me && me === post.author_id && !onBehalf;
  const mine = uploaded || credited;
  const canDelete = mine || isAdmin;
  // An admin hiding is a takedown and only an admin lifts it; anybody else's is
  // their own and theirs to lift. One button either way — whichever flag the
  // person pressing it actually controls.
  const hiddenFlag = isAdmin ? "hidden" : "owner_hidden";
  const isHidden = !!post.hidden || !!post.owner_hidden;
  const lockedByAdmin = !!post.hidden && !isAdmin;
  // The author owns their words; an admin can fix a caption that has to go
  // without taking the picture down over it.
  const canEditCaption = mine || isAdmin;

  async function placeTag(o: { id: number; name: string }) {
    if (!supabase || !placing) return;
    setBusy(true);
    await supabase.from("gallery_tags").insert({
      post_id: post.id, character_id: o.id, name: o.name,
      image_id: placing.imageId, x: placing.x, y: placing.y,
    });
    setBusy(false);
    setPlacing(null);
    setPicking(false);
    await loadTags();
    onChanged?.();
  }

  async function removeTag(tagId: number) {
    if (!supabase) return;
    setBusy(true);
    await supabase.from("gallery_tags").delete().eq("id", tagId);
    setBusy(false);
    await loadTags();
    onChanged?.();
  }

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
    // Same rule as a popoto on a profile: claim a character first. Taking one
    // back is always allowed — somebody who gave one before the rule existed
    // should still be able to change their mind.
    if (!liked && !iHaveCharacter) return;
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

  /**
   * Puts the link on the clipboard, and does nothing else.
   *
   * It used to hand off to navigator.share where the browser offered it, which
   * on a desktop means the operating system's share sheet: a panel of contacts
   * and applications, on top of the picture, over a button that says Copy link.
   * The button now does what it says. Anybody who wants the sheet has one in
   * their browser already.
   *
   * The throwaway query on the end is the same trick the member pages use.
   * Discord keeps what it has already unfurled, keyed by URL, so a link it has
   * seen before shows the card it saw then — a caption since edited, a picture
   * since added, a set of three where there is now a set of five. This one it
   * has not seen, which changes nothing about where it goes and everything
   * about whether it looks again.
   */
  async function share() {
    const url = `${location.origin}${postPath(post.id)}?v=${Date.now().toString(36)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard refused; nothing useful to say about it */ }
  }

  async function remove() {
    if (!supabase || !canDelete) return;
    setBusy(true);
    const { error } = await supabase.from("gallery_posts").delete().eq("id", post.id);
    setBusy(false);
    if (!error) onDeleted?.(post.id);
  }

  async function setPostHidden(next: boolean) {
    if (!supabase) return;
    setBusy(true);
    await supabase.from("gallery_posts")
      .update({ [hiddenFlag]: next }).eq("id", post.id);
    setBusy(false);
    onChanged?.();
  }

  async function setImageHidden(id: number, next: boolean) {
    if (!supabase) return;
    setBusy(true);
    await supabase.from("gallery_images").update({ hidden: next }).eq("id", id);
    setBusy(false);
    await load();
    onChanged?.();
  }

  const when = fmtDate(post.created_at);

  return (
    <div className="flex flex-col gap-4">
      <Carousel images={images} canEdit={canEditCaption}
                onToggleHidden={(id, next) => {
                  if (!next) { void setImageHidden(id, false); return; }
                  setAsk({
                    message: t("gallery.confirmHideImage"),
                    label: t("gallery.hide"),
                    run: () => void setImageHidden(id, true),
                  });
                }}
                picking={picking && canEditCaption}
                onPickPoint={(img, x, y) => setPlacing({ imageId: img.id, x, y })}
                overlay={(img) => (
                  <PhotoTagLayer
                    tags={tags.filter((g) => g.image_id === img.id && g.x != null)}
                    faces={faces} options={memberOptions}
                    placing={placing && placing.imageId === img.id
                      ? { x: placing.x, y: placing.y } : null}
                    revealAll={revealAll}
                    onPlace={placeTag}
                    onCancel={() => { setPlacing(null); setPicking(false); }}
                    onRemove={removeTag} canEdit={canEditCaption} />
                )}
                onRemove={(id) => {
                  if (!supabase || id < 0) return;
                  const last = images.length === 1;
                  setAsk({
                    message: last ? t("gallery.removeLast") : t("gallery.confirmDeleteImage"),
                    label: t("common.delete"),
                    danger: true,
                    run: async () => {
                      setBusy(true);
                      await supabase.from("gallery_images").delete().eq("id", id);
                      setBusy(false);
                      // Removing the last one deletes the post, which the
                      // database does for us — so the caller hears about it
                      // either way.
                      if (last) onDeleted?.(post.id);
                      else { await load(); onChanged?.(); }
                    },
                  });
                }} />

      <input ref={addInput} type="file" accept="image/*" multiple className="hidden"
             onChange={async (e) => {
               const chosen = [...(e.target.files ?? [])];
               e.target.value = "";
               if (!supabase || !me || !chosen.length) return;
               setBusy(true);
               const base = images.length
                 ? Math.max(...images.map((im) => im.position)) + 1 : 0;
               const rows = [];
               for (const [n, f] of chosen.entries()) {
                 const res = await uploadOne(supabase, me, f);
                 if ("error" in res) continue;
                 rows.push({ post_id: post.id, url: res.url, thumb_url: res.thumb,
                             width: res.width, height: res.height,
                             position: base + n });
               }
               if (rows.length) await supabase.from("gallery_images").insert(rows);
               setBusy(false);
               await load();
               onChanged?.();
             }} />

      {/* Held to a readable measure under a picture that may be very wide —
          comments running the full width of a 1600px screenshot are a chore. */}
      <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {shownAvatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownAvatar} alt=""
                 className="size-8 rounded-full border border-line object-cover" />
          )}
          <div className="min-w-0 flex-1">
            {/* Credited to whoever the picture is of, which is not always the
                account that uploaded it — an admin can post for a member who
                never signs in. */}
            {post.character_id ? (
              <Link href={`/member/${post.character_id}`}
                    className="font-data text-[13.5px] font-semibold text-ink no-underline hover:text-accent">
                {shownName}
              </Link>
            ) : (
              <span className="font-data text-[13.5px] font-semibold text-ink">
                {shownName}
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
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => setEditing(true)}
                        title={t("gallery.editCaption")}
                        className="rounded-md border border-line px-2 py-0.5 text-[11.5px] text-muted hover:border-accent hover:text-accent">
                  {t("common.edit")}
                </button>
                <button onClick={() => addInput.current?.click()} disabled={busy}
                        className="rounded-md border border-line px-2 py-0.5 text-[11.5px] text-muted hover:border-accent hover:text-accent disabled:opacity-40">
                  + {t("gallery.addImages")}
                </button>
              </div>
            )}
          </div>
        )}

        {isHidden && (
          <p className="rounded-lg border border-chili/40 bg-chili/5 px-3 py-2 text-[12.5px] leading-relaxed text-ink/85">
            {post.hidden ? t("gallery.hiddenByAdmin") : t("gallery.hiddenByYou")}
          </p>
        )}

        {/* Under the caption and above the buttons: it is part of what the
            picture says, not one of the things you can do to it. */}
        <PostTags postId={post.id} tags={tags}
                  canEdit={canEditCaption} isAdmin={isAdmin}
                  myCharacterId={myCharacter}
                  picking={picking} onPicking={(on) => {
                    setPicking(on);
                    if (!on) setPlacing(null);
                  }}
                  revealAll={revealAll} onReveal={setRevealAll}
                  onReload={loadTags} onChanged={onChanged} />

        <div className="flex flex-wrap gap-2">
          {/* Disabled rather than hidden, with the reason on hover: a button
              that vanishes leaves somebody wondering what they did wrong. */}
          <button onClick={toggleLike}
                  disabled={!me || busy || (!liked && !iHaveCharacter)}
                  title={!me ? t("gallery.signInToReact")
                    : !liked && !iHaveCharacter ? t("kudos.needCharacter") : undefined}
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
          {canDelete && (
            <button onClick={() => {
                      const on = isAdmin ? post.hidden : post.owner_hidden;
                      if (on) { void setPostHidden(false); return; }
                      setAsk({
                        message: t("gallery.confirmHidePost"),
                        label: t("gallery.hide"),
                        run: () => void setPostHidden(true),
                      });
                    }}
                    disabled={busy || lockedByAdmin}
                    title={lockedByAdmin ? t("gallery.hiddenByAdmin") : undefined}
                    className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:border-chili hover:text-chili disabled:opacity-50">
              {(isAdmin ? post.hidden : post.owner_hidden)
                ? t("gallery.restore") : t("gallery.hide")}
            </button>
          )}
          {canDelete && (
            <button onClick={() => setAsk({
                      message: t("gallery.confirmDeletePost"),
                      label: t("common.delete"),
                      danger: true,
                      run: () => void remove(),
                    })}
                    disabled={busy}
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

      {ask && (
        <ConfirmDialog message={ask.message} confirmLabel={ask.label}
                       danger={ask.danger}
                       onConfirm={() => { ask.run(); setAsk(null); }}
                       onCancel={() => setAsk(null)} />
      )}
    </div>
  );
}
