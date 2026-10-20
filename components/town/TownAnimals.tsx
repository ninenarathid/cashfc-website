"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Keeper } from "@/lib/town/keeper";
import {
  ANIMALS, BREEDS, DAWN_BOOSTS, GRAPH, LETTERS, OFFERINGS, OFFERING_KINDS, SPECIES, SPECIES_IDS, STAT_IDS, adultAt, breedAt, breedOf, careOf, childRange, crossOf, feeOf,
  dayOf, freeHome, gives, kindOf, knowsOffering, mayCare, nextStage, scrollOf, sellBackOf, stageOf, statOf, stepKey, stepsOf, untendedOf, usedOf,
  type Animal, type Herd, type Sex, type SpeciesId, type Stats,
} from "@/lib/town/animals";
import { ANIMAL_GIFTS, POPOTO_SHOP, TOOL_OF, bookOf, feedHours, growFor, viewOf, type AnimalInput, type AnimalReply, type AnimalWhy, type AnimalWorld } from "@/lib/town/animal-act";
import { ANIMAL_SCROLL_ITEMS } from "@/lib/town/animal-items";
import { BARNS, LANE_ROWS } from "@/lib/town/pasture";
import { hasThing, usesLeft, type ThingId } from "@/lib/town/gifts";
import { ITEMS, type ItemId } from "@/lib/town/items";
import { held, type Purse } from "@/lib/town/trade";
import type { SceneryKit } from "@/lib/town/scenery";
import { Coins, ItemIcon, Pic } from "./TownTrade";
import { QualityRange } from "./TownQuality";
import { animalK, animalPicture, animalSize, drawAnimal } from "./pasture-draw";
import type { Sprite } from "@/lib/town/scenery";

/*
 * Uncle Popoto's panel (docs/plans/animals/README.md, "Round 6"): the barns' plan to buy one of (one a member, none a
 * friend's), his stall (young animals of a sex chosen, feed, the games' and the making table's tools, the dishes'
 * scrolls, a barn's front, an animal sold back), my barn and my animals' cards (sex, the three stats, how well each is
 * cared for), his pen and the handing on of animals, the breeding nest (the child's likely stats, a friend's animal
 * asked for), friends' care and the breed book. The Midnight theme and the trade panel's own look: the same head, tabs,
 * chips and buttons. Every refusal says why in a short line.
 */

export type AnimalsView = "barn" | "trough" | "shop" | "mine" | "pen" | "nest" | "care" | "book";
const VIEWS: Array<[AnimalsView, string, string]> = [["shop", "ร้านลุง", "Stall"], ["mine", "สัตว์ฉัน", "Mine"], ["pen", "คอกลุง", "Pen"], ["nest", "รังผสม", "Nest"], ["care", "ช่วยดูแล", "Care"], ["book", "สมุด", "Book"]];
/** A barn's name on the screen (its number, from 1). */
export const barnName = (i: number, th: boolean) => (th ? `โรง ${i + 1}` : `Barn ${i + 1}`);

/** Why a step was refused, in a line each. */
export const WHY: Record<AnimalWhy, [string, string]> = {
  none: ["ทำไม่ได้ ลองใหม่อีกครั้งนะ", "That can't be done. Try again."],
  theirs: ["ตัวนี้ไม่ใช่ของเรา หรือเจ้าของยังไม่ให้ช่วยดูแล", "Not yours, or its owner hasn't let you care for it."],
  coins: ["เหรียญไม่พอ", "Not enough coins."],
  room: ["กระเป๋าเต็ม เคลียร์ช่องก่อนนะ", "Your bag is full."],
  places: ["ที่ในโรงและคอกลุงเต็มแล้ว", "No room in your barn or in Uncle's pen."],
  stage: ["ยังไม่ถึงวัยที่ทำแบบนี้ได้", "Not at the age for that yet."],
  hungry: ["หิวอยู่ ให้อาหารก่อนนะ", "It's hungry. Feed it first."],
  nothing: ["ไม่มีของที่ต้องใช้", "You don't have what that needs."],
  spent: ["ใช้ของรางวัลนี้ไปแล้ววันนี้", "Already used today."],
  stamina: ["แรงไม่พอ", "Not enough stamina."],
  rest: ["ยังพักอยู่หลังผสมพันธุ์", "Still resting after breeding."],
  hearts: ["ต้องสนิทกันอย่างน้อย 3 หัวใจทั้งคู่", "Both need at least 3 hearts."],
  species: ["ตัวนี้ไม่กินของนี้ หรือคนละชนิดกัน", "Not for this kind, or not of one kind."],
  offering: ["ไม่มีของเซ่นนี้ในกระเป๋า", "That offering isn't in your bag."],
  gift: ["ยังไม่มีของรางวัลนี้", "You don't have that gift yet."],
  used: ["ทำไปแล้ว", "Done already."],
  lent: ["ยังไม่ได้ยืมตัวนี้ หมดเวลายืม หรือตัวนี้ถูกยืมอยู่", "Not lent to you, the loan has ended, or it is on loan."],
  far: ["อยู่ไกลเกินไป เดินเข้าไปใกล้ๆ ก่อน", "Too far. Walk closer."],
  name: ["ชื่อนี้ใช้ไม่ได้", "That name can't be used."],
  soon: ["เร็วไปนิด เล่นให้จบก่อนนะ", "Too quick: play it through."],
  full: ["เต็มแล้ว", "It's full."],
  barn: ["ซื้อโรงเลี้ยงก่อนนะ ลุงขายอยู่", "Buy a barn first: Uncle sells them."],
  taken: ["โรงนี้มีเจ้าของแล้ว เลือกโรงอื่นนะ", "That barn is taken. Pick another."],
  had: ["หลานมีโรงแล้ว คนละหนึ่งโรง", "You have a barn already: one each."],
  pen: ["ตัวนี้อยู่ในคอกลุง ย้ายเข้าโรงก่อน", "It's waiting in Uncle's pen: move it to a barn first."],
  sex: ["ต้องเป็นตัวผู้กับตัวเมีย ชนิดเดียวกัน", "It takes a male and a female of one kind."],
  away: ["ติดต่อเมืองไม่ได้ กดลองใหม่อีกครั้ง", "Couldn't reach the town. Try again."],
};
export const why = (w: AnimalWhy | undefined, th: boolean) => (WHY[w ?? "none"] ?? WHY.none)[th ? 0 : 1];
type Why = Partial<Record<AnimalWhy, [string, string]>>;
const STAGE: Record<string, [string, string]> = { coming: ["ยังไม่เกิด", "Coming"], baby: ["ลูกสัตว์", "Baby"], young: ["วัยรุ่น", "Young"], adult: ["โตเต็มวัย", "Grown"] };
const GAME_WORD: Record<string, [string, string]> = { eggs: ["เก็บไข่", "Collect eggs"], milk: ["รีดนม", "Milk"], shear: ["ตัดขน", "Shear"] };
const STAT_WORD: Record<keyof Stats, [string, string, string, string]> = {
  thrift: ["ประหยัดอาหาร", "Thrift", "กินน้อยลง", "eats less"],
  gentle: ["อ่อนโยน", "Gentleness", "รับหัวใจเพิ่ม", "takes care more to heart"],
  vigor: ["แข็งแรง", "Vigour", "โตไวขึ้น", "grows faster"],
};
const hrs = (h: number, th: boolean) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} ${th ? "นาที" : "min"}` : h < 48 ? `${Math.round(h)} ${th ? "ชม." : "h"}` : `${+(h / 24).toFixed(1)} ${th ? "วัน" : "d"}`);
const left = (ms: number, th: boolean) => hrs(Math.max(0, ms) / 3_600_000, th);
const clock = (t: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t));
const nameOfAnimal = (a: Animal, th: boolean) => a.name || breedOf(a.breed)?.name[th ? "th" : "en"] || a.breed;
const HOUR = 3_600_000;
/** What settles an animal for the screen: its owner's barn door, and (mine) my warm bottle, (another's) the herd's word of theirs. */
const ctxOf = (world: AnimalWorld, owner: string, purse: Purse, me: string) => {
  const h = world.herds.find((x) => x.owner === owner);
  return { door: h?.door ?? [], bottle: owner === me ? hasThing(purse, ANIMAL_GIFTS.bottle as ThingId) : !!(h as Herd & { bottle?: boolean } | undefined)?.bottle };
};
const artStage = (a: Animal, now: number) => { const st = stageOf(a, now); return (st === "coming" ? "baby" : st) as "baby" | "young" | "adult"; };

/** A little picture of an animal: its own (the pasture's sheet), or its stand-in drawn the same as on the map. */
export function AnimalPic({ species, breed, stage, size = 48, kit, dark = false, pose = "idle", sex }: { species: SpeciesId; breed: string; stage: "baby" | "young" | "adult"; size?: number; kit: SceneryKit | null; dark?: boolean; pose?: "idle" | "sleep"; sex?: Sex }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    // (sized to the box by its longer side: a picture at a whole number of the screen's pixels to one of its own where it
    // fits, so its pixels stay square; a stand-in as before)
    const box = animalSize(kit, { species, breed, stage, sex });
    const art = animalPicture(kit, { species, breed, stage, right: true, sex }, pose), k = art ? animalK(species, art.name) : 0.6;
    let s = Math.min(2.6, (size * 0.8) / Math.max(18, box.w * 1.15));
    if (art && kit) { const [w, h] = kit.sizeOf(art.name), fit = (size * 0.88) / Math.max(w, h); s = (fit >= 1 ? Math.min(3, Math.floor(fit)) : fit) / k; }
    drawAnimal(ctx, kit, { species, breed, stage, pose, right: true, sex }, { x: size / 2, y: size * 0.93 }, s, dpr, 0, true);
    if (dark) { ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = "rgba(20,24,32,0.92)"; ctx.fillRect(0, 0, size, size); ctx.globalCompositeOperation = "source-over"; }
  }, [species, breed, stage, size, kit, dark, pose, sex]);
  return <canvas ref={ref} aria-hidden className="shrink-0" style={{ width: size, height: size, imageRendering: "pixelated" }} />;
}

function Heart({ on, size = 14 }: { on: boolean; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 16 16" className="shrink-0">
      <path d="M8 14 1.6 7.6a3.6 3.6 0 0 1 5.1-5.1L8 3.8l1.3-1.3a3.6 3.6 0 0 1 5.1 5.1Z" fill={on ? "#ff7a93" : "transparent"} stroke={on ? "#ff7a93" : "rgba(255,255,255,0.35)"} strokeWidth="1.4" />
    </svg>
  );
}
function Hearts({ n, th }: { n: number; th: boolean }) {
  return <span className="flex items-center gap-0.5" role="img" aria-label={th ? `สนิท ${n} จาก 10 หัวใจ` : `${n} of 10 hearts`} data-hearts={n}>{Array.from({ length: 10 }, (_, i) => <Heart key={i} on={i < n} size={12} />)}</span>;
}
/** ♂ or ♀, in its colour, with its word for a screen reader. */
function SexMark({ sex, th, big = false }: { sex: Sex; th: boolean; big?: boolean }) {
  return <span role="img" aria-label={sex === "m" ? (th ? "ตัวผู้" : "male") : th ? "ตัวเมีย" : "female"} data-sex={sex}
               className={`shrink-0 font-semibold leading-none ${big ? "text-title" : "text-ui"} ${sex === "m" ? "text-[#8cc4ff]" : "text-[#ffa8c8]"}`}>{sex === "m" ? "♂" : "♀"}</span>;
}
function Bar({ value, tone = "jade", label }: { value: number; tone?: "jade" | "gold" | "accent" | "rose"; label: string }) {
  const color = tone === "gold" ? "bg-gold" : tone === "accent" ? "bg-accent" : tone === "rose" ? "bg-[#ff7a93]" : "bg-jade";
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full border border-line-strong bg-bg/70" role="img" aria-label={label}>
      <span className={`block h-full ${color}`} style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </span>
  );
}
/** A stat of ten: its word, ten small pips (a range lit fainter for a child's likely one), its number. */
function StatRow({ k, n, range, th }: { k: keyof Stats; n?: number; range?: { lo: number; hi: number }; th: boolean }) {
  const [a, b] = STAT_WORD[k];
  const label = range ? (th ? `${a} ${range.lo}-${range.hi} จาก 10` : `${b} ${range.lo}-${range.hi} of 10`) : th ? `${a} ${n} จาก 10` : `${b} ${n} of 10`;
  return (
    <div className="grid grid-cols-[5.5rem_1fr_2.4rem] items-center gap-2" data-stat={k} data-value={n ?? `${range?.lo}-${range?.hi}`}>
      <span className="truncate text-meta text-ink">{th ? a : b}</span>
      <span className="flex gap-0.5" role="img" aria-label={label}>
        {Array.from({ length: 10 }, (_, i) => {
          const v = i + 1, on = n !== undefined ? v <= n : !!range && v <= range.lo, maybe = !!range && v > range.lo && v <= range.hi;
          return <span key={i} className={`h-2 flex-1 rounded-sm ${on ? "bg-jade" : maybe ? "bg-jade/35" : "bg-bg/80 ring-1 ring-inset ring-line-strong"}`} />;
        })}
      </span>
      <span className="text-right font-data text-meta tabular-nums text-ink">{n !== undefined ? n : `${range!.lo}–${range!.hi}`}</span>
    </div>
  );
}
const button = "pressable min-h-11 rounded-lg border border-line-strong px-3 py-2 text-ui text-ink hover:border-accent disabled:opacity-45 disabled:hover:border-line-strong";
const main = "pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-45";
const chip = "rounded-full border border-line bg-bg/60 px-2 py-0.5 text-meta text-ink";
const select = "mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3 text-ink";
const H3 = ({ children }: { children: ReactNode }) => <h3 className="mb-2 mt-4 font-data text-label uppercase tracking-wider text-muted first:mt-1">{children}</h3>;
/** A warning in a box: amber, or rose for the worse. */
const Warn = ({ children, bad = false, ...rest }: { children: ReactNode; bad?: boolean } & Record<`data-${string}`, string | number | boolean>) => (
  <p role="status" className={`rounded-xl border px-3 py-2 text-meta leading-relaxed ${bad ? "border-[#ff7a93]/60 bg-[#ff7a93]/10 text-[#ffb3c1]" : "border-gold/60 bg-gold/10 text-gold"}`} {...rest}>{children}</p>
);

export interface AnimalsProps {
  keeper: Keeper;
  th: boolean;
  view: AnimalsView;
  onView: (v: AnimalsView, focus?: string | null) => void;
  onClose: () => void;
  /** The animal to open on (a tap on it on the map), or the barn to show on the plan. */
  focus: string | null;
  /** Somebody's name, for a herd's owner, a carer, the first breeder. */
  nameOf: (id: string) => string;
  /** Members one may name as carers or hand an animal on to: whoever is in town, and the site's members. */
  members: Array<{ id: string; name: string }>;
  /** Begin a game to collect from an animal of mine. */
  onCollect: (a: Animal) => void;
  kit: SceneryKit | null;
  /** Uncle Popoto's face over the panel. */
  face: Sprite | null;
}
type Act = (input: AnimalInput | null, ok?: [string, string], after?: (r: { ok: boolean; got?: AnimalReply["got"] }) => void, whyFor?: Why) => Promise<void>;
/** Several steps one after another (the trough's "fill every slot"): how many went through, and why the first that did not. */
type Many = (inputs: AnimalInput[], ok: (n: number) => [string, string]) => Promise<void>;
interface Common { th: boolean; purse: Purse; world: AnimalWorld; now: number; kit: SceneryKit | null; busy: boolean; act: Act; many: Many; me: string; nameOf: (id: string) => string; onView: AnimalsProps["onView"] }

export default function TownAnimals({ keeper, th, view, onView, onClose, focus, nameOf, members, onCollect, kit, face }: AnimalsProps) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const [said, setSaid] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ input: AnimalInput; request: string } | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const world: AnimalWorld = keeper.animalWorld() ?? { animals: [], herds: [], found: {}, spells: [], wagons: [], offers: [], asks: [] };
  const purse = keeper.purse(), now = keeper.now(), me = keeper.id;
  const t = (a: string, b: string) => (th ? a : b);

  /** Do a step; a step the town did not answer can be tried again as itself (it answers its first answer). */
  const act = useCallback<Act>(async (input, ok, after, whyFor) => {
    if (busy) return;
    if (input) pending.current = { input, request: crypto.randomUUID() };
    const p = pending.current;
    if (!p) return;
    setBusy(true);
    try {
      const r = await keeper.animals(p.input, p.request);
      if (!alive.current) return;
      if (r.ok || r.why !== "away") pending.current = null;
      setSaid(r.ok ? (ok ? ok[th ? 0 : 1] : t("เรียบร้อย", "Done.")) : (whyFor?.[r.why ?? "none"] ?? WHY[r.why ?? "none"] ?? WHY.none)[th ? 0 : 1]);
      after?.(r);
    } finally { if (alive.current) setBusy(false); }
  }, [busy, keeper, th]); // eslint-disable-line react-hooks/exhaustive-deps

  const many = useCallback<Many>(async (inputs, ok) => {
    if (busy || !inputs.length) return;
    setBusy(true);
    let n = 0, first: AnimalWhy | undefined;
    try {
      for (const input of inputs) {
        const r = await keeper.animals(input, crypto.randomUUID());
        if (!alive.current) return;
        if (r.ok) n++; else first ??= r.why;
      }
      setSaid(n ? ok(n)[th ? 0 : 1] : why(first, th));
    } finally { if (alive.current) setBusy(false); }
  }, [busy, keeper, th]);
  const mine = world.animals.filter((a) => a.owner === me);
  const live = (at: number, hours: number) => at > now - hours * HOUR;
  const offersIn = (world.offers ?? []).filter((o) => o.to === me && live(o.at, ANIMALS.offerHours));
  const asksIn = (world.asks ?? []).filter((q) => q.to === me && live(q.at, ANIMALS.askHours));
  const lentToMe = world.animals.filter((a) => a.owner !== me && a.lent?.to === me && a.lent.until > now);
  const c: Common = { th, purse, world, now, kit, busy, act, many, me, nameOf, onView };
  const dot = (v: AnimalsView) => (v === "mine" && mine.some((a) => a.home !== "pen" && viewOf(a, now, ctxOf(world, me, purse, me)).ready > 0)) || (v === "pen" && offersIn.length > 0) || (v === "nest" && (asksIn.length > 0 || lentToMe.length > 0));

  return (
    <section aria-labelledby="town-animals-h" className="flex h-full flex-col" data-animals-panel data-view={view}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Pic sprite={face} box={30} />
        <h2 id="town-animals-h" className="min-w-0 truncate font-display text-title font-semibold text-ink">{t("ลุง Popoto · ฟาร์มสัตว์", "Uncle Popoto · the animal farm")}</h2>
        <Coins n={purse.coins} th={th} className="ml-auto" />
        <button type="button" onClick={onClose} data-animals-close className="pressable min-h-11 rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">{t("ปิด", "Close")}</button>
      </div>
      <div role="tablist" aria-label={t("ฟาร์มสัตว์", "The animal farm")} className="flex gap-0.5 border-b border-line px-2 pt-1">
        {VIEWS.map(([v, a, b]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => onView(v)} data-animals-tab={v}
                  className={`pressable -mb-px min-h-11 min-w-0 flex-1 truncate rounded-t-lg border-b-2 px-0.5 text-ui font-semibold ${view === v ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"}`}>
            {th ? a : b}
            {dot(v) && <span aria-hidden className="ml-0.5 inline-block size-2 rounded-full bg-gold align-middle" data-tab-dot />}
          </button>
        ))}
      </div>
      <p className="min-h-[1.75em] px-4 pt-1.5 text-meta text-accent" aria-live="polite" data-animals-said>{said}</p>
      {pending.current && !busy && (
        <div className="px-4 pb-1"><button type="button" className={button} onClick={() => void act(null)} data-animals-retry>{t("ลองรายการเดิมอีกครั้ง", "Retry the same step")}</button></div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {view === "barn" && <BarnPicker {...c} focus={focus} />}
        {view === "trough" && <Trough {...c} focus={focus} />}
        {view === "shop" && <Shop {...c} mine={mine} />}
        {view === "mine" && <Mine {...c} mine={mine} focus={focus} onCollect={onCollect} lentToMe={lentToMe} />}
        {view === "pen" && <Pen {...c} mine={mine} members={members} focus={focus} offersIn={offersIn} />}
        {view === "nest" && <Nest {...c} mine={mine} asksIn={asksIn} lentToMe={lentToMe} />}
        {view === "care" && <Care {...c} members={members} />}
        {view === "book" && <Book {...c} />}
      </div>
    </section>
  );
}

