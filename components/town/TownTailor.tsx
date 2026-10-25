"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Keeper } from "@/lib/town/keeper";
import type { LineId } from "@/lib/town/lines";
import { HAIRS, type Look } from "@/lib/town/look";
import type { PixelKit } from "@/lib/town/pixeldoll";
import type { Sprite } from "@/lib/town/scenery";
import type { ShopRoomArt } from "@/lib/town/shop-room-art";
import { TAILOR, inSeason } from "@/lib/town/tailor";
import { FACE_WEAR, HAIR_WEAR, HATS, NECK_WEAR, OUTFITS, owns, together, type Wearable } from "@/lib/town/wear";
import DollPreview from "./DollPreview";
import TownIcon from "./TownIcon";

/**
 * What every window of Granny Twilla's clothes shop is given by the town (components/town/Town.tsx's panel `tailor` and
 * `auction`): the window that is built for each takes these, and the town opens and closes it.
 */
export interface ShopWindowProps {
  th: boolean;
  /** Whoever keeps the game for this page (null until it is ready, or where the game is not open to me). */
  keeper: Keeper | null;
  /** The town's own pixel art for a picture's name, once the scenery has come (Granny's portraits are `tk_granny`, `tk_granny_o`). */
  art: (name: string) => Sprite | null;
  phone: boolean;
  /**
   * What the shop's mannequin wears (lib/town/shop-room-art's `onMannequin`): a drawing given here is drawn over the
   * mannequin, in its place back to front among the walkers, on this page, until null is given. (Town.tsx keeps it after
   * the window closes; the week's auction outfits are to be shown there.)
   */
  dressMannequin: (draw: ShopRoomArt["onMannequin"]) => void;
  onClose: () => void;
  /** The look I keep (not what I try on), the doll's pictures, what I have to wear and my lines' points, my coins. */
  look: Look;
  kit: PixelKit | null;
  had: ReadonlySet<string>;
  points: Partial<Record<LineId, number>>;
  coins: number;
  /** Clothes tried on: on my avatar at once, a tag over my head for the others; null puts back the look I keep. */
  tryOn: (look: Look | null) => void;
  /** A look worn for good (what was bought and is kept on). */
  wear: (look: Look) => void;
  /** Something bought or won (its ids, had at once): the wardrobe asks again what I have. */
  onDressed: (ids?: string[]) => void;
  /** The other window of the shop. */
  switchTo: (panel: "tailor" | "auction") => void;
}

/** One rail of Granny's: a slot of the look and the things of hers that go in it. */
type Rail = "outfit" | "hat" | "faceWear" | "neck" | "hairWear" | "hair";
const RAILS: Array<[Rail, string, string]> = [
  ["outfit", "ชุด", "Outfits"], ["hat", "หมวก", "Hats"], ["faceWear", "แว่นตา", "Glasses"],
  ["neck", "ที่คอ", "Neck"], ["hairWear", "ที่ผม", "Hair things"], ["hair", "ทรงผม", "Hairstyles"],
];
const LISTS: Record<Exclude<Rail, "hair">, Wearable[]> = { outfit: OUTFITS, hat: HATS, faceWear: FACE_WEAR, neck: NECK_WEAR, hairWear: HAIR_WEAR };
const ATLAS_SLOT = { hat: "hat", faceWear: "face", neck: "neck", hairWear: "hair" } as const;

/** A thing on the rails: which slot, its index in that slot's list, the id the shop sells it by, its names. */
interface Good { rail: Rail; index: number; sold: string; th: string; en: string; price: number; season: boolean }

/**
 * Granny Twilla's clothes (the owner, 2026-10-25: "เครื่องตกแต่งใหม่ราวๆ 40 รายการ ... มีระบบลองใส่ดูได้", and the
 * hairstyles: "ช่วยทำให้มีทรงผมใหม่ในร้านขายเสื้อผ้าด้วยได้ไหม"): her rails by slot, each thing on a card drawn on my
 * own doll; a tap tries it on (my avatar in the shop wears it at once, and the others see a tag that says it is a try),
 * a second tap takes it off; what is tried and not had yet is counted at the foot and bought together, into the
 * wardrobe, never a bag slot. Leaving the window puts back what I wear unless it was bought and kept on. Only what
 * the doll's pictures have is shown (her rails fill as the pictures come). Codex's look at the mock-ups (2026-10-25):
 * 44 px to press on a phone, a badge for what is had rather than a dimmed card, room under the last row.
 */
