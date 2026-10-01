"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { rememberTown, resumable } from "@/lib/town/active";
import { BUBBLE_MS } from "@/lib/town/chat";
import { currentSession, openSession, type TownSession } from "@/lib/town/session";
import ChatHistory from "./ChatHistory";

/**
 * The dock: still in Cash Town while you look at another page of the site.
 *
 * It says how many are in town and the last thing anybody typed, and keeps
 * the microphone, the chat, the way back to the map and the way out one tap
 * away, so going to look at the gallery never means leaving your friends.
 * After a reload, or a link that loads a whole page, it puts you back in town
 * by itself, if this tab was there a moment ago (lib/town/active) and the same
 * member is still signed in.
 *
 * Part of the town's own chunk, fetched only by a tab that is in town
 * (TownDock decides). On the z-index ladder at 45: above the page and the
 * header (40), below the phone's tab bar (50), which it sits just above, and
 * below every dialog, sheet, toast and popover.
 */

const noSubscribe = () => () => {};

function useWords() {
  const { lang } = useLang();
  const th = lang === "th";
  return {
    th,
    region: "Cash Town",
    here: (n: number) => (th ? `${n} คนในเมือง` : `${n} in town`),
    mic: th ? "เปิดไมค์อยู่" : "mic on",
    muted: th ? "ปิดเสียงตัวเองอยู่" : "muted",
    back: th ? "ไปที่เมือง" : "Go to town",
    leave: th ? "ออกจากเมือง" : "Leave town",
    micOn: th ? "เปิดไมค์ คุยกับทุกคน" : "Turn mic on and talk",
    mute: th ? "ปิดเสียงตัวเอง" : "Mute me",
    unmute: th ? "เปิดเสียงตัวเอง" : "Unmute me",
    hear: th ? "แตะเพื่อฟังเสียง" : "Tap to hear",
    chat: th ? "แชท" : "Chat",
    unread: (n: number) => (th ? `${n} ข้อความใหม่` : `${n} new`),
    placeholder: th ? "พิมพ์คุยกับทุกคนในเมือง…" : "Say something to everyone in town…",
    send: th ? "ส่ง" : "Send",
    slow: th ? "พิมพ์เร็วไปนิด รอแป๊บนึงนะ" : "A little fast. Wait a moment.",
    offline: th ? "ยังส่งไม่ได้ กำลังต่อใหม่" : "Can't send while reconnecting.",
    connecting: th ? "กำลังกลับเข้าเมือง…" : "Getting back in…",
    reconnecting: th ? "กำลังต่อใหม่…" : "Reconnecting…",
    full: th ? "ห้องเต็ม รอเข้าอยู่…" : "Room full, waiting…",
    micProblem: th ? "เปิดไมค์ไม่สำเร็จ แตะ 🎤 เพื่อลองใหม่" : "The mic didn't start. Tap 🎤 to try again.",
  };
}