const herdOf = (world: AnimalWorld, me: string): Herd | null => world.herds.find((h) => h.owner === me) ?? null;
/** Logs and stone tiles a barn's stage asks, against what is in the bag: a line of chips. */
function Needs({ th, purse, coins, logs, stone, credit = 0 }: { th: boolean; purse: Purse; coins: number; logs: number; stone: number; credit?: number }) {
  const t = (a: string, b: string) => (th ? a : b);
  const have = (id: string) => held(purse.bag, id as ItemId);
  const need = (id: string, n: number, word: [string, string]) => (
    <span className={`flex items-center gap-1 ${chip} ${have(id) < n ? "border-[#ff7a93]/60 text-[#ffb3c1]" : ""}`} data-need={id} data-short={have(id) < n}>
      <ItemIcon id={id as ItemId} size={18} />{th ? word[0] : word[1]} {n}<span className="text-muted">({t("มี", "have")} {have(id)})</span>
    </span>
  );
  const pay = Math.max(0, coins - credit);
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-meta" data-needs>
      <span className={`flex items-center gap-1 ${chip} ${purse.coins < pay ? "border-[#ff7a93]/60 text-[#ffb3c1]" : ""}`}><Coins n={pay} th={th} small />{credit > 0 && <span className="text-muted">{t(`(หักเครดิต ${Math.min(credit, coins)})`, `(${Math.min(credit, coins)} credit off)`)}</span>}</span>
      {need("log", logs, ["ไม้ซุง", "logs"])}
      {need("stoneTile", stone, ["แผ่นหิน", "stone tiles"])}
    </p>
  );
}

/* ── the barns' plan: one to buy, none another's ── */
function BarnPicker({ th, purse, world, now, busy, act, me, nameOf, onView, focus }: Common & { focus: string | null }) {
  const t = (a: string, b: string) => (th ? a : b);
  const herd = herdOf(world, me);
  const holders = new Map(world.herds.filter((h) => h.barn !== null).map((h) => [h.barn as number, h]));
  const anyFree = BARNS.some((b) => !holders.has(b.i));
  const [pick, setPick] = useState<number | null>(() => (focus !== null && Number.isFinite(Number(focus)) ? Number(focus) : herd?.barn ?? null));
  const S = ANIMALS.barns.stages[0];
  const stateOf = (i: number): "mine" | "free" | "taken" | "left" => {
    const h = holders.get(i);
    if (!h) return "free";
    if (h.owner === me) return "mine";
    return untendedOf(h, now).level === 3 && !anyFree ? "left" : "taken";
  };
  const cell = (i: number) => {
    const st = stateOf(i), h = holders.get(i), on = pick === i;
    const tone = st === "mine" ? "border-gold/80 bg-gold/15 text-gold" : st === "free" ? "border-jade/60 bg-jade/10 text-ink" : st === "left" ? "border-[#f0a040]/70 bg-[#f0a040]/10 text-ink" : "border-line bg-bg/40 text-muted";
    return (
      <button key={i} type="button" aria-pressed={on} disabled={st === "taken"} onClick={() => setPick(i)} data-barn-cell={i} data-barn-state={st}
              className={`pressable flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-lg border px-1.5 py-1 text-left leading-tight disabled:cursor-not-allowed ${tone} ${on ? "ring-2 ring-accent" : ""}`}
              aria-label={`${barnName(i, th)} · ${st === "free" ? t("ว่าง", "free") : st === "mine" ? t("ของฉัน", "mine") : st === "left" ? t("ไม่ได้ดูแล 28 วัน", "untended 28 days") : nameOf(h!.owner)}`}>
        <span className="font-data text-label tabular-nums">{i + 1}</span>
        <span className="w-full truncate text-label">{st === "free" ? t("ว่าง", "free") : st === "mine" ? t("ของฉัน", "mine") : st === "left" ? t("ร้าง", "left") : nameOf(h!.owner)}</span>
      </button>
    );
  };
  const lane = () => <div aria-hidden className="my-0.5 ml-9 h-2 rounded-full bg-[#4a4033]" />;
  const sel = pick !== null ? BARNS[pick] : null, st = pick !== null ? stateOf(pick) : null, h = pick !== null ? holders.get(pick) : undefined;
  const credit = herd?.credit ?? 0, pay = Math.max(0, S.coins - credit);
  const short = !!sel && (purse.coins < pay || held(purse.bag, "log" as ItemId) < S.logs || held(purse.bag, "stoneTile" as ItemId) < S.stone);
  const can = !!sel && (st === "free" || st === "left") && !(herd && herd.barn !== null) && !short;
  return (
    <div data-animals-barns>
      <p className="text-meta leading-relaxed text-muted">{t(`เลือกโรงเลี้ยงสัตว์หนึ่งโรง คนละหนึ่งโรง ซ้ำกับเพื่อนไม่ได้ · แรกเลี้ยงได้ ${S.room} ตัว ขยายได้ทีหลัง`, `Pick one barn: one each, never a friend's · it houses ${S.room} at first, enlarged later`)}</p>
      <p className="mt-1 text-label text-muted">{t("แผนผังฟาร์มสัตว์ (มองจากด้านบน ประตูทางซ้ายต่อจากสวนผัก)", "The animal farm from above (the gates on the left, from the garden)")}</p>
      <div className="mt-2 rounded-xl border border-line bg-[#24301f] p-2" data-barn-plan>
        {[0, 1, 2, 3, 4, 5].map((r) => (
          <div key={r}>
            {r === 3 && <p aria-hidden className="my-1.5 rounded-lg bg-[#3a5a2c]/70 py-1 text-center text-label text-[#cfe6b0]">{t("ทุ่งหญ้า · บ่อเป็ด", "Meadow · duck pond")}</p>}
            <div className="flex items-stretch gap-1">
              <span aria-hidden className="flex w-8 shrink-0 flex-col items-center justify-end pb-0.5 text-center text-[0.65rem] leading-3 text-[#e5cc80]">{r === 1 ? <>{t("ลุง", "Uncle")}<br />{t("◀ประตู", "◀gate")}</> : r === 4 ? t("◀ประตู", "◀gate") : ""}</span>
              {cell(r * 4)}{cell(r * 4 + 1)}
              <span aria-hidden className="w-1.5 shrink-0 rounded-full bg-[#4a4033]" />
              {cell(r * 4 + 2)}{cell(r * 4 + 3)}
            </div>
            {lane()}
          </div>
        ))}
        <p aria-hidden className="mt-1 rounded-lg bg-[#3a5a2c]/70 py-1 text-center text-label text-[#cfe6b0]">{t("ทุ่งหญ้าใต้", "South meadow")}</p>
      </div>
      <p className="mt-2 flex flex-wrap gap-1.5 text-label" aria-hidden>
        <span className={`${chip} border-jade/60`}>{t("ว่าง", "free")}</span><span className={`${chip} border-gold/80 text-gold`}>{t("ของฉัน", "mine")}</span>
        <span className={`${chip} text-muted`}>{t("มีเจ้าของ", "taken")}</span><span className={`${chip} border-[#f0a040]/70`}>{t("ร้าง 28 วัน", "left 28 days")}</span>
      </p>
      {sel && (
        <div className="mt-3 rounded-xl border border-line bg-bg/50 p-3" data-barn-pick={sel.i}>
          <p className="text-ui font-semibold text-ink">{barnName(sel.i, th)} <span className="font-normal text-muted">· {t(`แถว ${sel.row + 1} ${sel.col < 2 ? "ฝั่งตะวันตก" : "ฝั่งตะวันออก"} ใกล้ประตู${LANE_ROWS[sel.row] < 42 ? "เหนือ" : "ใต้"}`, `row ${sel.row + 1}, ${sel.col < 2 ? "west" : "east"} side, by the ${LANE_ROWS[sel.row] < 42 ? "north" : "south"} gate`)}</span></p>
          {st === "mine" && <p className="mt-1 text-meta text-gold">{t("โรงนี้เป็นของหลานแล้ว", "This barn is yours.")}</p>}
          {st === "taken" && <p className="mt-1 text-meta text-muted">{t(`ของ ${nameOf(h!.owner)} เลือกโรงอื่นนะ`, `${nameOf(h!.owner)}'s: pick another.`)}</p>}
          {st === "left" && <Warn data-barn-left={sel.i}>{t(`เจ้าของเดิม (${nameOf(h!.owner)}) ไม่ได้ดูแลมา ${untendedOf(h!, now).days} วัน และไม่มีโรงว่างแล้ว จึงจองได้ สัตว์ของเขาจะย้ายไปคอกลุง`, `Its owner (${nameOf(h!.owner)}) has left it ${untendedOf(h!, now).days} days and no barn stands free, so it may be taken: their animals go to Uncle's pen.`)}</Warn>}
          {holders.size > 0 && st === "taken" && untendedOf(h!, now).level === 3 && anyFree && <p className="mt-1 text-label text-muted">{t("โรงร้างจองได้เมื่อไม่มีโรงว่างเหลือเท่านั้น", "A left barn is only taken when none stands free.")}</p>}
          {(st === "free" || st === "left") && !(herd && herd.barn !== null) && (<>
            <p className="mt-2 text-meta text-ink">{t(`ราคาโรง (เลี้ยงได้ ${S.room} ตัว)`, `The barn (houses ${S.room})`)}</p>
            <Needs th={th} purse={purse} coins={S.coins} logs={S.logs} stone={S.stone} credit={credit} />
            <button type="button" className={`${main} mt-2 w-full`} disabled={busy || !can} data-barn-buy={sel.i}
                    onClick={() => void act({ action: "barn", index: sel.i }, ["ได้โรงแล้ว! ลุงทำความสะอาดรอไว้ ไปรับลูกสัตว์ที่ร้านลุงได้เลย", "It's yours! Swept and ready: take a young one home from the stall."], (r) => { if (r.ok) onView("mine"); },
                      { nothing: ["ไม้ซุงหรือแผ่นหินไม่พอ (หาได้จากสายตัดไม้และเหมือง)", "Not enough logs or stone tiles (from felling and the mine)."] })}>
              {t(`ซื้อ${barnName(sel.i, true)}`, `Buy ${barnName(sel.i, false)}`)}
            </button>
          </>)}
          {(st === "free" || st === "left") && herd && herd.barn !== null && <p className="mt-1 text-meta text-muted">{t(`หลานมี${barnName(herd.barn, true)}แล้ว คนละหนึ่งโรง`, `You have ${barnName(herd.barn, false)} already: one each.`)}</p>}
        </div>
      )}
    </div>
  );
}

