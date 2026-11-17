"use client";

import { createFinish } from "@/lib/town-hd/finish";
import { Town2Art } from "@/lib/town/town2-art";
import { createShade } from "@/lib/town-hd/shade";
import { loadForest, loadScenery, type SceneryKit } from "@/lib/town/scenery";
import { artOf } from "@/lib/town/decor";
import { FOREST_PROPS } from "@/lib/town/world";
import { useEffect, useRef, useState } from "react";
import { createHdTown, type HdTown, type TimeId } from "@/lib/town-hd/engine";
import type { MapId } from "@/lib/town-hd/maps";
import { createClient } from "@/lib/supabase/client";

const PLACES: Array<{ id: MapId; label: string }> = [{ id: "town", label: "เมือง" }, { id: "farm", label: "ฟาร์ม" }, { id: "shop", label: "ร้านเสื้อ" }];
const mapOf = (search: string): MapId => (/[?&]map=(town|farm|shop)/.exec(search)?.[1] as MapId | undefined) ?? "town";

/** The hour's light by the clock, in Bangkok as the town's is (the owner, 2026-11-17: "เวลา แสงแดด ช่วยอิงตามเวลาจริงเหมือนเดิมได้ไหม"). */
const timeNow = (): TimeId => {
  const h = new Date(Date.now() + 7 * 3600_000).getUTCHours();
  return h >= 5 && h < 10 ? "morning" : h >= 10 && h < 16 ? "day" : h >= 16 && h < 19 ? "evening" : "night";
};

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
  // (by the clock until a tester picks an hour to look at; "ตามจริง" goes back to the clock)
  const [byClock, setByClock] = useState(true);
  const [rain, setRain] = useState(false);
  useEffect(() => { town.current?.setRain(rain); }, [rain]);
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
      if (/[?&]under=lit/.test(window.location.search)) {
        // (the live town's way of drawing the editor's town, alone: its own pictures back to front with walkers, each
        // laid again from the 3D town's lit picture; `&plain=1` leaves that out, to compare; `&at=x,y` looks elsewhere)
        const c = canvas.current, under = createHdTown(document.createElement("canvas"), { map: "town", time: "day", underlay: true, quality: "high" });
        const art = new Town2Art(), copy = document.createElement("canvas"), plain = /[?&]plain=1/.test(window.location.search);
        // (`&finish=1`: and the finish over it, as the live town wears it: lib/town-hd/finish)
        const stage = document.createElement("canvas"), finish = /[?&]finish=1/.test(window.location.search) ? createFinish(document.createElement("canvas"), "high") : null, finished = document.createElement("canvas");
        void finished;
        const [mx, my] = (/[?&]at=(\d+),(\d+)/.exec(window.location.search)?.slice(1).map(Number) ?? [41, 44]) as [number, number];
        let raf = 0;
        const paint = () => {
          raf = requestAnimationFrame(paint);
          if (!under.ready()) return;
          const cw = c.clientWidth, ch = c.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), d = new Date(Date.now() + 7 * 3600_000), sc = 1.6;
          if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
          if (stage.width !== c.width || stage.height !== c.height) { stage.width = c.width; stage.height = c.height; }
          const cx = (mx - my) * 32, cy = (mx + my) * 16, g = (finish ? stage : c).getContext("2d")!, now = performance.now();
          const minute = Number(/[?&]min=(\d+)/.exec(window.location.search)?.[1] ?? d.getUTCHours() * 60 + d.getUTCMinutes());
          const screen = (ix: number, iy: number) => ({ x: cw / 2 + (ix - cx) * sc, y: ch / 2 + (iy - cy) * sc });
          const walkers: Array<[number, number, number]> = [];
          for (let y = my - 12; y <= my + 12; y += 3) for (let x = mx - 12; x <= mx + 12; x += 3) walkers.push([x, y, 48]);
          const pic = under.renderAt({ cx, cy, s: sc, cw, ch, dpr, min: minute, walkers });
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          g.fillStyle = "#6aa556"; g.fillRect(0, 0, cw, ch);
          g.globalCompositeOperation = "multiply"; g.drawImage(pic, 0, 0, cw, ch); g.globalCompositeOperation = "source-over";
          const lit = under.renderLit();
          if (copy.width !== lit.width || copy.height !== lit.height) { copy.width = lit.width; copy.height = lit.height; }
          const cg = copy.getContext("2d")!;
          cg.clearRect(0, 0, copy.width, copy.height); cg.drawImage(lit, 0, 0);
          art.lit = plain ? null : { pic: copy, k: copy.width / cw };
          const seen = art.visible({ x0: cx - cw / 2 / sc, y0: cy - ch / 2 / sc, x1: cx + cw / 2 / sc, y1: cy + ch / 2 / sc }, now);
          art.drawFloor(g, seen, screen, sc, dpr, now, false);
          const things: Array<{ depth: number; draw: () => void }> = [];
          art.pushStanding(g, seen, (depth, draw) => things.push({ depth, draw }), screen, sc, dpr, false);
          // (walkers: plain figures on a grid of tiles, each drawn in its turn)
          for (let y = my - 12; y <= my + 12; y += 3) for (let x = mx - 12; x <= mx + 12; x += 3) things.push({ depth: x + y, draw: () => {
            const q = screen((x - y) * 32, (x + y) * 16);
            g.fillStyle = "#e8479a"; g.fillRect(q.x - 7 * sc, q.y - 30 * sc, 14 * sc, 30 * sc);
          } });
          things.sort((u, w) => u.depth - w.depth);
          for (const t of things) t.draw();
          // (a night laid over it as the live town lays its own, and two lamps)
          if (finish) {
            const dark = minute > 1170 || minute < 270 ? 0.62 : 0;
            if (dark) { g.globalCompositeOperation = "multiply"; g.fillStyle = "#3a4a86"; g.fillRect(0, 0, cw, ch); g.globalCompositeOperation = "lighter"; for (const [lx, ly] of [[0.3, 0.45], [0.7, 0.6]]) { const r = g.createRadialGradient(cw * lx, ch * ly, 0, cw * lx, ch * ly, 150); r.addColorStop(0, "rgba(255,190,110,0.85)"); r.addColorStop(1, "rgba(255,190,110,0)"); g.fillStyle = r; g.fillRect(0, 0, cw, ch); } g.globalCompositeOperation = "source-over"; }
            finish.render(stage, { cx, cy, s: sc, cw, ch, dpr, min: minute }, { indoors: false, still: false, town: true, rain: /[?&]rain=1/.test(window.location.search) ? 0.9 : 0 });
            const out = c.getContext("2d")!;
            out.setTransform(1, 0, 0, 1, 0, 0); out.drawImage(finish.canvas, 0, 0, c.width, c.height);
          }
          if (/[?&]showlit=1/.test(window.location.search)) { g.fillStyle = "#203040"; g.fillRect(0, 0, cw, ch); g.drawImage(copy, 0, 0, cw, ch); }
          setReady(true);
        };
        raf = requestAnimationFrame(paint);
        return () => { cancelAnimationFrame(raf); under.dispose(); finish?.dispose(); };
      }
      if (/[?&]under=forest/.test(window.location.search)) {
        // (the forest's shadows under its own trees, as the live town lays them: to look at lib/town-hd/shade alone)
        const c = canvas.current, shade = createShade(document.createElement("canvas"), "mid");
        let raf = 0, kit: SceneryKit | null = null;
        void loadScenery().then((k) => loadForest().then(() => { kit = k; }));
        const [mx, my] = (/[?&]at=(\d+),(\d+)/.exec(window.location.search)?.slice(1).map(Number) ?? [193, 159]) as [number, number];
        const paint = () => {
          raf = requestAnimationFrame(paint);
          if (!kit) return;
          const cw = c.clientWidth, ch = c.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), d = new Date(Date.now() + 7 * 3600_000), sc = 1.6;
          if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
          const cx = (mx - my) * 32, cy = (mx + my) * 16, g = c.getContext("2d")!;
          const seen = FOREST_PROPS.filter((q) => q.kind !== "flowers" && Math.abs(q.x - mx) + Math.abs(q.y - my) < 40).map((q) => ({ q, name: kit!.has(artOf(q)) ? artOf(q) : q.kind })).filter((t) => kit!.has(t.name));
          const stands = seen.filter((t) => t.q.kind !== "campfire").map(({ q, name }) => { const a = kit!.pieceOf(name)!; return { img: a.img, sx: a.x, sy: a.y, w: a.w, h: a.h, ax: a.ax, ay: a.ay, k: 1, x: q.x + 0.5, y: q.y + 0.62 }; });
          const pic = shade.renderAt({ cx, cy, s: sc, cw, ch, dpr, min: Number(/[?&]min=(\d+)/.exec(window.location.search)?.[1] ?? d.getUTCHours() * 60 + d.getUTCMinutes()) }, stands);
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          g.fillStyle = "#5d9a4c"; g.fillRect(0, 0, cw, ch);
          g.globalCompositeOperation = "multiply"; g.drawImage(pic, 0, 0, cw, ch); g.globalCompositeOperation = "source-over";
          for (const { q, name } of seen.sort((u, w) => u.q.x + u.q.y - w.q.x - w.q.y)) kit.drawProp(g, name, cw / 2 + ((q.x + 0.5 - q.y - 0.62) * 32 - cx) * sc, ch / 2 + ((q.x + 0.5 + q.y + 0.62) * 16 - cy) * sc, sc, dpr);
          setReady(true);
        };
        raf = requestAnimationFrame(paint);
        return () => { cancelAnimationFrame(raf); shade.dispose(); };
      }
      if (/[?&]under=1/.test(window.location.search)) {
        // (the live town's HD ground alone, at the live town's own first view: to look at what `renderAt` hands it)
        const c = canvas.current, spare = document.createElement("canvas");
        const under = createHdTown(spare, { map: "town", time: "day", underlay: true, quality: "mid" });
        // (the middle of the plaza; of the forest, by its camp; of the mountain, its middle)
        const [mx, my] = [41, 44];
        let raf = 0;
        const paint = () => {
          raf = requestAnimationFrame(paint);
          if (!under.ready()) return;
          const cw = c.clientWidth, ch = c.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), d = new Date(Date.now() + 7 * 3600_000);
          if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
          const pic = under.renderAt({ cx: (mx - my) * 32, cy: (mx + my) * 16, s: 1.6, cw, ch, dpr, min: Number(/[?&]min=(\d+)/.exec(window.location.search)?.[1] ?? d.getUTCHours() * 60 + d.getUTCMinutes()) });
          c.getContext("2d")!.drawImage(pic, 0, 0, c.width, c.height);
          setReady(true);
        };
        raf = requestAnimationFrame(paint);
        return () => { cancelAnimationFrame(raf); under.dispose(); };
      }
      made = createHdTown(canvas.current, { map: mapOf(window.location.search), fx: !/[?&]fx=0/.test(window.location.search), quality: (/[?&]q=(high|mid|low)/.exec(window.location.search)?.[1] as "high" | "mid" | "low" | undefined), time: timeNow(), at: m ? { x: +m[1], y: +m[2] } : undefined, nameEl: plate.current, showWalk: /[?&]walk=1/.test(window.location.search), onReady: () => setReady(true), onFps: setFps });
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

  const pick = (t: TimeId) => { setByClock(false); setTime(t); town.current?.setTime(t); };
  useEffect(() => {
    if (!byClock) return;
    // (the light itself goes minute by minute; `time` only says which of the four hours the clock is nearest)
    const tick = () => { const d = new Date(Date.now() + 7 * 3600_000); setTime(timeNow()); town.current?.setClock(d.getUTCHours() * 60 + d.getUTCMinutes()); };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [byClock]);

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-[30] select-none overflow-hidden bg-bg">
      <canvas ref={canvas} tabIndex={0} className={`block h-full w-full touch-none outline-none transition-opacity duration-700 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${ready ? "opacity-100" : "opacity-0"}`}
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

      <div className="absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] flex flex-col gap-2 sm:bottom-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div className="flex flex-col gap-2">
          <p className="pointer-events-none hidden w-fit rounded-md bg-surface/80 px-2 py-1 text-meta text-muted sm:block">คลิกพื้นเพื่อเดิน · WASD · ล้อเมาส์ซูม</p>
          <p className="pointer-events-none w-fit rounded-md bg-surface/80 px-2 py-1 text-meta text-muted sm:hidden">แตะพื้นเพื่อเดิน · ถ่างนิ้วเพื่อซูม</p>
          <div role="group" aria-label="ช่วงเวลา" className="flex overflow-hidden rounded-lg border border-line bg-surface/90 shadow-md backdrop-blur-sm">
            <button type="button" aria-pressed={byClock} onClick={() => setByClock(true)}
              className={`h-11 min-w-11 whitespace-nowrap px-2 text-meta transition sm:px-3 sm:text-ui ${byClock ? "bg-accent/25 font-semibold text-ink" : "text-muted hover:text-ink"}`}>
              ตามจริง
            </button>
            {TIMES.map((t) => (
              <button key={t.id} type="button" aria-pressed={!byClock && time === t.id} onClick={() => pick(t.id)}
                className={`h-11 min-w-11 whitespace-nowrap px-2 text-meta transition sm:min-w-[3.4rem] sm:px-3 sm:text-ui ${!byClock && time === t.id ? "bg-accent/25 font-semibold text-ink" : "text-muted hover:text-ink"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {/* (on a phone the two zoom buttons stand over the hours, at the right: side by side they no longer fit) */}
        <div className="order-first flex gap-2 self-end sm:order-none sm:self-auto">
          <button type="button" className={`${BTN} ${rain ? "border-accent text-accent" : ""}`} aria-label="ฝน" aria-pressed={rain} onClick={() => setRain((v) => !v)}>
            <Icon d="M7 16a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17.5 16M9 19l-1 2M13 19l-1 2M17 19l-1 2" />
          </button>
          <button type="button" className={BTN} aria-label="ซูมออก" onClick={() => town.current?.zoom(1.25)}><Icon d="M5 12h14" /></button>
          <button type="button" className={BTN} aria-label="ซูมเข้า" onClick={() => town.current?.zoom(0.8)}><Icon d="M12 5v14M5 12h14" /></button>
        </div>
      </div>
    </div>
  );
}
