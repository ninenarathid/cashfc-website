"use client";
import { useEffect, useMemo, useState } from "react";
import { calendarOrder, isOpen, untilText, whenText, type Festival, type FestivalWindow, type WindowKind } from "@/lib/town/festivals";
import TownIcon, { type IconName } from "./TownIcon";

const BKK = 7 * 3_600_000;
/** Each window's colour on the month and its chip. */
const TONE: Partial<Record<WindowKind, { dot: string; chip: string }>> = {
  make: { dot: "bg-accent", chip: "bg-accent/15 text-accent" },
  vote: { dot: "bg-[#f0a6ca]", chip: "bg-[#f0a6ca]/15 text-[#f0a6ca]" },
  float: { dot: "bg-[#e5cc80]", chip: "bg-[#e5cc80]/15 text-[#e5cc80]" },
  results: { dot: "bg-[#9ad3ff]", chip: "bg-[#9ad3ff]/15 text-[#9ad3ff]" },
  auction: { dot: "bg-ink/40", chip: "bg-ink/[0.08] text-muted" },
};
const SHOWN: WindowKind[] = ["make", "vote", "float", "results", "auction"];

/**
 * The festival calendar pinned on the Popoto Board (v336's town_festivals): the month the next festival falls in, its
 * days coloured by what is on, a card for each festival now or to come, and last years' below. Bangkok time.
 */
export default function FestivalCalendar({ festivals, th, onFestival }: {
  festivals: Festival[]; th: boolean; onFestival?: (f: Festival) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const { on, coming, past } = useMemo(() => calendarOrder(festivals, now), [festivals, now]);
  const lead = on[0] ?? coming[0] ?? past[0];
  return (
    <div className="flex flex-col gap-3">
      {lead && <Month f={lead} now={now} th={th} />}
      {[...on, ...coming].map((f) => <Card key={f.id} f={f} now={now} th={th} onFestival={onFestival} />)}
      {past.length > 0 && (
        <>
          <h3 className="mt-1 font-data text-label uppercase tracking-wider text-muted">{th ? "ปีที่ผ่านมา" : "Past years"}</h3>
          {past.map((f) => <Card key={f.id} f={f} now={now} th={th} onFestival={onFestival} past />)}
        </>
      )}
    </div>
  );
}

/** The month of a festival's first window, its days marked by the windows that touch them. */
function Month({ f, now, th }: { f: Festival; now: number; th: boolean }) {
  const first = new Date(Math.min(...f.windows.filter((w) => w.kind !== "auction" && w.kind !== "announce").map((w) => Date.parse(w.from))) + BKK);
  const y = first.getUTCFullYear(), m = first.getUTCMonth();
  const startDow = new Date(Date.UTC(y, m, 1)).getUTCDay(), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const today = new Date(now + BKK);
  const isToday = (d: number) => today.getUTCFullYear() === y && today.getUTCMonth() === m && today.getUTCDate() === d;
  const marks = (d: number) => {
    const a = Date.UTC(y, m, d) - BKK, b = a + 86_400_000;
    return f.windows.filter((w) => SHOWN.includes(w.kind) && Date.parse(w.from) < b && (w.until === null ? w.kind === "results" && Date.parse(w.from) >= a : Date.parse(w.until) > a));
  };
  const monthName = (th ? ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"])[m];
  const heads = th ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] : ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div className="rounded-xl border border-line bg-card/60 p-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-ui font-semibold text-ink"><TownIcon name={"festivalCalendar" as IconName} size={18} />{monthName} {th ? y + 543 : y}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {heads.map((h, i) => <span key={i} className="pb-0.5 font-data text-[11px] text-muted">{h}</span>)}
        {Array.from({ length: startDow }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1, ws = marks(d), main = ws.find((w) => w.kind !== "auction") ?? ws[0];
          return (
            <span key={d} className={`relative flex h-9 flex-col items-center justify-center rounded-md font-data text-meta tabular-nums ${main ? "bg-ink/[0.06] text-ink" : "text-muted"} ${isToday(d) ? "ring-1 ring-accent" : ""}`}>
              {d}
              {ws.length > 0 && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {ws.slice(0, 3).map((w) => <span key={w.kind} className={`size-1.5 rounded-full ${TONE[w.kind]?.dot ?? "bg-ink/40"}`} />)}
                </span>
              )}
            </span>
          );
        })}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
        {SHOWN.filter((k) => f.windows.some((w) => w.kind === k)).map((k) => {
          const w = f.windows.find((x) => x.kind === k)!;
          return <span key={k} className="flex items-center gap-1 text-[11px] text-muted"><span className={`size-1.5 rounded-full ${TONE[k]?.dot}`} />{th ? w.th : w.en}</span>;
        })}
      </p>
    </div>
  );
}

function Card({ f, now, th, onFestival, past = false }: { f: Festival; now: number; th: boolean; onFestival?: (f: Festival) => void; past?: boolean }) {
  const rows = SHOWN.map((k) => f.windows.find((w) => w.kind === k)).filter((w): w is FestivalWindow => !!w && (!past || w.kind === "results"));
  const live = rows.filter((w) => isOpen(w, now) && w.kind !== "results" && w.kind !== "auction");
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${live.length ? "border-accent/60 bg-accent/[0.06]" : "border-line bg-card/60"}`}>
      <div className="flex items-center gap-2">
        <TownIcon name={f.icon as IconName} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-read font-semibold text-ink">{th ? f.name.th : f.name.en} {f.year}</p>
          <p className="truncate text-meta text-muted">{th ? f.about.th : f.about.en}</p>
        </div>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {rows.map((w) => {
          const open = isOpen(w, now), done = w.until !== null && Date.parse(w.until) <= now;
          return (
            <li key={w.kind} className={`flex items-center gap-2 text-meta ${done ? "opacity-50" : ""}`}>
              <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${TONE[w.kind]?.chip ?? ""}`}>{th ? w.th : w.en}</span>
              <span className="min-w-0 flex-1 font-data tabular-nums text-ink">{whenText(w.from, th)}{w.until && w.kind !== "auction" ? ` – ${whenText(w.until, th)}` : ""}</span>
              {open && w.until && <span className="ml-auto shrink-0 font-data tabular-nums text-accent">{untilText(w.until, now, th)}</span>}
            </li>
          );
        })}
      </ul>
      {onFestival && f.slug === "loykrathong" && (
        <button type="button" onClick={() => onFestival(f)}
                className="pressable mt-2.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-3 text-ui font-semibold text-bg">
          <TownIcon name={"floatKrathong" as IconName} size={18} />
          {past ? (th ? "ดูผลประกาศ" : "See the results") : (th ? "ไปซุ้มกระทง" : "Go to the krathong stall")}
        </button>
      )}
    </div>
  );
}
