"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { works } from "@/lib/town/gifts";
import { iconOf } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { FishSfx } from "@/lib/town/sfx";
import { SKIES } from "@/lib/town/skies";
import { forcedWeather, isWet, type Sky, type Weather } from "@/lib/town/weather";
import { FROG, croaksAt, rainAhead, rainNeed, skyAhead } from "@/lib/town/well-gifts";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";

/** A sky as a small picture, twelve pixels a side: each letter a colour, a dot nothing. */
const INK: Record<string, string> = { y: "#f6c945", Y: "#fdf0a8", m: "#ece9d2", w: "#eef2f6", g: "#b6c2ce", d: "#8794a4", D: "#5d6978", b: "#8fd2fb", B: "#4a9be0", z: "#ffd84a", q: "#8a94a3" };
const ART: Record<string, string[]> = {
  sun: [".....yy.....", ".y...yy...y.", "..y......y..", "....yyyy....", "...yYYyyy...", "yy.yYyyyy.yy", "yy.yyyyyy.yy", "...yyyyyy...", "....yyyy....", "..y......y..", ".y...yy...y.", ".....yy....."],
  moon: ["............", ".....mmm....", "....mmm.....", "...mmm......", "...mmm......", "...mmm......", "...mmmm.....", "...mmmmm..m.", "....mmmmmmm.", ".....mmmmm..", "............", "............"],
  cloudy: ["............", "............", ".....www....", "....wwwww...", "..wwwwwwww..", ".wwwwwwwwww.", ".wwwwwwwwww.", ".gggggggggg.", "..gggggggg..", "............", "............", "............"],
  fog: ["............", "............", ".wwwwwwww...", "............", "...gggggggg.", "............", ".wwwwwwwww..", "............", "...ggggggg..", "............", "............", "............"],
  drizzle: ["............", ".....www....", "....wwwww...", "..wwwwwwww..", ".wwwwwwwwww.", ".gggggggggg.", "..gggggggg..", "............", "...b....b...", "............", "......b.....", "............"],
  rain: ["............", ".....ddd....", "....ddddd...", "..dddddddd..", ".dddddddddd.", ".DDDDDDDDDD.", "..DDDDDDDD..", "............", "..b..b..b...", "..B..B..B...", "....b..b....", "....B..B...."],
  storm: ["............", ".....ddd....", "....ddddd...", "..dddddddd..", ".dddddddddd.", ".DDDDDDDDDD.", "..DDDzzDDD..", ".....zz.....", "..b.zz...b..", "..B..zz..B..", ".....z......", "............"],
  unknown: ["............", "....qqqq....", "...qq..qq...", ".......qq...", "......qq....", ".....qq.....", ".....qq.....", "............", ".....qq.....", ".....qq.....", "............", "............"],
};
/** Each picture as runs of one colour along its rows, made once. */
const RUNS: Record<string, Array<[x: number, y: number, w: number, fill: string]>> = Object.fromEntries(Object.entries(ART).map(([name, rows]) => {
  const runs: Array<[number, number, number, string]> = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const c = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === c) w++;
      if (c !== ".") runs.push([x, y, w, INK[c]]);
      x += w;
    }
  });
  return [name, runs];
}));
const HOUR = 3_600_000, BANGKOK = 7 * HOUR;
/** Whether a moment is in the night, by Bangkok's clock: a clear sky is a moon then, a sun by day. */
const atNight = (ms: number) => { const h = (((ms + BANGKOK) % (24 * HOUR)) + 24 * HOUR) % (24 * HOUR) / HOUR; return h >= 19 || h < 5; };
const glyphOf = (sky: Sky | null, at: number): string => (sky === null ? "unknown" : sky === "clear" ? (atNight(at) ? "moon" : "sun") : sky);
const SKY_WORDS: Record<string, [string, string]> = {
  sun: ["ฟ้าใส", "Clear"], moon: ["ฟ้าใส", "Clear"], cloudy: ["เมฆมาก", "Cloudy"], fog: ["หมอก", "Mist"], drizzle: ["ฝนปรอย", "Drizzle"], rain: ["ฝนตก", "Rain"], storm: ["พายุฝน", "Storm"], unknown: ["ยังไม่รู้", "Not known yet"],
};

function SkyGlyph({ name, size }: { name: string; size: number }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" className="shrink-0">
      {RUNS[name].map(([x, y, w, fill]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={fill} />)}
    </svg>
  );
}

