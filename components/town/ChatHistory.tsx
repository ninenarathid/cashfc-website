"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ChatLine } from "@/lib/town/session";
import TownIcon from "./TownIcon";

/**
 * The town's chat as far back as this tab heard it, to scroll through: the
 * town page's history panel and the dock's chat both show it.
 *
 * Nothing is stored anywhere (lib/town/chat): the session keeps the last
 * LOG_MAX lines typed since this tab came into town, and the top of the list
 * says so. It follows the newest line while you are at the bottom, and stays
 * where you are while you read back up: new lines then wait under a "↓ new"
 * button rather than pulling the list away from what you were reading.
 */
export default function ChatHistory({ lines, th, className = "" }: {
  lines: ChatLine[];
  th: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  /** The newest line read: everything after it is new. */
  const seen = useRef(0);
  const [unseen, setUnseen] = useState(0);
  const newest = lines.length ? lines[lines.length - 1].key : 0;

  // Open at the newest line.
  useLayoutEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
    seen.current = newest;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new line: followed from the bottom, or waiting under the button.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (atBottom.current) {
      el.scrollTop = el.scrollHeight;
      seen.current = newest;
      setUnseen(0);
    } else {
      setUnseen(lines.filter((l) => l.key > seen.current).length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest]);

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (atBottom.current && seen.current !== newest) { seen.current = newest; setUnseen(0); }
  };

  const jump = () => {
    const el = box.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: still ? "auto" : "smooth" });
  };

  const time = (at: number) => new Date(at).toLocaleTimeString(th ? "th-TH" : "en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`relative flex min-h-0 flex-col ${className}`}>
      {/* Focusable, so the keys can scroll it too. */}
      <div ref={box} onScroll={onScroll} role="log" tabIndex={0}
           aria-label={th ? "ประวัติแชท" : "Chat history"}
           className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 text-ui leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60">
        <p className="mb-1 text-label text-muted">
          {th ? "แชทไม่ถูกเก็บไว้ที่ไหน เห็นแค่ที่พิมพ์ตั้งแต่คุณเข้าเมือง" : "Chat isn't saved anywhere: you see what was said since you came in."}
        </p>
        {lines.length === 0 ? (
          <p className="text-muted">{th ? "ยังไม่มีใครพิมพ์อะไร ทักก่อนเลย" : "Nobody has typed yet. Say hi!"}</p>
        ) : lines.map((l) => (
          <p key={l.key} className="break-words py-px">
            <span className="mr-1.5 font-data text-label tabular-nums text-muted">{time(l.at)}</span>
            <span className={`font-semibold ${l.mine ? "text-gold" : "text-accent"}`}>{l.mine ? (th ? "คุณ" : "You") : l.name}</span>
            <span className="text-muted">: </span>
            <span className="text-ink">{l.text}</span>
          </p>
        ))}
      </div>
      {unseen > 0 && (
        <button type="button" onClick={jump}
                className="pressable absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-label font-semibold text-bg shadow-lg shadow-black/40">
          <span className="flex items-center gap-1"><TownIcon name="down" size={12} />{th ? `ข้อความใหม่ ${unseen}` : `${unseen} new`}</span>
        </button>
      )}
    </div>
  );
}
