"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_BUCKET, MAX_UPLOAD_BYTES } from "@/lib/gallery";
import ImageCropper from "@/components/ImageCropper";
import DropZone, { useDropTarget } from "@/components/ui/DropZone";

/**
 * The two pictures a member chooses for themselves.
 *
 * The portrait replaces the Lodestone's everywhere the site names them — the
 * board, their page, a byline in the gallery, a tag on somebody's group shot.
 * The cover only ever appears at the top of their own page, which is the one
 * place on this site that is theirs to decorate.
 *
 * Both come from the same two places: a picture already in the gallery, or a
 * file from their machine. The gallery is offered first because most people
 * already have the shot they want in it, and picking it is two clicks against
 * finding the file again.
 *
 * Taking one down is a first-class option rather than an afterthought. It puts
 * the Lodestone portrait back, which means nobody can end up stuck with a
 * picture they regret and no way back to the default.
 *
 * The share card gets a third picture because it is a third shape. A banner is
 * wide and short; a share card is nearly square beside it, so using the banner
 * for both kept the middle three fifths and lost whoever was standing at the
 * edges of a group shot. It is optional and falls back to the cover — most
 * people will never set it, and the ones who do are the ones who noticed.
 */

/** The site draws avatars at 40–96px; 512 keeps them sharp on a retina screen
 *  without storing a screenshot-sized file for a thumbnail. */
const AVATAR = { w: 512, h: 512 };
/** Wide and short, so it reads as a banner behind the name rather than as a
 *  second picture competing with the portrait in front of it. */
const COVER = { w: 1600, h: 500 };
/** The shape every link unfurler settled on, so the card is cut for its frame
 *  rather than squeezed out of one meant for something else. */
const SHARE = { w: 1200, h: 630 };

type Kind = "avatar" | "cover" | "share";
interface Shot { id: number; url: string; thumb_url?: string | null }

