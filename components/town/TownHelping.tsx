"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { numberOf, usesLeft, wearing, works, type GiftId } from "@/lib/town/gifts";
import { HELPING, aidsOf, runOf, timesAt, type Aid } from "@/lib/town/helping";
import type { Keeper } from "@/lib/town/keeper";
import type { Stander } from "@/lib/town/line";
import type { FishSfx } from "@/lib/town/sfx";
import TownIcon, { type IconName } from "./TownIcon";
import TownFoot from "./TownFoot";

/**
 * What the gifts of the helpers' line show on the map's page (lib/town/helping), beside the farm's own buttons
 * (components/town/TownFarm, which draws what is drawn on the map itself).
 */

/**
 * The anklet's run, while it lasts: a pip for each plant of it, up to the twenty that make the most of it, what a
 * watering is worth now, and how much of the gap's seconds is left before it begins anew. It says nothing of how:
 * the pips and the time say it.
 */
export function AnkletRun({ keeper }: { keeper: Keeper }) {
  const [, setTick] = useState(0);
  const purse = keeper.purse(), now = keeper.now(), run = wearing(purse, "charmAnklet") ? runOf(purse, now) : 0, alive = run > 0;
  // (the time left runs down by itself: looked at five times a second while there is a run)
  useEffect(() => { if (!alive) return; const t = setInterval(() => setTick((n) => n + 1), 200); return () => clearInterval(t); }, [alive]);
  if (!alive) return null;
  const top = run >= HELPING.anklet.run, left = Math.max(0, Math.min(1, 1 - (now - (purse.chime?.at ?? now)) / (HELPING.anklet.gap * 1000)));
  return (
    <div className={`pop-in pointer-events-none flex items-center gap-2 rounded-full border-2 bg-[#3a2513]/95 py-1 pl-1.5 pr-3 shadow-lg shadow-black/40 ${top ? "border-[#ffe19a]" : "border-[#9c6b3d]"}`}
         data-state="open" data-anklet-run={run} data-anklet-times={timesAt(run)} aria-hidden>
      <span className="grid size-8 place-items-center rounded-full border-2 border-[#2a190d] bg-[#6b4424]"><TownIcon name={"charmAnklet" as IconName} size={22} /></span>
      <span className="flex flex-col gap-1">
        {/* a pip a plant, ten to a line */}
        <span className="grid grid-cols-10 gap-[2px]">
          {Array.from({ length: HELPING.anklet.run }, (_, i) => <span key={i} className={`size-[5px] ${i < run ? (top ? "bg-[#ffd98a]" : "bg-[#cfe9ff]") : "bg-[#4a2f18]"}`} />)}
        </span>
        {/* the time left before the run begins anew */}
        <span className="block h-[3px] w-full overflow-hidden bg-[#4a2f18]"><span className={`block h-full ${top ? "bg-[#ffd98a]" : "bg-[#cfe9ff]"}`} style={{ width: `${left * 100}%` }} /></span>
      </span>
      <span className={`font-data text-ui font-semibold tabular-nums ${top ? "text-[#ffe19a]" : "text-[#e9cfa4]"}`}>×{timesAt(run)}</span>
    </div>
  );
}

/** The gift each thing a friend did for me is of: its picture is on the word of it. */
const AID_GIFT: Record<Aid["what"], GiftId> = { bell: "charmBell", ring: "charmRing", dust: "thingDust" };
const tenth = (n: number) => Math.round(n * 10) / 10;
/** What is said of one, in a line. */
function aidWord(a: Aid, th: boolean, called?: string | null): string {
  const who = called || a.name || (th ? "เพื่อน" : "a friend");
  if (a.what === "bell") {
    const back = a.back ? tenth(a.back) : 0;
    return th ? `ระฆังคู่หูดังกับ ${who} · ${a.n} ต้นนับ 2 เท่า${back ? ` · แรง +${back}` : ""}` : `The duet bell rang with ${who}: ${a.n} ${a.n === 1 ? "plant counts" : "plants count"} double${back ? `, +${back} stamina` : ""}`;
  }
  if (a.what === "ring") return th ? `${who} แบ่งแรงให้คุณ +${tenth(a.n)}` : `${who} shared strength with you: +${tenth(a.n)} stamina`;
  return th ? `${who} โรยผงภูตสวนให้ต้นไม้ของคุณ` : `${who} sprinkled fae dust on a plant of yours`;
}

