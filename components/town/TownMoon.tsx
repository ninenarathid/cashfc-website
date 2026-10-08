"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FARMING } from "@/lib/town/farm";
import { hasThing } from "@/lib/town/gifts";
import type { Keeper } from "@/lib/town/keeper";
import { carried } from "@/lib/town/line";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent } from "@/lib/town/stamina";
import { NATURE_NAMES, type Nature } from "@/lib/town/waters";
import { MOON, moonOf } from "@/lib/town/well-gifts";
import { WELL } from "@/lib/town/world";
import type { FarmDraw } from "./TownFarm";
import TownIcon, { type IconName } from "./TownIcon";
import TownFoot from "./TownFoot";
import { useLeaving } from "./useLeaving";
import TownPouring from "./TownPouring";
import { FLASK_LIGHT_MS, drawFlaskLight } from "./moon-art";

/** The picture of each water that has a nature, and its light (the well's own, components/town/TownWell and TownFarm). */
const NATURE_ICONS: Record<Nature, IconName> = { dawn: "waterDawn", rain: "waterRain", moon: "waterMoon" };
const GLOW: Record<Nature, string> = { dawn: "#ffd98a", rain: "#9fd0ff", moon: "#e8ecff" };
const FLASK = "thingMoon" as IconName;

/** Why not, in the flask's own words. */
const WHY: Record<string, [string, string]> = {
  none: ["ตรงนี้เทไม่ได้ ต้องยืนที่บ่อน้ำ", "Not here: stand at the well"], hand: ["ถังในมือไม่มีน้ำ", "The bucket you hold has no water"],
  plain: ["น้ำธรรมดาเก็บใส่ขวดไม่ได้", "Plain water is not for the flask"], other: ["ขวดเก็บน้ำอีกชนิดอยู่", "The flask keeps another water"],
  brim: ["ขวดเต็มแล้ว", "The flask is full"], dry: ["ขวดว่างอยู่", "The flask is empty"], amount: ["เทไม่ได้", "That cannot be poured"],
  shaky: ["หมดแรง มือสั่นจนเทไม่ลง", "Too tired: your hands shake, and nothing is poured"], away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town could not be reached: try again"],
};

/**
 * The moon flask (lib/town/well-gifts; the well's sixth rank), for whoever has it: a small plate under the town's
 * clock that says what the flask keeps (three places, each filled in the light of its water, and the water's name),
 * and offers what can be done with it where it can be done:
 *
 * - **holding a bucket of water that has a nature** (the dew's, the rain's, the moon's): keep it in the flask, as
 *   much as there is room for;
 * - **standing at the farm's well with water in the flask**: pour a bucketful, or all of it. The bucket's own pour
 *   is offered as ever, where the map's foot has it. With no stamina the pour is the short game of tired hands, as
 *   any pour is.
 *
 * Poured, the well takes the water's nature three times as long as from a bucket; a column of its light goes up out
 * of the well on the pourer's page, and the well's own look and sign tell everybody (components/town/TownFarm).
 * Nothing says what a water does.
 */
