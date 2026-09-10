"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { tagWho, type GalleryTag } from "@/lib/gallery";
import TellButton from "@/components/TellButton";

/**
 * Who is in this picture, written out under it.
 *
 * The pins on the photograph say where; this says who, and is the part that
 * works without a mouse, without hovering, and on a phone. Both are the same
 * rows underneath, so a name here is a point there.
 *
 * Adding is only ever done by pointing at the picture. A second way in — a name
 * typed into a box, with no point attached — produced tags that could be read
 * but never found, and two answers to "how do I tag somebody" where one will do.
 *
 * The tag does nothing until the person tagged agrees. Anybody may write your
 * name on a picture; only you decide whether it appears on your page, and until
 * you do the tag sits here marked as waiting. An admin can agree on behalf of a
 * member who never signs in — a named person choosing, rather than the tag
 * quietly defaulting to yes.
 *
 * Actions work by person rather than by pin: confirming answers every pin of
 * yours on this post at once, because being in three pictures of one post is
 * still one question.
 */
export default function PostTags(
  { postId, tags, canEdit, isAdmin, myCharacterId,
    picking, onPicking, revealAll, onReveal, onReload, onChanged }: {
    postId: number;
    tags: GalleryTag[];
    /** The post's author or an admin: whoever may say who is in it. */
    canEdit: boolean;
    isAdmin: boolean;
    /** Only set for a signed-in member holding a verified character. */
    myCharacterId: number | null;
    picking: boolean;
    onPicking: (on: boolean) => void;
    revealAll: boolean;
    onReveal: (on: boolean) => void;
    onReload: () => Promise<void> | void;
    onChanged?: () => void;
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [busy, setBusy] = useState(false);

  // One entry per person, however many pins they have here. Keyed through
  // tagWho, so a guest — who has no id to be keyed by — is grouped by their
  // name instead and does not collide with anybody's character.
  const people = new Map<string, {
    characterId: number | null; name: string; pending: boolean; pins: number;
  }>();
  for (const g of tags) {
    const key = tagWho(g);
    const at = people.get(key);
    people.set(key, {
      characterId: g.character_id,
      name: g.name,
      // A guest tag has nobody to agree to it, so it is never waiting on one.
      pending: g.character_id != null
        && ((at?.pending ?? false) || !g.confirmed_at),
      pins: (at?.pins ?? 0) + (g.x != null ? 1 : 0),
    });
  }

  async function confirm(who: { characterId: number | null; name: string }) {
    if (!supabase || busy || who.characterId == null) return;
    setBusy(true);
    await supabase.from("gallery_tags")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("post_id", postId).eq("character_id", who.characterId);
    setBusy(false);
    await onReload();
    onChanged?.();
  }

  async function remove(who: { characterId: number | null; name: string }) {
    if (!supabase || busy) return;
    setBusy(true);
    if (who.characterId != null) {
      await supabase.from("gallery_tags")
        .delete().eq("post_id", postId).eq("character_id", who.characterId);
    } else {
      await supabase.from("gallery_tags")
        .delete().eq("post_id", postId).is("character_id", null).eq("name", who.name);
    }
    setBusy(false);
    await onReload();
    onChanged?.();
  }

  const pinned = tags.filter((g) => g.x != null).length;
  if (!people.size && !canEdit) return null;

  // Both sides can be null — an unnamed guest tag, and a member who has not
  // claimed a character — and null matching null would tell everybody without
  // a character that a tag was waiting on them.
  const waitingOnMe = myCharacterId != null && tags.some(
    (g) => g.character_id === myCharacterId && !g.confirmed_at);

  return (
    <div className="flex flex-col gap-2">
      <div className="font-data text-[10.5px] uppercase tracking-[0.14em] text-muted">
        {t("gallery.tagTitle")}
      </div>

      {waitingOnMe && (
        <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-[12.5px] leading-relaxed text-ink/85">
          {t("gallery.tagWaitingYou")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {[...people].map(([key, who]) => {
          const guest = who.characterId == null;
          const isMe = !guest && who.characterId === myCharacterId;
          // Mine to answer, or an admin answering for somebody who is not here.
          const canConfirm = who.pending && (isMe || isAdmin);
          // A guest cannot take their own name off a picture — there is no
          // account behind it to do the taking — so whoever may edit the post
          // is the only one who can.
          const canRemove = canEdit || isMe;
          return (
            <span key={key}
                  className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-1.5 text-[12.5px] ${
                    who.pending ? "border-dashed border-line text-muted"
                                : "border-line bg-card text-ink"}`}>
              {guest ? (
                <span className="font-data" title={t("gallery.tagGuest")}>{who.name}</span>
              ) : (
                <>
                  <Link href={`/member/${who.characterId}`}
                        className="font-data no-underline hover:text-accent">
                    {who.name}
                  </Link>
                  <TellButton name={who.name} size={13}
                              characterId={who.characterId} />
                </>
              )}
              {who.pins > 0 && (
                <span title={t("gallery.tagPinned")} className="text-[10px]">📍</span>
              )}
              {guest && (
                <span className="text-[10.5px] italic text-muted">
                  · {t("gallery.tagGuest")}
                </span>
              )}
              {who.pending && (
                <span className="text-[10.5px] italic">· {t("gallery.tagPending")}</span>
              )}
              {canConfirm && (
                <button onClick={() => confirm(who)} disabled={busy}
                        title={isMe ? t("gallery.tagConfirm") : t("gallery.tagConfirmFor")}
                        className="rounded-full border border-jade/50 px-2 text-[11px] text-jade hover:bg-jade/10 disabled:opacity-40">
                  ✓
                </button>
              )}
              {canRemove && (
                <button onClick={() => remove(who)} disabled={busy}
                        title={t("gallery.tagRemove")}
                        className="rounded-full border border-line px-1.5 text-[11px] text-muted hover:border-chili hover:text-chili disabled:opacity-40">
                  ✕
                </button>
              )}
            </span>
          );
        })}

        {!people.size && (
          <span className="text-[12.5px] text-muted">{t("gallery.tagNone")}</span>
        )}

        {/* The pins stay hidden until somebody points at one, which keeps the
            picture clean but gives no way to see the whole cast at once. This is
            that way: every ring drawn, every name in place, until it is turned
            off again. */}
        {pinned > 0 && (
          <button onClick={() => onReveal(!revealAll)}
                  className={`rounded-full border px-2.5 py-0.5 text-[12.5px] transition-colors ${
                    revealAll ? "border-accent bg-accent/15 text-accent"
                              : "border-line text-muted hover:border-accent hover:text-accent"}`}>
            {revealAll ? t("gallery.tagHideAll") : t("gallery.tagShowAll")}
          </button>
        )}

        {/* The one way in. Tagging starts on the picture, because a tag is a
            place before it is a name. */}
        {canEdit && (
          <button onClick={() => onPicking(!picking)}
                  className={`rounded-full border px-2.5 py-0.5 text-[12.5px] transition-colors ${
                    picking ? "border-accent bg-accent/15 text-accent"
                            : "border-dashed border-line text-muted hover:border-accent hover:text-accent"}`}>
            {picking ? t("common.cancel") : `📍 ${t("gallery.tagOnPhoto")}`}
          </button>
        )}
      </div>

      {canEdit && (
        <p className="text-[11.5px] leading-relaxed text-muted">{t("gallery.tagHint")}</p>
      )}
    </div>
  );
}
