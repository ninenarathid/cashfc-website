"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isFcMember } from "@/lib/people";
import {
  fmtShortDay, loadPfEvent, loadPfParties, phaseOf, scoreEvent, type PfEvent,
} from "@/lib/pf-event";

/**
 * The party finder event, as a line on Aqua's page: where it stands and how
 * many pictures wait for her, with the way into its own page.
 *
 * Scored here without the catalogue: the counts need only each party's kind,
 * which its key carries, and none of its names or levels.
 */
export default function PfEventCard({ supabase }: { supabase: SupabaseClient }) {
  const [got, setGot] = useState<
    | { s: "loading" } | { s: "missing" } | { s: "none" } | { s: "error" }
    | { s: "ok"; ev: PfEvent; pending: number; ok: number; people: number; lead: string | null }
  >({ s: "loading" });

  useEffect(() => {
    let live = true;
    void (async () => {
      const e = await loadPfEvent(supabase);
      if (!live) return;
      if (e.state !== "ok") { setGot({ s: e.state === "error" ? "error" : e.state }); return; }
      try {
        const parties = await loadPfParties(supabase, e.event);
        const sum = scoreEvent(e.event, parties, e.reviews, {}, isFcMember);
        if (live) {
          setGot({
            s: "ok", ev: e.event, pending: sum.counts.pending, ok: sum.counts.ok,
            people: sum.fcPeople + sum.outsidePeople,
            lead: sum.topPoints[0] ? `${sum.topPoints[0].name} ${sum.topPoints[0].points} แต้ม` : null,
          });
        }
      } catch { if (live) setGot({ s: "error" }); }
    })();
    return () => { live = false; };
  }, [supabase]);

  if (got.s === "loading") {
    return <div aria-hidden className="mt-4 h-[84px] animate-pulse rounded-2xl border border-line bg-surface/60" />;
  }

  const icon = (
    <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/10 text-[22px]" aria-hidden>
      🏆
    </span>
  );

  if (got.s !== "ok") {
    const line = got.s === "missing" ? "รอรัน v320 ใน Supabase ก่อน"
      : got.s === "none" ? "ยังไม่มีกิจกรรม — สร้างได้เลย" : "โหลดไม่ได้ เปิดหน้าเพื่อดูสาเหตุ";
    return (
      <Link href="/admin/aqua/party-event"
            className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed border-gold/50 bg-gold/5 px-4 py-4 no-underline transition-colors hover:border-gold hover:bg-gold/10">
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block font-data text-meta uppercase tracking-[0.22em] text-gold">กิจกรรม Party Finder</span>
          <span className="mt-0.5 block text-read text-ink">{line}</span>
        </span>
        <span className="shrink-0 text-ui text-gold">→</span>
      </Link>
    );
  }

  const ph = phaseOf(got.ev);
  const last = new Date(Date.parse(got.ev.endsAt) - 1).toISOString();
  return (
    <Link href="/admin/aqua/party-event"
          className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-gold/40 bg-surface px-4 py-4 no-underline transition-colors hover:border-gold sm:flex-nowrap">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block font-data text-meta uppercase tracking-[0.22em] text-gold">
          กิจกรรม Party Finder · {ph.stage === "live" ? `เหลือ ${ph.daysLeft} วัน` : ph.stage === "soon" ? "ยังไม่เริ่ม" : "จบแล้ว"}
        </span>
        <span className="mt-0.5 block truncate font-display text-lead font-semibold text-ink">{got.ev.title}</span>
        <span className="mt-0.5 block text-meta text-muted">
          {fmtShortDay(got.ev.startsAt)} – {fmtShortDay(last)} · ผ่าน {got.ok} ห้อง · {got.people} คนได้แต้ม
          {got.lead ? ` · นำ: ${got.lead}` : ""}
        </span>
      </span>
      <span className={`w-full shrink-0 rounded-lg border px-3.5 py-2 text-center text-ui font-medium sm:w-auto ${got.pending ? "border-gold bg-gold/15 text-gold" : "border-line bg-bg/40 text-muted"}`}>
        {got.pending ? `ตรวจรูป ${got.pending} ห้อง →` : "เปิดสรุป →"}
      </span>
    </Link>
  );
}