/* ── my barn: its door, its room, its warnings ── */
function BarnHead({ th, purse, world, now, busy, act, me, onView, mine }: Common & { mine: Animal[] }) {
  const t = (a: string, b: string) => (th ? a : b);
  const herd = herdOf(world, me);
  if (!herd || herd.barn === null) return (
    <div className="rounded-xl border border-gold/50 bg-gold/10 p-3" data-barn-none>
      <p className="text-ui text-ink">{t("ยังไม่มีโรงเลี้ยงสัตว์ ซื้อโรงกับลุงก่อน แล้วค่อยรับลูกสัตว์มาเลี้ยง", "No barn yet: buy one of Uncle first, then take a young one home.")}</p>
      {mine.some((a) => a.home === "pen") && <p className="mt-1 text-meta text-muted">{t("สัตว์ของหลานรออยู่ที่คอกลุง", "Your animals wait in Uncle's pen.")}</p>}
      <button type="button" className={`${main} mt-2 w-full`} onClick={() => onView("barn")} data-open-barns>{t("เลือกโรงเลี้ยง", "Choose a barn")}</button>
    </div>
  );
  const open = herd.door.length > 0 && herd.door[herd.door.length - 1][1] === null;
  const used = usedOf(world.animals, me), next = nextStage(herd.room), u = untendedOf(herd, now);
  return (
    <div className="rounded-xl border border-line bg-bg/50 p-3" data-barn-head={herd.barn} data-door={open ? "open" : "shut"}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-ui font-semibold text-ink">{barnName(herd.barn, th)}</span>
          <span className="mt-0.5 flex flex-wrap gap-1.5"><span className={chip} data-room={herd.room}>{t(`ในโรง ${used.barn}/${herd.room}`, `In the barn ${used.barn}/${herd.room}`)}</span><span className={chip}>{t(`คอกลุง ${used.pen}/${ANIMALS.pen}`, `Uncle's pen ${used.pen}/${ANIMALS.pen}`)}</span><span className={`${chip} ${open ? "border-jade/60 text-jade" : ""}`}>{open ? t("ประตูเปิด", "Door open") : t("ประตูปิด", "Door shut")}</span></span>
        </span>
        <button type="button" className={open ? button : main} disabled={busy} onClick={() => void act({ action: "door", open: !open }, open ? ["ปิดประตูโรงแล้ว สัตว์เดินกลับเข้าโรง", "The door is shut: they walk home."] : ["เปิดประตูโรงแล้ว สัตว์ออกไปกินหญ้า เดินเล่นถึงสวนผัก", "The door is open: out they go to graze."])} data-door-toggle>{open ? t("ปิดประตู", "Shut door") : t("เปิดประตู", "Open door")}</button>
      </div>
      <p className="mt-1.5 text-label text-muted">{open ? t("สัตว์ออกไปกินหญ้าในทุ่งและเดินเล่นถึงสวนผัก กินอาหารช้าลงครึ่งหนึ่ง", "They graze the meadows and wander the garden's lanes, eating half as fast.") : t("สัตว์อยู่ในโรง เปิดประตูตอนเช้าให้ออกไปกินหญ้าได้ (ได้หัวใจวันละครั้ง)", "They're inside: open the door of a morning to let them graze (a heart once a day).")}</p>
      {u.level >= 1 && u.level < 3 && <div className="mt-2"><Warn bad={u.level === 2} data-untended={u.level}>{t(`ไม่ได้ดูแลสัตว์ในโรงมา ${u.days} วันแล้ว ถ้าครบ ${ANIMALS.untended.reclaim} วัน คนที่รอโรงอาจจองโรงนี้ไปได้ (สัตว์จะไปอยู่คอกลุง)`, `Your barn has gone ${u.days} days without care. At ${ANIMALS.untended.reclaim} days somebody waiting may take it (your animals would go to Uncle's pen).`)}</Warn></div>}
      {next ? (
        <div className="mt-2 border-t border-line pt-2" data-enlarge={next.room}>
          <p className="text-meta text-ink">{t(`ขยายโรงเลี้ยงเป็น ${next.room} ตัว`, `Enlarge the barn to house ${next.room}`)}</p>
          <Needs th={th} purse={purse} coins={next.coins} logs={next.logs} stone={next.stone} credit={herd.credit} />
          <button type="button" className={`${button} mt-1.5 w-full`} disabled={busy || purse.coins < Math.max(0, next.coins - herd.credit) || held(purse.bag, "log" as ItemId) < next.logs || held(purse.bag, "stoneTile" as ItemId) < next.stone}
                  onClick={() => void act({ action: "enlarge" }, ["ลุงต่อเติมโรงให้แล้ว เลี้ยงได้เพิ่มขึ้น", "Built on: room for more."], undefined, { nothing: ["ไม้ซุงหรือแผ่นหินไม่พอ", "Not enough logs or stone tiles."], full: ["โรงขยายเต็มที่แล้ว", "It's as large as it goes."] })} data-enlarge-buy>{t("ขยายโรงเลี้ยง", "Enlarge the barn")}</button>
        </div>
      ) : <p className="mt-2 text-label text-muted">{t("โรงขยายเต็มที่แล้ว", "Your barn is as large as it goes.")}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" className={button} onClick={() => onView("trough", String(herd.barn))} data-open-trough>{t("รางอาหาร", "The trough")}</button>
        <button type="button" className={button} onClick={() => onView("barn", String(herd.barn))} data-open-barns>{t("ผังโรงทั้งหมด", "The barns' plan")}</button>
      </div>
    </div>
  );
}

/* ── a barn's one trough: a slot for each place, each its animal's own feed ── */
function Trough({ th, purse, world, now, kit, busy, act, many, me, nameOf, focus, onView }: Common & { focus: string | null }) {
  const t = (a: string, b: string) => (th ? a : b);
  const mineH = herdOf(world, me), index = focus !== null && Number.isFinite(Number(focus)) ? Number(focus) : mineH?.barn ?? null;
  const holder = index !== null ? world.herds.find((h) => h.barn === index) ?? null : null;
  if (index === null || !holder) return <p className="mt-2 text-ui text-muted" data-trough-none>{t("โรงนี้ยังไม่มีเจ้าของ", "Nobody keeps this barn yet.")}</p>;
  const own = holder.owner === me, may = own || mayCare(holder, me);
  const animals = world.animals.filter((a) => a.owner === holder.owner && a.home !== "pen" && a.born <= now).sort((x, y) => (x.id < y.id ? -1 : 1));
  const slots = Array.from({ length: holder.room }, (_, i) => animals[i] ?? null);
  const views = slots.map((a) => (a ? viewOf(a, now, ctxOf(world, a.owner, purse, me)) : null));
  // (what filling every slot takes: each animal not full, its own species' sack, while the bag has one)
  const left = new Map<string, number>();
  const fills: AnimalInput[] = [];
  slots.forEach((a, i) => {
    const v = views[i];
    if (!a || !v || v.food >= ANIMALS.trough - 0.5) return;
    const sack = SPECIES[a.species].sack, have = left.get(sack) ?? held(purse.bag, sack, 0);
    if (have < 1) return;
    left.set(sack, have - 1);
    fills.push({ action: "feed", id: a.id, item: sack, grade: 0 });
  });
  const needs = [...new Set(fills.map((f) => (f as { item: string }).item))].map((id) => `${ITEMS[id as ItemId]?.name[th ? "th" : "en"]} ×${fills.filter((f) => (f as { item: string }).item === id).length}`).join(", ");
  return (
    <div data-animals-trough={index}>
      <p className="text-ui font-semibold text-ink">{t(`รางอาหาร · ${barnName(index, true)}`, `The trough · ${barnName(index, false)}`)}{!own && <span className="font-normal text-muted"> · {t(`ของ ${nameOf(holder.owner)}`, `${nameOf(holder.owner)}'s`)}</span>}</p>
      <p className="mt-0.5 text-label text-muted">{t(`ช่องใส่อาหาร ${holder.room} ช่อง ตัวละช่อง แต่ละตัวกินอาหารของตัวเอง อิ่มได้สูงสุด ${ANIMALS.trough} ชม.`, `${holder.room} slots, one an animal, each its own feed; at most ${ANIMALS.trough} h of food`)}</p>
      {!may && <div className="mt-2"><Warn>{t("เจ้าของยังไม่ให้ช่วยดูแล ดูได้อย่างเดียว", "Its owner hasn't let you care for them: look only.")}</Warn></div>}
      {may && (
        <div className="mt-2">
          <button type="button" className={`${main} w-full`} disabled={busy || !fills.length} data-trough-fill={fills.length}
                  onClick={() => void many(fills, (n) => [`เติมอาหารแล้ว ${n} ช่อง`, `${n} slot${n > 1 ? "s" : ""} filled`])}>{t("เติมให้ครบทุกช่อง", "Fill every slot")}</button>
          <p className="mt-1 text-label text-muted">{fills.length ? t(`ใช้ ${needs} จากกระเป๋า`, `Uses ${needs} from your bag`) : slots.some((a, i) => a && (views[i]?.food ?? 24) < ANIMALS.trough - 0.5) ? t("ไม่มีถุงอาหารของสัตว์ที่หิวในกระเป๋า ซื้อได้ที่ร้านลุง", "No sack of feed for the hungry ones in your bag: the stall sells them.") : t("ทุกช่องเต็มแล้ว", "Every slot is full.")}</p>
        </div>
      )}
      <ul className="mt-2 grid gap-2">
        {slots.map((a, i) => {
          const v = views[i];
          if (!a || !v) return <li key={i} className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-meta text-muted" data-trough-slot={i}>{t(`ช่อง ${i + 1} · ว่าง`, `Slot ${i + 1} · empty`)}</li>;
          const feeds = purse.bag.map((x, slot) => ({ x, slot })).filter(({ x }) => x && feedHours(a.species, x.item) > 0);
          const level = v.food <= 0.05 ? t("ว่าง", "empty") : v.food < ANIMALS.trough * 0.55 ? t("ครึ่งราง", "half") : t("เต็ม", "full");
          return (
            <li key={a.id} className="rounded-xl border border-line bg-bg/50 p-2" data-trough-slot={i} data-animal={a.id}>
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center font-data text-label text-muted">{i + 1}</span>
                <AnimalPic species={a.species} breed={a.breed} stage={artStage(a, now)} size={40} kit={kit} sex={a.sex} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-ui font-semibold text-ink"><SexMark sex={a.sex} th={th} /><span className="truncate">{nameOfAnimal(a, th)}</span></span>
                  <span className="mt-1 flex items-center gap-2"><span className="block w-full max-w-[9rem]"><Bar value={v.food / ANIMALS.trough} tone={v.hungry ? "rose" : "jade"} label={t(`อาหาร ${Math.round(v.food)} ชม.`, `${Math.round(v.food)} h of food`)} /></span><span className="shrink-0 text-label text-muted">{Math.round(v.food)}/{ANIMALS.trough} {t("ชม.", "h")} · {level}</span></span>
                </span>
                {v.hungry && <span className="rounded-full bg-[#ff7a93]/20 px-2 py-0.5 text-meta font-semibold text-[#ff9fb0]">{t("หิว", "Hungry")}</span>}
              </div>
              {may && (feeds.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">{feeds.map(({ x, slot }) => (
                  <li key={slot}><button type="button" className={`${button} flex items-center gap-1.5 px-2`} disabled={busy || v.food >= ANIMALS.trough - 0.01} data-trough-feed={x!.item}
                    onClick={() => void act({ action: "feed", id: a.id, item: x!.item, grade: (x!.grade ?? 0) as 0 | 1 | 2 | 3 }, ["เติมอาหารในช่องแล้ว", "Into its slot."])}>
                    <ItemIcon id={x!.item} size={22} /><span className="text-meta">×{x!.n}</span><span className="text-label text-muted">+{feedHours(a.species, x!.item)}{t("ชม.", "h")}</span>
                  </button></li>
                ))}</ul>
              ) : <p className="mt-1 text-label text-muted">{t(`ไม่มีอาหาร${SPECIES[a.species].name.th}ในกระเป๋า`, `No ${SPECIES[a.species].name.en.toLowerCase()} feed in your bag`)}</p>)}
            </li>
          );
        })}
      </ul>
      {own && <button type="button" className="pressable mt-2 min-h-11 text-meta text-accent underline-offset-2 hover:underline" onClick={() => onView("mine")}>{t("ดูการ์ดสัตว์ในโรง", "See the animals' cards")}</button>}
    </div>
  );
}

