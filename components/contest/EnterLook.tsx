"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLang, type Key } from "@/lib/i18n";
import { enterLook, fileProblem, MAX_CAPTION, MAX_PICTURES } from "@/lib/contest";
import DropZone, { useDropTarget, usePasteImages } from "@/components/ui/DropZone";

/**
 * Entering a look.
 *
 * Three ways in, the same as the gallery's poster — the file dialog, a drop,
 * and a paste straight out of the clipboard — because a GPose screenshot lives
 * four folders down and finding it by name is the worst of the three.
 *
 * The gates are said here and enforced underneath: signed in, a verified
 * character, and for an FC-only contest a character in the FC. The last is
 * asked of the roster the page was built with, which can be a day behind the
 * one the database holds; if the two disagree the database wins and says so.
 *
 * Nothing is stored until the button is pressed, and then everything is — the
 * files, then the look and its pictures in one call — so a half-sent look is
 * never something anybody else can see.
 */
export default function EnterLook(
  { supabase, contestId, me, fcOnly, inFc, onEntered }: {
    supabase: SupabaseClient;
    contestId: number;
    me: { id: string; verified: boolean } | null;
    fcOnly: boolean;
    inFc: boolean;
    onEntered: (id: number) => void;
  },
) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [err, setErr] = useState<Key | null>(null);

  const open = !!me?.verified && (!fcOnly || inFc);

  // The previews are object URLs, which hold the file in memory until let go.
  // Each removal lets its own go as it happens; this is for leaving the page
  // with some still chosen, and reads them through a ref because the cleanup
  // is written once and would otherwise only ever see the empty first list.
  const held = useRef<string[]>([]);
  useEffect(() => { held.current = previews; }, [previews]);
  useEffect(() => () => held.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function pick(chosen: File[]) {
    setErr(null);
    const room = MAX_PICTURES - files.length;
    const ok: File[] = [];
    for (const f of chosen) {
      const bad = fileProblem(f);
      if (bad) { setErr(bad); continue; }
      if (ok.length >= room) { setErr("contest.err.tooMany"); break; }
      ok.push(f);
    }
    if (!ok.length) return;
    setFiles((prev) => [...prev, ...ok]);
    setPreviews((prev) => [...prev, ...ok.map((f) => URL.createObjectURL(f))]);
  }

  const { over, handlers } = useDropTarget({ onFiles: pick, disabled: busy || !open });
  usePasteImages(pick, open && !busy);

  function drop(i: number) {
    setFiles((prev) => prev.filter((_, n) => n !== i));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[i]);
      return prev.filter((_, n) => n !== i);
    });
  }

  async function submit() {
    if (!me || !files.length) return;
    setBusy(true); setErr(null); setDone(0);
    const res = await enterLook(supabase, contestId, me.id, files, caption, setDone);
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    previews.forEach((u) => URL.revokeObjectURL(u));
    setFiles([]); setPreviews([]); setCaption("");
    onEntered(res.id);
  }

  if (!open) {
    const why: Key = !me ? "contest.gateAnon"
      : !me.verified ? "contest.gateUnverified"
      : "contest.gateFc";
    return (
      <div className="rounded-xl border border-dashed border-line px-4 py-3.5 text-read leading-relaxed text-muted">
        {t(why)}{" "}
        {why !== "contest.gateFc" && (
          <Link href="/profile" className="text-accent no-underline hover:underline">
            {!me ? t("nav.signIn") : t("nav.profile")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div {...handlers}
         className={`relative rounded-xl border bg-surface p-4 transition-colors ${
           over ? "border-accent" : "border-line"}`}>
      <div className="font-display text-lead font-semibold">{t("contest.enter")}</div>
      <p className="mt-0.5 text-ui leading-relaxed text-muted">{t("contest.enterHint")}</p>

      <input ref={input} type="file" accept="image/*" multiple className="hidden"
             onChange={(e) => { pick([...(e.target.files ?? [])]); e.target.value = ""; }} />

      {over && previews.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-bg/85 text-read text-accent">
          {t("drop.now")}
        </div>
      )}

      {previews.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt=""
                     className="h-36 w-auto rounded-lg border border-line object-contain" />
                <button onClick={() => drop(i)} disabled={busy}
                        aria-label={t("contest.removePicture")}
                        className="absolute right-1 top-1 rounded-md border border-chili/60 bg-bg/85 px-1.5 text-ui text-chili disabled:opacity-40">
                  ✕
                </button>
                {i === 0 && previews.length > 1 && (
                  <span className="absolute bottom-1 left-1 rounded bg-bg/80 px-1.5 py-0.5 text-label text-muted">
                    {t("contest.cover")}
                  </span>
                )}
              </div>
            ))}
            {files.length < MAX_PICTURES && (
              <button onClick={() => input.current?.click()} disabled={busy}
                      className="h-36 w-24 rounded-lg border border-dashed border-line text-ui text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40">
                + {t("contest.addPictures")}
              </button>
            )}
          </div>

          <textarea value={caption} rows={2} maxLength={MAX_CAPTION}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={t("contest.captionPlaceholder")}
                    className="rounded-lg border border-line bg-card px-3 py-2 text-read text-ink placeholder:text-muted" />
          <p className="text-ui text-muted">{t("contest.rulesReminder")}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={submit} disabled={busy || !files.length}
                    className="rounded-lg border border-accent bg-accent/15 px-4 py-2 text-read text-accent hover:bg-accent/25 disabled:opacity-50">
              {busy
                ? t("contest.submitting", { n: done, of: files.length })
                : t("contest.submit")}
            </button>
            <button disabled={busy}
                    onClick={() => {
                      previews.forEach((u) => URL.revokeObjectURL(u));
                      setFiles([]); setPreviews([]); setErr(null);
                    }}
                    className="rounded-lg border border-line px-4 py-2 text-read text-muted hover:border-muted hover:text-ink disabled:opacity-40">
              {t("contest.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <DropZone multiple onFiles={pick} disabled={busy}
                  title={t("contest.dropZone")} className="mt-3" />
      )}

      {err && <p className="mt-2 text-ui text-chili">{t(err)}</p>}
    </div>
  );
}
