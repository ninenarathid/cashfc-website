"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import type { GalleryTag } from "@/lib/gallery";
import MemberPicker, { type MemberOption } from "@/components/gallery/MemberPicker";

/**
 * Who is in this picture, written out under it.
 *
 * The pins on the photograph say where; this says who, and is the part that
 * works without a mouse, without hovering, and for a member who is in the shot
 * but not worth pointing at. Both are the same rows underneath.
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
  { postId, tags, options, canEdit, isAdmin, myCharacterId,
    picking, onPicking, onReload, onChanged }: {
    postId: number;
    tags: GalleryTag[];
    options: MemberOption[];
    /** The post's author or an admin: whoever may say who is in it. */
    canEdit: boolean;
    isAdmin: boolean;
    /** Only set for a signed-in member holding a verified character. */
    myCharacterId: number | null;
    picking: boolean;
    onPicking: (on: boolean) => void;
    onReload: () => Promise<void> | void;
    onChanged?: () => void;
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  // One entry per person, however many pins they have here.
  const people = new Map<number, { name: string; pending: boolean; pins: number }>();
  for (const g of tags) {
    const at = people.get(g.character_id);
    people.set(g.character_id, {
      name: g.name,
      pending: (at?.pending ?? false) || !g.confirmed_at,
      pins: (at?.pins ?? 0) + (g.x != null ? 1 : 0),
    });
  }

  async function add(o: MemberOption) {
    if (!supabase || busy) return;
    setBusy(true);
    // The row may come back already confirmed — the database does that for a
    // member tagging themselves — so read the truth back rather than guessing.
    await supabase.from("gallery_tags")
      .insert({ post_id: postId, character_id: o.id, name: o.name });
    setBusy(false);
    setAdding(false);
    await onReload();
    onChanged?.();
  }

  async function confirm(characterId: number) {
    if (!supabase || busy) return;
    setBusy(true);
    await supabase.from("gallery_tags")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("post_id", postId).eq("character_id", characterId);
    setBusy(false);
    await onReload();
    onChanged?.();
  }

  async function remove(characterId: number) {
    if (!supabase || busy) return;
    setBusy(true);
    await supabase.from("gallery_tags")
      .delete().eq("post_id", postId).eq("character_id", characterId);
    setBusy(false);
    await onReload();
    onChanged?.();
  }

  const canTag = canEdit || myCharacterId != null;
  if (!people.size && !canTag) return null;

  const waitingOnMe = tags.some(
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
        {[...people].map(([characterId, who]) => {
          const isMe = characterId === myCharacterId;
          // Mine to answer, or an admin answering for somebody who is not here.
          const canConfirm = who.pending && (isMe || isAdmin);
          const canRemove = canEdit || isMe;
          return (
            <span key={characterId}
                  className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-1.5 text-[12.5px] ${
                    who.pending ? "border-dashed border-line text-muted"
                                : "border-line bg-card text-ink"}`}>
              <Link href={`/member/${characterId}`}
                    className="font-data no-underline hover:text-accent">
                {who.name}
              </Link>
              {who.pins > 0 && (
                <span title={t("gallery.tagPinned")} className="text-[10px]">📍</span>
              )}
              {who.pending && (
                <span className="text-[10.5px] italic">· {t("gallery.tagPending")}</span>
              )}
              {canConfirm && (
                <button onClick={() => confirm(characterId)} disabled={busy}
                        title={isMe ? t("gallery.tagConfirm") : t("gallery.tagConfirmFor")}
                        className="rounded-full border border-jade/50 px-2 text-[11px] text-jade hover:bg-jade/10 disabled:opacity-40">
                  ✓
                </button>
              )}
              {canRemove && (
                <button onClick={() => remove(characterId)} disabled={busy}
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

        {/* Pointing at a face is the better tag when there is a face to point
            at, so it is the button offered first. */}
        {canEdit && (
          <button onClick={() => { onPicking(!picking); setAdding(false); }}
                  className={`rounded-full border px-2.5 py-0.5 text-[12.5px] transition-colors ${
                    picking ? "border-accent bg-accent/15 text-accent"
                            : "border-dashed border-line text-muted hover:border-accent hover:text-accent"}`}>
            {picking ? t("common.cancel") : `📍 ${t("gallery.tagOnPhoto")}`}
          </button>
        )}

        {canTag && !adding && (
          <button onClick={() => { setAdding(true); onPicking(false); }}
                  className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-[12.5px] text-muted hover:border-accent hover:text-accent">
            + {canEdit ? t("gallery.tagAdd") : t("gallery.tagMyself")}
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-lg border border-line bg-card p-2.5">
          {canEdit ? (
            <MemberPicker options={options} autoFocus
                          exclude={[...people.keys()]}
                          onPick={add} />
          ) : (
            // Not the poster: the only name you may add to somebody else's
            // picture is your own.
            <button onClick={() => {
                      const me = options.find((o) => o.id === myCharacterId);
                      if (me) void add(me);
                    }}
                    disabled={busy}
                    className="rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-50">
              {t("gallery.tagMyself")}
            </button>
          )}
          <button onClick={() => setAdding(false)}
                  className="mt-2 text-[12px] text-muted hover:text-ink">
            {t("common.cancel")}
          </button>
        </div>
      )}

      {canEdit && (
        <p className="text-[11.5px] leading-relaxed text-muted">{t("gallery.tagHint")}</p>
      )}
    </div>
  );
}
