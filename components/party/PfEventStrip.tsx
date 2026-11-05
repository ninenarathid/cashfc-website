"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { peekPfEvent, phaseOf, type PfEvent } from "@/lib/pf-event";

/**
 * One line above the finder while a party finder event runs, leading to its
 * page. A week after the end it goes. A draft reaches admins only (v320), and
 * says so, so they see where it will sit before members do.
 */
export default function PfEventStrip() {
  const [ev, setEv] = useState<PfEvent | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let live = true;
    void peekPfEvent(supabase).then((e) => { if (live) setEv(e); });
    return () => { live = false; };
  }, []);

  if (!ev) return null;
  const ph = phaseOf(ev);
  if (ph.stage === "over" && Date.now() - Date.parse(ev.endsAt) > 7 * 864e5) return null;
  const when = ph.stage === "live" ? `เหลือ ${ph.daysLeft} วัน`
    : ph.stage === "soon" ? `เริ่มในอีก ${ph.daysLeft} วัน` : "จบแล้ว · ดูผล";

  return (
    <Link href="/party/event"
          className="mb-4 flex items-center gap-3 rounded-xl border border-gold/40 bg-surface px-3 py-2.5 no-underline transition-colors hover:border-gold sm:px-4"
          style={{ background: "linear-gradient(100deg, color-mix(in oklab, var(--color-gold) 12%, var(--color-surface)) 0%, var(--color-surface) 70%)" }}>
      <span aria-hidden className="text-[22px]">🏆</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2">
          <span className="font-display text-read font-semibold text-ink">{ev.title}</span>
          {!ev.publishedAt && (
            <span className="rounded border border-gold/60 px-1.5 text-meta text-gold">ร่าง · เห็นเฉพาะแอดมิน</span>
          )}
        </span>
        <span className="block truncate text-meta text-muted">{when} · ลงดัน ส่งรูป สะสมแต้มชิงรางวัล</span>
      </span>
      <span className="shrink-0 text-ui text-gold">ดูแต้ม →</span>
    </Link>
  );
}
