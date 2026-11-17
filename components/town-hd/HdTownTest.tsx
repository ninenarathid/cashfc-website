"use client";

import { useEffect, useRef, useState } from "react";
import { createHdTown, type HdTown, type TimeId } from "@/lib/town-hd/engine";
import type { MapId } from "@/lib/town-hd/maps";
import { createClient } from "@/lib/supabase/client";

const PLACES: Array<{ id: MapId; label: string }> = [{ id: "town", label: "เมือง" }, { id: "farm", label: "ฟาร์ม" }, { id: "shop", label: "ร้านเสื้อ" }];
const mapOf = (search: string): MapId => (/[?&]map=(town|farm|shop)/.exec(search)?.[1] as MapId | undefined) ?? "town";

const TIMES: Array<{ id: TimeId; label: string }> = [
  { id: "morning", label: "เช้า" }, { id: "day", label: "กลางวัน" }, { id: "evening", label: "เย็น" }, { id: "night", label: "กลางคืน" },
];

const BTN = "grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface/90 text-ink shadow-md backdrop-blur-sm transition active:scale-95 hover:border-line-lit";

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

/** The HD-2D trial's page: the scene, and the few controls a tester needs (the hour, nearer and further; the view itself is fixed). */
export default function HdTownTest() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const town = useRef<HdTown | null>(null);
  const plate = useRef<HTMLSpanElement>(null);
  const [name, setName] = useState("Tester");
  const [time, setTime] = useState<TimeId>("evening");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fps, setFps] = useState(0);
  const [place, setPlace] = useState<MapId>("town");
  useEffect(() => { setPlace(mapOf(window.location.search)); }, []);

  useEffect(() => {
    if (!canvas.current) return;
    let made: HdTown | null = null;
    try {
      // (`?at=x,y`: stand somewhere else first, for a tester sent to look at one corner)
      const m = /[?&]at=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/.exec(window.location.search);
      made = createHdTown(canvas.current, { map: mapOf(window.location.search), fx: !/[?&]fx=0/.test(window.location.search), time: "evening", at: m ? { x: +m[1], y: +m[2] } : undefined, nameEl: plate.current, showWalk: /[?&]walk=1/.test(window.location.search), onReady: () => setReady(true), onFps: setFps });
      town.current = made;
    } catch {
      setFailed(true);
    }
    return () => { made?.dispose(); town.current = null; };
  }, []);

  // The name under the character (the owner, 2026-11-17: "ขึ้นชื่อตัวละครให้ด้วย", under it, not over): a signed-in member's own character's, read
  // from their own profile row; anybody else walks as "Tester". Nothing is written.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let gone = false;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("character_name, display_name").eq("id", data.user.id).maybeSingle();
      const own = (p as { character_name?: string | null; display_name?: string | null } | null);
      const n = own?.character_name?.trim() || own?.display_name?.trim();
      if (n && !gone) setName(n);
    }).catch(() => { /* the plate keeps "Tester" */ });
    return () => { gone = true; };
  }, []);

  const pick = (t: TimeId) => { setTime(t); town.current?.setTime(t); };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-[30] select-none overflow-hidden bg-bg">
      <canvas ref={canvas} tabIndex={0} className="block h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        aria-label="Cash Town HD-2D ทดลอง" aria-describedby="hd-how" />
      <p id="hd-how" className="sr-only">แตะหรือคลิกบนพื้นเพื่อเดิน หรือใช้ปุ่ม W A S D และปุ่มลูกศร ล้อเมาส์หรือถ่างนิ้วเพื่อซูม</p>

      <span ref={plate} style={{ visibility: "hidden" }}
        className="pointer-events-none absolute left-0 top-0 max-w-[12rem] truncate whitespace-nowrap rounded bg-bg/60 px-1.5 py-0.5 text-meta font-semibold text-ink [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]">
        {name}
      </span>

      {!ready && !failed && <div className="absolute inset-0 grid place-items-center bg-bg text-read text-muted">กำลังสร้างเมือง…</div>}
      {failed && <div className="absolute inset-0 grid place-items-center bg-bg px-6 text-center text-read text-ink">เบราว์เซอร์นี้เปิดภาพ 3D (WebGL) ไม่ได้ ลองเปิดด้วย Chrome หรือ Safari รุ่นใหม่</div>}

      {/* which map: each is its own page of the trial (a plain link; the town is stood up again) */}
      <nav aria-label="แผนที่" className="absolute right-3 top-3 flex overflow-hidden rounded-lg border border-line bg-surface/90 shadow-md backdrop-blur-sm">
        {PLACES.map((p) => (
          <a key={p.id} href={`?map=${p.id}`} aria-current={place === p.id ? "page" : undefined}
            className={`grid h-11 min-w-11 place-items-center whitespace-nowrap px-3 text-meta transition sm:text-ui ${place === p.id ? "bg-accent/25 font-semibold text-ink" : "text-muted hover:text-ink"}`}>
            {p.label}
          </a>
        ))}
      </nav>

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        <span className="rounded-md border border-gold/50 bg-surface/90 px-2 py-1 text-meta font-semibold text-gold shadow-md backdrop-blur-sm">HD-2D ทดลอง</span>
        {fps > 0 && <span className="hidden rounded-md bg-surface/80 px-1.5 py-1 text-label tabular-nums text-muted sm:inline">{fps} fps</span>}
      </div>

      <div className="absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] flex items-end justify-between gap-3 sm:bottom-3">
        <div className="flex flex-col gap-2">
          <p className="pointer-events-none hidden w-fit rounded-md bg-surface/80 px-2 py-1 text-meta text-muted sm:block">คลิกพื้นเพื่อเดิน · WASD · ล้อเมาส์ซูม</p>
          <p className="pointer-events-none w-fit rounded-md bg-surface/80 px-2 py-1 text-meta text-muted sm:hidden">แตะพื้นเพื่อเดิน · ถ่างนิ้วเพื่อซูม</p>
          <div role="group" aria-label="ช่วงเวลา" className="flex overflow-hidden rounded-lg border border-line bg-surface/90 shadow-md backdrop-blur-sm">
            {TIMES.map((t) => (
              <button key={t.id} type="button" aria-pressed={time === t.id} onClick={() => pick(t.id)}
                className={`h-11 min-w-11 whitespace-nowrap px-2 text-meta transition sm:min-w-[3.4rem] sm:px-3 sm:text-ui ${time === t.id ? "bg-accent/25 font-semibold text-ink" : "text-muted hover:text-ink"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className={BTN} aria-label="ซูมออก" onClick={() => town.current?.zoom(1.25)}><Icon d="M5 12h14" /></button>
          <button type="button" className={BTN} aria-label="ซูมเข้า" onClick={() => town.current?.zoom(0.8)}><Icon d="M12 5v14M5 12h14" /></button>
        </div>
      </div>
    </div>
  );
}
