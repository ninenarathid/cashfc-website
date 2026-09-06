"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { useAdmin } from "@/lib/admin";
import { fmtDateTime } from "@/lib/dates";
import Attach from "@/components/feedback/Attach";
import { uploadFeedbackImage } from "@/lib/feedback";
import ImageLightbox from "@/components/ui/ImageLightbox";

interface Thread {
  id: number;
  author_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  seen_author: string | null;
  seen_admin: string | null;
}

interface Message {
  id: number;
  thread_id: number;
  author_id: string;
  body: string;
  created_at: string;
  /** Attached pictures, in the order they were dropped. */
  images: string[];
}

/**
 * Saying something to the admins, and being answered.
 *
 * A thread and its replies. Not a ticket system — no assignee, no priority, no
 * queue — because a Free Company with two admins does not have a queue. It has
 * the occasional "the board says I am on vacation and I am not", and that wants
 * somewhere to be said and an answer underneath it.
 *
 * The same component serves both sides. A member sees their own threads and an
 * admin sees everybody's, which is a difference in what the database returns
 * rather than a difference in what is drawn: two screens for one conversation is
 * how the two halves of it drift apart.
 *
 * Who is speaking is worked out from the thread rather than stored on each
 * message. There are only ever two sides, and the one that did not start it is
 * the admin side — which stays true even if the admin who replied is not the one
 * who reads it later.
 */
