"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { MAX_UPLOAD_BYTES, uploadOne } from "@/lib/gallery";

/**
 * Posting a screenshot.
 *
 * Two conditions, both checked here and both enforced underneath: signed in, and
 * holding a character somebody actually proved is theirs. The gallery is the FC
 * showing itself off, so a picture needs a name attached that means something —
 * and an unverified claim is only a name somebody typed.
 *
 * The storage policy files uploads under the uploader's own id, so the database
 * would refuse a forged one regardless of what this component believes.
 */
interface Option { id: number; name: string }

export default function GalleryUpload(
  { onPosted, memberOptions = [] }:
  { onPosted: () => void; memberOptions?: Option[] },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [done, setDone] = useState(0);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Loaded once by the page and handed down, so the gate is decided in one place.
  const [gate, setGate] = useState<"loading" | "anon" | "unverified" | "ok">("loading");
  const [me, setMe] = useState<{ id: string; characterId: number | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Who the picture is by, when that is not the person uploading it.
  const [creditPick, setCreditPick] = useState("");
  const [credited, setCredited] = useState<Option | null>(null);

  // A real effect, not a useState initialiser doing side effects: React is free
  // to call an initialiser twice, which would have meant two auth round-trips.
  useEffect(() => {
    void (async () => {
      if (!supabase) { setGate("anon"); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setGate("anon"); return; }
      const { data: p } = await supabase.from("profiles")
        .select("character_id, character_verified_at, is_admin")
        .eq("id", data.user.id).maybeSingle();
      const row = p as {
        character_id?: number | null; character_verified_at?: string | null;
        is_admin?: boolean;
      } | null;
      setMe({ id: data.user.id, characterId: row?.character_id ?? null });
      setIsAdmin(!!row?.is_admin);
      // An admin posts for other people, so a character of their own is not
      // what stands between them and the form.
      setGate(row?.is_admin || (row?.character_id && row?.character_verified_at)
        ? "ok" : "unverified");
    })();
  }, [supabase]);

  function pick(chosen: File[]) {
    setErr(null);
    const ok: File[] = [];
    for (const f of chosen) {
      if (!f.type.startsWith("image/")) { setErr(t("gallery.notImage")); continue; }
      if (f.size > MAX_UPLOAD_BYTES) { setErr(t("gallery.tooBig")); continue; }
      ok.push(f);
    }
    if (!ok.length) return;
    setFiles((prev) => [...prev, ...ok]);
    setPreviews((prev) => [...prev, ...ok.map((f) => URL.createObjectURL(f))]);
  }

  function drop(i: number) {
    setFiles((prev) => prev.filter((_, n) => n !== i));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[i]);
      return prev.filter((_, n) => n !== i);
    });
  }

  function clear() {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setFiles([]); setPreviews([]); setErr(null); setDone(0);
  }

  async function upload() {
    if (!supabase || !files.length || !me) return;
    setBusy(true);
    setErr(null);
    setDone(0);

    // Every file goes up first. If one fails the post is never created, so a
    // half-uploaded set does not become a post missing pictures nobody can see
    // are missing.
    const uploaded: { url: string; width: number | null; height: number | null }[] = [];
    for (const f of files) {
      const res = await uploadOne(supabase, me.id, f);
      if ("error" in res) {
        setBusy(false);
        setErr(res.error === "not-image" ? t("gallery.notImage")
          : res.error === "too-big" ? t("gallery.tooBig")
          : res.error.includes("Bucket not found") ? t("gallery.noBucket")
          : res.error);
        return;
      }
      uploaded.push(res);
      setDone((n) => n + 1);
    }

    // The cover columns are filled by a trigger from the first image, so they
    // are seeded here only to satisfy the not-null on image_url.
    const { data: post, error } = await supabase.from("gallery_posts").insert({
      author_id: me.id,
      // Whose page it belongs on: the credited member if an admin picked one,
      // otherwise the uploader's own.
      character_id: credited?.id ?? me.characterId,
      credited_name: credited?.name ?? null,
      image_url: uploaded[0].url,
      width: uploaded[0].width,
      height: uploaded[0].height,
      caption: caption.trim() || null,
    }).select("id").single();

    if (error || !post) { setBusy(false); setErr(error?.message ?? "insert failed"); return; }

    const { error: imgErr } = await supabase.from("gallery_images").insert(
      uploaded.map((u, i) => ({
        post_id: (post as { id: number }).id,
        url: u.url, width: u.width, height: u.height, position: i,
      })));

    setBusy(false);
    if (imgErr) { setErr(imgErr.message); return; }
    clear();
    setCaption("");
    setCredited(null);
    setCreditPick("");
    onPosted();
  }

  if (gate === "loading") return null;

  if (gate !== "ok") {
    return (
      <div className="rounded-xl border border-dashed border-line px-4 py-3.5 text-[13px] leading-relaxed text-muted">
        {gate === "anon" ? t("gallery.gateAnon") : t("gallery.gateUnverified")}{" "}
        <Link href="/profile" className="text-accent no-underline hover:underline">
          {gate === "anon" ? t("nav.signIn") : t("nav.profile")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="font-display font-semibold">{t("gallery.post")}</div>

      {isAdmin && (
        <div className="mt-2.5 rounded-lg border border-chili/30 bg-chili/5 px-3 py-2.5">
          <div className="text-[12.5px] font-medium text-ink">{t("gallery.postFor")}</div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
            {t("gallery.postForHint")}
          </p>
          {credited ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-data text-[13px] text-ink">{credited.name}</span>
              <button onClick={() => { setCredited(null); setCreditPick(""); }}
                      className="rounded-md border border-line px-2 py-0.5 text-[11.5px] text-muted hover:border-muted hover:text-ink">
                {t("gallery.postForMe")}
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <input value={creditPick} onChange={(e) => setCreditPick(e.target.value)}
                     placeholder={t("gallery.findMember")}
                     className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink placeholder:text-muted" />
              {creditPick.trim().length >= 2 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {memberOptions
                    .filter((o) => o.name.toLowerCase()
                      .includes(creditPick.trim().toLowerCase()))
                    .slice(0, 8)
                    .map((o) => (
                      <button key={o.id} onClick={() => { setCredited(o); setCreditPick(""); }}
                              className="rounded-md border border-line bg-card px-2.5 py-1 text-[12.5px] text-ink hover:border-accent hover:text-accent">
                        {o.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" multiple className="hidden"
             onChange={(e) => {
               pick([...(e.target.files ?? [])]);
               e.target.value = "";
             }} />

      {previews.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt=""
                     className="h-32 w-auto rounded-lg border border-line object-contain" />
                <button onClick={() => drop(i)} disabled={busy}
                        aria-label={t("gallery.removeImage")}
                        className="absolute right-1 top-1 rounded-md border border-chili/60 bg-bg/85 px-1.5 text-[12px] text-chili disabled:opacity-40">
                  ✕
                </button>
                {i === 0 && previews.length > 1 && (
                  <span className="absolute bottom-1 left-1 rounded bg-bg/80 px-1.5 py-0.5 text-[10px] text-muted">
                    {t("gallery.cover")}
                  </span>
                )}
              </div>
            ))}
            <button onClick={() => input.current?.click()} disabled={busy}
                    className="h-32 w-24 rounded-lg border border-dashed border-line text-[12px] text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40">
              + {t("gallery.addImages")}
            </button>
          </div>
          <input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                 placeholder={t("gallery.captionPlaceholder")}
                 className="rounded-lg border border-line bg-card px-3 py-2 text-[13.5px] text-ink placeholder:text-muted" />
          <div className="flex flex-wrap gap-2">
            <button onClick={upload} disabled={busy}
                    className="rounded-lg border border-accent bg-accent/15 px-4 py-2 text-[13.5px] text-accent hover:bg-accent/25 disabled:opacity-50">
              {busy
                ? `${t("gallery.posting")} ${done}/${files.length}`
                : `${t("gallery.post")} (${files.length})`}
            </button>
            <button onClick={clear} disabled={busy}
                    className="rounded-lg border border-line px-4 py-2 text-[13.5px] text-muted hover:border-muted hover:text-ink disabled:opacity-40">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <button onClick={() => input.current?.click()}
                  className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent">
            {t("gallery.chooseMany")}
          </button>
          <span className="text-[11.5px] text-muted">{t("gallery.limits")}</span>
        </div>
      )}

      {err && <p className="mt-2 text-[12.5px] text-chili">{err}</p>}
    </div>
  );
}