export default function TownTailor(p: ShopWindowProps) {
  const { th, keeper, kit, look, had, points, coins, tryOn, wear, onDressed } = p;
  const [rail, setRail] = useState<Rail>("outfit");
  // what is tried on, slot by slot, over the look I keep
  const [trying, setTrying] = useState<Partial<Look>>({});
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const requests = useRef(new Map<string, string>());

  const goods = useMemo(() => {
    const out: Good[] = [];
    if (!kit) return out;
    const now = Date.now(), atlas = kit.atlas as typeof kit.atlas & { hairs?: string[] };
    for (const r of ["outfit", "hat", "faceWear", "neck", "hairWear"] as const) {
      LISTS[r].forEach((w, index) => {
        const good = TAILOR[w.id];
        if (!good || !w.from || !("tailor" in w.from)) return;
        const drawn = r === "outfit" ? !!atlas.outfits?.[w.id] : !!atlas.wear?.[ATLAS_SLOT[r]]?.[w.id];
        if (!drawn || !inSeason(good, now)) return;
        out.push({ rail: r, index, sold: w.id, th: w.th, en: w.en, price: good.price, season: !!good.season });
      });
    }
    HAIRS.forEach((h, index) => {
      const good = h.sold ? TAILOR[h.sold] : undefined;
      if (!h.sold || !good || h.g !== look.gender || !(atlas.hairs ?? []).includes(h.id)) return;
      out.push({ rail: "hair", index, sold: h.sold, th: h.th, en: h.en, price: good.price, season: false });
    });
    return out;
  }, [kit, look.gender]);

  const tried: Look = { ...look, ...trying };
  const isOn = (g: Good) => (trying as Record<string, number | undefined>)[g.rail] === g.index;
  const isHad = (g: Good) => had.has(g.sold) || (g.rail !== "hair" && owns(LISTS[g.rail][g.index], points, had));
  const toBuy = goods.filter((g) => isOn(g) && !isHad(g));
  const total = toBuy.reduce((n, g) => n + g.price, 0);
  const count = Object.keys(trying).length;

  // my avatar wears what is tried (and puts it back when the window goes, unless it was bought and kept on)
  const kept = useRef(false);
  const triedKey = JSON.stringify(trying);
  useEffect(() => { tryOn(count ? tried : null); }, [triedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (!kept.current) tryOn(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (g: Good) => {
    setSaid(null);
    kept.current = false;
    setTrying((t) => {
      const next: Partial<Look> = { ...t };
      if ((next as Record<string, number | undefined>)[g.rail] === g.index) { delete (next as Record<string, unknown>)[g.rail]; return next; }
      if (g.rail === "hair") return { ...next, hair: g.index };
      // (a hat and a thing on top of the head take turns, as in the wardrobe)
      return { ...next, ...together({ ...look, ...next }, { [g.rail]: g.index } as Partial<Look>) };
    });
  };

  const buy = async () => {
    if (!keeper || !toBuy.length || busy) return;
    if (total > coins) { setSaid(th ? "เหรียญไม่พอจ้ะ" : "Not enough coins, dearie."); return; }
    setBusy(true); setSaid(null);
    let got = 0;
    const bought: string[] = [];
    for (const g of toBuy) {
      const req = requests.current.get(g.sold) ?? crypto.randomUUID();
      requests.current.set(g.sold, req);
      const did = await keeper.tailorBuy(g.sold, req);
      if (did.ok) { got++; bought.push(g.sold); requests.current.delete(g.sold); continue; }
      const why = did.why;
      setSaid(why === "coins" ? (th ? "เหรียญไม่พอจ้ะ" : "Not enough coins, dearie.")
        : why === "season" ? (th ? `${g.th} หมดฤดูแล้วจ้ะ` : `${g.en} is out of season.`)
        : why === "away" ? (th ? "ติดต่อเมืองไม่ได้ ลองใหม่อีกครั้งนะ" : "The town can't be reached. Try again.")
        : (th ? "ยายขายชิ้นนี้ให้ไม่ได้จ้ะ" : "Granny can't sell that one."));
      break;
    }
    if (got) {
      onDressed(bought);
      // what was bought is kept on: the look I keep becomes what I tried
      if (got === toBuy.length) { kept.current = true; wear(tried); setTrying({}); setSaid(th ? "ขอบใจจ้ะ ใส่แล้วดูดีเชียว" : "Thank you, dearie. It suits you."); }
    }
    setBusy(false);
  };

  const shown = goods.filter((g) => g.rail === rail);
  const t = (n: { th: string; en: string }) => (th ? n.th : n.en);
  const fmt = (n: number) => n.toLocaleString(th ? "th-TH" : "en-US");
  return (
    <section aria-labelledby="town-tailor-h" className="flex h-full flex-col">
      <ShopHead id="town-tailor-h" {...p} panel="tailor" />
      {/* (on a phone the window leaves the top of the screen to my avatar: one line of help, the rails in one row that stays
          while the cards scroll, so that two rows of cards show) */}
      <p className={`border-b border-line px-4 py-2 text-meta text-muted ${p.phone ? "truncate" : ""}`}>
        {p.phone
          ? th ? "แตะการ์ดเพื่อลองใส่ · ซื้อแล้วเข้าตู้แต่งตัว" : "Tap a card to try it on; what you buy goes to your wardrobe."
          : th ? "แตะการ์ดเพื่อลองใส่ ตัวละครของคุณเปลี่ยนทันที คนในร้านเห็นด้วย ซื้อแล้วเข้าตู้แต่งตัวเลย" : "Tap a card to try it on: your avatar changes at once and others in the shop see it. What you buy goes into your wardrobe."}
      </p>
      <div role="tablist" aria-label={th ? "ราว" : "Rails"} className={`flex gap-1.5 px-3 pb-2 pt-2.5 ${p.phone ? "flex-nowrap overflow-x-auto" : "flex-wrap"}`}>
        {RAILS.map(([r, a, b]) => (
          <button key={r} type="button" role="tab" aria-selected={rail === r} onClick={() => setRail(r)}
                  className={`pressable min-h-11 shrink-0 rounded-full border ${p.phone ? "px-2.5 text-meta" : "px-3.5 text-ui"} ${rail === r ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line-strong text-ink"}`}>
            {th ? a : b}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-1">
        {!kit ? <p className="text-meta text-muted">{th ? "กำลังโหลด…" : "Loading…"}</p>
          : !shown.length ? <p className="text-meta text-muted">{th ? "ราวนี้ยังว่างอยู่จ้ะ" : "Nothing on this rail yet."}</p> : (
          <div className="grid grid-cols-3 gap-2 min-[380px]:grid-cols-4">
            {shown.map((g) => {
              const on = isOn(g), have = isHad(g), body = g.rail === "outfit";
              // (a hairstyle's card shows the hair itself: what is tried on the head would hide it, a full hat all of it)
              const l = { ...tried, ...(g.rail === "hair" ? { hair: g.index, hat: 0, hairWear: 0 } : together(tried, { [g.rail]: g.index } as Partial<Look>)), [g.rail]: g.index } as Look;
              return (
                <button key={`${g.rail}-${g.sold}`} type="button" aria-pressed={on} onClick={() => pick(g)} title={t(g)}
                        className={`pressable relative flex min-h-11 flex-col items-center gap-0.5 rounded-xl border px-1 pb-1.5 pt-1 text-center ${on
                          ? "border-accent bg-accent/15" : "border-line-strong hover:border-accent"}`}>
                  {on && <span className="absolute left-1 top-1 z-10 rounded-md bg-accent px-1.5 text-[10px] font-bold leading-4 text-bg">{th ? "ลองอยู่" : "Trying"}</span>}
                  {g.season && <span className="absolute right-1 top-1 z-10 rounded-md bg-[#3a2414] px-1.5 text-[10px] font-bold leading-4 text-[#e7843a]">{th ? "ฮาโลวีน" : "Halloween"}</span>}
                  <DollPreview w={56} h={body ? 72 : 56} deps={[kit, JSON.stringify(l)]}
                               draw={(ctx, W, H) => {
                                 if (!kit) return;
                                 if (body) {
                                   const s = (H * 0.92) / (kit.heightOf(l) ?? 52);
                                   kit.draw(ctx, l, "front", false, W / 2, H - Math.round(H * 0.04), s, {}, 1);
                                 } else {
                                   const { w, h } = kit.headSize(l), k = Math.min(W / w, H / h) * 0.86;
                                   kit.drawHead(ctx, l, Math.round((W - w * k) / 2), Math.round((H - h * k) / 2), k);
                                 }
                               }} />
                  <span className="text-meta leading-tight text-ink">{t(g)}</span>
                  {have
                    ? <span className="rounded-full bg-ok/15 px-1.5 text-[11px] font-semibold leading-5 text-ok">{th ? "มีแล้ว" : "Owned"}</span>
                    : <span className="flex items-center gap-1 text-meta font-semibold tabular-nums text-gold"><TownIcon name="coin" size={12} />{fmt(g.price)}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t border-line bg-bg/40 px-3 pb-3 pt-2">
        {said && <p role="status" className="mb-1.5 text-meta text-ink">{said}</p>}
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-meta text-muted">
            {th ? "ลองอยู่ " : "Trying "}<b className="text-ink">{count}</b>{th ? " ชิ้น" : ""}
            {toBuy.length > 0 && <> · {th ? "รวม" : "total"} <span className="font-semibold tabular-nums text-gold">{fmt(total)}</span></>}
          </p>
          <button type="button" disabled={!count || busy} onClick={() => { setTrying({}); setSaid(null); }}
                  className="pressable min-h-11 rounded-full border border-line-strong px-3.5 text-ui text-ink disabled:opacity-40">
            {th ? "ถอดที่ลอง" : "Take off"}
          </button>
          <button type="button" disabled={!toBuy.length || busy || total > coins} onClick={buy}
                  className="pressable min-h-11 rounded-full bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
            {busy ? "…" : th ? `ซื้อ ${toBuy.length || ""} ชิ้น` : `Buy ${toBuy.length || ""}`}
          </button>
        </div>
        {toBuy.length > 0 && total > coins && <p className="mt-1 text-meta text-[#e07a7a]">{th ? `ขาดอีก ${fmt(total - coins)} เหรียญ` : `${fmt(total - coins)} coins short`}</p>}
      </div>
    </section>
  );
}

/** The shop's head: Granny's portrait, its name, my coins, Close; and the two windows as tabs. */
export function ShopHead({ id, th, art, coins, panel, switchTo, onClose }: Pick<ShopWindowProps, "th" | "art" | "switchTo" | "onClose" | "coins"> & { id: string; panel: "tailor" | "auction" }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Face sprite={art("tk_granny")} box={36} />
        <h2 id={id} className="min-w-0 flex-1 truncate font-display text-title font-semibold text-ink">{th ? "ร้านผ้ายายทวิลล่า" : "Granny Twilla's"}</h2>
        <span className="flex items-center gap-1 text-ui font-semibold tabular-nums text-gold"><TownIcon name="coin" size={14} />{coins.toLocaleString(th ? "th-TH" : "en-US")}</span>
        <button type="button" onClick={onClose} className="pressable min-h-11 rounded-full bg-accent px-4 text-ui font-semibold text-bg">{th ? "ปิด" : "Close"}</button>
      </div>
      <div role="tablist" className="flex gap-5 border-b border-line px-4">
        {([["tailor", "เสื้อผ้า", "Clothes"], ["auction", "ประมูลลิมิเต็ด", "Limited auction"]] as const).map(([k, a, b]) => (
          <button key={k} type="button" role="tab" aria-selected={panel === k} onClick={() => { if (panel !== k) switchTo(k); }}
                  className={`min-h-11 border-b-2 text-ui ${panel === k ? "border-accent font-semibold text-accent" : "border-transparent text-muted"}`}>
            {th ? a : b}
          </button>
        ))}
      </div>
    </>
  );
}

/** A picture of the town's pixel art, whole and crisp, in a square box (as the Popoto Board draws its own). */
export function Face({ sprite, box }: { sprite: Sprite | null; box: number }) {
  if (!sprite) return <span aria-hidden className="shrink-0" style={{ width: box, height: box }} />;
  const [x, y, w, h] = sprite.at, k = box / Math.max(w, h);
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: box, height: box }}>
      <span style={{
        width: w * k, height: h * k, backgroundImage: `url(${sprite.src})`,
        backgroundSize: `${sprite.sheet[0] * k}px ${sprite.sheet[1] * k}px`, backgroundPosition: `${-x * k}px ${-y * k}px`,
        imageRendering: "pixelated",
      }} />
    </span>
  );
}
