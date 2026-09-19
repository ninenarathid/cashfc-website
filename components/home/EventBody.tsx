"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Messages from "@/components/ui/Messages";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { createClient } from "@/lib/supabase/client";
import {
  NOTICE_THREAD, addToThread, dropFromThread, editInThread, loadThread,
  reactInThread, type Message,
} from "@/lib/threads";
import { uploadPartyImage } from "@/lib/party-db";
import type { PersonOption } from "@/lib/people";
import { eventPath, picsOf, type Notice } from "@/lib/events";
import { useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";

/**
 * One notice: its pictures, what it says, and the conversation under it.
 *
 * Drawn the same whether it was opened from the front page or reached by its
 * own link — the modal and the page are two frames around this, and a notice
 * that looked like two different things depending on how you arrived at it
 * would be a strange thing to send somebody.
 */
export default function EventBody(
  { notice, people, onCount, heading = false }: {
    notice: Notice;
    people: PersonOption[];
    /** So a card behind this can say the new number without being reloaded. */
    onCount?: (n: number) => void;
    /**
     * Head it with its own title.
     *
     * On for the page, off in the window — where the title is the window's,
     * drawn by Modal along with the thing that closes it. Here rather than in
     * the page because the title has two languages and the language is only
     * known on this side of the line.
     */
    heading?: boolean;
  },
) {
  const { t, lang } = useLang();
  const [supabase] = useState(createClient);
  const [me, setMe] = useState<string | null>(null);
  const [who, setWho] = useState<PersonOption | null>(null);
  const [talk, setTalk] = useState<Message[]>([]);
  const [shown, setShown] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const title = (lang === "en" ? notice.title_en : null) || notice.title;
  const body = (lang === "en" ? notice.body_en : null) || notice.body;
  const pics = picsOf(notice);

  /*
   * Held rather than depended on.
   *
   * The card behind hands this in freshly every time it draws, so naming it as
   * something `load` depends on made `load` new on every render, which made the
   * effect run again, which set the count, which drew the card again. The
   * window read the thread in a loop and never stopped. What is wanted is the
   * latest one at the moment it is called, which is a ref.
   */
  const tell = useRef(onCount);
  tell.current = onCount;

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id ?? null;
    setMe(uid);
    if (uid) {
      /*
       * Who the reader is, not merely whether they are signed in.
       *
       * Their name and face go on what they send and on every reaction they
       * give, the same as under a photograph or a raid plan.
       *
       * A verified character, not a claimed one: this is the name the FC will
       * read the message under, and an unproven claim is a name somebody
       * picked off a list. Null leaves the conversation readable and takes
       * away the box, which says why.
       */
      const { data: p } = await supabase.from("profiles")
        .select("character_id, character_verified_at, character_name,"
          + " display_name, discord_username, discord_avatar, avatar_url")
        .eq("id", uid).maybeSingle();
      const r = p as {
        character_id?: number | null; character_verified_at?: string | null;
        character_name?: string | null;
        display_name?: string | null; discord_username?: string | null;
        discord_avatar?: string | null; avatar_url?: string | null;
      } | null;
      setWho(r?.character_id != null && r.character_verified_at ? {
        id: r.character_id,
        name: r.character_name ?? r.display_name ?? r.discord_username ?? "—",
        avatar: r.avatar_url ?? r.discord_avatar ?? null,
      } : null);
    } else {
      setWho(null);
    }
    const rows = await loadThread(supabase, NOTICE_THREAD, notice.id);
    setTalk(rows);
    tell.current?.(rows.filter((c) => !c.deletedAt).length);
  }, [supabase, notice.id]);

  useEffect(() => { void load(); }, [load]);

  /**
   * Puts the link on the clipboard, and does nothing else.
   *
   * The same as the gallery's, down to the throwaway query on the end: Discord
   * keeps what it has already unfurled, keyed by URL, so a link it has seen
   * before shows the card it saw then — a poster since replaced, a second
   * picture since added. This one it has not seen, which changes nothing about
   * where it goes and everything about whether it looks again.
   *
   * Not navigator.share. On a desktop that is the operating system's share
   * sheet, a panel of contacts laid over the poster somebody was reading;
   * anybody who wants it has one in their browser already.
   */
  async function share() {
    const url = `${location.origin}${eventPath(notice.id)}`
      + `?v=${Date.now().toString(36)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard refused; nothing useful to say about it */ }
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      {heading && (
        <header className="flex flex-col gap-1">
          <div className="font-data text-meta uppercase tracking-[0.16em] text-muted">
            {fmtDate(notice.created_at)}
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight">
            {title}
          </h1>
        </header>
      )}

      {pics.length > 0 && (
        <div className="flex flex-col gap-2">
          {/*
            * Contained rather than cropped, and given most of a screen.
            *
            * These carry the rules of an event in small type down one side, and
            * a poster you can see there is writing on but cannot read is the
            * worst of both. The blurred copy behind it fills whatever the shape
            * leaves over, so a portrait poster and a wide banner both sit in
            * the same frame without either looking like a mistake.
            */}
          <button type="button" onClick={() => setZoom(shown)} aria-label={title}
                  className="relative isolate block w-full overflow-hidden rounded-xl border border-line bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pics[shown]} alt="" aria-hidden
                 className="absolute inset-0 size-full scale-125 object-cover opacity-30 blur-2xl" />
            <span aria-hidden className="absolute inset-0 bg-bg/25" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pics[shown]} alt={title}
                 className="relative mx-auto block max-h-[72vh] w-auto max-w-full object-contain" />
          </button>

          {/*
            * The rest of them, as thumbnails.
            *
            * An event is often three pictures — the poster, the rules and the
            * prize — and stacking all three at full height would mean scrolling
            * past two of them to reach the words. Side by side, the reader
            * picks, and the one being shown says so.
            */}
          {pics.length > 1 && (
            <div className="no-bar flex gap-2 overflow-x-auto pb-0.5">
              {pics.map((src, i) => (
                <button key={src} type="button" onClick={() => setShown(i)}
                        aria-label={String(i + 1)} aria-current={i === shown}
                        className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                          i === shown ? "border-accent"
                                      : "border-line hover:border-muted"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy"
                       className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {body && (
        <p className="whitespace-pre-wrap text-title leading-relaxed text-ink/85">
          {body}
        </p>
      )}

      {/* Under the notice rather than over it: somebody sends this on once they
          have read it and decided it is worth sending, which is here. */}
      <div className="flex items-center">
        <button type="button" onClick={share}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-read text-muted transition-colors hover:border-accent hover:text-accent">
          {copied ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                 strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                 strokeLinejoin="round" aria-hidden>
              <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
              <path d="M12 15V3" />
              <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
            </svg>
          )}
          {copied ? t("gallery.copied") : t("gallery.share")}
        </button>
      </div>

      {supabase && (
        <Messages comments={talk} people={people} me={who} userId={me}
                  upload={(f) => uploadPartyImage(supabase, me!, f)}
                  write={(cid, emoji, mine, w) =>
                    void reactInThread(
                      supabase, NOTICE_THREAD, me!, cid, emoji, w, mine)}
                  onAdd={async (c) => {
                    // On the screen first, then written: a reply that waits for
                    // a round trip before appearing reads as one that did not
                    // send.
                    setTalk((v) => [...v, c]);
                    if (!me) return;
                    await addToThread(supabase, NOTICE_THREAD, notice.id, me, {
                      text: c.text, images: c.images,
                      mentions: c.mentions, mentionsAll: c.mentionsAll,
                      replyTo: c.replyTo,
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
                        const by = rs[i].by.filter(
                          (x) => x.characterId !== w.characterId);
                        if (by.length) rs[i] = { ...rs[i], by };
                        else rs.splice(i, 1);
                      }
                      return { ...c, reactions: rs };
                    }))}
                  onEdit={me ? async (cid, text) => {
                    await editInThread(supabase, NOTICE_THREAD, cid, text);
                    await load();
                  } : undefined}
                  onDrop={me ? async (cid) => {
                    await dropFromThread(supabase, NOTICE_THREAD, cid);
                    await load();
                  } : undefined} />
      )}

      {!me && (
        <p className="text-read text-muted">{t("home.signInToReply")}</p>
      )}

      {zoom !== null && (
        <ImageLightbox images={pics} at={zoom}
                       onMove={(i) => { setZoom(i); setShown(i); }}
                       onClose={() => setZoom(null)} />
      )}
    </div>
  );
}