export default function TownBar() {
  const w = useWords();
  const [session, setSession] = useState<TownSession | null>(() => currentSession());
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [lift, setLift] = useState(0);

  // Back into town after a reload, if this tab was there a moment ago and the
  // same member is still signed in (signing out loads a whole page too).
  useEffect(() => {
    if (session) return;
    const rec = resumable();
    if (!rec) return;
    if (rec.testTopic && process.env.NODE_ENV === "production") { rememberTown(null); return; }
    let cancelled = false;
    void (async () => {
      if (!rec.testTopic) {
        const supabase = createClient();
        const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
        if (data.session?.user.id !== rec.me.id) { rememberTown(null); return; }
      }
      if (cancelled) return;
      setSession(openSession(rec.me, {
        testTopic: rec.testTopic, cap: rec.cap, resume: { voice: rec.voice, muted: rec.muted },
      }));
    })();
    return () => { cancelled = true; };
  }, [session]);

  const version = useSyncExternalStore(session?.subscribe ?? noSubscribe, () => session?.version ?? 0, () => 0);

  // A door that will not open is not worth a dock.
  useEffect(() => {
    if (session && !session.closed && (session.status === "denied" || session.status === "needs-migration")) session.close();
  }, [session, version]);

  // While the chat is open, what arrives is read (ChatHistory keeps it in view).
  useEffect(() => {
    if (chatOpen) session?.readChat();
  }, [chatOpen, session, version]);

  // Typing on a phone: the keyboard covers the bottom of the page, and a dock
  // pinned there would be under it. Sit on top of the keyboard instead.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!chatOpen || !vv) { setLift(0); return; }
    const update = () => setLift(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [chatOpen]);

  // The latest line shows in the dock for a few seconds; this takes it away.
  const last = session?.chat[session.chat.length - 1];
  useEffect(() => {
    if (!last || last.mine) return;
    const left = BUBBLE_MS - (Date.now() - last.at);
    if (left <= 0) return;
    const id = window.setTimeout(() => setTick((n) => n + 1), left + 50);
    return () => window.clearTimeout(id);
  }, [last]);

  if (!session || session.closed) return null;
  const s = session;
  const ready = s.status === "ready";
  const voiceOn = s.self.info.voice && s.voice.active;
  const muted = s.self.info.muted;
  const fresh = last && !last.mine && Date.now() - last.at < BUBBLE_MS ? last : null;
  const line =
    s.status === "full" ? w.full
    : !ready ? (s.everReady ? w.reconnecting : w.connecting)
    : s.micProblem ? w.micProblem
    : fresh ? `${fresh.name}: ${fresh.text}`
    : voiceOn ? `${w.here(s.people.length + 1)} · ${muted ? w.muted : w.mic}`
    : w.here(s.people.length + 1);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const r = s.sendChat(draft);
    if (r === "sent") { setDraft(""); setNote(null); }
    else if (r === "slow") setNote(w.slow);
    else if (r === "offline") setNote(w.offline);
  };

  const iconBtn = "grid size-9 shrink-0 place-items-center rounded-full text-read transition-colors";

  return (
    <div role="region" aria-label={w.region} style={lift > 40 ? { bottom: lift + 8 } : undefined}
         className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[45] mx-auto max-w-md sm:inset-x-auto sm:bottom-5 sm:left-5 sm:mx-0 sm:w-[23rem]">
      {chatOpen && (
        <div data-state="open" className="pop-in mb-2 overflow-hidden rounded-2xl border border-line-lit bg-surface/95 shadow-xl shadow-black/40 backdrop-blur-sm"
             onKeyDown={(e) => { if (e.key === "Escape") setChatOpen(false); }}>
          <ChatHistory lines={s.chat} th={w.th} className="max-h-60" />
          <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-2">
            <input value={draft} onChange={(e) => { setDraft(e.target.value); setNote(null); }} autoFocus
                   maxLength={600} placeholder={w.placeholder} aria-label={w.placeholder} enterKeyHint="send"
                   className="min-w-0 flex-1 rounded-full border border-line-strong bg-bg px-3 py-1.5 text-read text-ink outline-none placeholder:text-muted focus:border-accent" />
            <button type="submit" className="rounded-full bg-accent/20 px-3 py-1.5 text-ui font-semibold text-accent hover:bg-accent/30">
              {w.send}
            </button>
          </form>
          {note && <p role="status" className="px-3 pb-2 text-label text-gold">{note}</p>}
        </div>
      )}

      {/* data-state: the site's quiet pop-in (globals.css), off for reduced motion. */}
      <div data-state="open" className="pop-in flex items-center gap-1 rounded-2xl border border-line-lit bg-surface/95 p-1.5 pl-3 shadow-xl shadow-black/40 backdrop-blur-sm">
        <Link href="/town" title={w.back} className="flex min-w-0 flex-1 items-center gap-2 no-underline">
          <span aria-hidden className={`size-2 shrink-0 rounded-full ${ready ? "bg-jade" : "bg-gold"}`} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-ui font-semibold text-ink">🏙️ Cash Town</span>
            <span aria-live="polite" className={`block truncate text-label ${fresh ? "text-ink" : "text-muted"}`}>{line}</span>
          </span>
          <span aria-hidden className="shrink-0 text-lead text-muted">›</span>
        </Link>

        {voiceOn && s.voice.audioBlocked && (
          <button type="button" onClick={() => s.voice.resumeAudio()} aria-label={w.hear} title={w.hear}
                  className={`${iconBtn} bg-gold text-bg`}>🔊</button>
        )}
        <button type="button" onClick={() => setChatOpen((o) => !o)} aria-expanded={chatOpen}
                aria-label={s.unread ? `${w.chat} (${w.unread(s.unread)})` : w.chat} title={w.chat}
                className={`${iconBtn} relative ${chatOpen ? "bg-accent/20 text-accent" : "text-muted hover:bg-card hover:text-ink"}`}>
          💬
          {s.unread > 0 && !chatOpen && (
            <span aria-hidden className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-chili px-1 font-data text-label leading-4 text-ink">
              {s.unread > 9 ? "9+" : s.unread}
            </span>
          )}
        </button>
        {voiceOn ? (
          <button type="button" onClick={() => s.toggleMute()} aria-pressed={muted}
                  aria-label={muted ? w.unmute : w.mute} title={muted ? w.unmute : w.mute}
                  className={`${iconBtn} ${muted ? "bg-chili text-ink" : "bg-jade/20 text-jade hover:bg-jade/30"}`}>
            {muted ? "🔇" : "🎤"}
          </button>
        ) : (
          <button type="button" onClick={() => void s.joinVoice()} disabled={!ready}
                  aria-label={w.micOn} title={w.micOn}
                  className={`${iconBtn} text-muted hover:bg-card hover:text-ink disabled:opacity-40`}>🎙️</button>
        )}
        <button type="button" onClick={() => s.close()} aria-label={w.leave} title={w.leave}
                className={`${iconBtn} text-muted hover:bg-card hover:text-ink`}>✕</button>
      </div>
    </div>
  );
}