export default function Feedback() {
  const { t } = useLang();
  const [supabase] = useState(createClient);
  const { isAdmin } = useAdmin();
  const [me, setMe] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("");
  // Held as files until the message they belong to is sent, so an abandoned
  // draft leaves nothing in storage to go looking for later.
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  // Which attachment is open, and the message it belongs to — so the arrows
  // walk that message's pictures and stop at its edges rather than wandering
  // into the next person's screenshots.
  const [zoom, setZoom] = useState<{ images: string[]; at: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const foot = useRef<HTMLDivElement | null>(null);

  const loadThreads = useCallback(async () => {
    if (!supabase) { setReady(true); return; }
    const { data: user } = await supabase.auth.getUser();
    setMe(user.user?.id ?? null);
    if (!user.user) { setReady(true); return; }

    // No filter: the read policy already decides whose threads these are, and
    // repeating it here would be a second rule to keep in step with the first.
    const { data } = await supabase.from("feedback_threads")
      .select("id, author_id, subject, status, created_at, updated_at, seen_author, seen_admin")
      .order("updated_at", { ascending: false }).limit(100);
    const rows = (data as Thread[]) ?? [];
    setThreads(rows);

    const ids = [...new Set(rows.map((r) => r.author_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, character_name, display_name, discord_username").in("id", ids);
      const map: Record<string, string> = {};
      for (const p of (profs ?? []) as Record<string, string | null>[]) {
        map[p.id as string] = p.character_name ?? p.display_name
          ?? p.discord_username ?? "—";
      }
      setNames(map);
    }
    setReady(true);
  }, [supabase]);

  useEffect(() => { void loadThreads(); }, [loadThreads]);

  const openThread = useCallback(async (id: number) => {
    if (!supabase) return;
    setOpenId(id);
    setReply("");
    const ask = (cols: string) => supabase.from("feedback_messages")
      .select(cols).eq("thread_id", id).order("created_at", { ascending: true });
    // The attachment column arrived with migration_v34; asking for a column a
    // database has not got fails the whole query, and a conversation that goes
    // blank is worse than one with no pictures in it.
    const BASE = "id, thread_id, author_id, body, created_at";
    let got = await ask(`${BASE}, images`);
    if (got.error) got = await ask(BASE);
    setMessages(((got.data ?? []) as unknown as Message[])
      .map((m) => ({ ...m, images: m.images ?? [] })));
    // Opening it is reading it. The trigger keeps each side to its own column,
    // so this cannot clear the other side's mark.
    const column = isAdmin ? "seen_admin" : "seen_author";
    await supabase.from("feedback_threads")
      .update({ [column]: new Date().toISOString() }).eq("id", id);
    void loadThreads();
    setTimeout(() => foot.current?.scrollIntoView({ block: "nearest" }), 50);
  }, [supabase, isAdmin, loadThreads]);

  /**
   * The attached files, uploaded, as URLs — or null if one of them would not go.
   *
   * All or nothing on purpose. A message that arrives saying "here is the
   * screenshot" with the screenshot missing is worse than one that has not been
   * sent yet, so a failure stops the send and leaves the draft, the words and
   * the files exactly where they were for a second try.
   */
  async function attach(list: File[]): Promise<string[] | null> {
    if (!supabase || !me || !list.length) return [];
    const urls: string[] = [];
    for (const f of list) {
      const res = await uploadFeedbackImage(supabase, me, f);
      if ("error" in res) {
        setErr(res.error === "not-image" ? t("gallery.notImage")
          : res.error === "too-big" ? t("gallery.tooBig")
          : res.error.includes("Bucket not found") ? t("feedback.noBucket")
          : res.error);
        return null;
      }
      urls.push(res.url);
    }
    return urls;
  }

  async function start() {
    if (!supabase || !me || !subject.trim() || !draft.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.from("feedback_threads")
      .insert({ author_id: me, subject: subject.trim().slice(0, 120) })
      .select("id").single();
    if (error || !data) { setBusy(false); setErr(error?.message ?? "failed"); return; }
    const id = (data as { id: number }).id;
    const shots = await attach(draftFiles);
    if (shots === null) { setBusy(false); return; }
    const { error: msgErr } = await supabase.from("feedback_messages")
      .insert({ thread_id: id, author_id: me, body: draft.trim().slice(0, 4000),
                ...(shots.length ? { images: shots } : {}) });
    setBusy(false);
    if (msgErr) { setErr(msgErr.message); return; }
    setSubject(""); setDraft(""); setDraftFiles([]); setWriting(false);
    await loadThreads();
    void openThread(id);
  }

  async function send() {
    if (!supabase || !me || openId == null || !reply.trim() || busy) return;
    setBusy(true);
    const body = reply.trim().slice(0, 4000);
    const shots = await attach(replyFiles);
    if (shots === null) { setBusy(false); return; }
    const { error } = await supabase.from("feedback_messages")
      .insert({ thread_id: openId, author_id: me, body,
                ...(shots.length ? { images: shots } : {}) });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setReply(""); setReplyFiles([]);
    await openThread(openId);
  }

  async function setStatus(id: number, status: string) {
    if (!supabase) return;
    await supabase.from("feedback_threads").update({ status }).eq("id", id);
    await loadThreads();
  }

  if (!ready) return null;
  if (!me) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-[13.5px] leading-relaxed text-muted">
        {t("feedback.signIn")}
      </p>
    );
  }

  const current = threads.find((x) => x.id === openId) ?? null;
  const when = (iso: string) => fmtDateTime(iso);

  /** Unanswered from where you are sitting: something arrived after you last looked. */
  const unread = (x: Thread) => {
    const seen = isAdmin ? x.seen_admin : x.seen_author;
    return !seen || new Date(x.updated_at) > new Date(seen);
  };

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      {/* ── The threads ── */}
      <div className="flex flex-col gap-2">
        {!isAdmin && !writing && (
          <button onClick={() => { setWriting(true); setOpenId(null); }}
                  className="rounded-lg border border-accent bg-accent/15 px-3.5 py-2 text-[13.5px] text-accent hover:bg-accent/25">
            + {t("feedback.new")}
          </button>
        )}

        {writing && (
          <div className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-surface p-3">
            <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 120))}
                   placeholder={t("feedback.subject")}
                   className="rounded-lg border border-line bg-card px-3 py-2 text-[13.5px] text-ink placeholder:text-muted" />
            <textarea value={draft} rows={5}
                      onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
                      placeholder={t("feedback.body")}
                      className="rounded-lg border border-line bg-card px-3 py-2 text-[13.5px] leading-relaxed text-ink placeholder:text-muted" />
            <Attach files={draftFiles} onChange={setDraftFiles} disabled={busy} />
            <div className="flex flex-wrap gap-2">
              <button onClick={start} disabled={busy || !subject.trim() || !draft.trim()}
                      className="rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-40">
                {t("feedback.send")}
              </button>
              <button onClick={() => {
                        setWriting(false); setSubject(""); setDraft("");
                        setDraftFiles([]);
                      }}
                      className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:border-muted hover:text-ink">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        {threads.length === 0 && !writing && (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-[12.5px] leading-relaxed text-muted">
            {isAdmin ? t("feedback.emptyAdmin") : t("feedback.empty")}
          </p>
        )}

        {threads.map((x) => (
          <button key={x.id} onClick={() => { setWriting(false); void openThread(x.id); }}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    x.id === openId ? "border-accent bg-accent/5"
                                    : "border-line bg-surface hover:border-muted"}`}>
            <div className="flex items-start gap-2">
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
                {x.subject}
              </span>
              {unread(x) && (
                <span className="mt-1 size-2 shrink-0 rounded-full bg-chili" />
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted">
              {isAdmin && <span className="text-ink/70">{names[x.author_id] ?? "—"}</span>}
              <span>{when(x.updated_at)}</span>
              {x.status === "closed" && (
                <span className="rounded-full border border-line px-1.5">
                  {t("feedback.closed")}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ── The conversation ── */}
      <div className="rounded-xl border border-line bg-surface p-4">
        {!current ? (
          <p className="py-10 text-center text-[13px] text-muted">{t("feedback.pick")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{current.subject}</h2>
              <button onClick={() => setStatus(current.id,
                                current.status === "closed" ? "open" : "closed")}
                      className="rounded-lg border border-line px-3 py-1 text-[12.5px] text-muted hover:border-accent hover:text-accent">
                {current.status === "closed" ? t("feedback.reopen") : t("feedback.close")}
              </button>
            </div>

            <div className="flex max-h-[26rem] flex-col gap-2.5 overflow-y-auto pr-1">
              {messages.map((msg) => {
                const fromAuthor = msg.author_id === current.author_id;
                const fromMe = msg.author_id === me;
                return (
                  <div key={msg.id}
                       className={`rounded-xl border px-3 py-2 ${
                         fromAuthor
                           ? "border-line bg-card"
                           : "border-accent/40 bg-accent/5"}`}>
                    <div className="flex flex-wrap items-baseline gap-2 text-[11.5px]">
                      <span className={fromAuthor ? "text-ink/80" : "text-accent"}>
                        {fromAuthor
                          ? (names[msg.author_id] ?? t("feedback.member"))
                          : t("feedback.adminSide")}
                        {fromMe && ` · ${t("feedback.you")}`}
                      </span>
                      <span className="text-muted">{when(msg.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink/90">
                      {msg.body}
                    </p>
                    {msg.images.length > 0 && (
                      // Small in the message, big in place. A new tab took the
                      // reader out of the conversation the picture was attached
                      // to and lost their place in it on the way back, for a
                      // bare URL in a tab that could not say which message it
                      // came from.
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.images.map((src, n) => (
                          <button key={src} type="button"
                                  onClick={() => setZoom({ images: msg.images, at: n })}
                                  className="block cursor-zoom-in">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" loading="lazy"
                                 className="h-28 w-auto rounded-md border border-line object-contain transition-colors hover:border-accent" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={foot} />
            </div>

            <div className="flex flex-col gap-2">
              <textarea value={reply} rows={3}
                        onChange={(e) => setReply(e.target.value.slice(0, 4000))}
                        placeholder={t("feedback.reply")}
                        className="rounded-lg border border-line bg-card px-3 py-2 text-[13.5px] leading-relaxed text-ink placeholder:text-muted" />
              <Attach files={replyFiles} onChange={setReplyFiles} disabled={busy} />
              <div>
                <button onClick={send} disabled={busy || !reply.trim()}
                        className="rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-[13px] text-accent hover:bg-accent/25 disabled:opacity-40">
                  {t("feedback.send")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {zoom && (
        <ImageLightbox images={zoom.images} at={zoom.at}
                       onMove={(at) => setZoom((z) => (z ? { ...z, at } : z))}
                       onClose={() => setZoom(null)} />
      )}

      {err && <p className="text-[12.5px] text-chili md:col-span-2">{err}</p>}
    </div>
  );
}