export default function ProfilePictures(
  { characterId, fallbackAvatar }: {
    characterId: number | null;
    /** The Lodestone portrait, shown as the default and as what "remove" returns to. */
    fallbackAvatar: string | null;
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [me, setMe] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [share, setShare] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Stamped on mount as well as on every change: the card is cached, and a
  // member who just changed their portrait is exactly the person who must not be
  // shown the version from before they changed it.
  const [stamp, setStamp] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  // What is being changed, and where the picture for it is coming from.
  const [kind, setKind] = useState<Kind | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [shots, setShots] = useState<Shot[] | null>(null);
  const file = useRef<HTMLInputElement | null>(null);

  // Three pictures, one set of controls. Naming the column and the setter once
  // each keeps a third picture from meaning a third copy of every branch.
  const COLUMN: Record<Kind, string> = {
    avatar: "avatar_url", cover: "cover_url", share: "share_url",
  };
  const SETTER: Record<Kind, (v: string | null) => void> = {
    avatar: setAvatar, cover: setCover, share: setShare,
  };

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    setMe(user.user.id);
    // One rung of fallback: share_url arrives with a migration, and an unknown
    // column fails the whole select rather than just that field.
    let { data } = await supabase.from("profiles")
      .select("avatar_url, cover_url, share_url").eq("id", user.user.id).maybeSingle();
    if (!data) {
      ({ data } = await supabase.from("profiles")
        .select("avatar_url, cover_url").eq("id", user.user.id).maybeSingle());
    }
    const p = data as {
      avatar_url?: string | null; cover_url?: string | null; share_url?: string | null;
    } | null;
    setAvatar(p?.avatar_url ?? null);
    setCover(p?.cover_url ?? null);
    setShare(p?.share_url ?? null);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  // Object URLs outlive the component unless they are let go of.
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);

  /**
   * The pictures this character is in — the same set their own member page
   * shows, which is theirs plus every group shot they agreed to be tagged in.
   *
   * Asked of gallery_feed rather than assembled here, so "in the picture" means
   * exactly one thing across the whole site. Uploading a shot on somebody else's
   * behalf does not put their face in it, which is why the poster is not part of
   * the question; a guest with no character has only what they uploaded, because
   * there is no character for a tag to point at.
   */
  async function openGallery(which: Kind) {
    setKind(which); setBrowsing(true); setErr(null);
    if (shots || !supabase || !me) return;
    let ids: number[] = [];
    if (characterId) {
      const { data } = await supabase.rpc("gallery_feed", {
        p_sort: "new", p_query: null, p_limit: 60, p_offset: 0,
        p_character: characterId,
      });
      ids = ((data ?? []) as { id: number }[]).map((r) => r.id);
    } else {
      const { data } = await supabase.from("gallery_posts")
        .select("id").eq("author_id", me).limit(60);
      ids = ((data ?? []) as { id: number }[]).map((r) => r.id);
    }
    if (!ids.length) { setShots([]); return; }
    // Sixty pictures at once. Shown as thumbnails, because the browser was
    // downloading sixty full-size screenshots to draw sixty squares the size of
    // a postage stamp — and the crop still reads the original, so choosing from
    // the small copy costs nothing in the picture that comes out.
    const ask = (cols: string) => supabase.from("gallery_images")
      .select(cols).in("post_id", ids).limit(60);
    const full = await ask("id, url, thumb_url");
    const imgs = (full.error ? (await ask("id, url")).data : full.data) ?? [];
    setShots(imgs as unknown as Shot[]);
  }

  /**
   * Whatever the source, the cropper is handed a blob from this origin.
   *
   * A canvas that has drawn a picture fetched from another host refuses to
   * export it, so cropping a gallery shot straight from its URL would fail at
   * the very last step. Fetching it first and cropping the copy sidesteps the
   * rule entirely instead of relying on the storage host's CORS headers.
   */
  async function useSource(url: string) {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      setSource(URL.createObjectURL(blob));
      setBrowsing(false);
    } catch {
      setErr(t("profile.picFetchFailed"));
    }
    setBusy(false);
  }

  function pickFile(f: File | undefined) {
    setErr(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr(t("gallery.notImage")); return; }
    if (f.size > MAX_UPLOAD_BYTES) { setErr(t("gallery.tooBig")); return; }
    setSource(URL.createObjectURL(f));
    setBrowsing(false);
  }

  async function store(blob: Blob) {
    if (!supabase || !me || !kind) return;
    setBusy(true);
    setErr(null);
    // Filed under the uploader's own id, which is what the bucket policy
    // requires, and stamped so a new picture is never served from a cache
    // holding the old one.
    const path = `${me}/${kind}-${Date.now()}.jpg`;
    const up = await supabase.storage.from(GALLERY_BUCKET)
      .upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: "image/jpeg" });
    if (up.error) { setBusy(false); setErr(up.error.message); return; }
    const { data: pub } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
    const { error } = await supabase.from("profiles")
      .update({ [COLUMN[kind]]: pub.publicUrl }).eq("id", me);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    SETTER[kind](pub.publicUrl);
    if (source) { URL.revokeObjectURL(source); setSource(null); }
    setKind(null);
    setStamp(Date.now());
  }

  async function clear(which: Kind) {
    if (!supabase || !me) return;
    setBusy(true);
    await supabase.from("profiles").update({ [COLUMN[which]]: null }).eq("id", me);
    setBusy(false);
    SETTER[which](null);
    setStamp(Date.now());
  }

  /**
   * Each picture is its own target, because each is already on screen.
   *
   * The portrait, the cover and the share card are drawn here at the size and
   * shape they will be — three boxes that say exactly what belongs in them. A
   * dashed rectangle beside each would be a fourth, fifth and sixth box asking
   * the same question the picture is already asking, so the picture takes the
   * drop and the buttons underneath stay for anybody who would rather browse.
   *
   * Dropping decides which of the three is being replaced, which is the one
   * thing the file dialog knew and a drop does not — hence setKind first.
   */
  const takeFor = (which: Kind) => (files: File[]) => {
    setKind(which);
    pickFile(files[0]);
  };
  const avatarDrop = useDropTarget({ onFiles: takeFor("avatar"), disabled: busy });
  const coverDrop = useDropTarget({ onFiles: takeFor("cover"), disabled: busy });
  const shareDrop = useDropTarget({ onFiles: takeFor("share"), disabled: busy });

  if (!me) return null;

  const shown = kind === "avatar" ? AVATAR : kind === "share" ? SHARE : COVER;

  return (
    <section className="mt-3 rounded-xl border border-line bg-surface p-4">
      <div className="font-display font-semibold">{t("profile.pictures")}</div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        {t("profile.picturesHint")} {t("profile.picDropHint")}
      </p>

      <input ref={file} type="file" accept="image/*" className="hidden"
             onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />

      {/* ── Cropping, when something has been chosen ── */}
      {source && kind ? (
        <div className="mt-3">
          <div className="mb-2 font-data text-[11px] uppercase tracking-[0.14em] text-accent">
            {kind === "avatar" ? t("profile.picAvatar")
              : kind === "share" ? t("profile.shareCard") : t("profile.picCover")}
          </div>
          <ImageCropper src={source} outWidth={shown.w} outHeight={shown.h}
                        round={kind === "avatar"} busy={busy}
                        onDone={store}
                        onCancel={() => {
                          URL.revokeObjectURL(source);
                          setSource(null); setKind(null);
                        }} />
        </div>
      ) : browsing ? (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-data text-[11px] uppercase tracking-[0.14em] text-accent">
              {t("profile.picFromGallery")}
            </div>
            <button onClick={() => { setBrowsing(false); setKind(null); }}
                    className="text-[12.5px] text-muted underline hover:text-ink">
              {t("common.cancel")}
            </button>
          </div>
          {shots === null ? (
            <p className="text-[12.5px] text-muted">{t("gallery.loadingMore")}</p>
          ) : shots.length === 0 ? (
            <p className="text-[12.5px] text-muted">{t("profile.picNoShots")}</p>
          ) : (
            <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
              {shots.map((s) => (
                <button key={s.id} onClick={() => useSource(s.url)} disabled={busy}
                        className="overflow-hidden rounded-lg border border-line transition-colors hover:border-accent disabled:opacity-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.thumb_url || s.url} alt="" loading="lazy"
                       className="aspect-square size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {/* ── The portrait ── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Too small for the cloud and the OR rule and a button, so it
                takes the one part that matters: a dashed ring says a picture
                can be dropped on it, and clicking it does what the button
                below does. */}
            <button {...avatarDrop.handlers} disabled={busy}
                    onClick={() => { setKind("avatar"); file.current?.click(); }}
                    title={t("profile.picDropHint")}
                    className={`group relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed bg-card transition-colors disabled:opacity-50 ${
                      avatarDrop.over ? "border-accent" : "border-line hover:border-accent/60"}`}>
              {(avatar ?? fallbackAvatar) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar ?? fallbackAvatar ?? ""} alt=""
                     className={`absolute inset-0 size-full object-cover transition-opacity ${
                       avatarDrop.over ? "opacity-30" : "group-hover:opacity-60"}`} />
              )}
              <svg viewBox="0 0 24 24" aria-hidden width="22" height="22" fill="none"
                   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                   strokeLinejoin="round"
                   className={`relative transition-opacity ${
                     avatarDrop.over ? "text-accent opacity-100"
                       : (avatar ?? fallbackAvatar)
                         ? "text-ink opacity-0 group-hover:opacity-100"
                         : "text-muted opacity-100"}`}>
                <path d="M6.5 18.5A4.5 4.5 0 0 1 6 9.55a6 6 0 0 1 11.6-1.6A4.25 4.25 0 0 1 18 16.4" />
                <path d="M12 12v8" />
                <path d="m8.75 15.25 3.25-3.25 3.25 3.25" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink">{t("profile.picAvatar")}</div>
              <div className="text-[12px] text-muted">
                {avatar ? t("profile.picYours") : t("profile.picDefault")}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button onClick={() => openGallery("avatar")} disabled={busy}
                        className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent disabled:opacity-40">
                  {t("profile.picFromGallery")}
                </button>
                <button onClick={() => { setKind("avatar"); file.current?.click(); }}
                        disabled={busy}
                        className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent disabled:opacity-40">
                  {t("profile.picUpload")}
                </button>
                {avatar && (
                  <button onClick={() => clear("avatar")} disabled={busy}
                          className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-chili hover:text-chili disabled:opacity-40">
                    {t("profile.picRemove")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── The cover ── */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-[13px] font-medium text-ink">{t("profile.picCover")}</div>
              <div className="text-[12px] text-muted">
                {cover ? t("profile.picYours") : t("profile.picNone")}
              </div>
            </div>
            {/* Nothing there yet, so the space it will occupy is the invitation
                to fill it — the drop zone drawn at 16:5, which is the shape the
                banner is. Once there is one, the banner is the target and the
                dashed border is what says so. */}
            {cover ? (
              <button {...coverDrop.handlers} disabled={busy}
                      onClick={() => { setKind("cover"); file.current?.click(); }}
                      title={t("profile.picDropHint")}
                      className={`aspect-[16/5] w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-card transition-colors disabled:opacity-50 ${
                        coverDrop.over ? "border-accent opacity-50"
                                       : "border-line hover:border-accent/60"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="size-full object-cover" />
              </button>
            ) : (
              <DropZone size="sm" paste={false} disabled={busy}
                        onFiles={takeFor("cover")}
                        title={t("profile.picCoverDrop")}
                        className="aspect-[16/5] w-full" />
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => openGallery("cover")} disabled={busy}
                      className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent disabled:opacity-40">
                {t("profile.picFromGallery")}
              </button>
              <button onClick={() => { setKind("cover"); file.current?.click(); }}
                      disabled={busy}
                      className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent disabled:opacity-40">
                {t("profile.picUpload")}
              </button>
              {cover && (
                <button onClick={() => clear("cover")} disabled={busy}
                        className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-chili hover:text-chili disabled:opacity-40">
                  {t("profile.picRemove")}
                </button>
              )}
            </div>
          </div>

          {/* ── What a link to your page looks like elsewhere ── */}
          {characterId && (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <div className="text-[13px] font-medium text-ink">{t("profile.shareCard")}</div>
              <p className="text-[12.5px] leading-relaxed text-muted">
                {t("profile.shareCardHint")}
              </p>
              {/* Dressed as the embed it becomes, because the picture on its own
                  does not tell you what Discord will actually do with it. */}
              <div {...shareDrop.handlers}
                   onClick={() => { if (!busy) { setKind("share"); file.current?.click(); } }}
                   title={t("profile.picDropHint")}
                   className={`cursor-pointer rounded-lg border-l-[3px] border-l-accent bg-card p-3 outline-2 outline-dashed transition-colors ${
                     shareDrop.over ? "opacity-50 outline outline-accent"
                                    : "outline-transparent hover:outline hover:outline-accent/50"}`}>
                <div className="text-[12px] text-muted">Cafe And SHabu</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/member/${characterId}/opengraph-image?v=${stamp}`}
                     alt="" className="mt-2 w-full rounded-md border border-line" />
              </div>
              {/* Discord remembers a link it has already unfurled, and our
                  side cannot reach into that. A link it has never seen before
                  can: the same page with a throwaway query on the end, which
                  changes nothing about where it goes and everything about
                  whether Discord bothers to look again. */}
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={async () => {
                          const url = `${location.origin}/member/${characterId}?v=${
                            Date.now().toString(36)}`;
                          try {
                            await navigator.clipboard.writeText(url);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2500);
                          } catch { /* clipboard refused; nothing useful to say */ }
                        }}
                        className="rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-[12.5px] text-accent hover:bg-accent/25">
                  {copied ? t("gallery.copied") : t("profile.shareFresh")}
                </button>
                <span className="text-[12px] leading-relaxed text-muted">
                  {t("profile.shareFreshHint")}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-muted">
                  {share ? t("profile.shareOwn") : t("profile.shareFromCover")}
                </span>
                <button onClick={() => openGallery("share")} disabled={busy}
                        className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent disabled:opacity-40">
                  {t("profile.picFromGallery")}
                </button>
                <button onClick={() => { setKind("share"); file.current?.click(); }}
                        disabled={busy}
                        className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent disabled:opacity-40">
                  {t("profile.picUpload")}
                </button>
                {share && (
                  <button onClick={() => clear("share")} disabled={busy}
                          className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-muted hover:border-chili hover:text-chili disabled:opacity-40">
                    {t("profile.picRemove")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {err && <p className="mt-2 text-[12.5px] text-chili">{err}</p>}
    </section>
  );
}
