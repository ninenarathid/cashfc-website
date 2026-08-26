"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_BUCKET, MAX_UPLOAD_BYTES } from "@/lib/gallery";
import ImageCropper from "@/components/ImageCropper";

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
 */

/** The site draws avatars at 40–96px; 512 keeps them sharp on a retina screen
 *  without storing a screenshot-sized file for a thumbnail. */
const AVATAR = { w: 512, h: 512 };
/** Wide and short, so it reads as a banner behind the name rather than as a
 *  second picture competing with the portrait in front of it. */
const COVER = { w: 1600, h: 500 };

type Kind = "avatar" | "cover";
interface Shot { id: number; url: string }

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Stamped on mount as well as on every change: the card is cached, and a
  // member who just changed their portrait is exactly the person who must not be
  // shown the version from before they changed it.
  const [stamp, setStamp] = useState(() => Date.now());

  // What is being changed, and where the picture for it is coming from.
  const [kind, setKind] = useState<Kind | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [shots, setShots] = useState<Shot[] | null>(null);
  const file = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    setMe(user.user.id);
    const { data } = await supabase.from("profiles")
      .select("avatar_url, cover_url").eq("id", user.user.id).maybeSingle();
    const p = data as { avatar_url?: string | null; cover_url?: string | null } | null;
    setAvatar(p?.avatar_url ?? null);
    setCover(p?.cover_url ?? null);
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
    const { data: imgs } = await supabase.from("gallery_images")
      .select("id, url").in("post_id", ids).limit(60);
    setShots((imgs ?? []) as Shot[]);
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
    const column = kind === "avatar" ? "avatar_url" : "cover_url";
    const { error } = await supabase.from("profiles")
      .update({ [column]: pub.publicUrl }).eq("id", me);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (kind === "avatar") setAvatar(pub.publicUrl); else setCover(pub.publicUrl);
    if (source) { URL.revokeObjectURL(source); setSource(null); }
    setKind(null);
    setStamp(Date.now());
  }

  async function clear(which: Kind) {
    if (!supabase || !me) return;
    setBusy(true);
    const column = which === "avatar" ? "avatar_url" : "cover_url";
    await supabase.from("profiles").update({ [column]: null }).eq("id", me);
    setBusy(false);
    if (which === "avatar") setAvatar(null); else setCover(null);
    setStamp(Date.now());
  }

  if (!me) return null;

  const shown = kind === "avatar" ? AVATAR : COVER;

  return (
    <section className="mt-3 rounded-xl border border-line bg-surface p-4">
      <div className="font-display font-semibold">{t("profile.pictures")}</div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        {t("profile.picturesHint")}
      </p>

      <input ref={file} type="file" accept="image/*" className="hidden"
             onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />

      {/* ── Cropping, when something has been chosen ── */}
      {source && kind ? (
        <div className="mt-3">
          <div className="mb-2 font-data text-[11px] uppercase tracking-[0.14em] text-accent">
            {kind === "avatar" ? t("profile.picAvatar") : t("profile.picCover")}
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
                  <img src={s.url} alt="" loading="lazy"
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
            <div className="size-20 shrink-0 overflow-hidden rounded-full border border-line bg-card">
              {(avatar ?? fallbackAvatar) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar ?? fallbackAvatar ?? ""} alt=""
                     className="size-full object-cover" />
              )}
            </div>
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
            <div className="aspect-[16/5] w-full overflow-hidden rounded-xl border border-line bg-card">
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="size-full object-cover" />
              )}
            </div>
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
              <div className="rounded-lg border-l-[3px] border-l-accent bg-card p-3">
                <div className="text-[12px] text-muted">Cafe And SHabu</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/member/${characterId}/opengraph-image?v=${stamp}`}
                     alt="" className="mt-2 w-full rounded-md border border-line" />
              </div>
            </div>
          )}
        </div>
      )}

      {err && <p className="mt-2 text-[12.5px] text-chili">{err}</p>}
    </section>
  );
}
