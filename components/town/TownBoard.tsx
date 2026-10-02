"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import popotoArt from "@/assets/popoto/popoto.webp";
import { createClient } from "@/lib/supabase/client";
import { BUILDING, CHOICES, POLL, countsOf, etaText, moved, progressOf } from "@/lib/town/board";
import type { Sprite } from "@/lib/town/scenery";
import TownIcon from "./TownIcon";

/** How often the counts are fetched again while the board is open. */
const REFRESH_MS = 30_000;

/**
 * The Popoto Board: a tap on the big board north of the fountain opens it.
 * It tells the town what is being built and lets everybody vote for what goes
 * up next (v103's town_vote; one vote each, changed or taken back any time).
 *
 * Counts only, never who: the database gives nothing else. Anything that goes
 * wrong (the dev test room has nobody signed in) leaves the board readable
 * and says so in one quiet line.
 */
export default function TownBoard({ th, onClose, onVoted, art }: {
  th: boolean;
  /** The town's own pixel art for a picture's name, once the scenery has come. */
  art: (name: string) => Sprite | null;
  onClose: () => void;
  /** Told what my vote is now, so the map can stop flagging the board. */
  onVoted?: (choice: number | null) => void;
}) {
  const [supabase] = useState(createClient);
  const [counts, setCounts] = useState<Record<number, number> | null>(null);
  const [mine, setMine] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  // A vote on its way: a fetch that started before it must not undo it on screen.
  const sent = useRef(0);

  const load = useCallback(async () => {
    if (!supabase) { setNote(th ? "ตอนนี้ยังโหวตไม่ได้" : "Voting isn't available right now"); return; }
    const was = sent.current;
    const [tally, my] = await Promise.all([
      supabase.rpc("town_vote_tally", { p_poll: POLL }),
      supabase.rpc("town_my_vote", { p_poll: POLL }),
    ]);
    if (was !== sent.current) return;
    if (tally.error || my.error) {
      const code = tally.error?.code ?? my.error?.code;
      setNote(code === "42501"
        ? (th ? "เข้าสู่ระบบด้วยตัวละครที่ยืนยันแล้วเพื่อโหวต" : "Sign in with a verified character to vote")
        : (th ? "ตอนนี้นับโหวตไม่ได้ ลองใหม่อีกทีนะ" : "Couldn't count the votes just now"));
      return;
    }
    setNote(null);
    setCounts(countsOf((tally.data ?? []) as Array<{ choice: number; votes: number }>));
    const m = typeof my.data === "number" ? my.data : null;
    setMine(m);
    onVoted?.(m);
  }, [supabase, th, onVoted]);

  useEffect(() => {
    // Not awaited: the first fetch fills the board in when it comes.
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  /** Vote for a choice; the same one again takes the vote back. */
  const pick = async (n: number) => {
    if (!supabase || !counts || busy) return;
    const before = { counts, mine };
    const next = mine === n ? null : n;
    sent.current++;
    setBusy(true);
    setCounts(moved(counts, mine, next));
    setMine(next);
    const { error } = await supabase.rpc("town_vote", { p_poll: POLL, p_choice: next });
    setBusy(false);
    if (error) {
      setCounts(before.counts);
      setMine(before.mine);
      setNote(error.code === "42501"
        ? (th ? "โหวตได้เฉพาะคนที่มีตัวละครยืนยันแล้ว" : "Only a verified character can vote")
        : error.code === "22023"
          ? (th ? "การโหวตนี้ปิดไปแล้ว" : "This vote has closed")
          : (th ? "โหวตไม่สำเร็จ ลองใหม่อีกทีนะ" : "That didn't go through, try again"));
      return;
    }
    setNote(null);
    onVoted?.(next);
  };

  const total = useMemo(() => (counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0), [counts]);

  return (
    <section aria-labelledby="town-board-h" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- the site's own small popoto */}
        <img src={popotoArt.src} alt="" className="size-7 shrink-0" />
        <h2 id="town-board-h" className="font-display text-title font-semibold text-ink">Popoto Board</h2>
        <button type="button" onClick={onClose}
                className="pressable ml-auto rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
          {th ? "ปิด" : "Close"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
        <h3 className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">
          {th ? "ความคืบหน้าของเมือง" : "Building work"}
        </h3>
        <div className="rounded-xl border border-line bg-card/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Pic sprite={art("pw_h1")} box={28} />
            <span className="text-read font-semibold text-ink">{th ? BUILDING.th : BUILDING.en}</span>
            <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-meta font-semibold text-accent">
              {th ? "กำลังสร้าง" : "Being built"}
            </span>
          </div>
          <p className="mt-1 text-meta text-muted">{etaText(BUILDING, now, th)}</p>
          <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent/70 [background-image:repeating-linear-gradient(45deg,transparent_0_6px,rgba(0,0,0,0.18)_6px_12px)]"
                 style={{ width: `${Math.round(progressOf(BUILDING, now) * 100)}%` }} />
          </div>
        </div>

        <h3 className="mb-1.5 mt-4 font-data text-label uppercase tracking-wider text-muted">
          {th ? "โหวตสิ่งก่อสร้างต่อไป" : "Vote: what goes up next"}
        </h3>
        <p className="mb-2 text-meta text-muted">
          {th ? "คนละ 1 เสียง เปลี่ยนใจได้ตลอด แตะอันเดิมอีกครั้งเพื่อถอนโหวต"
            : "One vote each; change it any time. Tap your choice again to take it back."}
        </p>
        <div role="group" aria-label={th ? "ตัวเลือก" : "Choices"} aria-busy={!counts || busy} className="flex flex-col gap-2">
          {CHOICES.map((c) => {
            const n = counts?.[c.n] ?? 0, share = total ? n / total : 0, chosen = mine === c.n;
            return (
              <button key={c.n} type="button" aria-pressed={chosen} disabled={!counts || busy}
                      onClick={() => void pick(c.n)}
                      className={`pressable relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default ${chosen
                        ? "border-accent bg-accent/10" : "border-line-strong hover:border-accent"}`}>
                {/* the share of the votes, behind the words */}
                <span aria-hidden className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${chosen ? "bg-accent/20" : "bg-ink/[0.06]"}`}
                      style={{ width: `${Math.round(share * 100)}%` }} />
                <span className="relative flex items-center gap-2">
                  <Pic sprite={art(c.art)} box={44} />
                  <span className="min-w-0 flex-1 text-ui font-semibold text-ink">{th ? c.th : c.en}</span>
                  {chosen && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-meta font-semibold text-bg"><span className="flex items-center gap-1"><TownIcon name="check" size={12} />{th ? "ของฉัน" : "Mine"}</span></span>}
                  <span className="shrink-0 font-data text-ui tabular-nums text-muted">
                    {counts ? `${n} · ${Math.round(share * 100)}%` : "…"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-meta text-muted" aria-live="polite">
          {note ?? (counts ? (th ? `โหวตแล้ว ${total} คน` : `${total} vote${total === 1 ? "" : "s"} so far`) : (th ? "กำลังนับ…" : "Counting…"))}
        </p>
      </div>
    </section>
  );
}

/** A picture from the scenery, fitted into a square box; an empty box until it has come. */
function Pic({ sprite, box }: { sprite: Sprite | null; box: number }) {
  if (!sprite) return <span aria-hidden className="shrink-0" style={{ width: box, height: box }} />;
  const [x, y, w, h] = sprite.at, k = box / Math.max(w, h);
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: box, height: box }}>
      <span style={{
        width: w * k, height: h * k,
        backgroundImage: `url(${sprite.src})`,
        backgroundSize: `${sprite.sheet[0] * k}px ${sprite.sheet[1] * k}px`,
        backgroundPosition: `${-x * k}px ${-y * k}px`,
        imageRendering: k >= 1 ? "pixelated" : "auto",
      }} />
    </span>
  );
}
