"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang, type Key } from "@/lib/i18n";
import { fileUrl, MAX_CAPTION, type ContestImage } from "@/lib/contest";
import type { GalleryImage } from "@/lib/gallery";
import Carousel from "@/components/gallery/Carousel";
import ConfirmDialog from "@/components/ConfirmDialog";
import PopotoVote from "@/components/contest/PopotoVote";

/**
 * One look, opened.
 *
 * Every picture of it at full size, through the gallery's own carousel so a
 * set of four behaves exactly the way a gallery post of four does. Beside it
 * the things that are only worth doing with the look in front of you: giving
 * it a popoto, and for its author fixing the caption or withdrawing it, and
 * for an admin taking it down.
 *
 * Withdrawing asks first, because it takes the popoto with it and cannot be
 * undone; hiding does not, because an admin can put it back.
 */
export default function LookDialog(
  { images, name, avatar, characterId, caption, votes, given, place, awards,
    mine, canEditCaption, canWithdraw, admin, hidden, pending = false, vote,
    onSaveCaption, onWithdraw, onSetHidden, onApprove, onClose }: {
    images: ContestImage[];
    name: string;
    avatar: string | null;
    /** Null while names are hidden: there is no page to link to by then. */
    characterId: number | null;
    /** Waiting for an admin; only its author and admins are sent it. */
    pending?: boolean;
    onApprove: () => Promise<void>;
    caption: string | null;
    votes: number | null;
    given: boolean;
    place: number | null;
    awards: string[];
    mine: boolean;
    canEditCaption: boolean;
    canWithdraw: boolean;
    admin: boolean;
    hidden: boolean;
    vote?: { disabled: boolean; why?: string; onToggle: (b: HTMLButtonElement) => Promise<void> };
    onSaveCaption: (caption: string) => Promise<Key | null>;
    onWithdraw: () => Promise<Key | null>;
    onSetHidden: (hidden: boolean) => Promise<void>;
    onClose: () => void;
  },
) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(caption ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Key | null>(null);
  const [asking, setAsking] = useState(false);

  // Escape closes, and the page underneath does not scroll while this is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // The carousel speaks the gallery's shape. A look keeps paths, so the
  // addresses are made here, and the small copy stands in while the full one
  // arrives exactly as it does for a gallery picture.
  const shots: GalleryImage[] = useMemo(() => images.map((img) => ({
    id: img.id, post_id: img.entry_id, url: fileUrl(img.path),
    thumb_url: img.thumb_path ? fileUrl(img.thumb_path) : null,
    width: img.width, height: img.height, position: img.position,
  })), [images]);

  return (
    <div role="dialog" aria-modal="true" aria-label={name}
         onClick={onClose}
         className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/90 p-2 backdrop-blur-sm sm:p-4">
      <div onClick={(e) => e.stopPropagation()}
           className="relative w-full max-w-[1200px] rounded-2xl border border-line bg-surface p-3 shadow-2xl sm:p-4">
        <div className="mb-1 flex items-center justify-end">
          <button onClick={onClose} aria-label={t("contest.close")} title={t("contest.close")}
                  className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-ink">
            <svg viewBox="0 0 24 24" aria-hidden width="19" height="19"
                 fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Carousel images={shots} />

          <aside className="flex flex-col gap-3">
            {characterId != null ? (
              <Link href={`/member/${characterId}`}
                    className="flex items-center gap-2.5 no-underline hover:text-accent">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="size-10 rounded-full border border-line object-cover" />
                ) : (
                  <span className="size-10 rounded-full border border-line bg-card" />
                )}
                <span className="font-data text-lead font-semibold text-ink">{name}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <span aria-hidden className="grid size-10 place-items-center rounded-full border border-line bg-card font-data text-read text-muted">#</span>
                <span className="font-data text-lead font-semibold text-ink">{name}</span>
              </div>
            )}

            {pending && !hidden && (
              <p className="rounded-lg border border-gold/40 bg-gold/5 px-3 py-2 text-ui leading-relaxed text-gold">
                {t("contest.pending")}{mine ? ` · ${t("contest.pendingHint")}` : ""}
              </p>
            )}

            {(place != null || awards.length > 0 || hidden) && (
              <div className="flex flex-wrap gap-1.5">
                {place != null && (
                  <span className={`rounded-md px-2 py-0.5 font-data text-ui font-semibold ${
                    place === 1 ? "bg-gold text-bg" : "border border-line text-ink"}`}>
                    {t("contest.place", { n: place })}
                  </span>
                )}
                {awards.map((a) => (
                  <span key={a} className="rounded-md border border-gold/60 bg-gold/10 px-2 py-0.5 text-ui text-gold">
                    {a}
                  </span>
                ))}
                {hidden && (
                  <span className="rounded-md border border-chili/60 px-2 py-0.5 text-ui text-chili">
                    {t("contest.hiddenByAdmin")}
                  </span>
                )}
              </div>
            )}

            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea value={draft} rows={4} maxLength={MAX_CAPTION}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder={t("contest.captionPlaceholder")}
                          className="rounded-lg border border-line bg-card px-3 py-2 text-read text-ink placeholder:text-muted" />
                <div className="flex gap-2">
                  <button disabled={busy}
                          onClick={async () => {
                            setBusy(true); setErr(null);
                            const bad = await onSaveCaption(draft);
                            setBusy(false);
                            if (bad) setErr(bad); else setEditing(false);
                          }}
                          className="rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-read text-accent hover:bg-accent/25 disabled:opacity-50">
                    {t("contest.save")}
                  </button>
                  <button onClick={() => { setEditing(false); setDraft(caption ?? ""); }}
                          className="rounded-lg border border-line px-3.5 py-1.5 text-read text-muted hover:border-muted hover:text-ink">
                    {t("contest.cancel")}
                  </button>
                </div>
              </div>
            ) : caption ? (
              <p className="whitespace-pre-wrap text-read leading-relaxed text-ink">{caption}</p>
            ) : null}

            {(vote || votes != null) && (
              <div className="flex flex-wrap items-center gap-2">
                {vote ? (
                  <PopotoVote given={given} count={votes} disabled={vote.disabled}
                              why={vote.why} onToggle={vote.onToggle} />
                ) : (
                  <span className="font-data text-read tabular-nums text-muted">
                    {t("contest.votes", { n: votes ?? 0 })}
                  </span>
                )}
                {vote?.why && vote.disabled && (
                  <span className="text-ui text-muted">{vote.why}</span>
                )}
              </div>
            )}

            {(mine && (canEditCaption || canWithdraw)) && (
              <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
                <div className="flex flex-wrap gap-2">
                  {canEditCaption && !editing && (
                    <button onClick={() => { setDraft(caption ?? ""); setEditing(true); }}
                            className="rounded-lg border border-line px-3 py-1.5 text-ui text-muted hover:border-accent hover:text-accent">
                      {t("contest.editCaption")}
                    </button>
                  )}
                  {canWithdraw && (
                    <button onClick={() => setAsking(true)} disabled={busy}
                            className="rounded-lg border border-line px-3 py-1.5 text-ui text-muted hover:border-chili hover:text-chili disabled:opacity-50">
                      {t("contest.withdraw")}
                    </button>
                  )}
                </div>
                {canEditCaption && (
                  <p className="text-ui leading-relaxed text-muted">{t("contest.changeHint")}</p>
                )}
              </div>
            )}

            {admin && (
              <div className="mt-1 flex flex-wrap gap-2 rounded-lg border border-chili/30 bg-chili/5 p-2.5">
                {pending && !hidden && (
                  <button disabled={busy}
                          onClick={async () => { setBusy(true); await onApprove(); setBusy(false); }}
                          className="rounded-lg border border-jade/60 bg-jade/10 px-3 py-1.5 text-ui text-jade hover:bg-jade/20 disabled:opacity-50">
                    {t("contest.adm.approve")}
                  </button>
                )}
                <button disabled={busy}
                        onClick={async () => { setBusy(true); await onSetHidden(!hidden); setBusy(false); }}
                        className={`rounded-lg border px-3 py-1.5 text-ui disabled:opacity-50 ${
                          hidden ? "border-jade/60 text-jade hover:bg-jade/10"
                                 : "border-line text-muted hover:border-chili hover:text-chili"}`}>
                  {hidden ? t("contest.adm.unhide") : t("contest.adm.hide")}
                </button>
                {!mine && (
                  <button onClick={() => setAsking(true)} disabled={busy}
                          className="rounded-lg border border-chili/50 px-3 py-1.5 text-ui text-chili hover:bg-chili/10 disabled:opacity-50">
                    {t("contest.adm.remove")}
                  </button>
                )}
              </div>
            )}

            {err && <p className="text-ui text-chili">{t(err)}</p>}
          </aside>
        </div>

        {/* Inside the box that stops clicks, not beside it. The question is
            drawn in a portal, but React still carries its clicks up through
            this tree, and one reaching the backdrop would close the look the
            question was about. */}
        {asking && (
          <ConfirmDialog z={70} danger
                         message={mine ? t("contest.confirmWithdraw") : t("contest.adm.confirmRemove")}
                         confirmLabel={mine ? t("contest.withdraw") : t("contest.adm.remove")}
                         onCancel={() => setAsking(false)}
                         onConfirm={async () => {
                           setAsking(false); setBusy(true); setErr(null);
                           const bad = await onWithdraw();
                           setBusy(false);
                           if (bad) setErr(bad);
                         }} />
        )}
      </div>
    </div>
  );
}
