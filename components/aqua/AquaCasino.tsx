"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACCESS_LABEL, accessOf, money, type CasinoAccess, type CasinoState } from "@/lib/casino";
import CasinoWinners from "@/components/casino/CasinoWinners";
import "@/components/casino/casino.css";

/**
 * The Popoto Casino on Aqua's page (the owner, 2026-10-26: "จะสามารถเปิดให้ใช้งานได้ใน page admin aqua"): who may go in
 * and spin (nobody, the admins trying it, everybody: v299's `casino_live_access`), the admins' trial wiped, the newest
 * winners with their 1-1 threads, and the way to the desk where the prizes and their odds are set. Members walk in by
 * the kura's door in the town; the door opens on their page within five minutes of a change here.
 */
export default function AquaCasino({ supabase }: { supabase: SupabaseClient }) {
  const [state, setState] = useState<CasinoState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const read = useCallback(async () => {
    const { data, error: failed } = await supabase.rpc("casino_live_state", { p_receipt_page: 0, p_history: false });
    if (failed) { setError(failed.code === "PGRST202" ? "ยังไม่ได้รัน SQL v206" : failed.message); return; }
    setState(data as CasinoState); setError("");
  }, [supabase]);
  useEffect(() => { void read(); }, [read]);
  const ready = !!state && state.settings.access !== undefined;
  const access = state ? accessOf(state.settings) : "closed";
  const tests = state?.tests ?? 0;
  const set = async (to: CasinoAccess) => {
    if (busy || to === access) return;
    if (to === "everyone" && tests > 0 && !window.confirm(`ยังมีผลทดสอบของแอดมิน ${money(tests)} ครั้ง เปิดให้ทุกคนโดยไม่ล้างก่อนไหม? (ล้างได้ที่ปุ่มด้านล่าง)`)) return;
    setBusy(true); setSaid("");
    const { error: failed } = await supabase.rpc("casino_live_access", { p_access: to });
    setBusy(false);
    if (failed) { setError(failed.message); return; }
    setSaid(to === "everyone" ? "เปิดให้ทุกคนแล้ว ประตูในเมืองจะเปิดในหน้าของสมาชิกภายใน 5 นาที" : to === "admins" ? "เปิดให้แอดมินทดสอบแล้ว ทุกการหมุนเป็นการทดสอบ" : "ปิด Casino แล้ว");
    await read();
  };
  const wipe = async () => {
    if (busy || !tests) return;
    if (!window.confirm(`ล้างผลทดสอบของแอดมินทั้งหมด ${money(tests)} ครั้ง? coin สต็อก งบ Gil รายการผู้โชคดี แชท และกระเป๋าเงินที่มาจากการทดสอบจะกลับเป็นเหมือนก่อนทดสอบ`)) return;
    setBusy(true); setSaid("");
    const { error: failed } = await supabase.rpc("casino_live_wipe_tests");
    setBusy(false);
    if (failed) { setError(failed.message); return; }
    setSaid("ล้างผลทดสอบแล้ว"); await read();
  };
  return (
    <section id="casino" className="mt-5 rounded-xl border border-line bg-card p-4 sm:p-5" data-aqua-casino={access}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-title text-ink">Popoto Casino</h2>
        <span className="text-meta text-muted">เดินเข้าทางประตูโรงเก็บของ kura ในเมือง</span>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-chili/40 bg-chili/10 p-3 text-ui text-chili">{error}</p>}
      {state && !ready && <p className="mt-3 text-ui text-muted">ต้องรัน SQL v299 ก่อน ถึงจะเลือกได้ว่าใครเข้าเล่น</p>}
      {ready && <>
        <div role="radiogroup" aria-label="ใครเข้า Casino ได้" className="mt-4 grid grid-cols-3 gap-2">
          {(["closed", "admins", "everyone"] as const).map((a) => (
            <button key={a} type="button" role="radio" aria-checked={access === a} disabled={busy} onClick={() => void set(a)}
                    className={`pressable min-h-11 rounded-lg border px-2 text-ui ${access === a ? "border-accent bg-accent/15 font-semibold text-ink" : "border-line bg-bg text-muted"}`}>
              {ACCESS_LABEL[a]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-meta text-muted">
          {access === "closed" ? "ไม่มีใครเข้าได้ ประตูในเมืองไม่แสดง" : access === "admins"
            ? "แอดมินเข้าได้ทุกเวลา บังคับผลได้ ทุกการหมุนเป็นการทดสอบ ไม่ประกาศทั้งเมือง"
            : "สมาชิกที่ยืนยันตัวละครเข้าได้ตามเวลากิจกรรม"}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-bg p-3">
          <span className="text-ui text-ink">ผลทดสอบของแอดมิน {money(tests)} ครั้ง</span>
          <button type="button" disabled={busy || !tests} onClick={() => void wipe()}
                  className="pressable min-h-11 rounded-lg border border-line bg-card px-3 text-ui text-ink disabled:opacity-50">ล้างผลทดสอบ</button>
        </div>
        {said && <p role="status" className="mt-2 text-meta text-jade">{said}</p>}
        <CasinoWinners winners={state!.winners ?? []} few={5} />
      </>}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-ui">
        <Link href="/admin/aqua/casino-live" className="text-accent">ตั้งค่ารางวัล โอกาส และงบ ↗</Link>
        <Link href="/admin/aqua/casino" className="text-accent">ห้องซ้อมตั้งค่า (TEST) ↗</Link>
      </div>
    </section>
  );
}
