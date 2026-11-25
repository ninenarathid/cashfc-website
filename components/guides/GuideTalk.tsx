"use client";

import { useCallback, useEffect, useState } from "react";
import Messages from "@/components/ui/Messages";
import { createClient } from "@/lib/supabase/client";
import {
  GUIDE_THREAD, addToThread, dropFromThread, editInThread, loadThread,
  reactInThread, type Message,
} from "@/lib/threads";
import { uploadPartyImage } from "@/lib/party-db";
import type { PersonOption } from "@/lib/people";
import { useLang } from "@/lib/i18n";

/**
 * The talk under a guide (the owner, 2026-11-25: "chat เหมือนในหน้า gallery
 * กับ party finder"): the site's own conversation (ui/Messages over
 * lib/threads), wired exactly as an event's is in home/EventBody. Anybody
 * reads it; a member with a proved character writes (v349 holds that).
 */
export default function GuideTalk({ guideId, people }: { guideId: number; people: PersonOption[] }) {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const [me, setMe] = useState<string | null>(null);
  const [who, setWho] = useState<PersonOption | null>(null);
  const [talk, setTalk] = useState<Message[]>([]);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id ?? null;
    setMe(uid);
    if (uid) {
      const { data: p } = await supabase.from("profiles")
        .select("character_id, character_verified_at, character_name,"
          + " display_name, discord_username, discord_avatar, avatar_url")
        .eq("id", uid).maybeSingle();
      const r = p as {
        character_id?: number | null; character_verified_at?: string | null;
        character_name?: string | null; display_name?: string | null;
        discord_username?: string | null; discord_avatar?: string | null; avatar_url?: string | null;
      } | null;
      setWho(r?.character_id != null && r.character_verified_at ? {
        id: r.character_id,
        name: r.character_name ?? r.display_name ?? r.discord_username ?? "—",
        avatar: r.avatar_url ?? r.discord_avatar ?? null,
      } : null);
    } else {
      setWho(null);
    }
    setTalk(await loadThread(supabase, GUIDE_THREAD, guideId));
  }, [supabase, guideId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section id="talk" className="mt-8 scroll-mt-[calc(var(--nav-h)+1rem)]">
      <h2 className="mb-2.5 font-display text-lg font-semibold">{t("guide.talk")}</h2>
      {supabase && (
        <Messages comments={talk} people={people} me={who} userId={me}
                  upload={(f) => uploadPartyImage(supabase, me!, f)}
                  write={(cid, emoji, mine, w) =>
                    void reactInThread(supabase, GUIDE_THREAD, me!, cid, emoji, w, mine)}
                  onAdd={async (c) => {
                    // On the screen first, then written, as everywhere else.
                    setTalk((v) => [...v, c]);
                    if (!me) return;
                    await addToThread(supabase, GUIDE_THREAD, guideId, me, {
                      text: c.text, images: c.images,
                      mentions: c.mentions, mentionsAll: c.mentionsAll, replyTo: c.replyTo,
                    });
                    await load();
                  }}
                  onReact={(cid, emoji, on, w) =>
                    setTalk((v) => v.map((c) => {
                      if (c.id !== cid) return c;
                      const rs = [...(c.reactions ?? [])];
                      const i = rs.findIndex((r) => r.emoji === emoji);
                      if (on) {
                        if (i < 0) rs.push({ emoji, by: [w] });
                        else rs[i] = { ...rs[i], by: [...rs[i].by, w] };
                      } else if (i >= 0) {
                        const by = rs[i].by.filter((x) => x.characterId !== w.characterId);
                        if (by.length) rs[i] = { ...rs[i], by };
                        else rs.splice(i, 1);
                      }
                      return { ...c, reactions: rs };
                    }))}
                  onEdit={me ? async (cid, text) => {
                    await editInThread(supabase, GUIDE_THREAD, cid, text);
                    await load();
                  } : undefined}
                  onDrop={me ? async (cid) => {
                    await dropFromThread(supabase, GUIDE_THREAD, cid);
                    await load();
                  } : undefined} />
      )}
      {!me && <p className="mt-2 text-read text-muted">{t("home.signInToReply")}</p>}
    </section>
  );
}
