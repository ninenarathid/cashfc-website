"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { GALLERY_BUCKET, MAX_UPLOAD_BYTES, measure } from "@/lib/gallery";

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
export default function GalleryUpload(
  { onPosted }: { onPosted: () => void },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Loaded once by the page and handed down, so the gate is decided in one place.
  const [gate, setGate] = useState<"loading" | "anon" | "unverified" | "ok">("loading");
  const [me, setMe] = useState<{ id: string; characterId: number | null } | null>(null);

  // A real effect, not a useState initialiser doing side effects: React is free
  // to call an initialiser twice, which would have meant two auth round-trips.
  useEffect(() => {
    void (async () => {
      if (!supabase) { setGate("anon"); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setGate("anon"); return; }
      const { data: p } = await supabase.from("profiles")
        .select("character_id, character_verified_at").eq("id", data.user.id).maybeSingle();
      const row = p as { character_id?: number | null; character_verified_at?: string | null } | null;
      setMe({ id: data.user.id, characterId: row?.character_id ?? null });
      setGate(row?.character_id && row?.character_verified_at ? "ok" : "unverified");
    })();
  }, [supabase]);

  function pick(f: File) {
    setErr(null);
    if (!f.type.startsWith("image/")) { setErr(t("gallery.notImage")); return; }
    if (f.size > MAX_UPLOAD_BYTES) { setErr(t("gallery.tooBig")); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!supabase || !file || !me) return;
    setBusy(true);
    setErr(null);
    const dims = await measure(file);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    // Filed under the uploader's id because the storage policy requires it, and
    // named by time so two people posting screenshot.png cannot collide.
    const path = `${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await supabase.storage.from(GALLERY_BUCKET)
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (up.error) {
      setBusy(false);
      setErr(up.error.message.includes("Bucket not found")
        ? t("gallery.noBucket") : up.error.message);
      return;
    }
    const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
    const { error } = await supabase.from("gallery_posts").insert({
      author_id: me.id,
      character_id: me.characterId,
      image_url: data.publicUrl,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      caption: caption.trim() || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setFile(null); setPreview(null); setCaption("");
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
      <input ref={input} type="file" accept="image/*" className="hidden"
             onChange={(e) => {
               const f = e.target.files?.[0];
               if (f) pick(f);
               e.target.value = "";
             }} />

      {preview ? (
        <div className="mt-3 flex flex-col gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt=""
               className="max-h-[60vh] w-full rounded-lg border border-line object-contain" />
          <input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                 placeholder={t("gallery.captionPlaceholder")}
                 className="rounded-lg border border-line bg-card px-3 py-2 text-[13.5px] text-ink placeholder:text-muted" />
          <div className="flex flex-wrap gap-2">
            <button onClick={upload} disabled={busy}
                    className="rounded-lg border border-accent bg-accent/15 px-4 py-2 text-[13.5px] text-accent hover:bg-accent/25 disabled:opacity-50">
              {busy ? t("gallery.posting") : t("gallery.post")}
            </button>
            <button onClick={() => { setFile(null); setPreview(null); setErr(null); }}
                    className="rounded-lg border border-line px-4 py-2 text-[13.5px] text-muted hover:border-muted hover:text-ink">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <button onClick={() => input.current?.click()}
                  className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent">
            {t("gallery.choose")}
          </button>
          <span className="text-[11.5px] text-muted">{t("gallery.limits")}</span>
        </div>
      )}

      {err && <p className="mt-2 text-[12.5px] text-chili">{err}</p>}
    </div>
  );
}
