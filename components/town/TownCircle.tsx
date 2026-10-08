"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CircleNote, TownSession } from "@/lib/town/session";
import { SIGN, decodeSign } from "@/lib/town/sign";
import ChatHistory from "./ChatHistory";
import SignIcon from "./SignIcon";
import TownIcon from "./TownIcon";
import TownFoot from "./TownFoot";

const NOTE: Record<CircleNote, [th: string, en: string]> = {
  full: ["ห้องเต็มแล้ว", "The room is full"],
  out: ["เจ้าของห้องให้ออกจากห้อง", "The room's holder let you go"],
  end: ["ห้องปิดแล้ว", "The room is over"],
  quiet: ["เจ้าของห้องไม่ตอบ", "The room's holder did not answer"],
};

/**
 * The chat room under a sign (lib/town/circle; the owner, 2026-10-06: "เอาแบบ RO
 * แต่แยกเสียงในห้องได้ด้วย"), for whoever is in one: who is in it, what is typed
 * in it, and a box of its own to type into. What is typed here goes to those
 * in the room and nobody else; the town's own chat box still speaks to the
 * town. With the microphone on, the room is all one hears and all that hears
 * one, and the panel says so.
 *
 * Its holder closes it by taking the sign down, and lets somebody go by their
 * name (asked a second time); anybody else leaves by the button, or by walking
 * off. Folded, it is a small board with how many lines wait to be read.
 *
 * Until one is in a room it shows only what a room last said: that one is
 * asking to be let in, or why one was not.
 */
