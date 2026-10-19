"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Keeper } from "@/lib/town/keeper";
import {
  ANIMALS, BREEDS, DAWN_BOOSTS, GRAPH, LETTERS, OFFERINGS, OFFERING_KINDS, SPECIES, SPECIES_IDS, adultAt, breedAt, breedOf, crossOf, feeOf,
  dayOf, kindOf, knowsOffering, mayCare, placesOf, scrollOf, sellBackOf, stageOf, stepKey, stepsOf, usedOf as placesUsed,
  type Animal, type Herd, type Place, type SpeciesId,
} from "@/lib/town/animals";
import { ANIMAL_GIFTS, POPOTO_SHOP, TOOL_OF, bookOf, feedHours, growFor, viewOf, type AnimalInput, type AnimalReply, type AnimalWhy, type AnimalWorld } from "@/lib/town/animal-act";
import { ANIMAL_SCROLL_ITEMS } from "@/lib/town/animal-items";
import { hasThing, usesLeft, type ThingId } from "@/lib/town/gifts";
import { ITEMS, type ItemId } from "@/lib/town/items";
import { held, type Purse } from "@/lib/town/trade";
import type { SceneryKit } from "@/lib/town/scenery";
import { Coins, ItemIcon, Pic } from "./TownTrade";
import { QualityRange } from "./TownQuality";
import { drawAnimal, lengthOf } from "./pasture-draw";
import type { Sprite } from "@/lib/town/scenery";

/*
 * Uncle Popoto's panel (docs/plans/animals/README.md): his stall (babies of the four kinds, feed, the games' and the
 * making table's tools, the pasture's dishes' scrolls, keeping places and barn fronts, an animal sold back), my
 * animals' cards, the friends' care, the breeding nest and the breed book. The Midnight theme and the trade panel's
 * own look: the same head, tabs, chips and buttons. Every refusal says why in a short line.
 */

export type AnimalsView = "shop" | "mine" | "care" | "nest" | "book";
const VIEWS: Array<[AnimalsView, string, string]> = [["shop", "ร้านลุง", "Stall"], ["mine", "สัตว์ฉัน", "Mine"], ["care", "ช่วยดูแล", "Care"], ["nest", "รังผสม", "Nest"], ["book", "สมุดพันธุ์", "Book"]];