export default function TownMoon({ keeper, th, compact, reduced, sfx, at, bottom, register }: {
  keeper: Keeper;
  th: boolean;
  /** A phone's width: fewer words. */
  compact: boolean;
  reduced: boolean;
  sfx: FishSfx | null;
  /** The tile I stand still on at the farm's well (null: I am not at it, or something else has the screen). */
  at: [number, number] | null;
  /** How far up from the foot of the map the game of tired hands sits. */
  bottom: string;
  /** Hand the map the way to draw the light at the well (and take it back with null). */
  register: (draw: FarmDraw | null) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const purse = keeper.purse();
  const mine = keeper.gives("thingMoon") && hasThing(purse, "thingMoon");
  const has = moonOf(purse), held = carried(purse), kind = held && held.has >= 1 ? keeper.carriedKind() : null;
  const room = MOON.holds - (has?.n ?? 0);
  /** Whether the water in my hand can be kept now; or is kept from the flask by the water it has. */
  const canKeep = mine && !!kind && room > 0 && (!has || has.kind === kind), other = mine && !!kind && !!has && has.kind !== kind;
  const canPour = mine && !!at && !!has;
  // (what water the bucket in my hand has is the keeper's to say: asked whenever what I hold changes)
  const heldKey = held ? `${held.hand}:${held.has}` : "";
  useEffect(() => { if (mine) keeper.moonLook(); }, [keeper, mine, heldKey]);

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4200); return () => clearTimeout(t); }, [note]);
  const say = useCallback((why: string) => { const w = WHY[why] ?? WHY.amount; setNote(th ? w[0] : w[1]); }, [th]);
  /** The pour that tired hands are at: how many bucketfuls. */
  const leaving = useLeaving(keeper);
  const [working, setWorking] = useState<number | null>(null);
  useEffect(() => { if (working !== null && !canPour) setWorking(null); }, [working, canPour]);

  // The light at the well, for a few seconds after I pour: drawn by the map among its own things.
  const light = useRef<{ from: number; kind: Nature; n: number } | null>(null);
  useEffect(() => {
    register((frame) => {
      const l = light.current;
      if (!l) return;
      const t = (performance.now() - l.from) / FLASK_LIGHT_MS;
      if (t >= 1) { light.current = null; return; }
      const foot = frame.project({ x: WELL.x + 0.5, y: WELL.y + 0.5 });
      if (!frame.onScreen(foot)) return;
      const draw = () => drawFlaskLight(frame.ctx, foot, frame.s, t, GLOW[l.kind], l.n, frame.still);
      if (frame.over) frame.over(draw); else frame.things.push({ depth: WELL.x + WELL.y + 1.3, draw });
    });
    return () => register(null);
  }, [register]);

  const name = useCallback((k: Nature) => NATURE_NAMES[k][th ? 0 : 1], [th]);
  const keep = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const did = await keeper.moonKeep();
    setBusy(false);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake();
    sfx?.work("dip", 0.8);
    setNote(th ? `เก็บ${name(did.kind)}ใส่ขวด ${did.n} ถัง` : `${did.n} bucketful${did.n === 1 ? "" : "s"} of ${name(did.kind).toLowerCase()} kept`);
  }, [keeper, busy, sfx, th, say, name]);
  const pour = useCallback(async (n: number) => {
    if (!at || busy) return;
    setBusy(true);
    const did = await keeper.moonPour(n, at);
    setBusy(false);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake();
    sfx?.work("pour");
    sfx?.work("made", 0.5);
    light.current = { from: performance.now(), kind: did.kind, n: did.poured };
    const w = keeper.wellWater(), mins = w ? Math.max(1, Math.ceil((w.until - keeper.now()) / 60_000)) : 0, h = Math.floor(mins / 60), m = mins % 60;
    const long = th ? `${h ? `${h} ชม. ` : ""}${m ? `${m} นาที` : ""}`.trim() : `${h ? `${h} h ` : ""}${m ? `${m} min` : ""}`.trim();
    setNote(th ? `น้ำในบ่อเป็น${name(did.kind)}แล้ว${long ? ` · อีก ${long}` : ""}` : `The well's water is ${name(did.kind).toLowerCase()} now${long ? ` · ${long} more` : ""}`);
  }, [keeper, at, busy, sfx, th, say, name]);
  /** A pour begun: at once with stamina; with none, the short game of tired hands first. */
  const begin = useCallback((n: number) => {
    if (busy || working !== null) return;
    if (isSpent(keeper.purse(), keeper.now())) setWorking(n); else void pour(n);
  }, [keeper, busy, working, pour]);

  // (for scripts in `next dev`: what the flask keeps, what is offered, and the two deeds)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      mine: () => mine, has: () => has, kind: () => kind, canKeep: () => canKeep, canPour: () => canPour, other: () => other, note: () => note, working: () => working,
      lit: () => (light.current ? { kind: light.current.kind, n: light.current.n } : null), keep, pour: begin,
    };
    (window as unknown as { __townMoon?: typeof handle }).__townMoon = handle;
    return () => { delete (window as unknown as { __townMoon?: typeof handle }).__townMoon; };
  }, [mine, has, kind, canKeep, canPour, other, note, working, keep, begin]);

  if (!mine) return null;
  const pips = Array.from({ length: MOON.holds }, (_, i) => i < (has?.n ?? 0));
  return (
    <>
      <div data-town-moon={has ? `${has.kind}:${has.n}` : ""} data-still={reduced ? "" : undefined}
           className="pointer-events-auto max-w-full rounded-2xl border border-line-strong bg-bg/80 px-2 py-1.5 shadow-lg shadow-black/30 backdrop-blur-sm">
        <style href="town-moon" precedence="medium">{`
          @keyframes tmo-pip { 0%, 100% { opacity: .78 } 50% { opacity: 1 } }
          @keyframes tmo-in { from { transform: scale(.3); opacity: 0 } to { transform: none; opacity: 1 } }
          .tmo-pip { animation: tmo-in 260ms cubic-bezier(.2, .9, .3, 1.3) both, tmo-pip 2200ms ease-in-out 260ms infinite }
          [data-town-moon][data-still] .tmo-pip { animation: none }
          @media (prefers-reduced-motion: reduce) { .tmo-pip { animation: none } }
        `}</style>
        <div className="flex items-center gap-2">
          <span className="inline-grid shrink-0" title={th ? "ขวดแก้วจันทรา" : "The moon flask"}><TownIcon name={FLASK} size={compact ? 26 : 30} /></span>
          <span className="flex items-center gap-1" role="img" aria-label={has ? (th ? `ในขวดมี${name(has.kind)} ${has.n} ถัง` : `The flask keeps ${has.n} of ${name(has.kind).toLowerCase()}`) : th ? "ขวดว่าง" : "The flask is empty"}>
            {pips.map((full, i) => (
              <span key={`${i}-${full}`} data-moon-pip={full ? "full" : ""} className={`inline-block size-3 rounded-[3px] border ${full ? "tmo-pip border-white/60" : "border-line-strong bg-line/40"}`}
                    style={full && has ? { backgroundColor: GLOW[has.kind], boxShadow: `0 0 6px ${GLOW[has.kind]}` } : undefined} />
            ))}
          </span>
          {has && (
            <span className="flex min-w-0 items-center gap-1 text-label font-semibold text-ink">
              <TownIcon name={NATURE_ICONS[has.kind]} size={16} />
              <span className="truncate">{name(has.kind)}</span>
            </span>
          )}
        </div>
        {(canKeep || canPour || other) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {canKeep && kind && (
              <button type="button" onClick={() => void keep()} disabled={busy} data-moon-keep={kind}
                      className="pressable flex min-h-11 items-center gap-1.5 rounded-full border border-line-lit bg-surface/95 px-3 text-ui font-semibold text-ink transition-colors hover:border-accent disabled:opacity-60">
                <TownIcon name={NATURE_ICONS[kind]} size={18} />{th ? "เก็บใส่ขวด" : "Keep it"}
              </button>
            )}
            {other && kind && !canKeep && (
              <span className="flex items-center gap-1 px-1 text-label text-muted" data-moon-other={kind}><TownIcon name={NATURE_ICONS[kind]} size={14} className="opacity-70" />{th ? "ขวดเก็บน้ำอีกชนิดอยู่" : "The flask keeps another water"}</span>
            )}
            {canPour && has && working === null && (
              <>
                <button type="button" onClick={() => begin(1)} disabled={busy} data-moon-pour="1"
                        className="pressable flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-3 text-ui font-semibold text-bg disabled:opacity-60">
                  <TownIcon name="well" size={18} />{th ? "เทลงบ่อ 1 ถัง" : "Pour 1 in"}
                </button>
                {has.n > 1 && (
                  <button type="button" onClick={() => begin(has.n)} disabled={busy} data-moon-pour="all"
                          className="pressable flex min-h-11 items-center gap-1.5 rounded-full border border-accent px-3 text-ui font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-60">
                    {th ? `เททั้งหมด ${has.n}` : `All ${has.n}`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {note && <p className="mt-1 flex max-w-[17rem] items-start gap-1 px-0.5 text-label font-semibold text-ink" aria-live="polite" data-moon-note>{note}</p>}
      </div>
      {/* tired hands: the short pour, as of any water (in the map's foot, though this plate lives under the clock) */}
      {working !== null && canPour && (
        <TownFoot rank="board">
          <div className="pop-in pointer-events-auto w-full max-w-[24rem]" data-state="open" data-game="pouring">
            <TownPouring th={th} title={th ? "เทน้ำจากขวดลงบ่อ" : "Pour the flask into the well"} verb={th ? "กดค้างเท" : "Hold to pour"} need={FARMING.tired} mods={{ tool: 1, spent: true, drops: true }}
                         icon={FLASK} taking={false} into={"well" as IconName}
                         onHit={(hit) => { sfx?.wake(); if (!hit) sfx?.work("knock"); }}
                         onDone={(result) => {
                           const n = working;
                           leaving.ended("flask");
                           setWorking(null);
                           keeper.record({ game: "farming", board: "pouring", at: keeper.now(), won: !result.dropped, secs: result.secs, spent: true, buff: null, what: "flask", need: result.need, hits: result.hits, misses: result.misses });
                           if (result.dropped) { say("shaky"); return; }
                           void pour(n);
                         }}
                         onCancel={() => {
                           leaving.left("flask", { game: "farming", board: "pouring", how: "left", at: keeper.now(), won: false, secs: 0, spent: true, buff: null, what: "flask", need: 0, hits: 0, misses: 0 });
                           setWorking(null);
                         }} />
          </div>
        </TownFoot>
      )}
    </>
  );
}
