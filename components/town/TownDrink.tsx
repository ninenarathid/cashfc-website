"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasThing } from "@/lib/town/gifts";
import type { Keeper } from "@/lib/town/keeper";
import type { Stander } from "@/lib/town/line";
import type { FishSfx } from "@/lib/town/sfx";
import { STAMINA, staminaOf } from "@/lib/town/stamina";
import { DRINK, drinkNear, hasDrunk, readDrinkTold, toastOf, type DrinkNo, type DrinkTold } from "@/lib/town/well-gifts";
import TownIcon, { type IconName } from "./TownIcon";

/** The room's way for two pages to tell each other of a drink (lib/town/session's `pair`): into one letterbox, never the room. */
export interface DrinkPairing { send: (to: string, told: DrinkTold) => void; hear: (fn: ((from: string, data: unknown) => void) | null) => void }
/** The map's way to have a drink held out to somebody from their card. */
export type OfferDrink = (id: string, name: string) => void;

/** One of the two of a drink, as this page has them. */
interface Who { id: string; name: string }
/** A drink that was drunk, to be shown for a moment: who gave, who drank, what each had of it, and which of the two I am. */
interface Moment { key: number; giver: Who; drinker: Who; got: number; back: number; mine: "drank" | "gave" }
const MOMENT_MS = 3200;
const FLASK = "thingFlask" as IconName;

/** Why not, in the flask's own words: mine, and (by name) the other's. */
const WHY: Record<string, [string, string]> = {
  none: ["ตอนนี้ไม่มีน้ำให้ดื่มแล้ว", "There is no drink to be had now"], late: ["ช้าไปนิด กระติกถูกเก็บแล้ว", "Too late: the flask was put away"],
  far: ["ยืนไกลเกินไป เข้าไปใกล้อีกนิด", "Too far off: step nearer"], drunk: ["มื้อนี้ดื่มไปแล้ว", "You have had your drink of these hours"],
  sated: ["แรงเต็มอยู่แล้ว", "Your stamina is full"], away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town could not be reached: try again"],
};
const NO: Record<DrinkNo | "lapsed", [(n: string) => string, (n: string) => string]> = {
  drunk: [(n) => `${n} ดื่มไปแล้วมื้อนี้`, (n) => `${n} has had a drink in these hours`], sated: [(n) => `${n} แรงเต็มอยู่แล้ว`, (n) => `${n}'s stamina is full`],
  busy: [(n) => `${n} ยังไม่ว่าง`, (n) => `${n} is busy`], far: [(n) => `${n} อยู่ไกลเกินไป`, (n) => `${n} is too far off`],
  later: [(n) => `${n} ขอไว้ก่อน`, (n) => `${n} said not now`], lapsed: [(n) => `${n} ยังไม่ได้ดื่ม`, (n) => `${n} did not drink`],
};

/**
 * The flask of living water (lib/town/well-gifts; the well's fourth rank): a drink for a friend.
 *
 * Whoever has the flask holds a drink out to somebody near: from that person's card on the map, or, when a friend
 * who stands near has no stamina left, from a chip that names them. The friend's page puts a small card up, with
 * the giver's name and a button: **it is the friend who drinks**. Drunk, both pages show it for a moment (the flask
 * tipped, what each had of it rising over their heads); not drunk within its twenty seconds, the drink is put away
 * and the giver is told. A friend who has drunk in these hours, or whose gauge is full, is not shown a card: the
 * giver is told so by name.
 *
 * The two pages talk through the room's letterboxes; what is true is the keeper's (the database judges both purses
 * in the one call that drinks). On the giver's page the drink is known to be drunk when the purse no longer holds
 * one out, whether or not the other page's word has come.
 */