/** Why a step was refused, in a line each. */
export const WHY: Record<AnimalWhy, [string, string]> = {
  none: ["ทำไม่ได้ ลองใหม่อีกครั้งนะ", "That can't be done. Try again."],
  theirs: ["ตัวนี้ไม่ใช่ของเรา หรือเจ้าของยังไม่ให้ช่วยดูแล", "Not yours, or its owner hasn't let you care for it."],
  coins: ["เหรียญไม่พอ", "Not enough coins."],
  room: ["กระเป๋าเต็ม เคลียร์ช่องก่อนนะ", "Your bag is full."],
  places: ["ที่เลี้ยงเต็มแล้ว ซื้อที่เก็บเพิ่มได้ที่ลุง", "No place free. Buy more keeping places at the stall."],
  stage: ["ยังไม่ถึงวัยที่ทำแบบนี้ได้", "Not at the age for that yet."],
  hungry: ["หิวอยู่ ให้อาหารก่อนนะ", "It's hungry. Feed it first."],
  nothing: ["ไม่มีของที่ต้องใช้", "You don't have what that needs."],
  spent: ["ใช้ของรางวัลนี้ไปแล้ววันนี้", "Already used today."],
  stamina: ["แรงไม่พอ", "Not enough stamina."],
  rest: ["ยังพักอยู่หลังผสมพันธุ์", "Still resting after breeding."],
  hearts: ["ต้องสนิทกันอย่างน้อย 3 หัวใจทั้งคู่", "Both need at least 3 hearts."],
  species: ["ตัวนี้ไม่กินของนี้", "That isn't for this kind."],
  offering: ["ไม่มีของเซ่นนี้ในกระเป๋า", "That offering isn't in your bag."],
  gift: ["ยังไม่มีของรางวัลนี้", "You don't have that gift yet."],
  used: ["ทำไปแล้ววันนี้ พรุ่งนี้มาใหม่นะ", "Done already today."],
  lent: ["ยังไม่ได้ยืมตัวนี้ หรือหมดเวลายืมแล้ว", "Not lent to you, or the loan has ended."],
  far: ["อยู่ไกลเกินไป เดินเข้าไปใกล้ๆ ก่อน", "Too far. Walk closer."],
  name: ["ชื่อนี้ใช้ไม่ได้", "That name can't be used."],
  soon: ["เร็วไปนิด เล่นให้จบก่อนนะ", "Too quick: play it through."],
  full: ["เต็มแล้ว", "It's full."],
  away: ["ติดต่อเมืองไม่ได้ กดลองใหม่อีกครั้ง", "Couldn't reach the town. Try again."],
};
export const why = (w: AnimalWhy | undefined, th: boolean) => (WHY[w ?? "none"] ?? WHY.none)[th ? 0 : 1];
const STAGE: Record<string, [string, string]> = { coming: ["ยังไม่เกิด", "Coming"], baby: ["ลูกสัตว์", "Baby"], young: ["วัยรุ่น", "Young"], adult: ["โตเต็มวัย", "Grown"] };
const PLACE: Record<Place, [string, string]> = { producing: ["ที่ผลิต", "Producing"], nursery: ["อนุบาล", "Nursery"], keeping: ["ที่เก็บ", "Keeping"] };
const GAME_WORD: Record<string, [string, string]> = { eggs: ["เก็บไข่", "Collect eggs"], milk: ["รีดนม", "Milk"], shear: ["ตัดขน", "Shear"] };
const hrs = (h: number, th: boolean) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} ${th ? "นาที" : "min"}` : h < 48 ? `${Math.round(h)} ${th ? "ชม." : "h"}` : `${+(h / 24).toFixed(1)} ${th ? "วัน" : "d"}`);
const clock = (t: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t));
const nameOfAnimal = (a: Animal, th: boolean) => a.name || breedOf(a.breed)?.name[th ? "th" : "en"] || a.breed;

/** A little picture of an animal: its own (the pasture's sheet), or its stand-in drawn the same as on the map. */
export function AnimalPic({ species, breed, stage, size = 48, kit, dark = false, pose = "idle" }: { species: SpeciesId; breed: string; stage: "baby" | "young" | "adult"; size?: number; kit: SceneryKit | null; dark?: boolean; pose?: "idle" | "sleep" }) {
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
    const len = lengthOf(species, stage);
    const s = Math.min(2.6, (size * 0.8) / Math.max(18, len * 1.15));
    drawAnimal(ctx, kit, { species, breed, stage, pose, right: true }, { x: size / 2 - 2, y: size * 0.86 }, s, dpr, 0, true);
    if (dark) { ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = "rgba(20,24,32,0.92)"; ctx.fillRect(0, 0, size, size); ctx.globalCompositeOperation = "source-over"; }
  }, [species, breed, stage, size, kit, dark, pose]);
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
function Bar({ value, tone = "jade", label }: { value: number; tone?: "jade" | "gold" | "accent" | "rose"; label: string }) {
  const color = tone === "gold" ? "bg-gold" : tone === "accent" ? "bg-accent" : tone === "rose" ? "bg-[#ff7a93]" : "bg-jade";
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full border border-line-strong bg-bg/70" role="img" aria-label={label}>
      <span className={`block h-full ${color}`} style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </span>
  );
}
const button = "pressable min-h-11 rounded-lg border border-line-strong px-3 py-2 text-ui text-ink hover:border-accent disabled:opacity-45 disabled:hover:border-line-strong";
const main = "pressable min-h-11 rounded-lg bg-accent px-3 py-2 text-ui font-semibold text-bg disabled:opacity-45";
const chip = "rounded-full border border-line bg-bg/60 px-2 py-0.5 text-meta text-ink";
const H3 = ({ children }: { children: ReactNode }) => <h3 className="mb-2 mt-4 font-data text-label uppercase tracking-wider text-muted first:mt-1">{children}</h3>;

export interface AnimalsProps {
  keeper: Keeper;
  th: boolean;
  view: AnimalsView;
  onView: (v: AnimalsView) => void;
  onClose: () => void;
  /** The animal to open on (a tap on it on the map). */
  focus: string | null;
  /** Somebody's name, for a herd's owner, a carer, the first breeder. */
  nameOf: (id: string) => string;
  /** Members one may name as carers or lend to: whoever is in town, and the site's members. */
  members: Array<{ id: string; name: string }>;
  /** Begin a game to collect from an animal of mine. */
  onCollect: (a: Animal) => void;
  kit: SceneryKit | null;
  /** Uncle Popoto's face over the panel. */
  face: Sprite | null;
}

export default function TownAnimals({ keeper, th, view, onView, onClose, focus, nameOf, members, onCollect, kit, face }: AnimalsProps) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const [said, setSaid] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ input: AnimalInput; request: string } | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const world: AnimalWorld = keeper.animalWorld() ?? { animals: [], herds: [], gate: [], found: {}, spells: [], wagons: [] };
  const purse = keeper.purse(), now = keeper.now(), me = keeper.id;
  const t = (a: string, b: string) => (th ? a : b);

  /** Do a step; a step the town did not answer can be tried again as itself (it answers its first answer). */
  const act = useCallback(async (input: AnimalInput | null, ok?: [string, string], after?: (r: { ok: boolean; got?: AnimalReply["got"] }) => void) => {
    if (busy) return;
    if (input) pending.current = { input, request: crypto.randomUUID() };
    const p = pending.current;
    if (!p) return;
    setBusy(true);
    try {
      const r = await keeper.animals(p.input, p.request);
      if (!alive.current) return;
      if (r.ok || r.why !== "away") pending.current = null;
      setSaid(r.ok ? (ok ? ok[th ? 0 : 1] : t("เรียบร้อย", "Done.")) : why(r.why, th));
      after?.(r);
    } finally { if (alive.current) setBusy(false); }
  }, [busy, keeper, th]); // eslint-disable-line react-hooks/exhaustive-deps

  const mine = world.animals.filter((a) => a.owner === me);
  const herd: Herd = world.herds.find((h) => h.owner === me) ?? { owner: me, keeping: 0, facade: 0, care: "named", carers: [] };

  return (
    <section aria-labelledby="town-animals-h" className="flex h-full flex-col" data-animals-panel data-view={view}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Pic sprite={face} box={30} />
        <h2 id="town-animals-h" className="min-w-0 truncate font-display text-title font-semibold text-ink">{t("ลุง Popoto · ฟาร์มสัตว์", "Uncle Popoto · the pasture")}</h2>
        <Coins n={purse.coins} th={th} className="ml-auto" />
        <button type="button" onClick={onClose} data-animals-close className="pressable min-h-11 rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">{t("ปิด", "Close")}</button>
      </div>
      <div role="tablist" aria-label={t("ฟาร์มสัตว์", "The pasture")} className="flex gap-0.5 border-b border-line px-2 pt-1">
        {VIEWS.map(([v, a, b]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => onView(v)} data-animals-tab={v}
                  className={`pressable -mb-px min-h-11 min-w-0 flex-1 truncate rounded-t-lg border-b-2 px-1 text-ui font-semibold ${view === v ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"}`}>
            {th ? a : b}
            {v === "mine" && mine.some((a) => viewOf(a, now, { gate: world.gate }).ready > 0) && <span aria-hidden className="ml-1 inline-block size-2 rounded-full bg-gold align-middle" />}
          </button>
        ))}
      </div>
      <p className="min-h-[1.75em] px-4 pt-1.5 text-meta text-accent" aria-live="polite" data-animals-said>{said}</p>
      {pending.current && !busy && (
        <div className="px-4 pb-1"><button type="button" className={button} onClick={() => void act(null)} data-animals-retry>{t("ลองรายการเดิมอีกครั้ง", "Retry the same step")}</button></div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {view === "shop" && <Shop th={th} purse={purse} herd={herd} mine={mine} now={now} kit={kit} busy={busy} act={act} />}
        {view === "mine" && <Mine th={th} purse={purse} world={world} mine={mine} now={now} kit={kit} busy={busy} act={act} focus={focus} members={members} nameOf={nameOf} onCollect={onCollect} me={me} />}
        {view === "care" && <Care th={th} purse={purse} world={world} herd={herd} now={now} kit={kit} busy={busy} act={act} members={members} nameOf={nameOf} me={me} />}
        {view === "nest" && <Nest th={th} purse={purse} world={world} mine={mine} now={now} kit={kit} busy={busy} act={act} me={me} nameOf={nameOf} />}
        {view === "book" && <Book th={th} purse={purse} world={world} kit={kit} nameOf={nameOf} />}
      </div>
    </section>
  );
}