/* ── the stall ── */
function Shop({ th, purse, world, now, kit, busy, act, me, onView, mine }: Common & { mine: Animal[] }) {
  const t = (a: string, b: string) => (th ? a : b);
  const herd = herdOf(world, me);
  const hasBarn = !!herd && herd.barn !== null;
  const home = herd ? freeHome(herd, world.animals) : null;
  const used = usedOf(world.animals, me);
  const [sex, setSex] = useState<Record<string, Sex>>({});
  const [sure, setSure] = useState<string | null>(null);
  const nextFront = herd ? ANIMALS.facades[herd.facade] : undefined;
  const row = (id: string, price: number, note?: string) => (
    <li key={id} className="flex items-center gap-2 border-b border-line py-1.5" data-shop-item={id}>
      <ItemIcon id={id as ItemId} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ui text-ink">{ITEMS[id as ItemId]?.name[th ? "th" : "en"] ?? id}</span>
        <span className="flex items-center gap-2 text-meta text-muted"><Coins n={price} th={th} small />{note && <span className="truncate">{note}</span>}{held(purse.bag, id as ItemId) > 0 && <span>{t(`มี ${held(purse.bag, id as ItemId)}`, `have ${held(purse.bag, id as ItemId)}`)}</span>}</span>
      </span>
      <button type="button" className={button} disabled={busy || purse.coins < price} onClick={() => void act({ action: "shop", item: id, n: 1 }, ["ได้ของแล้ว ขอบใจนะหลาน", "There you go, kiddo."])}>{t("ซื้อ", "Buy")}</button>
      <button type="button" className={`${button} hidden sm:block`} disabled={busy || purse.coins < price * 5} onClick={() => void act({ action: "shop", item: id, n: 5 }, ["ได้ของแล้ว ขอบใจนะหลาน", "There you go, kiddo."])}>×5</button>
    </li>
  );
  return (
    <div data-animals-shop>
      {!hasBarn ? (
        <div className="mb-2 rounded-xl border border-gold/50 bg-gold/10 p-3" data-shop-nobarn>
          <p className="text-meta text-ink">{t("ต้องมีโรงเลี้ยงก่อนถึงจะรับลูกสัตว์ได้", "You need a barn before you can take a young one home.")}</p>
          <button type="button" className={`${main} mt-2 w-full`} onClick={() => onView("barn")} data-open-barns>{t("เลือกโรงเลี้ยง", "Choose a barn")}</button>
        </div>
      ) : (
        <p className="flex flex-wrap gap-1.5 text-meta" data-places>
          <span className={chip}>{t(`ในโรง ${used.barn}/${herd!.room}`, `Barn ${used.barn}/${herd!.room}`)}</span>
          <span className={chip}>{t(`คอกลุง ${used.pen}/${ANIMALS.pen}`, `Uncle's pen ${used.pen}/${ANIMALS.pen}`)}</span>
          {home === "pen" && <span className={`${chip} border-gold/60 text-gold`}>{t("โรงเต็ม ตัวใหม่จะไปรอที่คอกลุง", "Barn full: a new one waits in the pen")}</span>}
        </p>
      )}
      <H3>{t("ลูกสัตว์ (เลือกเพศได้ ค่อยๆ โตเมื่อกินอิ่ม)", "Young ones (choose the sex; they grow while fed)")}</H3>
      <ul className="grid gap-2">
        {SPECIES_IDS.map((sp) => {
          const s = SPECIES[sp], days = (s.grow[0] + s.grow[1]) / 24, x = sex[sp] ?? "f";
          const yields = sp === "chicken" ? t(`ไข่ทุก ${s.cycle} ชม.`, `an egg every ${s.cycle} h`) : sp === "duck" ? t(`ไข่เป็ดทุก ${s.cycle} ชม.`, `a duck egg every ${s.cycle} h`) : sp === "sheep" ? t("ขนเต็มทุก 24 ชม.", "a fleece every 24 h") : t(`นมเต็มทุก ${s.cycle} ชม.`, `milk every ${s.cycle} h`);
          const maleNote = sp === "sheep" ? t("แกะให้ขนทั้งสองเพศ", "sheep of both sexes give wool") : t("ตัวผู้ไม่ให้ผลผลิต ใช้ผสมพันธุ์", "males give nothing: for breeding");
          return (
            <li key={sp} className="rounded-xl border border-line bg-bg/50 p-2" data-buy={sp}>
              <div className="flex items-center gap-3">
                <AnimalPic species={sp} breed={breedAt(sp, "A").id} stage="baby" size={52} kit={kit} />
                <span className="min-w-0 flex-1">
                  <span className="block text-ui font-semibold text-ink">{s.baby[th ? "th" : "en"]}</span>
                  <span className="block text-meta text-muted">{t(`โตใน ${days} วัน · ${yields}`, `grown in ${days} d · ${yields}`)}</span>
                  <Coins n={s.price} th={th} small />
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div role="radiogroup" aria-label={t("เพศ", "Sex")} className="flex shrink-0 overflow-hidden rounded-lg border border-line-strong">
                  {(["f", "m"] as const).map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={x === v} onClick={() => setSex({ ...sex, [sp]: v })} data-sex-pick={v}
                            className={`pressable flex min-h-11 min-w-[4.25rem] items-center justify-center gap-1 px-2 text-ui ${x === v ? "bg-accent/15 font-semibold text-accent" : "text-ink"}`}>
                      <SexMark sex={v} th={th} />{v === "f" ? t("เมีย", "F") : t("ผู้", "M")}
                    </button>
                  ))}
                </div>
                <button type="button" className={`${main} flex-1`} disabled={busy || !hasBarn || purse.coins < s.price || !home} data-buy-go={sp}
                        onClick={() => void act({ action: "buy", species: sp, sex: x }, home === "pen" ? ["ได้ลูกสัตว์แล้ว! โรงเต็มเลยรอที่คอกลุงก่อนนะ", "Here's your little one! The barn's full, so it waits in Uncle's pen."] : ["ได้ลูกสัตว์แล้ว! อยู่ในโรงของหลาน อย่าลืมให้อาหารนะ", "Here's your little one, in your barn! Don't forget to feed it."])}>{t("รับเลี้ยง", "Take")}</button>
              </div>
              {x === "m" && <p className="mt-1 text-label text-muted">{maleNote}</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-label text-muted">{t("ผสมพันธุ์ได้เมื่อมีตัวผู้กับตัวเมียชนิดเดียวกัน ลูกที่เกิดเป็นเพศสุ่ม", "A cross takes a male and a female of one kind; a child's sex is by chance.")}</p>
      <H3>{t("อาหารและของเร่งโต", "Feed and growth feed")}</H3>
      <ul>{SPECIES_IDS.flatMap((sp) => [row(SPECIES[sp].sack, SPECIES[sp].sackPrice, t("อิ่ม 24 ชม.", "24 h of food")), row(SPECIES[sp].growItem, SPECIES[sp].growPrice, t("โตไวขึ้น 24 ชม.", "faster growth for 24 h"))])}</ul>
      <H3>{t("เครื่องมือ", "Tools")}</H3>
      <ul>{["milker", "woolShears", "eggBasket", "churn", "cheesePress", "spindle", "knittingNeedles"].map((id) => row(id, POPOTO_SHOP[id], id === "milker" ? t("ใช้รีดนมวัว", "for milking") : id === "woolShears" ? t("ใช้ตัดขนแกะ", "for shearing") : id === "eggBasket" ? t("ใช้เก็บไข่", "for eggs") : t("ใช้ที่โต๊ะแปรรูป", "for the making table")))}</ul>
      <details className="mt-3 rounded-xl border border-line bg-bg/40 px-3 py-1" data-shop-scrolls>
        <summary className="pressable flex min-h-11 cursor-pointer items-center text-ui font-semibold text-ink">{t(`ม้วนสูตรอาหารจากฟาร์ม (${Object.keys(ANIMAL_SCROLL_ITEMS).length})`, `Farm recipe scrolls (${Object.keys(ANIMAL_SCROLL_ITEMS).length})`)}</summary>
        <ul>{Object.keys(ANIMAL_SCROLL_ITEMS).map((id) => row(id, POPOTO_SHOP[id]))}</ul>
      </details>
      {hasBarn && (<>
        <H3>{t("หน้าโรงเลี้ยง", "The barn's front")}</H3>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-bg/50 p-2" data-facade={herd!.facade}>
          <span className="min-w-0 flex-1 text-ui text-ink">{nextFront !== undefined ? t(`หน้าโรงแบบที่ ${herd!.facade + 1} (ความสวยงาม)`, `Barn front no. ${herd!.facade + 1} (looks only)`) : t("หน้าโรงครบทุกแบบแล้ว", "Every barn front bought")}{nextFront !== undefined && <Coins n={nextFront} th={th} small />}</span>
          <button type="button" className={button} disabled={busy || nextFront === undefined || purse.coins < (nextFront ?? Infinity)} onClick={() => void act({ action: "facade" }, ["ทาสีใหม่เรียบร้อย สวยเชียว", "Freshly done. Looks grand."])}>{t("ซื้อ", "Buy")}</button>
        </div>
      </>)}
      <H3>{t("ขายสัตว์คืนให้ลุง", "Sell an animal back")}</H3>
      <p className="mb-1 text-label text-muted">{t("ลุงรับซื้อคืนเฉพาะตัวที่ซื้อจากลุง ตัวที่เกิดในฟาร์มลุงรับไว้ดูแลให้ ไม่ได้เงิน", "Uncle buys back the ones he sold; one born on the farm he takes in for nothing.")}</p>
      {mine.length ? (
        <ul className="grid gap-1.5">{mine.map((a) => {
          const coming = stageOf(a, now) === "coming", price = sellBackOf(a);
          return (
            <li key={a.id} className="flex items-center gap-2 border-b border-line py-1.5" data-sell={a.id}>
              <AnimalPic species={a.species} breed={a.breed} stage={artStage(a, now)} size={34} kit={kit} sex={a.sex} />
              <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-ui text-ink"><SexMark sex={a.sex} th={th} />{nameOfAnimal(a, th)}</span>
              <Coins n={price} th={th} small />
              <button type="button" className={button} disabled={busy || coming} onClick={() => { if (sure !== a.id) { setSure(a.id); return; } setSure(null); void act({ action: "sell", id: a.id }, ["ลุงรับไว้ดูแลต่อนะ", "I'll look after it from here."]); }}>{sure === a.id ? t("ยืนยัน", "Sure?") : price ? t("ขาย", "Sell") : t("ให้ลุง", "Give")}</button>
            </li>
          );
        })}</ul>
      ) : <p className="text-meta text-muted">{t("ยังไม่มีสัตว์", "No animals yet.")}</p>}
    </div>
  );
}

/* ── my animals ── */
function Mine(p: Common & { mine: Animal[]; focus: string | null; onCollect: (a: Animal) => void; lentToMe: Animal[] }) {
  const { th, mine, focus, lentToMe, now, onView } = p;
  const [open, setOpen] = useState<string | null>(focus);
  useEffect(() => { if (focus) setOpen(focus); }, [focus]);
  const inBarn = mine.filter((a) => a.home !== "pen"), inPen = mine.filter((a) => a.home === "pen");
  return (
    <div data-animals-mine>
      <BarnHead {...p} />
      {inBarn.length ? (
        <ul className="mt-3 grid gap-2">
          {inBarn.map((a) => <Card key={a.id} {...p} a={a} open={open === a.id} onOpen={() => setOpen(open === a.id ? null : a.id)} mine />)}
        </ul>
      ) : <p className="mt-3 text-ui text-muted" data-animals-none>{th ? "ยังไม่มีสัตว์ในโรง ไปที่แท็บ \"ร้านลุง\" รับลูกสัตว์สักตัวสิหลาน" : "No animals in your barn yet: take a young one home from the stall."}</p>}
      {inPen.length > 0 && <button type="button" className="pressable mt-2 min-h-11 w-full rounded-lg border border-line px-3 text-left text-meta text-ink" onClick={() => onView("pen")} data-to-pen>{th ? `อีก ${inPen.length} ตัวรออยู่ที่คอกลุง (ไม่กิน ไม่โต) แตะเพื่อจัดการ` : `${inPen.length} more wait in Uncle's pen (frozen): tap to see`}</button>}
      {lentToMe.length > 0 && <>
        <H3>{th ? "เพื่อนให้ยืม (ใช้ผสมที่รังได้)" : "Lent to me (for the nest)"}</H3>
        <ul className="grid gap-2">{lentToMe.map((a) => <li key={a.id} className="flex items-center gap-2 rounded-xl border border-line bg-bg/50 p-2" data-lent-to-me={a.id}>
          <AnimalPic species={a.species} breed={a.breed} stage={artStage(a, now)} size={40} kit={p.kit} sex={a.sex} />
          <span className="min-w-0 flex-1 text-meta text-ink"><span className="flex items-center gap-1 font-semibold"><SexMark sex={a.sex} th={th} />{nameOfAnimal(a, th)}</span>{th ? `ของ ${p.nameOf(a.owner)} · เหลือ ${left(a.lent!.until - now, true)}` : `${p.nameOf(a.owner)}'s · ${left(a.lent!.until - now, false)} left`}</span>
          <button type="button" className={main} onClick={() => onView("nest")}>{th ? "ไปที่รัง" : "To the nest"}</button>
        </li>)}</ul>
      </>}
    </div>
  );
}

function Card({ a, th, purse, world, now, kit, busy, act, open, onOpen, onCollect, me, nameOf, onView, mine }: Common & { a: Animal; open: boolean; onOpen: () => void; onCollect: (a: Animal) => void; mine: boolean }) {
  const t = (x: string, y: string) => (th ? x : y);
  const v = viewOf(a, now, ctxOf(world, a.owner, purse, me)), s = v.animal, sp = SPECIES[a.species], breed = breedOf(a.breed);
  const [picker, setPicker] = useState<"feed" | "treat" | "name" | null>(null);
  const [name, setName] = useState(a.name);
  const stage = v.stage, inPen = a.home === "pen", yields = gives(a);
  const bottle = hasThing(purse, ANIMAL_GIFTS.bottle as ThingId);
  const speed = Math.min(ANIMALS.speedCap, 1 + (now < s.speedUntil ? 1 : 0) + (bottle ? 1 : 0) + (statOf(s, "vigor") - 1) * ANIMALS.stats.vigor);
  const feeds = purse.bag.map((x, slot) => ({ x, slot })).filter(({ x }) => x && (feedHours(a.species, x.item) > 0 || (growFor(a.species, x.item) > 0 && stage !== "adult")));
  const treats = purse.bag.map((x, slot) => ({ x, slot })).filter(({ x }) => x && sp.treats.includes(x.item));
  const tool = TOOL_OF[sp.game];
  const cradle = mine && hasThing(purse, ANIMAL_GIFTS.cradle as ThingId) && stage === "adult" && !inPen;
  const herd = herdOf(world, me), used = usedOf(world.animals, me);
  const shorn = a.species === "sheep" && stage === "adult" && v.ready === 0 && v.round < 0.5;
  const care = careOf(s), lent = !!a.lent && a.lent.until > now;
  return (
    <li className={`rounded-xl border bg-bg/50 ${open ? "border-accent/70" : "border-line"}`} data-animal-card={a.id} data-stage={stage} data-ready={v.ready} data-sex={a.sex} data-home={a.home}>
      <button type="button" onClick={onOpen} aria-expanded={open} className="pressable flex min-h-11 w-full items-center gap-2 p-2 text-left">
        <AnimalPic species={a.species} breed={a.breed} stage={artStage(a, now)} size={44} kit={kit} pose={stage === "coming" ? "sleep" : "idle"} sex={a.sex} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5"><SexMark sex={a.sex} th={th} /><span className="truncate text-ui font-semibold text-ink">{nameOfAnimal(a, th)}</span><span className={chip}>{STAGE[stage][th ? 0 : 1]}</span></span>
          <span className="mt-0.5 flex items-center gap-2"><Hearts n={v.hearts} th={th} />{!mine && <span className="truncate text-meta text-muted">{nameOf(a.owner)}</span>}</span>
          <span className="mt-1 block w-full max-w-[12rem]"><Bar value={v.food / ANIMALS.trough} tone={v.hungry ? "rose" : "jade"} label={t(`อาหารในราง ${Math.round(v.food)} ชม.`, `${Math.round(v.food)} h of food in the trough`)} /></span>
        </span>
        {inPen && <span className={`${chip} text-muted`}>{t("คอกลุง", "Pen")}</span>}
        {!inPen && v.hungry && <span className="rounded-full bg-[#ff7a93]/20 px-2 py-0.5 text-meta font-semibold text-[#ff9fb0]" data-hungry>{t("หิว", "Hungry")}</span>}
        {!inPen && v.ready > 0 && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-meta font-semibold text-gold" data-ready-badge>{t(`พร้อมเก็บ ${v.ready}`, `${v.ready} ready`)}</span>}
      </button>
      {open && (
        <div className="border-t border-line px-3 pb-3 pt-2" data-animal-open>
          <p className="text-meta text-muted">{breed?.name[th ? "th" : "en"]} · {a.sex === "m" ? t("ตัวผู้", "male") : t("ตัวเมีย", "female")} · {breed?.looks[th ? "th" : "en"]}</p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {inPen && <span className={chip}>{t("รอที่คอกลุง: ไม่กิน ไม่โต ไม่ให้ผลผลิต", "In Uncle's pen: frozen")}</span>}
            {a.rest > now && <span className={chip}>{t(`พักถึง ${clock(a.rest)}`, `resting till ${clock(a.rest)}`)}</span>}
            {lent && <span className={chip} data-lent>{t(`${nameOf(a.lent!.to)} ยืมอยู่ เหลือ ${left(a.lent!.until - now, true)}`, `lent to ${nameOf(a.lent!.to)}, ${left(a.lent!.until - now, false)} left`)}</span>}
            {speed > 1 && stage !== "adult" && <span className={`${chip} text-jade`}>{t(`โตไว ×${+speed.toFixed(2)}`, `growing ×${+speed.toFixed(2)}`)}</span>}
            {a.outside.length > 0 && <span className={chip}>{t(`ไข่ในทุ่ง ${a.outside.reduce((n, o) => n + o.n, 0)} ฟอง`, `${a.outside.reduce((n, o) => n + o.n, 0)} eggs out on the meadow`)}</span>}
            {shorn && <span className={chip} data-shorn>{t("ตัดขนแล้ว ขนกำลังงอก", "Shorn: the fleece is growing back")}</span>}
          </p>
          <div className="mt-2 grid gap-1" data-stats>
            <p className="text-meta text-ink">{t("ค่าพันธุกรรม (1-10)", "Stats (1-10)")}</p>
            {STAT_IDS.map((k) => <StatRow key={k} k={k} n={statOf(s, k)} th={th} />)}
          </div>
          <div className="mt-2" data-care={Math.round(care * 100)}>
            <p className="mb-1 flex justify-between text-meta"><span className="text-ink">{t("การดูแล", "How well it's cared for")}</span><span className="text-muted">{t(`หัวใจ ${v.hearts} · กินอิ่มต่อเนื่อง ${s.streak ?? 0} วัน`, `${v.hearts} hearts · fed through ${s.streak ?? 0} days in a row`)}</span></p>
            <Bar value={care} tone="accent" label={t(`การดูแล ${Math.round(care * 100)}%`, `care ${Math.round(care * 100)}%`)} />
            <p className="mt-0.5 text-label text-muted">{t("ดูแลดีๆ ลูกที่เกิดจากตัวนี้จะได้ค่าพันธุกรรมดีขึ้น", "The better it's cared for, the better its children's stats.")}</p>
          </div>
          {stage === "coming" && <p className="mt-2 text-ui text-ink">{t(`จะออกมา ${clock(a.born)}`, `Comes out at ${clock(a.born)}`)}</p>}
          {(stage === "baby" || stage === "young") && (
            <div className="mt-2" data-growth={Math.round(v.grown * 100)}>
              <p className="mb-1 flex justify-between text-meta"><span className="text-ink">{t(stage === "baby" ? "โตเป็นวัยรุ่น" : "โตเต็มวัย", stage === "baby" ? "To young" : "To grown")}</span><span className="text-muted">{t(`อีกราว ${hrs(v.adultIn / speed, true)} (เมื่อกินอิ่ม)`, `about ${hrs(v.adultIn / speed, false)} more while fed`)}</span></p>
              <Bar value={v.grown} label={t(`โตแล้ว ${Math.round(v.grown * 100)}%`, `${Math.round(v.grown * 100)}% grown`)} />
            </div>
          )}
          {stage === "adult" && yields && !inPen && (
            <div className="mt-2" data-round={v.ready}>
              <p className="mb-1 flex justify-between text-meta"><span className="text-ink">{t(`ผลผลิตรอบต่อไป · พร้อมเก็บ ${v.ready}/${sp.bank}`, `Next round · ${v.ready}/${sp.bank} ready`)}</span><span className="text-muted">{v.ready >= sp.bank ? t("เต็มแล้ว หยุดรอเก็บ", "full: waiting") : t(`อีก ${hrs((1 - v.round) * sp.cycle, true)} ที่อิ่ม`, `${hrs((1 - v.round) * sp.cycle, false)} fed`)}</span></p>
              <Bar value={v.ready >= sp.bank ? 1 : v.round} tone="gold" label={t("รอบผลผลิต", "The round")} />
            </div>
          )}
          {stage === "adult" && !yields && <p className="mt-2 text-meta text-muted" data-no-yield>{t("ตัวผู้ไม่ให้ผลผลิต ใช้ผสมพันธุ์กับตัวเมีย", "A male gives nothing to collect: he's for breeding.")}</p>}
          {yields && <div className="mt-2">
            <p className="mb-1 text-meta text-ink">{t("คุณภาพผลผลิต (หัวใจตั้งเพดาน อาหารเกรดดียกพื้น)", "Produce quality (hearts set the ceiling; graded feed lifts the floor)")}</p>
            <QualityRange range={{ lo: v.range.floor, hi: v.range.ceiling }} base={Math.max(0, v.range.ceiling - ANIMALS.quality.spread)} th={th} odds={false} />
          </div>}
          {mine && (
            <div className="mt-2 grid grid-cols-2 gap-2" data-animal-actions>
              <button type="button" className={button} disabled={busy || stage === "coming" || inPen} onClick={() => setPicker(picker === "feed" ? null : "feed")} aria-expanded={picker === "feed"}>{t("ให้อาหาร", "Feed")}</button>
              <button type="button" className={button} disabled={busy || stage === "coming" || inPen || !!s.today.pet} onClick={() => void act({ action: "pet", id: a.id }, ["ลูบหัวแล้ว มันดูดีใจนะ", "A pat. It looks pleased."])}>{s.today.pet ? t("ลูบแล้ววันนี้", "Petted today") : t("ลูบหัว", "Pet")}</button>
              <button type="button" className={button} disabled={busy || stage === "coming" || inPen || !!s.today.treat} onClick={() => setPicker(picker === "treat" ? null : "treat")} aria-expanded={picker === "treat"}>{s.today.treat ? t("ให้ขนมแล้ว", "Treated today") : t("ให้ขนม", "Treat")}</button>
              {yields && <button type="button" className={stage === "adult" && v.ready > 0 && !inPen ? main : button} disabled={busy || stage !== "adult" || v.ready < 1 || inPen} onClick={() => { if (held(purse.bag, tool as ItemId) < 1) { void act({ action: "collect", id: a.id, play: null }); return; } onCollect(s); }} data-collect={sp.game}>
                {GAME_WORD[sp.game][th ? 0 : 1]}{held(purse.bag, tool as ItemId) < 1 ? t(" (ไม่มีเครื่องมือ)", " (no tool)") : ""}
              </button>}
              {inPen
                ? <button type="button" className={main} disabled={busy || !herd || herd.barn === null || used.barn >= (herd?.room ?? 0)} onClick={() => void act({ action: "move", id: a.id, home: "barn" }, ["ย้ายเข้าโรงแล้ว", "Into the barn."])} data-move="barn">{t("ย้ายเข้าโรง", "Move to barn")}</button>
                : <button type="button" className={button} disabled={busy || lent || used.pen >= ANIMALS.pen} onClick={() => void act({ action: "move", id: a.id, home: "pen" }, ["ฝากไว้ที่คอกลุงแล้ว", "Left in Uncle's pen."])} data-move="pen">{t("ฝากคอกลุง", "To Uncle's pen")}</button>}
              <button type="button" className={button} disabled={busy || stage === "coming" || lent} onClick={() => onView("pen", a.id)} data-hand-on>{t("ส่งต่อให้เพื่อน", "Hand on")}</button>
              <button type="button" className={button} disabled={busy} onClick={() => setPicker(picker === "name" ? null : "name")} aria-expanded={picker === "name"}>{t("ตั้งชื่อ", "Rename")}</button>
              {cradle && <button type="button" className={button} disabled={busy || usesLeft(purse, ANIMAL_GIFTS.cradle, now) < 1} onClick={() => void act({ action: "cradle", id: a.id }, ["เปลอุ่นของยายให้ลูกน้อยมาหนึ่งตัว!", "Grandma's cradle brings a little one!"], (r) => { if (r.ok && r.got?.sex && r.got.stats) void 0; })} data-cradle>{t("เปลอุ่นของยาย", "Warm cradle")}</button>}
            </div>
          )}
          {picker === "feed" && (
            <div className="mt-2 rounded-lg border border-line p-2" data-picker="feed">
              <p className="mb-1 text-meta text-muted">{t(`อาหารในราง ${Math.round(v.food)}/${ANIMALS.trough} ชม. · เลือกจากกระเป๋า`, `${Math.round(v.food)}/${ANIMALS.trough} h in the trough · from your bag`)}</p>
              {feeds.length ? <ul className="grid gap-1">{feeds.map(({ x, slot }) => {
                const hours = feedHours(a.species, x!.item), grow = growFor(a.species, x!.item);
                return (
                  <li key={slot}><button type="button" className={`${button} flex w-full items-center gap-2 text-left`} disabled={busy} onClick={() => { setPicker(null); void act({ action: "feed", id: a.id, item: x!.item, ...(grow ? {} : { grade: (x!.grade ?? 0) as 0 | 1 | 2 | 3 }) }, grow ? ["กินของเร่งโตแล้ว โตไวขึ้นนะ", "Growth feed eaten: growing faster."] : ["เติมอาหารในรางแล้ว", "The trough is topped up."]); }}>
                    <ItemIcon id={x!.item} size={24} /><span className="min-w-0 flex-1 truncate">{ITEMS[x!.item]?.name[th ? "th" : "en"]} ×{x!.n}</span>
                    <span className="text-meta text-muted">{grow ? t(`เร่งโต ${grow / 3_600_000} ชม.`, `faster ${grow / 3_600_000} h`) : t(`+${hours} ชม.`, `+${hours} h`)}</span>
                  </button></li>
                );
              })}</ul> : <p className="text-meta text-muted">{t(`ไม่มีอาหารที่${sp.name.th}กินในกระเป๋า ซื้อ${ITEMS[sp.sack].name.th}ได้ที่ลุง`, `Nothing it eats in your bag. Buy ${ITEMS[sp.sack].name.en.toLowerCase()} at the stall.`)}</p>}
            </div>
          )}
          {picker === "treat" && (
            <div className="mt-2 rounded-lg border border-line p-2" data-picker="treat">
              <p className="mb-1 text-meta text-muted">{t(`ของโปรด: ${sp.treats.map((id) => ITEMS[id]?.name.th ?? id).join(", ")}`, `Favourites: ${sp.treats.map((id) => ITEMS[id]?.name.en ?? id).join(", ")}`)}</p>
              {treats.length ? <ul className="grid gap-1">{treats.map(({ x, slot }) => (
                <li key={slot}><button type="button" className={`${button} flex w-full items-center gap-2 text-left`} disabled={busy} onClick={() => { setPicker(null); void act({ action: "treat", id: a.id, item: x!.item }, ["ชอบมากเลย!", "It loves it!"]); }}><ItemIcon id={x!.item} size={24} /><span className="min-w-0 flex-1 truncate">{ITEMS[x!.item]?.name[th ? "th" : "en"]} ×{x!.n}</span></button></li>
              ))}</ul> : <p className="text-meta text-muted">{t("ไม่มีของโปรดในกระเป๋า", "None of its favourites in your bag.")}</p>}
            </div>
          )}
          {picker === "name" && (
            <form className="mt-2 flex gap-2 rounded-lg border border-line p-2" data-picker="name" onSubmit={(e) => { e.preventDefault(); setPicker(null); void act({ action: "name", id: a.id, name }, ["ตั้งชื่อแล้ว น่ารักจัง", "Named. Lovely."]); }}>
              <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} aria-label={t("ชื่อ", "Name")} className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-card px-3 text-ink" placeholder={breed?.name[th ? "th" : "en"]} />
              <button type="submit" className={main} disabled={busy}>{t("บันทึก", "Save")}</button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

/** A small line for an animal in a list: its picture, sex, name, and whatever is said of it. */
function AnimalLine({ a, th, kit, now, children, note }: { a: Animal; th: boolean; kit: SceneryKit | null; now: number; children?: ReactNode; note?: ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-line bg-bg/50 p-2">
      <AnimalPic species={a.species} breed={a.breed} stage={artStage(a, now)} size={40} kit={kit} sex={a.sex} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-ui font-semibold text-ink"><SexMark sex={a.sex} th={th} /><span className="truncate">{nameOfAnimal(a, th)}</span></span>
        {note && <span className="block truncate text-label text-muted">{note}</span>}
      </span>
      {children}
    </li>
  );
}
const statLine = (a: Animal, th: boolean) => STAT_IDS.map((k) => `${STAT_WORD[k][th ? 0 : 1].slice(0, th ? 6 : 6)} ${statOf(a, k)}`).join(" · ");

/* ── Uncle Popoto's pen, and the handing on of animals ── */
function Pen({ th, purse, world, now, kit, busy, act, me, nameOf, mine, members, focus, offersIn }: Common & { mine: Animal[]; members: Array<{ id: string; name: string }>; focus: string | null; offersIn: AnimalWorld["offers"] }) {
  const t = (a: string, b: string) => (th ? a : b);
  const herd = herdOf(world, me), used = usedOf(world.animals, me);
  const inPen = mine.filter((a) => a.home === "pen"), inBarn = mine.filter((a) => a.home !== "pen" && stageOf(a, now) !== "coming");
  const live = (at: number) => at > now - ANIMALS.offerHours * HOUR;
  const out = (world.offers ?? []).filter((o) => o.from === me && live(o.at));
  const offerable = mine.filter((a) => stageOf(a, now) !== "coming" && !(a.lent && a.lent.until > now) && !out.some((o) => o.animal === a.id));
  const [id, setId] = useState<string>(focus && offerable.some((a) => a.id === focus) ? focus : "");
  const [to, setTo] = useState("");
  useEffect(() => { if (focus && offerable.some((a) => a.id === focus)) setId(focus); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  const find = (aid: string) => world.animals.find((a) => a.id === aid) ?? null;
  const roomInBarn = !!herd && herd.barn !== null && used.barn < herd.room;
  return (
    <div data-animals-pen>
      <p className="text-meta leading-relaxed text-muted">{t(`คอกฝากของลุง ฝากได้ ${ANIMALS.pen} ตัว สัตว์ในคอกจะหยุดกิน หยุดโต หยุดให้ผลผลิต จนกว่าจะย้ายกลับเข้าโรง ลูกสัตว์หรือตัวที่ซื้อเกินที่ในโรงจะมารอที่นี่`, `Uncle's pen keeps ${ANIMALS.pen}. Animals here neither eat, grow nor give until they go back to a barn. Buys and children past the barn's room wait here.`)}</p>
      <p className="mt-1.5 flex flex-wrap gap-1.5 text-meta"><span className={chip} data-pen-used={used.pen}>{t(`ในคอก ${used.pen}/${ANIMALS.pen}`, `In the pen ${used.pen}/${ANIMALS.pen}`)}</span>{herd && herd.barn !== null && <span className={chip}>{t(`ในโรง ${used.barn}/${herd.room}`, `In the barn ${used.barn}/${herd.room}`)}</span>}</p>
      {offersIn.length > 0 && <>
        <H3>{t("เพื่อนส่งมาให้", "Offered to me")}</H3>
        <ul className="grid gap-2" data-offers-in>{offersIn.map((o) => { const a = find(o.animal); return a && (
          <AnimalLine key={o.id} a={a} th={th} kit={kit} now={now} note={<>{t(`จาก ${nameOf(o.from)} · เหลือ ${left(o.at + ANIMALS.offerHours * HOUR - now, true)}`, `from ${nameOf(o.from)} · ${left(o.at + ANIMALS.offerHours * HOUR - now, false)} left`)}<br />{statLine(a, th)}</>}>
            <span className="flex shrink-0 flex-col gap-1">
              <button type="button" className={main} disabled={busy || used.pen >= ANIMALS.pen} onClick={() => void act({ action: "take", offer: o.id, yes: true }, ["รับมาแล้ว อยู่ในคอกลุงนะ ย้ายเข้าโรงได้เลย", "Taken: it waits in Uncle's pen. Move it to your barn."], undefined, { places: ["คอกลุงเต็ม ย้ายสัตว์ออกก่อน", "Uncle's pen is full: make room first."] })} data-offer-take={o.id}>{t("รับ", "Take")}</button>
              <button type="button" className={button} disabled={busy} onClick={() => void act({ action: "take", offer: o.id, yes: false }, ["ไม่รับแล้ว ส่งกลับเจ้าของ", "Declined."])} data-offer-no={o.id}>{t("ไม่รับ", "No")}</button>
            </span>
          </AnimalLine>); })}</ul>
        {used.pen >= ANIMALS.pen && <p className="mt-1 text-label text-[#ffb3c1]">{t("คอกลุงเต็ม รับเพิ่มไม่ได้จนกว่าจะย้ายออก", "The pen is full: make room to take one.")}</p>}
      </>}
      <H3>{t("ในคอกของลุง", "In Uncle's pen")}</H3>
      {inPen.length ? <ul className="grid gap-2" data-pen-list>{inPen.map((a) => (
        <AnimalLine key={a.id} a={a} th={th} kit={kit} now={now} note={STAGE[stageOf(a, now)][th ? 0 : 1]}>
          <button type="button" className={main} disabled={busy || !roomInBarn} onClick={() => void act({ action: "move", id: a.id, home: "barn" }, ["ย้ายเข้าโรงแล้ว", "Into the barn."])} data-move="barn">{t("ย้ายเข้าโรง", "To barn")}</button>
        </AnimalLine>
      ))}</ul> : <p className="text-meta text-muted">{t("ไม่มีสัตว์รออยู่ในคอก", "Nobody waiting in the pen.")}</p>}
      {inPen.length > 0 && !roomInBarn && <p className="mt-1 text-label text-muted">{herd && herd.barn !== null ? t("โรงเต็ม ฝากตัวในโรงไว้ หรือขยายโรงก่อน", "The barn is full: leave one in the pen or enlarge the barn.") : t("ซื้อโรงเลี้ยงก่อนถึงจะย้ายเข้าได้", "Buy a barn to move them in.")}</p>}
      {inBarn.length > 0 && <>
        <H3>{t("ในโรงของฉัน", "In my barn")}</H3>
        <ul className="grid gap-2">{inBarn.map((a) => (
          <AnimalLine key={a.id} a={a} th={th} kit={kit} now={now} note={STAGE[stageOf(a, now)][th ? 0 : 1]}>
            <button type="button" className={button} disabled={busy || used.pen >= ANIMALS.pen || (!!a.lent && a.lent.until > now)} onClick={() => void act({ action: "move", id: a.id, home: "pen" }, ["ฝากไว้ที่คอกลุงแล้ว", "Left in Uncle's pen."])} data-move="pen">{t("ฝากลุง", "To pen")}</button>
          </AnimalLine>
        ))}</ul>
      </>}
      <H3>{t("ส่งต่อสัตว์ให้เพื่อน", "Hand an animal on")}</H3>
      <div className="grid gap-2 rounded-xl border border-line bg-bg/40 p-2" data-offer-form>
        <label className="block text-meta text-muted">{t("ตัวไหน", "Which")}
          <select value={id} onChange={(e) => setId(e.target.value)} className={select} data-offer-animal>
            <option value="">{t("เลือกสัตว์", "Choose an animal")}</option>
            {offerable.map((a) => <option key={a.id} value={a.id}>{a.sex === "m" ? "♂" : "♀"} {nameOfAnimal(a, th)} · {STAGE[stageOf(a, now)][th ? 0 : 1]}</option>)}
          </select>
        </label>
        <label className="block text-meta text-muted">{t("ให้ใคร", "To whom")}
          <select value={to} onChange={(e) => setTo(e.target.value)} className={select} data-offer-to>
            <option value="">{t("เลือกเพื่อน", "Choose a friend")}</option>
            {members.filter((m) => m.id !== me).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <p className="text-label text-muted">{t("เพื่อนตอบรับภายใน 1 วัน สัตว์จะไปอยู่คอกของเพื่อน พร้อมหัวใจและค่าพันธุกรรม", "Your friend has a day to say yes; it goes to their pen with its hearts and stats.")}</p>
        <button type="button" className={main} disabled={busy || !id || !to} data-offer-go onClick={() => void act({ action: "offer", id, to }, ["เสนอให้แล้ว รอเพื่อนตอบรับ", "Offered: waiting for your friend."], (r) => { if (r.ok) { setId(""); setTo(""); } }, { used: ["ตัวนี้เสนอให้คนอื่นไว้แล้ว", "That one is offered already."], full: ["เสนอค้างไว้เต็มแล้ว ยกเลิกบางรายการก่อน", "Too many offers standing: withdraw one."] })}>{t("เสนอให้", "Offer")}</button>
      </div>
      {out.length > 0 && <>
        <H3>{t("ที่เสนอให้เพื่อนไว้", "My offers")}</H3>
        <ul className="grid gap-2" data-offers-out>{out.map((o) => { const a = find(o.animal); return a && (
          <AnimalLine key={o.id} a={a} th={th} kit={kit} now={now} note={t(`ให้ ${nameOf(o.to)} · รอตอบ เหลือ ${left(o.at + ANIMALS.offerHours * HOUR - now, true)}`, `to ${nameOf(o.to)} · waiting, ${left(o.at + ANIMALS.offerHours * HOUR - now, false)} left`)}>
            <button type="button" className={button} disabled={busy} onClick={() => void act({ action: "unoffer", offer: o.id }, ["ยกเลิกแล้ว", "Withdrawn."])} data-unoffer={o.id}>{t("ยกเลิก", "Withdraw")}</button>
          </AnimalLine>); })}</ul>
      </>}
      {(!purse) && null}
    </div>
  );
}

/* ── the breeding nest ── */
function Nest({ th, purse, world, now, kit, busy, act, me, nameOf, mine, asksIn, lentToMe }: Common & { mine: Animal[]; asksIn: AnimalWorld["asks"]; lentToMe: Animal[] }) {
  const t = (a: string, b: string) => (th ? a : b);
  const grown = (a: Animal) => stageOf(a, now) === "adult" && a.home !== "pen";
  const adults = mine.filter(grown);
  const [pa, setPa] = useState<string>(""), [pb, setPb] = useState<string>(""), [offering, setOffering] = useState<string>(""), [dawn, setDawn] = useState<string>("");
  const [result, setResult] = useState<{ child: string; sex?: Sex; stats?: Stats } | null>(null);
  const A = adults.find((a) => a.id === pa) ?? null;
  const partners = A ? [...adults.filter((a) => a.id !== pa && a.species === A.species && a.sex !== A.sex), ...lentToMe.filter((a) => a.species === A.species && a.sex !== A.sex && (!a.lent?.with || a.lent.with === A.id))] : [];
  const B = partners.find((a) => a.id === pb) ?? null;
  const ba = A ? breedOf(A.breed)! : null, bb = B ? breedOf(B.breed)! : null;
  // (a breed's scroll is known once it is read, as the database has it: holding one is not reading it)
  const book = bookOf(purse), recipes = purse.recipes as string[];
  const steps = ba && bb ? stepsOf(ba, bb) : [];
  const offerings = purse.bag.map((x) => x?.item).filter((id): id is ItemId => !!id && kindOf(id) !== null).filter((id, i, all) => all.indexOf(id) === i);
  const dawns = purse.bag.map((x) => x?.item).filter((id): id is ItemId => !!id && DAWN_BOOSTS.includes(id)).filter((id, i, all) => all.indexOf(id) === i);
  const x = ba && bb ? crossOf(ba, bb, offering || null, !!dawn) : null;
  const fee = ba && bb && x ? feeOf(x.target, ba, bb) : 0;
  const ready = (a: Animal) => a.hearts >= ANIMALS.breedHearts && a.rest <= now;
  const coming = mine.filter((a) => a.born > now);
  const range = A && B ? childRange(A, B) : null, care = A && B ? (careOf(A) + careOf(B)) / 2 : 0;
  // asking a friend: one of mine grown in my barn, and theirs of the other sex
  const [askMine, setAskMine] = useState<string>("");
  const M = adults.find((a) => a.id === askMine) ?? null;
  const theirs = M ? world.animals.filter((a) => a.owner !== me && a.species === M.species && a.sex !== M.sex && grown(a)).slice(0, 30) : [];
  const asksOut = (world.asks ?? []).filter((q) => q.from === me && q.at > now - ANIMALS.askHours * HOUR);
  const find = (aid: string) => world.animals.find((a) => a.id === aid) ?? null;
  const pickRow = (list: Animal[], value: string, set: (id: string) => void, label: string) => (
    <div>
      <p className="mb-1 text-meta text-muted">{label}</p>
      {list.length ? <ul className="flex flex-wrap gap-1.5">{list.map((a) => (
        <li key={a.id}><button type="button" aria-pressed={value === a.id} disabled={!ready(a)} onClick={() => set(value === a.id ? "" : a.id)} data-parent={a.id}
          className={`pressable flex min-h-11 items-center gap-1 rounded-xl border px-1.5 pr-2.5 text-meta disabled:opacity-45 ${value === a.id ? "border-accent bg-accent/15 text-accent" : "border-line-strong text-ink"}`}>
          <AnimalPic species={a.species} breed={a.breed} stage="adult" size={32} kit={kit} sex={a.sex} />
          <SexMark sex={a.sex} th={th} />
          <span className="max-w-[7rem] truncate">{nameOfAnimal(a, th)}{a.owner !== me ? ` (${nameOf(a.owner)})` : ""}</span>
          {!ready(a) && <span className="text-label text-muted">{a.rest > now ? t("พัก", "rest") : t("<3♥", "<3 hearts")}</span>}
        </button></li>
      ))}</ul> : <p className="text-label text-muted">{t("ไม่มีตัวที่เข้าคู่ได้ ต้องเป็นอีกเพศ ชนิดเดียวกัน โตแล้ว อยู่ในโรง", "None to pair: it takes the other sex, of one kind, grown, in a barn.")}</p>}
    </div>
  );
  return (
    <div data-animals-nest>
      <p className="text-meta leading-relaxed text-muted">{t("ตัวผู้กับตัวเมียชนิดเดียวกัน โตแล้ว อยู่ในโรง สนิท 3 หัวใจขึ้นไปทั้งคู่ กับของเซ่นหนึ่งอย่าง วางลงรังได้ลูกหนึ่งตัว นกฟักไข่ 12 ชม. สัตว์สี่ขา 24 ชม. พ่อแม่พัก 48 ชม.", "A male and a female of one kind, grown, in a barn, 3+ hearts each, and one offering make one young. Birds hatch in 12 h, four-legged ones in 24 h. Parents rest 48 h.")}</p>
      {asksIn.length > 0 && <>
        <H3>{t("เพื่อนขอยืมสัตว์ของเรา", "Friends asking for mine")}</H3>
        <ul className="grid gap-2" data-asks-in>{asksIn.map((q) => { const mineA = find(q.theirs), host = find(q.mine); return mineA && (
          <AnimalLine key={q.id} a={mineA} th={th} kit={kit} now={now} note={t(`${nameOf(q.from)} ขอยืม 1 ชม. ไปผสมกับ ${host ? `${host.sex === "m" ? "♂" : "♀"} ${nameOfAnimal(host, true)}` : "ของเขา"}`, `${nameOf(q.from)} asks it for an hour, for a cross with ${host ? `${host.sex === "m" ? "♂" : "♀"} ${nameOfAnimal(host, false)}` : "theirs"}`)}>
            <span className="flex shrink-0 flex-col gap-1">
              <button type="button" className={main} disabled={busy} onClick={() => void act({ action: "answer", ask: q.id, yes: true }, ["ให้ยืมแล้ว 1 ชั่วโมง ลูกที่เกิดเป็นของเพื่อน", "Lent for an hour: the child will be theirs."])} data-ask-yes={q.id}>{t("ให้ยืม", "Lend")}</button>
              <button type="button" className={button} disabled={busy} onClick={() => void act({ action: "answer", ask: q.id, yes: false }, ["ไม่ให้ยืมแล้ว", "Declined."])} data-ask-no={q.id}>{t("ไม่ให้", "No")}</button>
            </span>
          </AnimalLine>); })}</ul>
      </>}
      {lentToMe.length > 0 && <div className="mt-2 grid gap-1">{lentToMe.map((a) => <Warn key={a.id} data-lent-left={a.id}>{t(`${nameOf(a.owner)} ให้ยืม ${a.sex === "m" ? "♂" : "♀"} ${nameOfAnimal(a, true)} อยู่ เหลือเวลา ${left(a.lent!.until - now, true)} ผสมให้ทันนะ`, `${nameOf(a.owner)} has lent you ${a.sex === "m" ? "♂" : "♀"} ${nameOfAnimal(a, false)}: ${left(a.lent!.until - now, false)} left for the cross.`)}</Warn>)}</div>}
      <div className="mt-2 grid gap-2">
        {pickRow(adults, pa, (id) => { setPa(id); setPb(""); setResult(null); }, t("ตัวที่หนึ่ง (ของเรา)", "First parent (mine)"))}
        {A && pickRow(partners, pb, setPb, t("ตัวที่สอง: อีกเพศ (ของเรา หรือที่เพื่อนให้ยืม)", "Second parent: the other sex (mine, or lent to me)"))}
      </div>
      {range && (
        <div className="mt-3 rounded-xl border border-line bg-bg/50 p-2" data-nest-range>
          <p className="mb-1 text-meta font-semibold text-ink">{t("ค่าพันธุกรรมที่ลูกน่าจะได้", "The child's likely stats")}</p>
          <div className="grid gap-1">{STAT_IDS.map((k) => <StatRow key={k} k={k} range={range[k]} th={th} />)}</div>
          <p className="mt-1.5 text-label leading-relaxed text-muted">{t(`การดูแลพ่อแม่เฉลี่ย ${Math.round(care * 100)}% · ยิ่งดูแลดี (หัวใจเยอะ ให้อาหารอิ่มทุกวันต่อเนื่อง) ลูกยิ่งมีโอกาสได้ค่าสูงขึ้น ถ้าปล่อยหิว ค่ามักลดลง · เพศของลูกสุ่ม`, `The parents' care: ${Math.round(care * 100)}%. The better cared for (many hearts, fed through day after day), the better the child's chances; neglected, its stats often fall. Its sex is by chance.`)}</p>
        </div>
      )}
      {ba && bb && (
        <div className="mt-3 rounded-xl border border-line bg-bg/50 p-2" data-nest-steps={steps.length}>
          <p className="mb-1 text-meta font-semibold text-ink">{t("สูตรที่สองตัวนี้ไปได้", "Where these two can lead")}</p>
          {steps.length ? <ul className="grid gap-1">{steps.map((g) => {
            const child = breedAt(ba.species, g.child), found = world.found[child.id], known = knowsOffering(book, recipes, ba.species, g.child);
            const misses = book.misses[stepKey(ba.species, g.child)] ?? 0;
            return (
              <li key={g.child} className="flex items-center gap-2" data-step={g.child} data-known={known}>
                <AnimalPic species={ba.species} breed={child.id} stage="adult" size={34} kit={kit} dark={!found} />
                <span className="min-w-0 flex-1 text-meta">
                  <span className="block text-ink">{found ? child.name[th ? "th" : "en"] : t("พันธุ์ที่ยังไม่มีใครพบ", "A breed nobody has found")} · <span className="text-muted">{t(`โอกาส ${ANIMALS.odds[child.tier as "real"]}%`, `${ANIMALS.odds[child.tier as "real"]}% odds`)}</span></span>
                  <span className="block text-muted">{t("ของเซ่น: ", "Offering: ")}{known ? <b className="text-gold">{ITEMS[OFFERINGS[ba.species][g.child] as ItemId]?.name[th ? "th" : "en"]}</b> : <>{OFFERING_KINDS[g.kind][th ? "th" : "en"]}{t(" (ต้องลองเอง)", " (find it by trying)")}</>}{misses > 0 && !known ? t(` · ลองแล้ว ${misses} ครั้ง`, ` · ${misses} tries`) : ""}</span>
                </span>
              </li>
            );
          })}</ul> : <p className="text-meta text-muted">{t("สองตัวนี้ไม่มีสูตรไปต่อ ลูกจะเป็นพันธุ์พ่อหรือแม่", "These two lead nowhere new: the child takes a parent's breed.")}</p>}
        </div>
      )}
      {ba && bb && A && B && (
        <div className="mt-3 grid gap-2">
          <label className="block text-meta text-muted">{t("ของเซ่น (จากกระเป๋า)", "Offering (from your bag)")}
            <select value={offering} onChange={(e) => setOffering(e.target.value)} className={select} data-offering>
              <option value="">{t("ไม่ใส่ของเซ่น (ได้พันธุ์พ่อแม่)", "None (a parent's breed)")}</option>
              {offerings.map((id) => <option key={id} value={id}>{ITEMS[id]?.name[th ? "th" : "en"]} · {OFFERING_KINDS[kindOf(id)!][th ? "th" : "en"]}</option>)}
            </select>
          </label>
          <label className="block text-meta text-muted">{t("ของเช้ามืด (ไม่บังคับ +10% ถ้าของเซ่นถูก)", "A dawn forage (optional, +10% if the offering is right)")}
            <select value={dawn} onChange={(e) => setDawn(e.target.value)} className={select} data-dawn>
              <option value="">{t("ไม่ใส่", "None")}</option>
              {dawns.map((id) => <option key={id} value={id}>{ITEMS[id]?.name[th ? "th" : "en"]}</option>)}
            </select>
          </label>
          <p className="flex flex-wrap items-center gap-2 text-meta text-ink" data-nest-summary>
            <span className="flex items-center gap-1">{t("ค่าวางรัง", "Fee")} <Coins n={fee} th={th} small /></span>
            {x?.step && <span>{x.right ? t(`ของเซ่นถูก! โอกาสได้พันธุ์ใหม่ ${x.odds}%`, `Right offering: ${x.odds}% odds`) : offering ? t(`ชนิด${OFFERING_KINDS[x.step.kind].th} แต่ยังไม่รู้ว่าถูกไหม`, `a ${OFFERING_KINDS[x.step.kind].en}: right or not, you'll see`) : ""}</span>}
            <span className="text-muted">{t(`ลูกออกใน ${SPECIES[ba.species].kind === "bird" ? 12 : 24} ชม.`, `Out in ${SPECIES[ba.species].kind === "bird" ? 12 : 24} h`)}</span>
          </p>
          <button type="button" className={main} disabled={busy || purse.coins < fee} data-breed onClick={() => void act({ action: "breed", a: A.id, b: B.id, offering: offering || null, dawn: dawn || null }, ["วางลงรังแล้ว รอลูกน้อยออกมานะ", "In the nest. Wait for the little one."], (r) => {
            if (!r.ok || !r.got?.child) return;
            setResult({ child: r.got.child, sex: r.got.sex, stats: r.got.stats });
            setPa(""); setPb(""); setOffering(""); setDawn("");
          })}>{t("วางลงรัง", "Lay them in the nest")}</button>
        </div>
      )}
      {result && (
        <div className="mt-3 rounded-xl border border-jade/60 bg-jade/10 p-2" data-nest-result data-child-sex={result.sex}>
          <p className="flex items-center gap-1.5 text-ui font-semibold text-ink">{result.sex && <SexMark sex={result.sex} th={th} big />}{t(`ลูก${breedOf(result.child)?.name.th ?? ""} ${result.sex === "m" ? "ตัวผู้" : "ตัวเมีย"} กำลังจะออกมา`, `A ${result.sex === "m" ? "male" : "female"} ${breedOf(result.child)?.name.en ?? ""} is on its way`)}</p>
          {result.stats && <div className="mt-1 grid gap-1">{STAT_IDS.map((k) => <StatRow key={k} k={k} n={statOf({ stats: result.stats! }, k)} th={th} />)}</div>}
        </div>
      )}
      {coming.length > 0 && <>
        <H3>{t("กำลังจะออกมา", "On their way")}</H3>
        <ul className="grid gap-1.5">{coming.map((a) => <li key={a.id} className="flex items-center gap-2 text-meta text-ink" data-coming={a.id}><AnimalPic species={a.species} breed={a.breed} stage="baby" size={30} kit={kit} pose="sleep" /><SexMark sex={a.sex} th={th} /><span className="flex-1">{SPECIES[a.species].baby[th ? "th" : "en"]}{a.home === "pen" ? t(" (คอกลุง)", " (pen)") : ""}</span><span className="text-muted">{clock(a.born)}</span></li>)}</ul>
      </>}
      <H3>{t("ขอยืมสัตว์เพื่อนมาผสม", "Ask a friend's animal for a cross")}</H3>
      <div className="grid gap-2 rounded-xl border border-line bg-bg/40 p-2" data-ask-form>
        <p className="text-label text-muted">{t("เลือกตัวของเรา แล้วขอยืมตัวอีกเพศของเพื่อน ถ้าเพื่อนให้ยืม จะได้ 1 ชั่วโมงไว้ผสมที่รังของเรา ลูกเป็นของเรา", "Pick yours, then ask a friend's of the other sex. If they say yes it's lent an hour for your nest; the child is yours.")}</p>
        <label className="block text-meta text-muted">{t("ตัวของเรา", "Mine")}
          <select value={askMine} onChange={(e) => setAskMine(e.target.value)} className={select} data-ask-mine>
            <option value="">{t("เลือกตัวที่โตแล้ว", "Choose a grown one")}</option>
            {adults.map((a) => <option key={a.id} value={a.id}>{a.sex === "m" ? "♂" : "♀"} {nameOfAnimal(a, th)} · {SPECIES[a.species].name[th ? "th" : "en"]}</option>)}
          </select>
        </label>
        {M && (theirs.length ? <ul className="grid gap-2" data-ask-list>{theirs.map((a) => (
          <AnimalLine key={a.id} a={a} th={th} kit={kit} now={now} note={<>{t(`ของ ${nameOf(a.owner)}`, `${nameOf(a.owner)}'s`)} · {statLine(a, th)}</>}>
            <button type="button" className={button} disabled={busy || asksOut.some((q) => q.theirs === a.id)} onClick={() => void act({ action: "ask", mine: M.id, theirs: a.id }, ["ส่งคำขอแล้ว รอเพื่อนตอบ", "Asked: waiting for your friend."], undefined, { used: ["ขอตัวนี้ไปแล้ว รอเพื่อนตอบ", "Asked already: waiting."], full: [`ขอค้างไว้ได้ ${ANIMALS.asksOpen} รายการ`, `At most ${ANIMALS.asksOpen} asks at once.`] })} data-ask={a.id}>{asksOut.some((q) => q.theirs === a.id) ? t("ขอแล้ว", "Asked") : t("ขอยืม", "Ask")}</button>
          </AnimalLine>
        ))}</ul> : <p className="text-label text-muted">{t("ยังไม่มีเพื่อนคนไหนมีตัวที่เข้าคู่ได้ (อีกเพศ ชนิดเดียวกัน โตแล้ว อยู่ในโรง)", "No friend has one to pair (the other sex, one kind, grown, in a barn).")}</p>)}
      </div>
      {asksOut.length > 0 && <>
        <H3>{t("คำขอที่ส่งไป", "My asks")}</H3>
        <ul className="grid gap-2" data-asks-out>{asksOut.map((q) => { const a = find(q.theirs); return a && (
          <AnimalLine key={q.id} a={a} th={th} kit={kit} now={now} note={t(`รอ ${nameOf(q.to)} ตอบ · เหลือ ${left(q.at + ANIMALS.askHours * HOUR - now, true)}`, `waiting for ${nameOf(q.to)} · ${left(q.at + ANIMALS.askHours * HOUR - now, false)} left`)} />); })}</ul>
      </>}
    </div>
  );
}

/* ── friends' care ── */
function Care({ th, purse, world, now, kit, busy, act, members, nameOf, me }: Common & { members: Array<{ id: string; name: string }> }) {
  const t = (a: string, b: string) => (th ? a : b);
  const herd: Herd = herdOf(world, me) ?? { owner: me, barn: null, room: ANIMALS.barns.stages[0].room, door: [], credit: 0, lastCare: 0, facade: 0, care: "named", carers: [] };
  const [care, setCare] = useState<Herd["care"]>(herd.care);
  const [carers, setCarers] = useState<string[]>(herd.carers);
  const [add, setAdd] = useState("");
  useEffect(() => { setCare(herd.care); setCarers(herd.carers); }, [herd.care, herd.carers.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const careDay = (purse as Purse & { animalCare?: { day: number; n: number } }).animalCare;
  const today = careDay && careDay.day === dayOf(now) ? careDay.n : 0;
  const theirs = world.animals.filter((a) => a.owner !== me && a.home !== "pen" && mayCare(world.herds.find((h) => h.owner === a.owner), me));
  const changed = care !== herd.care || carers.join(",") !== herd.carers.join(",");
  return (
    <div data-animals-care>
      <H3>{t("ใครช่วยดูแลสัตว์ของเราได้", "Who may care for my animals")}</H3>
      <div role="radiogroup" className="flex flex-wrap gap-1.5">
        {([["none", "ไม่มีใคร", "Nobody"], ["named", "เพื่อนที่เลือก", "Friends I name"], ["anybody", "ทุกคน", "Anybody"]] as const).map(([v, a, b]) => (
          <button key={v} type="button" role="radio" aria-checked={care === v} onClick={() => setCare(v)} className={`pressable min-h-11 rounded-full border px-3 text-ui ${care === v ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line-strong text-ink"}`}>{th ? a : b}</button>
        ))}
      </div>
      {care === "named" && (
        <div className="mt-2">
          <ul className="flex flex-wrap gap-1.5">{carers.map((id) => <li key={id}><button type="button" onClick={() => setCarers(carers.filter((x) => x !== id))} className="pressable min-h-11 rounded-full border border-line bg-bg/60 px-3 text-meta text-ink" aria-label={t(`เอา ${nameOf(id)} ออก`, `Remove ${nameOf(id)}`)}>{nameOf(id)} ×</button></li>)}</ul>
          <div className="mt-2 flex gap-2">
            <select value={add} onChange={(e) => setAdd(e.target.value)} aria-label={t("เพิ่มเพื่อน", "Add a friend")} className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-card px-3 text-ink">
              <option value="">{t("เลือกเพื่อนที่จะให้ช่วยดูแล", "Choose a friend")}</option>
              {members.filter((m) => m.id !== me && !carers.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button type="button" className={button} disabled={!add || carers.length >= 20} onClick={() => { setCarers([...carers, add]); setAdd(""); }}>{t("เพิ่ม", "Add")}</button>
          </div>
        </div>
      )}
      <button type="button" className={`${main} mt-2 w-full`} disabled={busy || !changed} onClick={() => void act({ action: "care", care, carers }, ["บันทึกแล้ว", "Saved."])} data-care-save>{t("บันทึก", "Save")}</button>
      <H3>{t("สัตว์ของเพื่อนที่เราช่วยดูแลได้", "Friends' animals I may care for")}</H3>
      <p className="mb-2 text-meta text-muted" data-care-today={today}>{t(`แต้มผู้ช่วยจากการดูแลสัตว์วันนี้ ${today}/${ANIMALS.care.cap} · เดินเข้าไปในโรงของเพื่อนได้ · เก็บผลผลิต ผสม ขาย หรือย้ายไม่ได้`, `Helpers' points from animal care today: ${today}/${ANIMALS.care.cap} · walk into a friend's barn · no collecting, breeding, selling or moving`)}</p>
      {theirs.length ? <ul className="grid gap-2">{theirs.map((a) => <FriendCard key={a.id} a={a} th={th} purse={purse} world={world} now={now} kit={kit} busy={busy} act={act} nameOf={nameOf} me={me} />)}</ul>
        : <p className="text-meta text-muted">{t("ยังไม่มีเพื่อนคนไหนให้เราช่วยดูแล", "Nobody has let you care for their animals yet.")}</p>}
    </div>
  );
}
function FriendCard({ a, th, purse, world, now, kit, busy, act, nameOf, me }: { a: Animal; th: boolean; purse: Purse; world: AnimalWorld; now: number; kit: SceneryKit | null; busy: boolean; act: Act; nameOf: (id: string) => string; me: string }) {
  const t = (x: string, y: string) => (th ? x : y);
  const v = viewOf(a, now, ctxOf(world, a.owner, purse, me)), sp = SPECIES[a.species], stage = v.stage;
  const [pick, setPick] = useState<"feed" | "treat" | null>(null);
  const feeds = purse.bag.filter((x) => x && feedHours(a.species, x.item) > 0);
  const treats = purse.bag.filter((x) => x && sp.treats.includes(x.item));
  const barn = world.herds.find((h) => h.owner === a.owner)?.barn;
  if (stage === "coming") return null;
  return (
    <li className="rounded-xl border border-line bg-bg/50 p-2" data-friend-card={a.id}>
      <div className="flex items-center gap-2">
        <AnimalPic species={a.species} breed={a.breed} stage={stage as "baby"} size={40} kit={kit} sex={a.sex} />
        <span className="min-w-0 flex-1"><span className="flex items-center gap-1 truncate text-ui font-semibold text-ink"><SexMark sex={a.sex} th={th} />{nameOfAnimal(a, th)}</span><span className="block truncate text-meta text-muted">{t(`ของ ${nameOf(a.owner)}`, `${nameOf(a.owner)}'s`)}{barn !== null && barn !== undefined ? ` · ${barnName(barn, th)}` : ""}</span></span>
        {v.hungry && <span className="rounded-full bg-[#ff7a93]/20 px-2 py-0.5 text-meta font-semibold text-[#ff9fb0]">{t("หิว", "Hungry")}</span>}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" className={button} disabled={busy} onClick={() => setPick(pick === "feed" ? null : "feed")}>{t("ให้อาหาร", "Feed")}</button>
        <button type="button" className={button} disabled={busy || !!v.animal.today.pet} onClick={() => void act({ action: "pet", id: a.id }, ["ลูบหัวให้เพื่อนแล้ว", "Petted for your friend."])}>{t("ลูบหัว", "Pet")}</button>
        <button type="button" className={button} disabled={busy || !!v.animal.today.treat} onClick={() => setPick(pick === "treat" ? null : "treat")}>{t("ให้ขนม", "Treat")}</button>
      </div>
      {pick && <ul className="mt-2 grid gap-1">{(pick === "feed" ? feeds : treats).map((x, i) => (
        <li key={i}><button type="button" className={`${button} flex w-full items-center gap-2 text-left`} disabled={busy} onClick={() => { setPick(null); void act(pick === "feed" ? { action: "feed", id: a.id, item: x!.item, grade: (x!.grade ?? 0) as 0 | 1 | 2 | 3 } : { action: "treat", id: a.id, item: x!.item }, ["ช่วยเพื่อนแล้ว", "Done for your friend."]); }}><ItemIcon id={x!.item} size={22} /><span className="min-w-0 flex-1 truncate">{ITEMS[x!.item]?.name[th ? "th" : "en"]} ×{x!.n}</span></button></li>
      ))}{!(pick === "feed" ? feeds : treats).length && <li className="text-meta text-muted">{t("ไม่มีของที่ใช้ได้ในกระเป๋า", "Nothing suitable in your bag.")}</li>}</ul>}
    </li>
  );
}

/* ── the breed book ── */
function Book({ th, purse, world, kit, nameOf, me, busy, act }: Common) {
  const t = (a: string, b: string) => (th ? a : b);
  // (a breed's scroll is known once it is read, as the database has it: holding one is not reading it)
  const book = bookOf(purse), recipes = purse.recipes as string[];
  const [sp, setSp] = useState<SpeciesId>("chicken");
  const found = Object.keys(world.found).length;
  return (
    <div data-animals-book>
      <p className="text-meta text-muted">{t(`หมู่บ้านพบแล้ว ${found + SPECIES_IDS.length}/${BREEDS.length} พันธุ์ · ทุกชนิดใช้สูตรเดียวกัน แต่ของเซ่นต่างกัน`, `The village has found ${found + SPECIES_IDS.length}/${BREEDS.length} breeds · one ladder for every kind, its own offerings`)}</p>
      <div role="tablist" className="mt-2 flex flex-wrap gap-1.5">
        {SPECIES_IDS.map((s) => <button key={s} type="button" role="tab" aria-selected={sp === s} onClick={() => setSp(s)} className={`pressable min-h-11 rounded-full border px-3 text-ui ${sp === s ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line-strong text-ink"}`}>{SPECIES[s].name[th ? "th" : "en"]}</button>)}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {LETTERS.map((L) => {
          const b = breedAt(sp, L), f = world.found[b.id], seen = L === "A" || !!f, g = GRAPH.find((x) => x.child === L);
          const known = g ? knowsOffering(book, recipes, sp, L) : false, misses = book.misses[stepKey(sp, L)] ?? 0;
          return (
            <li key={L} className="rounded-xl border border-line bg-bg/50 p-2" data-book={b.id} data-found={seen}>
              <div className="flex items-center gap-2">
                <AnimalPic species={sp} breed={b.id} stage="adult" size={40} kit={kit} dark={!seen} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-semibold text-ink">{seen ? b.name[th ? "th" : "en"] : "???"}</span>
                  <span className="block text-label text-muted">{L} · {b.tier === "starter" ? t("พันธุ์เริ่มต้น", "starter") : b.tier === "real" ? t("พันธุ์แท้", "real") : b.tier === "fantasy" ? t("พันธุ์แฟนตาซี", "fantasy") : t("ตำนาน", "legend")}</span>
                </span>
              </div>
              {f && <p className="mt-1 truncate text-label text-gold">{t(`พบครั้งแรกโดย ${nameOf(f.by)}`, `First bred by ${nameOf(f.by)}`)}</p>}
              {g && <p className="mt-1 text-label text-muted">{g.parents.join(" + ")} + {known ? <b className="text-gold">{ITEMS[OFFERINGS[sp][L] as ItemId]?.name[th ? "th" : "en"]}</b> : OFFERING_KINDS[g.kind][th ? "th" : "en"]}{misses > 0 && !known ? t(` · พลาด ${misses}/${ANIMALS.clueAfter}`, ` · missed ${misses}/${ANIMALS.clueAfter}`) : ""}{misses >= ANIMALS.clueAfter && t(" (ใบ้แล้ว)", " (clue)")}</p>}
              {held(purse.bag, scrollOf(sp, L) as ItemId) > 0 && !known && (
                <button type="button" className="pressable mt-1 min-h-11 w-full rounded-lg border border-jade/50 px-2 text-ui text-jade" disabled={busy} data-book-read={b.id}
                  onClick={() => void act({ action: "read", item: scrollOf(sp, L) }, ["อ่านม้วนสูตรแล้ว รู้ของเซ่นของขั้นนี้", "Read: you know this step's offering now."])}>{t("อ่านม้วนสูตร", "Read the scroll")}</button>
              )}
              {f && f.by === me && L !== "A" && (
                <button type="button" className="pressable mt-1 min-h-11 w-full rounded-lg border border-line-strong px-2 text-ui text-ink" disabled={busy || purse.coins < ANIMALS.scrollFee} data-book-write={b.id}
                  onClick={() => void act({ action: "scroll", breed: b.id }, ["เขียนม้วนสูตรแล้ว อยู่ในกระเป๋า แลกหรือขายได้", "Written out: the scroll is in your bag, to give or sell."])}>{t(`เขียนม้วนสูตร (${ANIMALS.scrollFee} เหรียญ)`, `Write it out (${ANIMALS.scrollFee} coins)`)}</button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-label text-muted">{t(`${SPECIES[sp].name.th}โตเต็มวัยเมื่อกินอิ่มครบ ${adultAt(sp)} ชม.`, `A ${SPECIES[sp].name.en.toLowerCase()} is grown after ${adultAt(sp)} fed hours`)}</p>
    </div>
  );
}