/**
 * What friends' gifts did for me, told once (lib/town/helping's Aid: kept in my own purse by whoever keeps the game,
 * so it is told wherever and whenever I next look, though I was away when it was done): a bell that rang with a
 * friend, strength somebody shared with me, dust somebody sprinkled on a plant of mine. One at a time, a few seconds
 * each, with its sound; and the map is told (`onAid`), to show it where it happened. What this device has told of
 * is remembered on the device, by its moment.
 */
export function HelpNews({ keeper, th, sfx, onAid, nameOf }: {
  keeper: Keeper; th: boolean; sfx: FishSfx | null; onAid?: (aid: Aid) => void;
  /** What somebody is called on the map now, if they are on it (it is the name others know them by here: the one kept with the news is for when they are gone). */
  nameOf?: (id: string) => string | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const [shown, setShown] = useState<Aid | null>(null);
  const queue = useRef<Aid[]>([]), told = useRef<number | null>(null), busy = useRef(false);
  const next = useCallback(() => {
    const a = queue.current.shift() ?? null;
    busy.current = !!a;
    setShown(a);
    if (!a) return;
    sfx?.wake();
    if (a.what === "bell") sfx?.duet(); else sfx?.work(a.what === "ring" ? "made" : "feed", 0.8);
    onAid?.(a);
    window.setTimeout(next, 3600);
  }, [sfx, onAid]);
  const ready = keeper.ready(), aids = ready ? aidsOf(keeper.purse()) : [], newest = aids.length ? Math.max(...aids.map((a) => a.at)) : 0;
  useEffect(() => {
    if (!ready || !newest) return;
    const key = `cashtown.aided.${keeper.id}`;
    if (told.current === null) { try { told.current = Number(window.localStorage.getItem(key)) || 0; } catch { told.current = 0; } }
    const was = told.current, now = keeper.now();
    // (what was done more than two days ago is no news any more)
    const fresh = aidsOf(keeper.purse()).filter((a) => a.at > was && now - a.at < 2 * 86_400_000).sort((a, b) => a.at - b.at);
    if (!fresh.length) return;
    told.current = newest;
    try { window.localStorage.setItem(key, String(newest)); } catch { /* told again another time, then */ }
    queue.current.push(...fresh);
    if (!busy.current) next();
  }, [ready, newest, keeper, next]);
  if (!shown) return null;
  return (
    <TownFoot rank="toast" order={50}>
      <p key={shown.at} role="status" data-state="open" data-help-news={shown.what} data-help-by={shown.by}
         className="pop-in flex max-w-[24rem] items-center gap-2 rounded-2xl border-2 border-[#f0c060] bg-[#3a2513]/95 py-1.5 pl-2 pr-4 text-ui font-semibold leading-snug text-[#ffeccb] shadow-xl shadow-black/40">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#2a190d] bg-[#6b4424]"><TownIcon name={AID_GIFT[shown.what] as IconName} size={26} /></span>
        {aidWord(shown, th, nameOf?.(shown.by))}
      </p>
    </TownFoot>
  );
}

/** Why the ring gave nothing, in a line. */
const WHY_RING: Record<string, [th: (name: string) => string, en: (name: string) => string]> = {
  none: [() => "ตอนนี้ใช้แหวนไม่ได้", () => "The ring cannot be used now"], spent: [() => "วันนี้แบ่งแรงครบแล้ว", () => "The ring has given all it gives in a day"],
  far: [(n) => `${n} อยู่ไกลเกินไป`, (n) => `${n} stands too far off`], full: [(n) => `แรงของ ${n} เต็มอยู่แล้ว`, (n) => `${n} has all the stamina there is room for`],
  weak: [() => "แรงของคุณไม่พอจะแบ่ง", () => "You have not the stamina to share"], away: [() => "ติดต่อเมืองไม่ได้ ลองอีกครั้ง", () => "The town could not be reached: try again"],
};
/** Who stands near enough to be given strength by the ring, the nearest first: standing still, looking at the map, within the ring's reach of me. */
export function nearMe(people: Stander[], me: string): Array<Stander & { far: number }> {
  const self = people.find((p) => p.id === me);
  if (!self) return [];
  return people.filter((p) => p.id !== me && !p.moving && !p.away).map((p) => ({ ...p, far: Math.hypot(p.x - self.x, p.y - self.y) }))
    .filter((p) => p.far <= HELPING.ring.reach).sort((a, b) => a.far - b.far || (a.id < b.id ? -1 : 1));
}

/**
 * The ring of shared strength (lib/town/helping's share): while I wear it, stand still and have a giving left to the
 * day, each of the two friends nearest me within its reach is offered by name; one press gives them thirty of my
 * stamina for fifteen. What came of it is said in a line, and the map is told (`onGave`), to show it going over.
 */
export function RingOffer({ keeper, th, here, people, name, sfx, bottom, onGave }: {
  keeper: Keeper; th: boolean;
  /** Where I stand still (null while walking, or while something else is open). */
  here: [number, number] | null;
  /** Everybody on the map now, as the map has them. */
  people: () => Stander[];
  /** What I am called, for the friend to be told by. */
  name: string;
  sfx: FishSfx | null;
  /** How far up from the foot of the map the offer sits. */
  bottom: string;
  onGave?: (to: string) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const purse = keeper.purse(), now = keeper.now(), left = works(purse, "charmRing") && keeper.gives("charmRing") ? usesLeft(purse, "charmRing", now) : 0;
  const can = !!here && left > 0;
  // (who stands where is the map's, and changes without anything of the keeper's changing: looked at twice a second while the ring could give)
  useEffect(() => { if (!can) return; const t = setInterval(() => setTick((n) => n + 1), 500); return () => clearInterval(t); }, [can]);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3000); return () => clearTimeout(t); }, [note]);
  const busy = useRef(false);
  const give = useCallback(async (to: Stander & { far: number }) => {
    if (busy.current) return;
    busy.current = true;
    const did = await keeper.ringTo(to.id, to.far, name).finally(() => { busy.current = false; });
    if (!did.ok) { const w = WHY_RING[did.why] ?? WHY_RING.none; setNote(w[th ? 0 : 1](to.name)); return; }
    sfx?.wake();
    sfx?.work("made", 0.8);
    onGave?.(to.id);
    const gave = Math.round(did.gave * 10) / 10, paid = Math.round(did.paid * 10) / 10;
    setNote(th ? `แบ่งแรงให้ ${to.name} +${gave} · แรงของคุณ −${paid}` : `${to.name} has +${gave} stamina of yours, for ${paid}`);
  }, [keeper, name, th, sfx, onGave]);
  const near = can ? nearMe(people(), keeper.id).slice(0, 2) : [];
  // (for scripts in `next dev`: who the ring is offered for, what it last said, and giving to the first of them)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = { near: () => (can ? nearMe(people(), keeper.id).map((p) => ({ id: p.id, far: p.far })) : []), left: () => left, note: () => note, give: () => { const to = nearMe(people(), keeper.id)[0]; if (to) void give(to); } };
    (window as unknown as { __townRing?: typeof handle }).__townRing = handle;
    return () => { delete (window as unknown as { __townRing?: typeof handle }).__townRing; };
  }, [can, left, note, give, people, keeper]);
  if (!near.length && !note) return null;
  return (
    <TownFoot rank="chip" order={20}>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-ring-note>{note}</p>}
      {near.map((p) => (
        <button key={p.id} type="button" onClick={() => void give(p)} data-ring-chip={p.id} data-state="open"
                className="pop-in pressable pointer-events-auto flex min-h-12 max-w-full items-center gap-2 rounded-full border-2 border-[#f0c060] bg-[#3a2513]/95 py-1 pl-2 pr-4 text-ui font-semibold text-[#ffeccb] shadow-xl shadow-black/40">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#2a190d] bg-[#6b4424]"><TownIcon name={"charmRing" as IconName} size={26} /></span>
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="max-w-full truncate">{th ? `แบ่งแรงให้ ${p.name}` : `Share strength with ${p.name}`}</span>
            <span className="font-data text-label font-normal tabular-nums text-[#f0c060]" data-ring-more>+{numberOf("charmRing")} · {th ? `วันนี้เหลือ ${left}` : `${left} left today`}</span>
          </span>
        </button>
      ))}
    </TownFoot>
  );
}