type Act = (input: AnimalInput | null, ok?: [string, string], after?: (r: { ok: boolean; got?: AnimalReply["got"] }) => void) => Promise<void>;

/* ── the stall ── */
function Shop({ th, purse, herd, mine, now, kit, busy, act }: { th: boolean; purse: Purse; herd: Herd; mine: Animal[]; now: number; kit: SceneryKit | null; busy: boolean; act: Act }) {
  const t = (a: string, b: string) => (th ? a : b);
  const all = placesOf(herd), used = placesUsed(mine, herd.owner);
  const free = used.producing < all.producing || used.nursery < all.nursery || used.keeping < all.keeping;
  const [sure, setSure] = useState<string | null>(null);
  let total = 0, step = 0;
  while (step < ANIMALS.keeping.length && total < herd.keeping) total += ANIMALS.keeping[step++][0];
  const nextKeeping = total === herd.keeping ? ANIMALS.keeping[step] : undefined, nextFront = ANIMALS.facades[herd.facade];
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
      <p className="flex flex-wrap gap-1.5 text-meta" data-places>
        <span className={chip}>{t("ที่ผลิต", "Producing")} {used.producing}/{all.producing}</span>
        <span className={chip}>{t("อนุบาล", "Nursery")} {used.nursery}/{all.nursery}</span>
        <span className={chip}>{t("ที่เก็บ", "Keeping")} {used.keeping}/{all.keeping}</span>
      </p>
      <H3>{t("ลูกสัตว์ (ซื้อมาเป็นตัวเล็ก ค่อยๆ โตเมื่อกินอิ่ม)", "Young ones (they grow while fed)")}</H3>
      <ul className="grid gap-2">
        {SPECIES_IDS.map((sp) => {
          const s = SPECIES[sp], days = (s.grow[0] + s.grow[1]) / 24;
          const gives = sp === "chicken" ? t(`ไข่ทุก ${s.cycle} ชม.`, `an egg every ${s.cycle} h`) : sp === "duck" ? t(`ไข่เป็ดทุก ${s.cycle} ชม.`, `a duck egg every ${s.cycle} h`) : sp === "sheep" ? t("ขนเต็มทุก 24 ชม.", "a fleece every 24 h") : t(`นมเต็มทุก ${s.cycle} ชม.`, `milk every ${s.cycle} h`);
          return (
            <li key={sp} className="flex items-center gap-3 rounded-xl border border-line bg-bg/50 p-2" data-buy={sp}>
              <AnimalPic species={sp} breed={breedAt(sp, "A").id} stage="baby" size={52} kit={kit} />
              <span className="min-w-0 flex-1">
                <span className="block text-ui font-semibold text-ink">{s.baby[th ? "th" : "en"]}</span>
                <span className="block text-meta text-muted">{t(`โตใน ${days} วัน · ${gives}`, `grown in ${days} d · ${gives}`)}</span>
                <Coins n={s.price} th={th} small />
              </span>
              <button type="button" className={main} disabled={busy || purse.coins < s.price || !free} onClick={() => void act({ action: "buy", species: sp }, ["ได้ลูกสัตว์แล้ว! อยู่ในที่เลี้ยงของหลาน อย่าลืมให้อาหารนะ", "Here's your little one! Don't forget to feed it."])}>{t("รับเลี้ยง", "Take")}</button>
            </li>
          );
        })}
      </ul>
      <H3>{t("อาหารและของเร่งโต", "Feed and growth feed")}</H3>
      <ul>{SPECIES_IDS.flatMap((sp) => [row(SPECIES[sp].sack, SPECIES[sp].sackPrice, t("อิ่ม 24 ชม.", "24 h of food")), row(SPECIES[sp].growItem, SPECIES[sp].growPrice, t("โตไวขึ้น 24 ชม.", "faster growth for 24 h"))])}</ul>
      <H3>{t("เครื่องมือ", "Tools")}</H3>
      <ul>{["milker", "woolShears", "eggBasket", "churn", "cheesePress", "spindle", "knittingNeedles"].map((id) => row(id, POPOTO_SHOP[id], id === "milker" ? t("ใช้รีดนมวัว", "for milking") : id === "woolShears" ? t("ใช้ตัดขนแกะ", "for shearing") : id === "eggBasket" ? t("ใช้เก็บไข่", "for eggs") : t("ใช้ที่โต๊ะแปรรูป", "for the making table")))}</ul>
      <details className="mt-3 rounded-xl border border-line bg-bg/40 px-3 py-1" data-shop-scrolls>
        <summary className="pressable flex min-h-11 cursor-pointer items-center text-ui font-semibold text-ink">{t(`ม้วนสูตรอาหารจากฟาร์ม (${Object.keys(ANIMAL_SCROLL_ITEMS).length})`, `Pasture recipe scrolls (${Object.keys(ANIMAL_SCROLL_ITEMS).length})`)}</summary>
        <ul>{Object.keys(ANIMAL_SCROLL_ITEMS).map((id) => row(id, POPOTO_SHOP[id]))}</ul>
      </details>
      <H3>{t("ที่เลี้ยงและโรงนา", "Places and the barn")}</H3>
      <div className="grid gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-bg/50 p-2" data-keeping={herd.keeping}>
          <span className="min-w-0 flex-1 text-ui text-ink">{nextKeeping ? t(`ที่เก็บเพิ่ม ${nextKeeping[0]} ที่ (เลี้ยงไว้เฉยๆ ไม่ผลิต)`, `${nextKeeping[0]} more keeping places (they keep, never produce)`) : t("ที่เก็บครบแล้ว", "Every keeping place bought")}{nextKeeping && <Coins n={nextKeeping[1]} th={th} small />}</span>
          <button type="button" className={button} disabled={busy || !nextKeeping || purse.coins < (nextKeeping?.[1] ?? Infinity)} onClick={() => void act({ action: "keeping" }, ["ลุงกั้นคอกให้เพิ่มแล้ว", "More places, built."])}>{t("ซื้อ", "Buy")}</button>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-bg/50 p-2" data-facade={herd.facade}>
          <span className="min-w-0 flex-1 text-ui text-ink">{nextFront !== undefined ? t(`หน้าโรงนาแบบที่ ${herd.facade + 1} (ความสวยงาม)`, `Barn front no. ${herd.facade + 1} (looks only)`) : t("หน้าโรงนาครบทุกแบบแล้ว", "Every barn front bought")}{nextFront !== undefined && <Coins n={nextFront} th={th} small />}</span>
          <button type="button" className={button} disabled={busy || nextFront === undefined || purse.coins < (nextFront ?? Infinity)} onClick={() => void act({ action: "facade" }, ["ทาสีใหม่เรียบร้อย สวยเชียว", "Freshly done. Looks grand."])}>{t("ซื้อ", "Buy")}</button>
        </div>
      </div>
      <H3>{t("ขายสัตว์คืนให้ลุง", "Sell an animal back")}</H3>
      {mine.length ? (
        <ul className="grid gap-1.5">{mine.map((a) => {
          const coming = stageOf(a, now) === "coming";
          return (
            <li key={a.id} className="flex items-center gap-2 border-b border-line py-1.5" data-sell={a.id}>
              <AnimalPic species={a.species} breed={a.breed} stage={(stageOf(a, now) === "coming" ? "baby" : stageOf(a, now)) as "baby"} size={34} kit={kit} />
              <span className="min-w-0 flex-1 truncate text-ui text-ink">{nameOfAnimal(a, th)}</span>
              <Coins n={sellBackOf(a)} th={th} small />
              <button type="button" className={button} disabled={busy || coming} onClick={() => { if (sure !== a.id) { setSure(a.id); return; } setSure(null); void act({ action: "sell", id: a.id }, ["ลุงรับไว้ดูแลต่อนะ", "I'll look after it from here."]); }}>{sure === a.id ? t("ยืนยันขาย", "Sure?") : t("ขาย", "Sell")}</button>
            </li>
          );
        })}</ul>
      ) : <p className="text-meta text-muted">{t("ยังไม่มีสัตว์ให้ขาย", "No animals to sell yet.")}</p>}
    </div>
  );
}

