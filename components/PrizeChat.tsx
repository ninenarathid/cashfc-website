"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLang } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/dates";
import { markRead, messagesFor, say, type PrizeMessage } from "@/lib/prizes";

/**
 * The conversation about one prize, drawn the same on both sides.
 *
 * One component for the winner's inventory and the admin queue, for the reason
 * the feedback threads give: two screens for one conversation is how the two
 * halves of it drift apart. Which side each message came from is worked out
 * from the win rather than stored on the message — there are only ever two
 * sides, and the one that is not the winner is the admins.
 *
 * A thread that has been handed over is read-only. The database says so too;
 * this only stops the box being offered.
 */
export default function PrizeChat(
  { supabase, winId, me, winner, closed, nameOf }: {
    supabase: SupabaseClient;
    winId: number;
    /** Who is reading. */
    me: string;
    /** Whose prize it is, which is how a message's side is decided. */
    winner: string;
    /** Handed over: the thread is finished and takes nothing more. */
    closed: boolean;
    /** A name for an account id, where the caller has one. */
    nameOf?: (id: string) => string | null;
  },
) {
  const { t } = useLang();
  const [msgs, setMsgs] = useState<PrizeMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const foot = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setMsgs(await messagesFor(supabase, winId));
  }, [supabase, winId]);

  useEffect(() => {
    void load();
    // Opening it is reading it. Both columns go out and the trigger keeps
    // whichever is this reader's, so the browser never has to know which side
    // it is on before it can mark anything.
    void markRead(supabase, winId);
  }, [load, supabase, winId]);

  // Only once there is something to scroll past, so an empty thread does not
  // yank the page about on open.
  useEffect(() => {
    if (msgs?.length) foot.current?.scrollIntoView({ block: "nearest" });
  }, [msgs]);

  const send = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setErr(null);
    const r = await say(supabase, winId, me, body);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setDraft("");
    await load();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
        {msgs === null && <p className="text-ui text-muted">…</p>}
        {msgs?.length === 0 && (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-ui leading-relaxed text-muted">
            {t("prize.chatEmpty")}
          </p>
        )}
        {msgs?.map((m) => {
          const fromWinner = m.authorId === winner;
          const mine = m.authorId === me;
          return (
            <div key={m.id}
                 className={`rounded-xl border px-3 py-2 ${
                   fromWinner ? "border-line bg-card" : "border-accent/40 bg-accent/5"}`}>
              <div className="flex flex-wrap items-baseline gap-2 text-meta">
                <span className={fromWinner ? "text-ink/80" : "text-accent"}>
                  {fromWinner
                    ? (nameOf?.(m.authorId) ?? t("prize.sideWinner"))
                    : t("prize.sideAdmin")}
                  {mine && ` · ${t("feedback.you")}`}
                </span>
                <span className="text-muted">{fmtDateTime(m.at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-read leading-relaxed text-ink/90">
                {m.body}
              </p>
            </div>
          );
        })}
        <div ref={foot} />
      </div>

      {closed ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-2 text-ui text-muted">
          {t("prize.chatClosed")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea value={draft} rows={2}
                    onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
                    placeholder={t("prize.chatSay")}
                    className="rounded-lg border border-line bg-card px-3 py-2 text-read leading-relaxed text-ink placeholder:text-muted" />
          <div>
            <button type="button" onClick={() => void send()} disabled={busy || !draft.trim()}
                    className="rounded-lg border border-accent bg-accent/15 px-3.5 py-1.5 text-read text-accent hover:bg-accent/25 disabled:opacity-40">
              {t("feedback.send")}
            </button>
          </div>
        </div>
      )}
      {err && <p className="text-ui text-chili">{err}</p>}
    </div>
  );
}
