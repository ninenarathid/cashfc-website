"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import type { GalleryTag } from "@/lib/gallery";
import MemberPicker, { type MemberOption } from "@/components/gallery/MemberPicker";

/**
 * Who else is in this picture.
 *
 * A group shot belongs to everybody in it, so a tag puts the picture on the
 * tagged member's page alongside their own — eight people in one screenshot
 * should not each have to post their own copy.
 *
 * The tag does nothing until the person tagged agrees. Anybody may write your
 * name on a picture; only you decide whether it appears on your page, and until
 * you do the tag sits here marked as waiting and the picture is nowhere near
 * you. An admin can agree on behalf of a member who never signs in, which is the
 * escape hatch for most of the roster — a named person choosing, rather than the
 * tag quietly defaulting to yes.
 *
 * Tagging yourself needs no such ceremony and takes effect at once; the database
 * confirms it on the way in.
 */
export default function PostTags(
  { postId, options, canEdit, isAdmin, myCharacterId, onChanged }: {
    postId: number;
    options: MemberOption[];
    /** The post's author or an admin: whoever may say who is in it. */
    canEdit: boolean;
    isAdmin: boolean;
    /** Only set for a signed-in member holding a verified character. */
    myCharacterId: number | null;
    onChanged?: () => void;
  },
) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [tags, setTags] = useState<GalleryTag[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("gallery_tags")
      .select("post_id, character_id, name, confirmed_at, created_at")
      .eq("post_id", postId).order("created_at", { ascending: true });
    setTags((data as GalleryTag[]) ?? []);
  }, [supabase, postId]);

  useEffect(() => { void load(); }, [load]);

  async function add(o: MemberOption) {
    if (!supabase || busy) return;
    setBusy(true);
    // The row may come back already confirmed — the database does that for a
    // member tagging themselves — so read the truth back rather than guessing.
    await supabase.from("gallery_tags")
      .insert({ post_id: postId, character_id: o.id, name: o.name });
    setBusy(false);
    setAdding(false);
    await load();
    onChanged?.();
  }

  async function confirm(characterId: number) {
    if (!supabase || busy) return;
    setBusy(true);
    await supabase.from("gallery_tags")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("post_id", postId).eq("character_id", characterId);
    setBusy(false);
    await load();
    onChanged?.();
  }

  async function remove(characterId: number) {
    if (!supabase || busy) return;
    setBusy(true);
    await supabase.from("gallery_tags")
      .delete().eq("post_id", postId).eq("character_id", characterId);
    setBusy(false);
    await load();
    onChanged?.();
  }

  const canTag = canEdit || myCharacterId != null;
  if (!tags.length && !canTag) return null;

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
        {tags.map((g) => {
          const pending = !g.confirmed_at;
          const isMe = g.character_id === myCharacterId;
          // Mine to answer, or an admin answering for somebody who is not here.
          const canConfirm = pending && (isMe || isAdmin);
          const canRemove = canEdit || isMe;
          return (
            <span key={g.character_id}
                  className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-1.5 text-[12.5px] ${
                    pending ? "border-dashed border-line text-muted"
                            : "border-line bg-card text-ink"}`}>
              <Link href={`/member/${g.character_id}`}
                    className="font-data no-underline hover:text-accent">
                {g.name}
              </Link>
              {pending && (
                <span className="text-[10.5px] italic">· {t("gallery.tagPending")}</span>
              )}
              {canConfirm && (
                <button onClick={() => confirm(g.character_id)} disabled={busy}
                        title={isMe ? t("gallery.tagConfirm") : t("gallery.tagConfirmFor")}
                        className="rounded-full border border-jade/50 px-2 text-[11px] text-jade hover:bg-jade/10 disabled:opacity-40">
                  ✓
                </button>
              )}
              {canRemove && (
                <button onClick={() => remove(g.character_id)} disabled={busy}
                        title={t("gallery.tagRemove")}
                        className="rounded-full border border-line px-1.5 text-[11px] text-muted hover:border-chili hover:text-chili disabled:opacity-40">
                  ✕
                </button>
              )}
            </span>
          );
        })}

        {!tags.length && (
          <span className="text-[12.5px] text-muted">{t("gallery.tagNone")}</span>
        )}

        {canTag && !adding && (
          <button onClick={() => setAdding(true)}
                  className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-[12.5px] text-muted hover:border-accent hover:text-accent">
            + {canEdit ? t("gallery.tagAdd") : t("gallery.tagMyself")}
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-lg border border-line bg-card p-2.5">
          {canEdit ? (
            <MemberPicker options={options} autoFocus
                          exclude={tags.map((g) => g.character_id)}
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