/* ── my animals ── */
function Mine({ th, purse, world, mine, now, kit, busy, act, focus, members, nameOf, onCollect, me }: { th: boolean; purse: Purse; world: AnimalWorld; mine: Animal[]; now: number; kit: SceneryKit | null; busy: boolean; act: Act; focus: string | null; members: Array<{ id: string; name: string }>; nameOf: (id: string) => string; onCollect: (a: Animal) => void; me: string }) {
  const [open, setOpen] = useState<string | null>(focus);
  useEffect(() => { if (focus) setOpen(focus); }, [focus]);
  const lentToMe = world.animals.filter((a) => a.owner !== me && a.lent?.to === me && a.lent.until > now);
  if (!mine.length && !lentToMe.length) return <p className="mt-2 text-ui text-muted" data-animals-none>{th ? "ยังไม่มีสัตว์เลย ไปที่แท็บ \"ร้านลุง\" รับลูกเจี๊ยบสักตัวสิหลาน" : "No animals yet. Take a chick home from the stall."}</p>;
  return (
    <ul className="grid gap-2" data-animals-mine>
      {mine.map((a) => <Card key={a.id} a={a} th={th} purse={purse} world={world} now={now} kit={kit} busy={busy} act={act} open={open === a.id} onOpen={() => setOpen(open === a.id ? null : a.id)} members={members} nameOf={nameOf} onCollect={onCollect} mine />)}
      {lentToMe.length > 0 && <li className="mt-2 font-data text-label uppercase tracking-wider text-muted">{th ? "ยืมจากเพื่อน (ใช้ผสมพันธุ์ได้)" : "Lent to me (for breeding)"}</li>}
      {lentToMe.map((a) => <Card key={a.id} a={a} th={th} purse={purse} world={world} now={now} kit={kit} busy={busy} act={act} open={false} onOpen={() => {}} members={members} nameOf={nameOf} onCollect={onCollect} mine={false} />)}
    </ul>
  );
}

