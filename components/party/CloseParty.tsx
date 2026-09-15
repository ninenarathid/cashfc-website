"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Party } from "@/lib/party";
import { closeParty, uploadPartyImage } from "@/lib/party-db";
import Modal from "@/components/ui/Modal";
import DropZone from "@/components/ui/DropZone";
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
 * Closing a party, and saying how it went.
 *
 * Success, which the lead or an admin says, with the group photo if somebody
 * took one; and test, which only an admin says, for a listing that existed to
 * try the board out. Fail is not offered to anybody. It is what a party
 * becomes by itself a day after it closes with nobody having said otherwise
 * (v74); an admin filling in the old ones does it in the table, where the
 * database allows it from an admin and nobody else.
 *
 * The photo is optional and goes up the moment it is dropped, the same as a
 * screenshot in a message, so by the time somebody presses close it is already
 * stored and the press is one write.
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
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const take = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setErr(null);
    setUploading(true);
    const r = await uploadPartyImage(supabase, userId, f);
    setUploading(false);
    if ("error" in r) { setErr(r.error); return; }
    setPhoto(r.url);
  };

  const close = async (outcome: "success" | "test") => {
    setBusy(true);
    setErr(null);
    const r = await closeParty(supabase, party, outcome, photo);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
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

          {/* The group photo, optional. Once there is one, the picture is the
              control: pressing ✕ on it takes it off again. */}
          {photo ? (
            <span className="relative self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="max-h-56 w-auto rounded-lg border border-line" />
              <button type="button" onClick={() => setPhoto(null)}
                      aria-label={t("pf.remove")}
                      className="absolute right-1.5 top-1.5 rounded border border-chili/60 bg-bg/85 px-1.5 text-[14px] text-chili">
                ✕
              </button>
            </span>
          ) : (
            <DropZone size="sm" paste onFiles={(f) => void take(f)}
                      disabled={uploading || busy}
                      title={uploading ? t("pf.uploading", { n: 1 }) : t("pf.groupPhoto")}
                      hint={t("pf.groupPhotoHint")} />
          )}

          <button type="button" disabled={busy || uploading}
                  onClick={() => void close("success")}
                  className="self-start rounded-lg border border-jade/60 bg-jade/15 px-4 py-2 text-[15px] font-medium text-jade hover:bg-jade/25 disabled:opacity-50">
            {t("pf.closeAsSuccess")}
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
            <button type="button" disabled={busy || uploading}
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