export default function TownDrink({ keeper, me, th, here, where, people, pair, spot, register, sfx, reduced, hidden }: {
  keeper: Keeper;
  me: string;
  th: boolean;
  /** Where I stand still (null while walking). */
  here: [number, number] | null;
  /** The tile I am on, walking or not. */
  where: () => [number, number] | null;
  /** Everybody on the map now, as the map has them. */
  people: () => Stander[];
  pair: DrinkPairing | null;
  /** Where somebody's head is on the screen now (null: not on it). */
  spot: (id: string) => { x: number; y: number } | null;
  /** Hand the map the way to hold a drink out to somebody (and take it back with null). */
  register: (offer: OfferDrink | null) => void;
  sfx: FishSfx | null;
  /** Whether the town is asked to keep still. */
  reduced: boolean;
  /** Whether something else has the screen (a talk, the bag, a board): nothing of mine is offered then; a card that is up stays. */
  hidden: boolean;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const purse = keeper.purse(), now = keeper.now();
  const mine = keeper.gives("thingFlask") && hasThing(purse, "thingFlask");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3200); return () => clearTimeout(t); }, [note]);
  /** The drink I hold out, and the one held out to me. */
  const [out, setOut] = useState<(Who & { till: number; had: number }) | null>(null), outRef = useRef(out);
  const [card, setCard] = useState<(Who & { till: number }) | null>(null), cardRef = useRef(card);
  const [moment, setMoment] = useState<Moment | null>(null);
  useEffect(() => { outRef.current = out; cardRef.current = card; });
  useEffect(() => { if (!moment) return; const t = setTimeout(() => setMoment(null), MOMENT_MS); return () => clearTimeout(t); }, [moment]);
  // who stands where is the map's, and a drink held out runs down: looked at a few times a second while either matters
  const watching = (mine && !!here) || !!out || !!card || !!moment;
  useEffect(() => {
    if (!watching) return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [watching]);

  const say = useCallback((why: string) => { const w = WHY[why] ?? WHY.none; setNote(th ? w[0] : w[1]); }, [th]);
  const shown = useCallback((m: Omit<Moment, "key">) => {
    setMoment({ ...m, key: Date.now() });
    sfx?.wake();
    sfx?.work("ladle");
    sfx?.work("made", 0.6);
  }, [sfx]);

  /** Hold a drink out to somebody. */
  const offer = useCallback(async (to: Who) => {
    const at = where();
    if (!at || busy || outRef.current) return;
    setBusy(true);
    const before = staminaOf(keeper.purse(), keeper.now());
    const did = await keeper.drinkOffer(to.id, at);
    setBusy(false);
    if (!did.ok || did.till === null) { say(did.ok ? "none" : did.why); return; }
    setOut({ ...to, till: did.till, had: before });
    pair?.send(to.id, { k: "dr", m: "offer", t: did.till });
    sfx?.wake();
    sfx?.work("pour", 0.6);
  }, [keeper, where, busy, pair, sfx, say]);
  useEffect(() => { register((id, name) => { void offer({ id, name }); }); return () => register(null); }, [register, offer]);
  /** Put it away. */
  const putAway = useCallback((told = true) => {
    const o = outRef.current;
    if (!o) return;
    setOut(null);
    if (told) pair?.send(o.id, { k: "dr", m: "off" });
    const at = where();
    if (at) void keeper.drinkOffer(null, at);
  }, [keeper, where, pair]);

  /** Drink what is held out to me; or say not now. */
  const drink = useCallback(async () => {
    const c = cardRef.current, at = where();
    if (!c || !at || busy) return;
    setBusy(true);
    const did = await keeper.drinkTake(c.id, at);
    setBusy(false);
    setCard(null);
    if (!did.ok) {
      say(did.why);
      pair?.send(c.id, { k: "dr", m: "no", w: did.why === "drunk" || did.why === "sated" || did.why === "far" ? did.why : "later" });
      return;
    }
    pair?.send(c.id, { k: "dr", m: "ok", g: did.got, b: did.back });
    shown({ giver: c, drinker: { id: me, name: "" }, got: did.got, back: did.back, mine: "drank" });
  }, [keeper, where, busy, pair, say, shown, me]);
  const later = useCallback(() => {
    const c = cardRef.current;
    if (!c) return;
    setCard(null);
    pair?.send(c.id, { k: "dr", m: "no", w: "later" });
  }, [pair]);

  /** What another page said of a drink. */
  const heard = useCallback((from: string, raw: unknown) => {
    const told = readDrinkTold(raw);
    if (!told || !pair) return;
    if (told.m === "offer") {
      // (only from somebody the room has; and a card is put up only where a drink would be had)
      const who = people().find((p) => p.id === from), at = where(), p = keeper.purse(), t = keeper.now();
      if (!who || !at || told.t <= t) return;
      const no = (w: DrinkNo) => pair.send(from, { k: "dr", m: "no", w });
      if (cardRef.current && cardRef.current.id !== from) return no("busy");
      if (outRef.current) return no("busy");
      if (!drinkNear(who, { x: at[0], y: at[1] })) return no("far");
      if (hasDrunk(p, t)) return no("drunk");
      if (staminaOf(p, t) >= STAMINA.max) return no("sated");
      setCard({ id: from, name: who.name, till: told.t });
      sfx?.wake();
      sfx?.work("dip", 0.6);
      return;
    }
    if (told.m === "off") { if (cardRef.current?.id === from) setCard(null); return; }
    const o = outRef.current;
    if (!o || o.id !== from) return;
    setOut(null);
    if (told.m === "ok") shown({ giver: { id: me, name: "" }, drinker: o, got: told.g, back: told.b, mine: "gave" });
    else {
      setNote(NO[told.w][th ? 0 : 1](o.name || (th ? "เพื่อน" : "Your friend")));
      const at = where();
      if (at) void keeper.drinkOffer(null, at);
    }
  }, [pair, people, where, keeper, sfx, shown, th, me]);
  useEffect(() => { if (!pair) return; pair.hear(heard); return () => pair.hear(null); }, [pair, heard]);

  // What I hold out, as the keeper has it: gone from my purse before its time, it was drunk (whether or not the
  // other page's word came); its time up, it is put away.
  const held = toastOf(purse), outId = out?.id ?? null, outTill = out?.till ?? 0, heldTo = held?.to ?? null;
  useEffect(() => {
    const o = outRef.current;
    if (!o) return;
    if (heldTo !== o.id && now < o.till) {
      setOut(null);
      const after = staminaOf(keeper.purse(), keeper.now());
      shown({ giver: { id: me, name: "" }, drinker: o, got: DRINK.gives, back: Math.max(0, Math.min(DRINK.back, after - o.had)), mine: "gave" });
    } else if (now >= o.till) {
      setOut(null);
      setNote(NO.lapsed[th ? 0 : 1](o.name || (th ? "เพื่อน" : "Your friend")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- by what is held out and the clock, as they change
  }, [heldTo, outId, outTill, now >= outTill]);
  // …and the one held out to me: its time up, the card goes
  const cardTill = card?.till ?? 0;
  useEffect(() => { if (cardRef.current && now >= cardRef.current.till) setCard(null); }, [cardTill, now >= cardTill]); // eslint-disable-line react-hooks/exhaustive-deps

  // A friend who stands near with no stamina left: named on a chip (the room says who has none).
  const tired = mine && here && !hidden && !out && !card
    ? people().filter((p) => p.id !== me && !p.away && p.spent === true && drinkNear(p, { x: here[0], y: here[1] }))
      .sort((a, b) => Math.hypot(a.x - here[0], a.y - here[1]) - Math.hypot(b.x - here[0], b.y - here[1]) || (a.id < b.id ? -1 : 1))[0] ?? null
    : null;

  // (for scripts in `next dev`: what is held out, the card, the chip, and the buttons)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      mine: () => mine, out: () => out, card: () => card, tired: () => tired?.id ?? null, note: () => note, moment: () => moment,
      offer: (id: string, name = "") => offer({ id, name }), putAway: () => putAway(), drink, later,
    };
    (window as unknown as { __townDrink?: typeof handle }).__townDrink = handle;
    return () => { delete (window as unknown as { __townDrink?: typeof handle }).__townDrink; };
  }, [mine, out, card, tired, note, moment, offer, putAway, drink, later]);

  if (!tired && !out && !card && !moment && !note) return null;
  const secs = (till: number) => Math.max(0, Math.ceil((till - now) / 1000));
  const still = reduced;
  const friend = (w: Who) => w.name || (th ? "เพื่อน" : "your friend");
  return (
    <>
      <style href="town-drink" precedence="medium">{`
        @keyframes td-tip { 0% { transform: rotate(0) } 35% { transform: rotate(-34deg) translateY(-3px) } 70% { transform: rotate(-34deg) translateY(-3px) } 100% { transform: rotate(0) } }
        @keyframes td-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes td-drop { 0% { opacity: 0; transform: translate(0, -4px) scale(.6) } 30% { opacity: 1 } 100% { opacity: 0; transform: translate(-10px, 18px) scale(1) } }
        @keyframes td-rise { 0% { opacity: 0; transform: translate(-50%, 4px) scale(.7) } 14% { opacity: 1; transform: translate(-50%, -10px) scale(1.12) } 26% { transform: translate(-50%, -14px) scale(1) } 80% { opacity: 1 } 100% { opacity: 0; transform: translate(-50%, -46px) scale(1) } }
        @keyframes td-run { from { transform: scaleX(1) } to { transform: scaleX(0) } }
        @keyframes td-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(120, 200, 255, 0) } 50% { box-shadow: 0 0 0 6px rgba(120, 200, 255, .22) } }
        .td-tip { animation: td-tip 1500ms ease-in-out 1; transform-origin: 50% 80% }
        .td-bob { animation: td-bob 1400ms ease-in-out infinite }
        .td-drop { animation: td-drop 900ms ease-in 320ms 2 both }
        .td-rise { animation: td-rise ${MOMENT_MS}ms ease-out 1 both }
        .td-run { animation: td-run linear 1 both; transform-origin: 0 50% }
        .td-glow { animation: td-glow 1600ms ease-in-out infinite }
        [data-town-drink][data-still] .td-tip, [data-town-drink][data-still] .td-bob, [data-town-drink][data-still] .td-drop, [data-town-drink][data-still] .td-run, [data-town-drink][data-still] .td-glow { animation: none }
        [data-town-drink][data-still] .td-rise { animation: none; transform: translate(-50%, -14px) }
        @media (prefers-reduced-motion: reduce) {
          .td-tip, .td-bob, .td-drop, .td-run, .td-glow { animation: none }
          .td-rise { animation: none; transform: translate(-50%, -14px) }
        }
      `}</style>
      {/* what each had of it, rising over their heads */}
      {moment && [[moment.drinker.id, moment.got], [moment.giver.id, moment.back]].map(([id, n]) => {
        const at = (n as number) > 0 ? spot(id as string) : null;
        return at && (
          <span key={`${moment.key}-${id}`} data-town-drink data-still={still ? "" : undefined} data-drink-rise={id} aria-hidden
                className="pointer-events-none absolute z-20" style={{ left: at.x, top: at.y - 22 }}>
            <span className="td-rise absolute flex items-center gap-1 whitespace-nowrap rounded-full border border-[#2c6b4a] bg-[#10231a]/90 px-2 py-0.5 font-data text-ui font-semibold tabular-nums text-[#8ff0b4] shadow-lg shadow-black/40">
              <TownIcon name="stamina" size={14} />+{Math.round(n as number)}
            </span>
          </span>
        );
      })}
      <div className="pointer-events-none absolute inset-x-0 top-[6.25rem] z-20 flex flex-col items-center gap-2 px-2" data-town-drink data-still={still ? "" : undefined}>
        {/* a drink drunk: the flask tipped, and what I had of it */}
        {moment && (
          <p key={moment.key} role="status" data-state="open" data-drink-moment={moment.mine} data-got={moment.got} data-back={moment.back}
             className="pop-in flex max-w-full items-center gap-2.5 rounded-full border border-[#4aa3d8]/70 bg-surface/95 py-1.5 pl-2 pr-4 text-ui font-semibold text-ink shadow-xl shadow-black/40 backdrop-blur-sm">
            <span className="relative grid size-10 shrink-0 place-items-center">
              <span className="td-tip inline-grid"><TownIcon name={FLASK} size={36} /></span>
              <span className="td-drop absolute bottom-0 left-0"><TownIcon name="plotDrop" size={12} /></span>
            </span>
            <span className="min-w-0 truncate">
              {moment.mine === "drank"
                ? (th ? `ดื่มน้ำพุแห่งชีวิตของ ${friend(moment.giver)}` : `Living water from ${friend(moment.giver)}`)
                : (th ? `${friend(moment.drinker)} ดื่มแล้ว` : `${friend(moment.drinker)} drank`)}
            </span>
            {(moment.mine === "drank" ? moment.got : moment.back) > 0 && (
              <span className="flex shrink-0 items-center gap-1 font-data tabular-nums text-[#8ff0b4]"><TownIcon name="stamina" size={16} />+{Math.round(moment.mine === "drank" ? moment.got : moment.back)}</span>
            )}
          </p>
        )}
        {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-drink-note>{note}</p>}
        {/* a drink held out to me: it is mine to drink, or to leave */}
        {card && (
          <div role="group" aria-label={th ? "มีคนยื่นน้ำให้ดื่ม" : "A drink is held out to you"} data-state="open" data-drink-card={card.id}
               className="pop-in td-glow pointer-events-auto w-full max-w-[21rem] overflow-hidden rounded-2xl border border-[#4aa3d8]/70 bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 px-3 pb-2.5 pt-3">
              <span className="td-bob inline-grid shrink-0"><TownIcon name={FLASK} size={44} /></span>
              <p className="min-w-0 flex-1 text-ui leading-snug text-ink">
                <span className="block truncate font-semibold">{card.name || (th ? "เพื่อน" : "A friend")}</span>
                <span className="block text-meta text-muted">{th ? "ยื่นน้ำพุแห่งชีวิตให้" : "holds out living water"}</span>
              </p>
              <span className="shrink-0 font-data text-label tabular-nums text-muted" aria-hidden>{secs(card.till)}</span>
            </div>
            <div className="flex gap-2 px-3 pb-3">
              <button type="button" onClick={() => void drink()} disabled={busy} data-drink-take
                      className="pressable min-h-11 flex-1 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-60">{th ? "ดื่ม" : "Drink"}</button>
              <button type="button" onClick={later} disabled={busy} data-drink-later
                      className="pressable min-h-11 rounded-full border border-line-strong px-4 text-ui font-semibold text-ink transition-colors hover:border-accent disabled:opacity-60">{th ? "ไว้ก่อน" : "Not now"}</button>
            </div>
            <div aria-hidden className="h-1 bg-line"><div key={card.till} className="td-run h-full bg-[#4aa3d8]" style={{ animationDuration: `${Math.max(0, card.till - now)}ms` }} /></div>
          </div>
        )}
        {/* the drink I hold out: to whom, and for how long yet */}
        {out && (
          <div data-state="open" data-drink-out={out.id}
               className="pop-in pointer-events-auto flex min-h-11 max-w-full items-center gap-2 overflow-hidden rounded-full border border-[#4aa3d8]/70 bg-surface/95 pl-2 pr-1.5 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm">
            <span className="td-bob inline-grid shrink-0"><TownIcon name={FLASK} size={28} /></span>
            <span className="min-w-0 truncate">{th ? `ยื่นกระติกให้ ${friend(out)}` : `Held out to ${friend(out)}`}</span>
            <span className="shrink-0 font-data text-label tabular-nums text-muted" aria-hidden>{secs(out.till)}</span>
            <button type="button" onClick={() => putAway()} data-drink-away
                    className="pressable min-h-9 shrink-0 rounded-full border border-line-strong px-3 text-meta font-semibold text-ink transition-colors hover:border-accent">{th ? "เก็บ" : "Put away"}</button>
          </div>
        )}
        {/* a friend near me who has no stamina left */}
        {tired && (
          <button type="button" onClick={() => void offer({ id: tired.id, name: tired.name })} disabled={busy} data-drink-chip={tired.id} data-state="open"
                  className="pop-in pressable pointer-events-auto flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line-lit bg-surface/95 pl-2 pr-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-accent disabled:opacity-60">
            <TownIcon name={FLASK} size={28} />
            <span className="min-w-0 truncate">{th ? `${tired.name || "เพื่อน"} หมดแรง · รินน้ำให้ดื่ม` : `${tired.name || "Your friend"} is worn out · pour a drink`}</span>
          </button>
        )}
      </div>
    </>
  );
}