export default function TownCircle({ session, th, phone, tabbar, hidden }: {
  session: TownSession;
  th: boolean;
  phone: boolean;
  tabbar: boolean;
  /** Something else is open over the map: the room is folded meanwhile. */
  hidden: boolean;
}) {
  useSyncExternalStore(session.subscribe, session.getVersion, () => 0);
  const t = (a: string, b: string) => (th ? a : b);
  const c = session.circle, mine = c?.host === session.me.id;
  const [folded, setFolded] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);
  const shown = !!c && !folded && !hidden;

  // A new room opens unfolded; what was typed for another is not kept for it.
  const host = c?.host ?? null;
  useEffect(() => { setFolded(false); setDraft(""); setSure(null); setNote(null); }, [host]);
  // What is shown is read.
  const lines = session.circleChat.length;
  useEffect(() => { if (shown) session.readCircle(); }, [shown, lines, session]);
  // What a room last said is said for a few seconds.
  const last = session.circleNote;
  useEffect(() => { if (!last) return; const id = setTimeout(() => session.clearCircleNote(), 4500); return () => clearTimeout(id); }, [last, session]);
  useEffect(() => { if (!note) return; const id = setTimeout(() => setNote(null), 2500); return () => clearTimeout(id); }, [note]);

  // (for scripts in `next dev`: whether the room's panel is open, and what it shows)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = { shown: () => shown, folded: () => folded, fold: (f: boolean) => setFolded(f) };
    (window as unknown as { __townCircle?: typeof handle }).__townCircle = handle;
    return () => { delete (window as unknown as { __townCircle?: typeof handle }).__townCircle; };
  }, [shown, folded]);

  const word = !c && (session.circleAsked || last) && !hidden && (
    <TownFoot rank="toast" order={10}>
      <p role="status" data-circle-word className="pop-in flex min-h-9 items-center gap-2 rounded-full border border-line-lit bg-surface/95 px-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm">
        <TownIcon name="chat" size={16} />{last ? (th ? NOTE[last][0] : NOTE[last][1]) : t("กำลังขอเข้าห้อง…", "Asking to come in…")}
      </p>
    </TownFoot>
  );
  if (!c) return word || null;

  const holder = mine ? session.self : session.avatars.get(c.host);
  const title = decodeSign(holder?.info.sign)?.title || t("ห้องแชท", "Chat room");
  const people = c.members.map((id) => {
    const a = id === session.me.id ? session.self : session.avatars.get(id);
    return { id, name: a?.info.name ?? "…", voice: !!a?.info.voice, muted: !!a?.info.muted, me: id === session.me.id, host: id === c.host };
  });
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const did = session.sayCircle(draft);
    if (did === "sent") { setDraft(""); return; }
    if (did === "slow") setNote(t("พิมพ์เร็วไป รอสักครู่", "A moment: that was quick"));
    else if (did === "offline") setNote(t("ยังต่อกับเมืองไม่ได้", "Not connected just now"));
  };
  const leave = () => { if (mine) session.lowerSign(); else session.leaveCircle(); };

  if (!shown) {
    return (
      <TownFoot rank="corner">
      <button type="button" onClick={() => setFolded(false)} disabled={hidden} data-circle-chip
              className={`pop-in pressable pointer-events-auto flex min-h-10 max-w-full items-center gap-2 border-2 border-[#2a1b12] bg-[#c8975a] px-3 text-ui font-bold text-[#2b1a0c] shadow-[inset_0_2px_0_#e9c78b,inset_0_-3px_0_#a47238] ${hidden ? "hidden" : ""}`}>
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#3d2913]"><TownIcon name="chat" size={12} /></span>
        <span className="truncate">{title}</span>
        <span className="rounded bg-[#3d2913] px-1.5 py-px font-data text-label tabular-nums text-[#f3e3c3]">{c.members.length}/{SIGN.cap}</span>
        {session.circleUnread > 0 && <span className="rounded-full bg-chili px-1.5 font-data text-label tabular-nums text-white" data-circle-unread>{session.circleUnread}</span>}
      </button>
      </TownFoot>
    );
  }
  return (
    <div className={`pop-in absolute z-20 flex flex-col overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
           ? "inset-x-0 h-[min(62%,30rem)] rounded-t-2xl"
           : "left-3 top-16 max-h-[min(28rem,calc(100%-13rem))] w-[21rem] rounded-2xl"}`}
         style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : undefined}
         data-state="open" data-circle-panel>
      {/* the room's head is the board it is held up on */}
      <div className="relative flex items-center gap-2 border-b-2 border-[#2a1b12] bg-gradient-to-b from-[#d9aa63] to-[#b98445] px-3 py-2 shadow-[inset_0_2px_0_#e9c78b,inset_0_-3px_0_#a47238]">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#3d2913]"><TownIcon name="chat" size={14} /></span>
        <h2 className="min-w-0 flex-1 truncate font-display text-read font-bold text-[#2b1a0c]" data-circle-title>{title}</h2>
        <span className="rounded bg-[#3d2913] px-1.5 py-px font-data text-label font-bold tabular-nums text-[#f3e3c3]" data-circle-count>{c.members.length}/{SIGN.cap}</span>
        <button type="button" onClick={() => setFolded(true)} aria-label={t("พับห้อง", "Fold the room away")} title={t("พับห้อง", "Fold the room away")}
                className="pressable grid size-8 place-items-center rounded-full text-[#2b1a0c] hover:bg-[#2b1a0c]/15"><TownIcon name="chevron" size={14} /></button>
      </div>

      {/* who is in it; its holder lets somebody go by their name, asked a second time */}
      <ul className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2" aria-label={t("คนในห้อง", "In the room")} data-circle-people>
        {people.map((p) => {
          const body = (
            <>
              {p.host && <SignIcon size={13} />}
              <span className={`max-w-[9rem] truncate ${p.me ? "text-gold" : "text-ink"}`}>{p.name}</span>
              {p.voice && <TownIcon name={p.muted ? "muted" : "mic"} size={12} />}
            </>
          );
          return (
            <li key={p.id} data-member={p.id}>
              {mine && !p.me ? (
                <button type="button" onClick={() => { if (sure === p.id) { session.letGo(p.id); setSure(null); } else setSure(p.id); }} onBlur={() => setSure(null)} data-let-go={p.id}
                        className={`pressable flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-meta ${sure === p.id ? "border-chili bg-chili/20 text-chili" : "border-line-strong bg-card/60 hover:border-chili"}`}>
                  {sure === p.id ? <span className="font-semibold">{t("ให้ออกจากห้อง?", "Let go?")}</span> : body}
                </button>
              ) : (
                <span className="flex min-h-8 items-center gap-1 rounded-full border border-line bg-card/60 px-2.5 text-meta">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
      {session.voice.active && (
        <p className="flex items-center gap-1.5 border-b border-line bg-accent/10 px-3 py-1 text-label text-accent" data-circle-voice>
          <TownIcon name="speaker" size={12} />{t("เสียงเฉพาะคนในห้องนี้", "Voice: this room only")}
        </p>
      )}

      <ChatHistory lines={session.circleChat} th={th} className="min-h-24 flex-1" note={t("ที่พิมพ์ในห้องเห็นเฉพาะคนในห้อง และไม่ถูกเก็บไว้ที่ไหน", "What is typed here is read by the room only, and saved nowhere")} />

      <form onSubmit={send} className="flex items-center gap-1.5 border-t border-line p-2">
        <input ref={box} value={draft} maxLength={600} enterKeyHint="send" onChange={(e) => setDraft(e.target.value)} data-circle-box
               onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); e.stopPropagation(); }}
               placeholder={t("พิมพ์คุยในห้อง", "Say something to the room")} aria-label={t("พิมพ์คุยในห้อง", "Say something to the room")}
               className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-bg/85 px-4 text-read text-ink outline-none placeholder:text-muted focus:border-accent" />
        <button type="submit" className="pressable h-10 shrink-0 rounded-full bg-accent/25 px-4 text-ui font-semibold text-accent hover:bg-accent/35">{t("ส่ง", "Send")}</button>
      </form>
      <div className="flex items-center gap-2 px-3 pb-2">
        <span className="min-h-[1.2em] flex-1 text-label text-gold" aria-live="polite">{note}</span>
        <button type="button" onClick={leave} data-circle-leave
                className="pressable min-h-8 rounded-full border border-line-strong px-3 text-meta text-muted hover:border-chili hover:text-chili">
          {mine ? t("ปิดห้อง (เก็บป้าย)", "Close the room") : t("ออกจากห้อง", "Leave the room")}
        </button>
      </div>
    </div>
  );
}
