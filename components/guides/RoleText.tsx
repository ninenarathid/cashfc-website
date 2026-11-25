"use client";

import { Fragment } from "react";
import { isSeat, seatColor, type Seat } from "@/lib/guides";

/** A seat's name standing on its own in a sentence: MT, ST, H1…D4. */
const TOKEN = /\b(MT|ST|H1|H2|D1|D2|D3|D4)\b/;
const TOKENS = /\b(MT|ST|H1|H2|D1|D2|D3|D4)\b/g;
/** Where a line of pairs or an order splits: "MT·D3 / H1·D1", "MT·D1 > ST·D2". */
const SPLIT = /( \/ | > )/;

/**
 * A guide's words with every seat as a tag, and the reader's own part lit
 * (the owner, 2026-11-25: "ปรับเป็น tag และ highlight ส่วนที่เกี่ยวข้องกับ
 * role ที่เลือกอยู่").
 *
 * Each seat's name becomes a small tag in its role's colour, filled for the
 * reader's seat. A line that names the reader's seat is lit; a line of pairs or
 * an order ("MT·D3 / H1·D1", "MT·D1 > ST·D2") lights only the piece with the
 * reader's seat in it, because the whole line names everybody.
 */
export default function RoleText({ text, seat }: { text: string; seat: Seat }) {
  const mine = new RegExp(`\\b${seat}\\b`);
  return (
    <>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <span key={i} aria-hidden className="block h-[0.7em]" />;
        const parts = line.split(SPLIT);
        const split = parts.length > 1;
        return (
          <span key={i} className="block">
            {parts.map((part, j) => {
              if (j % 2 === 1) return <Fragment key={j}>{part}</Fragment>;
              const lit = mine.test(part) && (split || TOKEN.test(part));
              if (!lit) return <Fragment key={j}>{tags(part, seat)}</Fragment>;
              // A label before a colon ("คู่ stack:", "กลุ่ม MT:") stays unlit:
              // the light is for the reader's own piece, not the heading.
              const colon = part.lastIndexOf(": ");
              const head = colon >= 0 && mine.test(part.slice(colon + 2)) ? part.slice(0, colon + 2) : "";
              const rest = part.slice(head.length);
              return (
                <Fragment key={j}>
                  {head && tags(head, seat)}
                  <mark className="rounded-md bg-accent/15 px-1 text-ink ring-1 ring-accent/40 [box-decoration-break:clone]">{tags(rest, seat)}</mark>
                </Fragment>
              );
            })}
          </span>
        );
      })}
    </>
  );
}

function tags(text: string, seat: Seat) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKENS)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const s = m[1];
    if (isSeat(s)) {
      const c = seatColor(s);
      const on = s === seat;
      out.push(
        <span key={at}
              className="mx-px inline-block rounded px-1 align-[0.08em] font-data text-meta font-bold leading-tight"
              style={on ? { backgroundColor: c, color: "#fff" } : { color: "inherit", boxShadow: `inset 0 0 0 1.5px ${c}` }}>
          {s}
        </span>,
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