/**
 * The rain frog (lib/town/well-gifts; the well's fifth rank), for the member it follows.
 *
 * - **The sky forty-five minutes ahead**: under the town's clock, this quarter hour's sky and the three to come, each
 *   a small picture with the time it begins; and, when the weather turns within them, in how many minutes the rain
 *   comes or ends. Nobody else in town is shown what the weather is, let alone what it will be. A quarter hour the
 *   database has not written yet is shown as not known, and the site is asked to write it.
 * - **Under rain the bucket in its member's hand fills by itself**: the map shows the rain falling into it and how
 *   full it is; after its time (twelve seconds a bucketful) whoever keeps the game is asked to fill it, and it is
 *   full. Nothing to press. Only in rain, only with the frog following; it is still to be carried and poured.
 *
 * What everybody sees of a frog (its hop, its croak before rain, the rain gathering into its member's bucket) is the
 * map's to draw (components/town/frog-art).
 */
export default function TownFrog({ keeper, th, compact, reduced, sfx, gauge, onWant }: {
  keeper: Keeper;
  th: boolean;
  /** A phone's width: the pictures and the times, and fewer words. */
  compact: boolean;
  reduced: boolean;
  sfx: FishSfx | null;
  /** Told how full the bucket the rain is filling is (0 to 1; null while none is), for the map to draw. */
  gauge: MutableRefObject<number | null>;
  /** Ask the site for the quarter hours to come now (it has not written the last one shown). */
  onWant: () => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const purse = keeper.purse();
  const follows = keeper.gives("famFrog") && works(purse, "famFrog");
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3000); return () => clearTimeout(t); }, [note]);

  // The sky: this quarter hour's and those to come, by the database's clock as this page has it.
  const now = SKIES.now(), ahead = follows ? skyAhead(now, (ms) => SKIES.sky(ms)) : [], coming = rainAhead(ahead), croaks = follows && croaksAt(now, (ms) => SKIES.sky(ms));
  const lacks = ahead.length > 0 && ahead[ahead.length - 1].sky === null;
  const asked = useRef(0);
  useEffect(() => {
    if (!lacks || Date.now() - asked.current < 60_000) return;
    asked.current = Date.now();
    onWant();
  });

  // The rain into my bucket: from the moment I hold an empty one under rain, for as long as it takes to fill.
  const raining = follows && SKIES.raining(keeper.now()), need = raining ? rainNeed(purse) : null;
  const key = need ? `${need.hand}:${need.slot}:${purse.rained ?? 0}` : null;
  const fill = useRef<{ key: string; from: number; ms: number; tried: number; stuck: boolean } | null>(null);
  if (!key) fill.current = null;
  else if (fill.current?.key !== key) fill.current = { key, from: performance.now(), ms: need!.ms, tried: 0, stuck: false };
  const full = fill.current && !fill.current.stuck ? Math.min(1, (performance.now() - fill.current.from) / fill.current.ms) : null;
  gauge.current = full;
  useEffect(() => () => { gauge.current = null; }, [gauge]);
  const busy = useRef(false);
  useEffect(() => {
    const f = fill.current;
    if (!f || f.stuck || busy.current || full === null || full < 1 || performance.now() - f.tried < 1000) return;
    busy.current = true;
    f.tried = performance.now();
    void keeper.rainFill().then((did) => {
      busy.current = false;
      if (did.ok) {
        sfx?.wake();
        sfx?.work("dip");
        setNote(th ? `ฝนเติมถังให้แล้ว ${did.n} ถัง` : `The rain has filled it: ${did.n} bucketful${did.n === 1 ? "" : "s"}`);
        // (not yet by the keeper's clock, or the town could not be reached: asked again in a moment; anything else, and this bucket is left alone)
      } else if (did.why !== "soon" && did.why !== "away" && fill.current === f) f.stuck = true;
      setTick((n) => n + 1);
    });
  });
  // the clock runs: the sky's quarter hours turn, and a bucket fills
  const filling = full !== null;
  useEffect(() => {
    if (!follows) return;
    const t = setInterval(() => setTick((n) => n + 1), filling ? 200 : 5000);
    return () => clearInterval(t);
  }, [follows, filling]);

  // (for scripts in `next dev`: the sky as it is shown, what is coming, the croak, the filling; and a sky of the script's own)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      follows: () => follows, ahead: () => ahead.map((q) => ({ at: q.at, sky: q.sky })), coming: () => coming, croaks: () => croaks, raining: () => raining,
      filling: () => (fill.current ? { full, ms: fill.current.ms, stuck: fill.current.stuck } : null), note: () => note,
      force: (words: string[]) => { SKIES.forceAhead(words.map((w) => forcedWeather(w)).filter((w): w is Weather => !!w)); setTick((n) => n + 1); },
    };
    (window as unknown as { __townFrog?: typeof handle }).__townFrog = handle;
    return () => { delete (window as unknown as { __townFrog?: typeof handle }).__townFrog; };
  });

  if (!follows) return null;
  const clock = (at: number) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(at);
  const word = (name: string) => SKY_WORDS[name][th ? 0 : 1];
  const bucket = need ? ((`${iconOf(need.hand)}Full` in ICON_ATLAS.icons ? `${iconOf(need.hand)}Full` : iconOf(need.hand)) as IconName) : null;
  const said = coming ? ("rain" in coming ? (th ? `ฝนมาในอีก ${coming.rain} นาที` : `Rain in ${coming.rain} min`) : (th ? `ฝนซาในอีก ${coming.clears} นาที` : `Rain ends in ${coming.clears} min`)) : null;
  return (
    <div data-town-frog data-still={reduced ? "" : undefined} data-croaks={croaks ? "" : undefined}
         className="pointer-events-auto rounded-2xl border border-line-strong bg-bg/80 px-2 py-1.5 shadow-lg shadow-black/30 backdrop-blur-sm">
      <style href="town-frog" precedence="medium">{`
        @keyframes tf-croak { 0%, 62%, 100% { transform: none } 8% { transform: translateY(-2px) scale(1.08, .94) } 18% { transform: translateY(0) scale(.96, 1.05) } 28% { transform: none } }
        @keyframes tf-glow { 0%, 100% { opacity: .45 } 50% { opacity: 1 } }
        @keyframes tf-fill { from { background-position: 0 0 } to { background-position: 12px 0 } }
        .tf-croak { animation: tf-croak 3200ms ease-in-out infinite; transform-origin: 50% 100% }
        .tf-glow { animation: tf-glow 1500ms ease-in-out infinite }
        .tf-fill { animation: tf-fill 700ms linear infinite }
        [data-town-frog][data-still] .tf-croak, [data-town-frog][data-still] .tf-glow, [data-town-frog][data-still] .tf-fill { animation: none }
        @media (prefers-reduced-motion: reduce) { .tf-croak, .tf-glow, .tf-fill { animation: none } }
      `}</style>
      <div className="flex items-center gap-1.5">
        <span className={`inline-grid shrink-0 ${croaks ? "tf-croak" : ""}`} title={th ? "กบพยากรณ์ฝน" : "The rain frog"}><TownIcon name={"famFrog" as IconName} size={compact ? 26 : 30} /></span>
        <ol className="flex items-end gap-0.5" aria-label={th ? `ท้องฟ้า ${FROG.ahead} นาทีข้างหน้า` : `The sky, ${FROG.ahead} minutes ahead`} data-frog-ahead>
          {ahead.map((q, i) => {
            const name = glyphOf(q.sky, q.at), wet = q.sky !== null && isWet(q.sky), turn = i > 0 && q.sky !== null && ahead[0].sky !== null && wet !== isWet(ahead[0].sky);
            return (
              <li key={i} data-frog-sky={q.sky ?? "unknown"} title={`${i ? clock(q.at) : th ? "ตอนนี้" : "Now"} · ${word(name)}`}
                  className={`flex w-9 flex-col items-center rounded-lg px-0.5 py-0.5 ${i === 0 ? "bg-line/60" : ""} ${turn && wet ? "bg-[#4aa3d8]/20" : ""}`}>
                <span className={turn ? "tf-glow inline-grid" : "inline-grid"}><SkyGlyph name={name} size={compact ? 20 : 22} /></span>
                <span className="font-data text-[10px] leading-tight tabular-nums text-muted">{i ? clock(q.at) : th ? "ตอนนี้" : "now"}</span>
                <span className="sr-only">{word(name)}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {said && (
        <p className="mt-1 flex items-center gap-1 px-0.5 text-label font-semibold text-ink" data-frog-coming={"rain" in coming! ? "rain" : "clears"} aria-live="polite">
          <TownIcon name={"rain" in coming! ? "waterRain" : "plotDrop"} size={14} />{said}
        </p>
      )}
      {full !== null && bucket && (
        <div className="mt-1 flex items-center gap-1.5 px-0.5" data-frog-fill={Math.round(full * 100)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(full * 100)} aria-label={th ? "ฝนกำลังเติมถัง" : "The rain is filling your bucket"}>
          <TownIcon name={bucket} size={16} />
          <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-sm border border-[#1c2f3d] bg-[#22323f]">
            <span className="tf-fill absolute inset-y-0 left-0 block" style={{ width: `${Math.round(full * 100)}%`, backgroundImage: "repeating-linear-gradient(90deg, #7fc7f0 0 6px, #a9dcf7 6px 12px)" }} />
          </span>
          {!compact && <span className="shrink-0 text-label text-muted">{th ? "รองน้ำฝน" : "Catching rain"}</span>}
        </div>
      )}
      {note && <p className="mt-1 flex items-center gap-1 px-0.5 text-label font-semibold text-[#9fdcff]" aria-live="polite" data-frog-note><TownIcon name="plotDrop" size={12} />{note}</p>}
    </div>
  );
}
