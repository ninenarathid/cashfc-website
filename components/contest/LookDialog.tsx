"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLang, type Key } from "@/lib/i18n";
import { fileUrl, MAX_CAPTION, type ContestImage } from "@/lib/contest";
import { uploadOne, type GalleryImage } from "@/lib/gallery";
import {
  CONTEST_THREAD, addToThread, dropFromThread, editInThread, loadThread,
  reactInThread, type Message,
} from "@/lib/threads";
import type { PersonOption } from "@/lib/people";
import Carousel from "@/components/gallery/Carousel";
import ConfirmDialog from "@/components/ConfirmDialog";
import Messages from "@/components/ui/Messages";
import TalkWindow from "@/components/ui/TalkWindow";
import PopotoVote from "@/components/contest/PopotoVote";

/**
 * One look, opened: a window of its own with its conversation beside it, the
 * way a party opens on the party finder (see ui/TalkWindow).
 *
 * Every picture of it at full size, through the gallery's own carousel so a
 * set of four behaves exactly the way a gallery post of four does. Beside
 * that, the things only worth doing with the look in front of you: giving it
 * a popoto, and for its author fixing the caption or withdrawing it, and for
 * an admin letting it in or taking it down. And beside the window, what
 * people are saying about it (v99).
 *
 * Withdrawing asks first, because it takes the popoto with it and cannot be
 * undone; hiding does not, because an admin can put it back.
 */
export default function LookDialog(
  { supabase, entryId, contestTitle, number, images, name, avatar, characterId, caption,
    votes, given, place, awards, mine, canEditCaption, canWithdraw, admin, hidden,
    pending = false, vote, people, userId, me, talkClosed,
    onSaveCaption, onWithdraw, onSetHidden, onApprove, onTalk, onClose }: {
    supabase: SupabaseClient;
    entryId: number;
    contestTitle: string;
    /** The look's number in its contest, which is what the window calls it. */
    number: number;
    images: ContestImage[];
    name: string;
    avatar: string | null;
    /** Null while names are hidden: there is no page to link to by then. */
    characterId: number | null;
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
    /** Waiting for an admin; only its author and admins are sent it. */
    pending?: boolean;
    vote?: { disabled: boolean; why?: string; onToggle: (b: HTMLButtonElement) => Promise<void> };
    /** The roster, for names in the conversation. */
    people: PersonOption[];
    userId: string | null;
    /** The reader as the conversation needs them, or null without a verified character. */
    me: PersonOption | null;
    /** Their own look in a contest hiding names: readable, not writable (v99). */
    talkClosed: boolean;
    onSaveCaption: (caption: string) => Promise<Key | null>;
    onWithdraw: () => Promise<Key | null>;
    onSetHidden: (hidden: boolean) => Promise<void>;
    onApprove: () => Promise<void>;
    /** Something was said or taken back, for the count on the card. */
    onTalk: () => void;
    onClose: () => void;
  },
) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(caption ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Key | null>(null);
  const [asking, setAsking] = useState(false);
  const [talk, setTalk] = useState<Message[]>([]);

  const loadTalk = useCallback(async () => {
    setTalk(await loadThread(supabase, CONTEST_THREAD, entryId));
  }, [supabase, entryId]);
  useEffect(() => { void loadTalk(); }, [loadTalk]);

  // The carousel speaks the gallery's shape. A look keeps paths, so the
  // addresses are made here, and the small copy stands in while the full one
  // arrives exactly as it does for a gallery picture.
  const shots: GalleryImage[] = useMemo(() => images.map((img) => ({
    id: img.id, post_id: img.entry_id, url: fileUrl(img.path),
    thumb_url: img.thumb_path ? fileUrl(img.thumb_path) : null,
    width: img.width, height: img.height, position: img.position,
  })), [images]);

  // A portrait shot, in a window the conversation has narrowed, is a strip
  // down the middle with empty width either side, and the popoto was below
  // it, out of sight. The details can have that width. A wide shot needs the
  // whole window to itself, so it keeps them underneath until there is room.
  const cover = images[0];
  const tall = !!cover?.width && !!cover.height && cover.height > cover.width;

  const conversation = (
    <Messages chat comments={talk} people={people} me={me} userId={userId}
              closed={talkClosed ? t("contest.talkClosedOwn") : undefined}
              // A picture in a message goes where a gallery comment's does,
              // under the writer's own folder: it is theirs, and they are
              // speaking as themselves.
              upload={(f: File) => uploadOne(supabase, userId!, f)}
              write={(cid, emoji, mineToo, who) =>
                void reactInThread(supabase, CONTEST_THREAD, userId!, cid, emoji, who, mineToo)}
              onAdd={async (c) => {
                setTalk((v) => [...v, c]);
                if (!userId) return;
                await addToThread(supabase, CONTEST_THREAD, entryId, userId, {
                  text: c.text, images: c.images,
                  mentions: c.mentions, mentionsAll: c.mentionsAll,
                  replyTo: c.replyTo,
                });
                await loadTalk();
                onTalk();
              }}
              onReact={(cid, emoji, on, who) =>
                setTalk((v) => v.map((c) => {
                  if (c.id !== cid) return c;
                  const rs = [...(c.reactions ?? [])];
                  const i = rs.findIndex((r) => r.emoji === emoji);
                  if (on) {
                    if (i < 0) rs.push({ emoji, by: [who] });
                    else rs[i] = { ...rs[i], by: [...rs[i].by, who] };
                  } else if (i >= 0) {
                    const by = rs[i].by.filter((w) => w.characterId !== who.characterId);
                    if (by.length) rs[i] = { ...rs[i], by };
                    else rs.splice(i, 1);
                  }
                  return { ...c, reactions: rs };
                }))}
              onEdit={userId ? async (cid, text) => {
                await editInThread(supabase, CONTEST_THREAD, cid, text);
                await loadTalk();
              } : undefined}
              onDrop={userId ? async (cid) => {
                await dropFromThread(supabase, CONTEST_THREAD, cid);
                await loadTalk();
                onTalk();
              } : undefined} />
  );

  return (
    <TalkWindow onClose={onClose} title={contestTitle}
                subtitle={t("contest.lookNo", { n: number })}
                talk={{ messages: talk, title: t("gallery.comments"), body: conversation }}>
      {/* Two columns while the window is wide enough to hold them, one when
          the conversation has taken half the screen: the window's own width
          decides, not the screen's. */}
      <div className="@container">
        <div className={`grid gap-4 ${tall ? "@2xl:grid-cols-[minmax(0,1fr)_16rem]" : ""} @4xl:grid-cols-[minmax(0,1fr)_18rem]`}>
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
      </div>

      {/* Over the window as well as the page, or it would open behind it. */}
      {asking && (
        <ConfirmDialog z={120} danger
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
    </TalkWindow>
  );
}
