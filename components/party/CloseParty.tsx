"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Party } from "@/lib/party";
import { addGroupPhotos, closeParty } from "@/lib/party-db";
import Modal from "@/components/ui/Modal";
import DropZone from "@/components/ui/DropZone";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { useLang } from "@/lib/i18n";

/**
 * The one mark a finished party carries on the board: that it went well.
 *
 * Only success is drawn. A fail is what most evenings that nobody came back to
 * mark become, and printing it on every one of them would turn the board's
 * history into a column of red; a test is an admin's bookkeeping. Both are
 * recorded, and neither is anybody else's business to read on a row.
 */
export function SuccessTag({ className = "" }: { className?: string }) {
  const { t } = useLang();
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-jade/60 bg-jade/15 px-2 py-[2px] font-data text-[12px] font-semibold uppercase tracking-[0.1em] text-jade ${className}`}>
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
           stroke="currentColor" strokeWidth="3" strokeLinecap="round"
           strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {t("pf.successTag")}
    </span>
  );
}

/**
 * Pictures chosen and not yet sent, drawn from the files themselves.
 *
 * Held as files rather than uploaded on the drop, the opposite of a screenshot
 * in a message. The archive only grows (v75) — nothing put in it is taken out
 * from the site — so a photo dropped by mistake and then removed, or a window
 * closed without closing the party, must never have reached it.
 */
function usePending() {
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  return {
    files, previews,
    add: (more: File[]) => setFiles((v) => [
      ...v, ...more.filter((f) => f.type.startsWith("image/"))]),
    drop: (i: number) => setFiles((v) => v.filter((_, n) => n !== i)),
    clear: () => setFiles([]),
  };
}

function PendingPhotos(
  { previews, onDrop, removeLabel }: {
    previews: string[]; onDrop: (i: number) => void; removeLabel: string;
  },
) {
  if (!previews.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {previews.map((src, i) => (
        <span key={src} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-28 w-auto rounded-lg border border-line" />
          <button type="button" onClick={() => onDrop(i)} aria-label={removeLabel}
                  className="absolute right-1 top-1 rounded border border-chili/60 bg-bg/85 px-1.5 text-[14px] text-chili">
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}

/**
 * Closing a party, and saying how it went.
 *
 * Success, which the lead or an admin says, with group photos if somebody took
 * any; and test, which only an admin says, for a listing that existed to try
 * the board out. Fail is not offered to anybody. It is what a party becomes by
 * itself a day after it closes with nobody having said otherwise (v74); an
 * admin filling in the old ones does it in the table, where the database
 * allows it from an admin and nobody else.
 */
export default function CloseParty(
  { party, supabase, userId, admin, onClose, onDone }: {
    party: Party;
    supabase: SupabaseClient;
    userId: string;
    /** Whether "test" is offered. The database checks again. */
    admin: boolean;
    onClose: () => void;
    onDone: () => Promise<void> | void;
  },
) {
  const { t } = useLang();
  const pending = usePending();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const close = async (outcome: "success" | "test") => {
    setBusy(true);
    setErr(null);
    const r = await closeParty(supabase, userId, party, outcome,
      outcome === "success" ? pending.files : []);
    setBusy(false);
    // The verdict is written before the photos, so an error here after a
    // success is about a photo: the party is closed, and the board should say
    // so while the message says what did not go up.
    if (r.error) { setErr(r.error); await onDone(); return; }
    onClose();
    await onDone();
  };

  return (
    <Modal open sticky onOpenChange={(v) => { if (!v) onClose(); }}
           title={t("pf.closeTitle")}>
      <div className="flex flex-col gap-4 pt-1">
        <section className="flex flex-col gap-2.5 rounded-xl border border-jade/40 bg-jade/[0.06] p-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[16px] font-semibold text-jade">
              {t("pf.closeSuccess")}
            </span>
            <span className="text-[13.5px] text-muted">{t("pf.closeSuccessWhy")}</span>
          </div>

          <PendingPhotos previews={pending.previews} onDrop={pending.drop}
                         removeLabel={t("pf.remove")} />
          <DropZone size="sm" multiple paste onFiles={pending.add}
                    disabled={busy}
                    title={t("pf.groupPhoto")} hint={t("pf.groupPhotoHint")} />

          <button type="button" disabled={busy}
                  onClick={() => void close("success")}
                  className="self-start rounded-lg border border-jade/60 bg-jade/15 px-4 py-2 text-[15px] font-medium text-jade hover:bg-jade/25 disabled:opacity-50">
            {busy && pending.files.length
              ? t("pf.uploading", { n: pending.files.length })
              : t("pf.closeAsSuccess")}
          </button>
        </section>

        {/* Test, for an admin. Its own box and a quieter colour, so the one
            most people will press is not sitting beside one they cannot. */}
        {admin && (
          <section className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-gold/50 p-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-gold">{t("pf.closeTest")}</span>
              <span className="text-[13.5px] text-muted">{t("pf.closeTestWhy")}</span>
            </div>
            <button type="button" disabled={busy}
                    onClick={() => void close("test")}
                    className="rounded-lg border border-gold/60 bg-gold/10 px-3 py-1.5 text-[14.5px] text-gold hover:bg-gold/20 disabled:opacity-50">
              {t("pf.closeAsTest")}
            </button>
          </section>
        )}

        {err && (
          <p className="rounded-lg border border-chili/50 bg-chili/10 px-3 py-2 text-[14px] text-chili">
            {err}
          </p>
        )}
      </div>
    </Modal>
  );
}

/**
 * The group photos on a successful party, and a way to add another.
 *
 * Adding is for whoever may close the party — the lead or an admin — because
 * that is who the database lets write here (v75), and because the photo often
 * turns up the next day in Discord rather than at the moment of pressing
 * close. There is no way to take one off from here; see v75.
 */
export function GroupPhotos(
  { party, supabase, userId, canAdd, onAdded }: {
    party: Party;
    supabase: SupabaseClient | null;
    userId: string | null;
    canAdd: boolean;
    onAdded: () => Promise<void> | void;
  },
) {
  const { t } = useLang();
  const shots = party.photos ?? [];
  const pending = usePending();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  if (party.outcome !== "success") return null;
  if (!shots.length && !canAdd) return null;

  const send = async () => {
    if (!supabase || !userId || !pending.files.length) return;
    setBusy(true);
    setErr(null);
    const r = await addGroupPhotos(supabase, userId, party.id, pending.files);
    setBusy(false);
    if (r.error) { setErr(r.error); await onAdded(); return; }
    pending.clear();
    setAdding(false);
    await onAdded();
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="font-data text-[12.5px] uppercase tracking-[0.14em] text-jade">
          {t("pf.groupPhotoTitle")}
        </span>
        {canAdd && !adding && (
          <button type="button" onClick={() => setAdding(true)}
                  className="ml-auto text-[13.5px] text-accent hover:underline">
            + {t("pf.addGroupPhoto")}
          </button>
        )}
      </div>

      {shots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shots.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setZoom(i)}
                    className="overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={t("pf.groupPhotoTitle")} loading="lazy"
                   className={`w-auto object-contain ${
                     shots.length === 1 ? "max-h-[28rem] max-w-full" : "h-40"}`} />
            </button>
          ))}
        </div>
      )}

      {adding && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg/40 p-2.5">
          <PendingPhotos previews={pending.previews} onDrop={pending.drop}
                         removeLabel={t("pf.remove")} />
          <DropZone size="sm" multiple paste={false} onFiles={pending.add}
                    disabled={busy}
                    title={t("pf.groupPhoto")} hint={t("pf.groupPhotoHint")} />
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy || !pending.files.length}
                    onClick={() => void send()}
                    className="rounded-lg border border-jade/60 bg-jade/15 px-3 py-1.5 text-[14.5px] text-jade hover:bg-jade/25 disabled:opacity-50">
              {busy ? t("pf.uploading", { n: pending.files.length }) : t("pf.saveGroupPhotos")}
            </button>
            <button type="button" disabled={busy}
                    onClick={() => { pending.clear(); setAdding(false); setErr(null); }}
                    className="text-[14px] text-muted hover:text-ink">
              {t("pf.cancel")}
            </button>
          </div>
          {err && <p className="text-[13.5px] text-chili">{err}</p>}
        </div>
      )}

      {zoom !== null && (
        <ImageLightbox images={shots.map((p) => p.url)} at={zoom}
                       onMove={setZoom} onClose={() => setZoom(null)} />
      )}
    </section>
  );
}