function Card({ a, th, purse, world, now, kit, busy, act, open, onOpen, members, nameOf, onCollect, mine }: { a: Animal; th: boolean; purse: Purse; world: AnimalWorld; now: number; kit: SceneryKit | null; busy: boolean; act: Act; open: boolean; onOpen: () => void; members: Array<{ id: string; name: string }>; nameOf: (id: string) => string; onCollect: (a: Animal) => void; mine: boolean }) {
  const t = (x: string, y: string) => (th ? x : y);
  const v = viewOf(a, now, { gate: world.gate, bottle: mine && hasThing(purse, ANIMAL_GIFTS.bottle as ThingId) }), s = v.animal, sp = SPECIES[a.species], breed = breedOf(a.breed);
  const [picker, setPicker] = useState<"feed" | "treat" | "move" | "lend" | "name" | null>(null);
  const [name, setName] = useState(a.name);
  const [lendTo, setLendTo] = useState("");
  const stage = v.stage, artStage = (stage === "coming" ? "baby" : stage) as "baby" | "young" | "adult";
  const speed = Math.min(ANIMALS.speedCap, 1 + (now < s.speedUntil ? 1 : 0) + (mine && hasThing(purse, ANIMAL_GIFTS.bottle as ThingId) ? 1 : 0));
  const feeds = purse.bag.map((x, slot) => ({ x, slot })).filter(({ x }) => x && (feedHours(a.species, x.item) > 0 || (growFor(a.species, x.item) > 0 && stage !== "adult")));
  const treats = purse.bag.map((x, slot) => ({ x, slot })).filter(({ x }) => x && sp.treats.includes(x.item));
  const tool = TOOL_OF[sp.game];
  const cradle = mine && hasThing(purse, ANIMAL_GIFTS.cradle as ThingId) && stage === "adult";
  return (
    <li className={`rounded-xl border bg-bg/50 ${open ? "border-accent/70" : "border-line"}`} data-animal-card={a.id} data-stage={stage} data-ready={v.ready}>
      <button type="button" onClick={onOpen} aria-expanded={open} className="pressable flex min-h-11 w-full items-center gap-2 p-2 text-left">
        <AnimalPic species={a.species} breed={a.breed} stage={artStage} size={44} kit={kit} pose={stage === "coming" ? "sleep" : "idle"} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5"><span className="truncate text-ui font-semibold text-ink">{nameOfAnimal(a, th)}</span><span className={chip}>{STAGE[stage][th ? 0 : 1]}</span></span>
          <span className="mt-0.5 flex items-center gap-2"><Hearts n={v.hearts} th={th} />{!mine && <span className="truncate text-meta text-muted">{nameOf(a.owner)}</span>}</span>
          <span className="mt-1 block w-full max-w-[12rem]"><Bar value={v.food / ANIMALS.trough} tone={v.hungry ? "rose" : "jade"} label={t(`อาหารในราง ${Math.round(v.food)} ชม.`, `${Math.round(v.food)} h of food in the trough`)} /></span>
        </span>
        {v.hungry && <span className="rounded-full bg-[#ff7a93]/20 px-2 py-0.5 text-meta font-semibold text-[#ff9fb0]" data-hungry>{t("หิว", "Hungry")}</span>}
        {v.ready > 0 && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-meta font-semibold text-gold" data-ready-badge>{t(`พร้อมเก็บ ${v.ready}`, `${v.ready} ready`)}</span>}
      </button>
      {open && (
        <div className="border-t border-line px-3 pb-3 pt-2" data-animal-open>
          <p className="text-meta text-muted">{breed?.name[th ? "th" : "en"]} · {breed?.looks[th ? "th" : "en"]}</p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            <span className={chip}>{PLACE[a.place][th ? 0 : 1]}</span>
            {a.rest > now && <span className={chip}>{t(`พักถึง ${clock(a.rest)}`, `resting till ${clock(a.rest)}`)}</span>}
            {a.lent && a.lent.until > now && <span className={chip}>{t(`ให้ ${nameOf(a.lent.to)} ยืมถึง ${clock(a.lent.until)}`, `lent to ${nameOf(a.lent.to)} till ${clock(a.lent.until)}`)}</span>}
            {speed > 1 && stage !== "adult" && <span className={`${chip} text-jade`}>{t(`โตไว ×${speed}`, `growing ×${speed}`)}</span>}
            {a.outside.length > 0 && <span className={chip}>{t(`ไข่ในทุ่ง ${a.outside.reduce((n, o) => n + o.n, 0)} ฟอง`, `${a.outside.reduce((n, o) => n + o.n, 0)} eggs out on the meadow`)}</span>}
          </p>
          {stage === "coming" && <p className="mt-2 text-ui text-ink">{t(`จะออกมา ${clock(a.born)}`, `Comes out at ${clock(a.born)}`)}</p>}
          {(stage === "baby" || stage === "young") && (
            <div className="mt-2" data-growth={Math.round(v.grown * 100)}>
              <p className="mb-1 flex justify-between text-meta"><span className="text-ink">{t(stage === "baby" ? "โตเป็นวัยรุ่น" : "โตเต็มวัย", stage === "baby" ? "To young" : "To grown")}</span><span className="text-muted">{t(`อีกราว ${hrs(v.adultIn / speed, true)} (เมื่อกินอิ่ม)`, `about ${hrs(v.adultIn / speed, false)} more while fed`)}</span></p>
              <Bar value={v.grown} label={t(`โตแล้ว ${Math.round(v.grown * 100)}%`, `${Math.round(v.grown * 100)}% grown`)} />
            </div>
          )}
          {stage === "adult" && a.place === "producing" && (
            <div className="mt-2" data-round={v.ready}>
              <p className="mb-1 flex justify-between text-meta"><span className="text-ink">{t(`ผลผลิตรอบต่อไป · พร้อมเก็บ ${v.ready}/${sp.bank}`, `Next round · ${v.ready}/${sp.bank} ready`)}</span><span className="text-muted">{v.ready >= sp.bank ? t("เต็มแล้ว หยุดรอเก็บ", "full: waiting") : t(`อีก ${hrs((1 - v.round) * sp.cycle, true)} ที่อิ่ม`, `${hrs((1 - v.round) * sp.cycle, false)} fed`)}</span></p>
              <Bar value={v.ready >= sp.bank ? 1 : v.round} tone="gold" label={t("รอบผลผลิต", "The round")} />
            </div>
          )}
          {stage === "adult" && a.place !== "producing" && <p className="mt-2 text-meta text-muted">{t("อยู่ที่นี่ไม่ผลิต ย้ายไปที่ผลิตเพื่อเก็บผลผลิต", "Not producing here: move it to a producing place.")}</p>}
          <div className="mt-2">
            <p className="mb-1 text-meta text-ink">{t("คุณภาพผลผลิต (หัวใจตั้งเพดาน อาหารเกรดดียกพื้น)", "Produce quality (hearts set the ceiling; graded feed lifts the floor)")}</p>
            <QualityRange range={{ lo: v.range.floor, hi: v.range.ceiling }} base={Math.max(0, v.range.ceiling - ANIMALS.quality.spread)} th={th} odds={false} />
          </div>
          {mine ? (
            <div className="mt-2 grid grid-cols-2 gap-2" data-animal-actions>
              <button type="button" className={button} disabled={busy || stage === "coming"} onClick={() => setPicker(picker === "feed" ? null : "feed")} aria-expanded={picker === "feed"}>{t("ให้อาหาร", "Feed")}</button>
              <button type="button" className={button} disabled={busy || stage === "coming" || !!s.today.pet} onClick={() => void act({ action: "pet", id: a.id }, ["ลูบหัวแล้ว มันดูดีใจนะ", "A pat. It looks pleased."])}>{s.today.pet ? t("ลูบแล้ววันนี้", "Petted today") : t("ลูบหัว", "Pet")}</button>
              <button type="button" className={button} disabled={busy || stage === "coming" || !!s.today.treat} onClick={() => setPicker(picker === "treat" ? null : "treat")} aria-expanded={picker === "treat"}>{s.today.treat ? t("ให้ขนมแล้ว", "Treated today") : t("ให้ขนม", "Treat")}</button>
              <button type="button" className={stage === "adult" && v.ready > 0 ? main : button} disabled={busy || stage !== "adult" || v.ready < 1} onClick={() => { if (held(purse.bag, tool as ItemId) < 1) { void act({ action: "collect", id: a.id, play: null }); return; } onCollect(s); }} data-collect={sp.game}>
                {GAME_WORD[sp.game][th ? 0 : 1]}{held(purse.bag, tool as ItemId) < 1 ? t(" (ไม่มีเครื่องมือ)", " (no tool)") : ""}
              </button>
              <button type="button" className={button} disabled={busy} onClick={() => setPicker(picker === "move" ? null : "move")} aria-expanded={picker === "move"}>{t("ย้ายที่", "Move")}</button>
              <button type="button" className={button} disabled={busy || stage !== "adult"} onClick={() => setPicker(picker === "lend" ? null : "lend")} aria-expanded={picker === "lend"}>{a.lent && a.lent.until > now ? t("เลิกให้ยืม", "End loan") : t("ให้เพื่อนยืม", "Lend")}</button>
              <button type="button" className={button} disabled={busy} onClick={() => setPicker(picker === "name" ? null : "name")} aria-expanded={picker === "name"}>{t("ตั้งชื่อ", "Rename")}</button>
              {cradle && <button type="button" className={button} disabled={busy || usesLeft(purse, ANIMAL_GIFTS.cradle, now) < 1} onClick={() => void act({ action: "cradle", id: a.id }, ["เปลอุ่นของยายให้ลูกน้อยมาหนึ่งตัว!", "Grandma's cradle brings a little one!"])} data-cradle>{t("เปลอุ่นของยาย", "Warm cradle")}</button>}
            </div>
          ) : (
            <p className="mt-2 text-meta text-muted">{t(`เจ้าของ ${nameOf(a.owner)} ให้ยืมไว้ใช้ผสมพันธุ์ที่รัง`, `${nameOf(a.owner)} lent it for the nest.`)}</p>
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
          {picker === "move" && (
            <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-line p-2" data-picker="move">
              {(["producing", "nursery", "keeping"] as Place[]).map((p) => <button key={p} type="button" className={a.place === p ? main : button} disabled={busy || a.place === p} onClick={() => { setPicker(null); void act({ action: "move", id: a.id, place: p }, ["ย้ายให้แล้ว", "Moved."]); }}>{PLACE[p][th ? 0 : 1]}</button>)}
            </div>
          )}
          {picker === "lend" && (
            <div className="mt-2 rounded-lg border border-line p-2" data-picker="lend">
              {a.lent && a.lent.until > now ? <button type="button" className={button} disabled={busy} onClick={() => { setPicker(null); void act({ action: "lend", id: a.id, to: null }, ["เรียกกลับมาแล้ว", "Back with you."]); }}>{t("เรียกกลับ", "End the loan")}</button> : <>
                <label className="block text-meta text-muted">{t("ให้ใครยืมไปผสมพันธุ์ (1 ชั่วโมง)", "Lend to (for an hour, for breeding)")}
                  <select value={lendTo} onChange={(e) => setLendTo(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3 text-ink">
                    <option value="">{t("เลือกเพื่อน", "Choose a friend")}</option>
                    {members.filter((m) => m.id !== a.owner).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
                <button type="button" className={`${button} mt-2`} disabled={busy || !lendTo} onClick={() => { setPicker(null); void act({ action: "lend", id: a.id, to: lendTo, mins: 60 }, ["ให้ยืมแล้ว เพื่อนใช้ที่รังได้ 1 ชั่วโมง", "Lent for an hour."]); }}>{t("ให้ยืม", "Lend")}</button>
              </>}
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

/* ── friends' care ── */
function Care({ th, purse, world, herd, now, kit, busy, act, members, nameOf, me }: { th: boolean; purse: Purse; world: AnimalWorld; herd: Herd; now: number; kit: SceneryKit | null; busy: boolean; act: Act; members: Array<{ id: string; name: string }>; nameOf: (id: string) => string; me: string }) {
  const t = (a: string, b: string) => (th ? a : b);
  const [care, setCare] = useState<Herd["care"]>(herd.care);
  const [carers, setCarers] = useState<string[]>(herd.carers);
  const [add, setAdd] = useState("");
  useEffect(() => { setCare(herd.care); setCarers(herd.carers); }, [herd.care, herd.carers.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const careDay = (purse as Purse & { animalCare?: { day: number; n: number } }).animalCare;
  const today = careDay && careDay.day === dayOf(now) ? careDay.n : 0;
  const theirs = world.animals.filter((a) => a.owner !== me && mayCare(world.herds.find((h) => h.owner === a.owner), me));
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
          <ul className="flex flex-wrap gap-1.5">{carers.map((id) => <li key={id}><button type="button" onClick={() => setCarers(carers.filter((x) => x !== id))} className="pressable min-h-9 rounded-full border border-line bg-bg/60 px-3 text-meta text-ink" aria-label={t(`เอา ${nameOf(id)} ออก`, `Remove ${nameOf(id)}`)}>{nameOf(id)} ×</button></li>)}</ul>
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
      <p className="mb-2 text-meta text-muted" data-care-today={today}>{t(`แต้มผู้ช่วยจากการดูแลสัตว์วันนี้ ${today}/${ANIMALS.care.cap} · เก็บผลผลิต ผสม ขาย หรือย้ายไม่ได้`, `Helpers' points from animal care today: ${today}/${ANIMALS.care.cap} · no collecting, breeding, selling or moving`)}</p>
      {theirs.length ? <ul className="grid gap-2">{theirs.map((a) => <FriendCard key={a.id} a={a} th={th} purse={purse} world={world} now={now} kit={kit} busy={busy} act={act} nameOf={nameOf} />)}</ul>
        : <p className="text-meta text-muted">{t("ยังไม่มีเพื่อนคนไหนให้เราช่วยดูแล", "Nobody has let you care for their animals yet.")}</p>}
    </div>
  );
}
function FriendCard({ a, th, purse, world, now, kit, busy, act, nameOf }: { a: Animal; th: boolean; purse: Purse; world: AnimalWorld; now: number; kit: SceneryKit | null; busy: boolean; act: Act; nameOf: (id: string) => string }) {
  const t = (x: string, y: string) => (th ? x : y);
  const v = viewOf(a, now, { gate: world.gate }), sp = SPECIES[a.species], stage = v.stage;
  const [pick, setPick] = useState<"feed" | "treat" | null>(null);
  const feeds = purse.bag.filter((x) => x && feedHours(a.species, x.item) > 0);
  const treats = purse.bag.filter((x) => x && sp.treats.includes(x.item));
  if (stage === "coming") return null;
  return (
    <li className="rounded-xl border border-line bg-bg/50 p-2" data-friend-card={a.id}>
      <div className="flex items-center gap-2">
        <AnimalPic species={a.species} breed={a.breed} stage={stage as "baby"} size={40} kit={kit} />
        <span className="min-w-0 flex-1"><span className="block truncate text-ui font-semibold text-ink">{nameOfAnimal(a, th)}</span><span className="block truncate text-meta text-muted">{t(`ของ ${nameOf(a.owner)}`, `${nameOf(a.owner)}'s`)}</span></span>
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

/* ── the breeding nest ── */
function Nest({ th, purse, world, mine, now, kit, busy, act, me, nameOf }: { th: boolean; purse: Purse; world: AnimalWorld; mine: Animal[]; now: number; kit: SceneryKit | null; busy: boolean; act: Act; me: string; nameOf: (id: string) => string }) {
  const t = (a: string, b: string) => (th ? a : b);
  const ctx = { gate: world.gate };
  const adults = mine.filter((a) => viewOf(a, now, ctx).stage === "adult");
  const lent = world.animals.filter((a) => a.owner !== me && a.lent?.to === me && a.lent.until > now && viewOf(a, now, ctx).stage === "adult");
  const [pa, setPa] = useState<string>(""), [pb, setPb] = useState<string>(""), [offering, setOffering] = useState<string>(""), [dawn, setDawn] = useState<string>("");
  const A = adults.find((a) => a.id === pa) ?? null, B = [...adults, ...lent].find((a) => a.id === pb) ?? null;
  const ba = A ? breedOf(A.breed)! : null, bb = B ? breedOf(B.breed)! : null;
  const book = bookOf(purse), recipes = [...purse.recipes, ...purse.bag.filter((x) => x?.item.startsWith("scrollBreed_")).map((x) => x!.item)] as string[];
  const steps = ba && bb ? stepsOf(ba, bb) : [];
  const offerings = purse.bag.map((x) => x?.item).filter((id): id is ItemId => !!id && kindOf(id) !== null).filter((id, i, all) => all.indexOf(id) === i);
  const dawns = purse.bag.map((x) => x?.item).filter((id): id is ItemId => !!id && DAWN_BOOSTS.includes(id)).filter((id, i, all) => all.indexOf(id) === i);
  const x = ba && bb ? crossOf(ba, bb, offering || null, !!dawn) : null;
  const fee = ba && bb && x ? feeOf(x.target, ba, bb) : 0;
  const ready = (a: Animal) => a.hearts >= ANIMALS.breedHearts && a.rest <= now;
  const coming = mine.filter((a) => a.born > now);
  const pickRow = (list: Animal[], value: string, set: (id: string) => void, of: SpeciesId | null, label: string) => (
    <div>
      <p className="mb-1 text-meta text-muted">{label}</p>
      <ul className="flex flex-wrap gap-1.5">{list.filter((a) => !of || a.species === of).map((a) => (
        <li key={a.id}><button type="button" aria-pressed={value === a.id} disabled={!ready(a)} onClick={() => set(value === a.id ? "" : a.id)} data-parent={a.id}
          className={`pressable flex min-h-11 items-center gap-1 rounded-xl border px-1.5 pr-2.5 text-meta disabled:opacity-45 ${value === a.id ? "border-accent bg-accent/15 text-accent" : "border-line-strong text-ink"}`}>
          <AnimalPic species={a.species} breed={a.breed} stage="adult" size={32} kit={kit} />
          <span className="max-w-[7rem] truncate">{nameOfAnimal(a, th)}{a.owner !== me ? ` (${nameOf(a.owner)})` : ""}</span>
          {!ready(a) && <span className="text-label text-muted">{a.rest > now ? t("พัก", "rest") : t("<3♥", "<3 hearts")}</span>}
        </button></li>
      ))}</ul>
    </div>
  );
  return (
    <div data-animals-nest>
      <p className="text-meta leading-relaxed text-muted">{t("สองตัวชนิดเดียวกัน (สนิท 3 หัวใจขึ้นไป) กับของเซ่นหนึ่งอย่าง วางลงรัง ได้ลูกหนึ่งตัว นกฟักไข่ 12 ชม. สัตว์สี่ขา 24 ชม. แม่พ่อพัก 48 ชม.", "Two of a kind (3+ hearts each) and one offering in the nest make one young. Birds hatch in 12 h, four-legged ones in 24 h. Parents rest 48 h.")}</p>
      <div className="mt-2 grid gap-2">
        {pickRow(adults, pa, (id) => { setPa(id); setPb(""); }, null, t("ตัวที่หนึ่ง (ของเรา)", "First parent (mine)"))}
        {A && pickRow([...adults.filter((a) => a.id !== pa), ...lent], pb, setPb, A.species, t("ตัวที่สอง (ของเรา หรือที่เพื่อนให้ยืม)", "Second parent (mine, or lent to me)"))}
      </div>
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
          })}</ul> : <p className="text-meta text-muted">{t("สองตัวนี้ไม่มีสูตรไปต่อ ลองจับคู่ตัวอื่น", "These two lead nowhere new. Try another pair.")}</p>}
        </div>
      )}
      {ba && bb && (
        <div className="mt-3 grid gap-2">
          <label className="block text-meta text-muted">{t("ของเซ่น (จากกระเป๋า)", "Offering (from your bag)")}
            <select value={offering} onChange={(e) => setOffering(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3 text-ink" data-offering>
              <option value="">{t("ไม่ใส่ของเซ่น (ได้พันธุ์พ่อแม่)", "None (a parent's breed)")}</option>
              {offerings.map((id) => <option key={id} value={id}>{ITEMS[id]?.name[th ? "th" : "en"]} · {OFFERING_KINDS[kindOf(id)!][th ? "th" : "en"]}</option>)}
            </select>
          </label>
          <label className="block text-meta text-muted">{t("ของเช้ามืด (ไม่บังคับ +10% ถ้าของเซ่นถูก)", "A dawn forage (optional, +10% if the offering is right)")}
            <select value={dawn} onChange={(e) => setDawn(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3 text-ink" data-dawn>
              <option value="">{t("ไม่ใส่", "None")}</option>
              {dawns.map((id) => <option key={id} value={id}>{ITEMS[id]?.name[th ? "th" : "en"]}</option>)}
            </select>
          </label>
          <p className="flex flex-wrap items-center gap-2 text-meta text-ink" data-nest-summary>
            <span className="flex items-center gap-1">{t("ค่าวางรัง", "Fee")} <Coins n={fee} th={th} small /></span>
            {x?.step && <span>{x.right ? t(`ของเซ่นถูก! โอกาสได้พันธุ์ใหม่ ${x.odds}%`, `Right offering: ${x.odds}% odds`) : offering ? t(`ชนิด${OFFERING_KINDS[x.step.kind].th} แต่ยังไม่รู้ว่าถูกไหม`, `a ${OFFERING_KINDS[x.step.kind].en}: right or not, you'll see`) : ""}</span>}
            {x && !x.right && offering && known(x) && <span className="text-[#ff9fb0]">{t("ของเซ่นนี้ไม่ใช่ของขั้นนี้", "Not this step's offering")}</span>}
            <span className="text-muted">{t(`ลูกออกใน ${SPECIES[ba.species].kind === "bird" ? 12 : 24} ชม.`, `Out in ${SPECIES[ba.species].kind === "bird" ? 12 : 24} h`)}</span>
          </p>
          <button type="button" className={main} disabled={busy || purse.coins < fee} data-breed onClick={() => void act({ action: "breed", a: ba && A ? A.id : "", b: B ? B.id : "", offering: offering || null, dawn: dawn || null }, ["วางลงรังแล้ว รอลูกน้อยออกมานะ", "In the nest. Wait for the little one."], (r) => {
            if (!r.ok || !r.got?.child) return;
            setPa(""); setPb(""); setOffering(""); setDawn("");
          })}>{t("วางลงรัง", "Lay them in the nest")}</button>
        </div>
      )}
      {coming.length > 0 && <>
        <H3>{t("กำลังจะออกมา", "On their way")}</H3>
        <ul className="grid gap-1.5">{coming.map((a) => <li key={a.id} className="flex items-center gap-2 text-meta text-ink" data-coming={a.id}><AnimalPic species={a.species} breed={a.breed} stage="baby" size={30} kit={kit} pose="sleep" /><span className="flex-1">{SPECIES[a.species].baby[th ? "th" : "en"]}</span><span className="text-muted">{clock(a.born)}</span></li>)}</ul>
      </>}
    </div>
  );
  function known(c: NonNullable<typeof x>) { return !!c.step && ba ? knowsOffering(book, recipes, ba.species, c.step.child) : false; }
}

/* ── the breed book ── */
function Book({ th, purse, world, kit, nameOf }: { th: boolean; purse: Purse; world: AnimalWorld; kit: SceneryKit | null; nameOf: (id: string) => string }) {
  const t = (a: string, b: string) => (th ? a : b);
  const book = bookOf(purse), recipes = [...purse.recipes, ...purse.bag.filter((x) => x?.item.startsWith("scrollBreed_")).map((x) => x!.item)] as string[];
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
              {held(purse.bag, scrollOf(sp, L) as ItemId) > 0 && <p className="text-label text-jade">{t("มีม้วนสูตรนี้", "You hold its scroll")}</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-label text-muted">{t(`เป้าหมายของแต่ละพันธุ์ถูก ${adultAt(sp)} ชม.ที่อิ่ม จึงโตเต็มวัย`, `A ${SPECIES[sp].name.en.toLowerCase()} is grown after ${adultAt(sp)} fed hours`)}</p>
    </div>
  );
}
