"use client";

import { useEffect, useState } from "react";
import { LINES, type LineId } from "@/lib/town/lines";
import type { PixelKit } from "@/lib/town/pixeldoll";
import { FACE_WEAR, HAIR_WEAR, HATS, NECK_WEAR, OUTFITS, owns, together, type Wearable } from "@/lib/town/wear";
import {
  EYES, EYE_COLORS, GENDERS, HAIR_COLORS, ONE_MODEL, RACES, hairForGender, hairsFor, hairsOf, lookAsRace, skinsOf,
  type Look, type Named, type Swatch,
} from "@/lib/town/look";
import TownIcon from "./TownIcon";
import DollPreview from "./DollPreview";

/**
 * The wardrobe: how your avatar looks, changed as you go.
 *
 * There is no preview of its own. While it is open the town's camera comes
 * close to your avatar, so what you try on is what everybody else will see,
 * standing in the town. The room hears about it once you stop changing things
 * (TownSession.setLook).
 *
 * How one looks is free and can be changed back at any time (the owner's call for the first version, 2026-10-01).
 * What one wears is had from the game (lib/town/wear: a line's rank), and what is not had yet is shown, locked, with
 * where it comes from. Three tabs (the owner, 2026-10-17: "ทำ UI สำหรับใส่ ของตกแต่งด้วย"): oneself, outfits, and the
 * things worn; each outfit and each thing is a card showing the player's own doll, or head, wearing it.
 */
type Tab = "me" | "outfit" | "wear";

export default function Wardrobe({ look, kit, points, had, fresh = new Set(), note = null, onChange, onTurn, onClose, th }: {
  look: Look;
  /** The doll's pictures, for the cards (none yet: the cards wait for them). */
  kit: PixelKit | null;
  /** The player's points on each line: what they have to wear. */
  points: Partial<Record<LineId, number>>;
  /** What the player has bought or found (lib/town/wear's `owns`). */
  had: ReadonlySet<string>;
  /** What dropped and is seen here for the first time: marked "new" on its card, and its tab opened first. */
  fresh?: ReadonlySet<string>;
  /** Something to say at the top of the page once (the one model). */
  note?: string | null;
  onChange: (look: Look) => void;
  /** Turn the avatar to see its side or back: -1 one way, 1 the other. */
  onTurn: (dir: -1 | 1) => void;
  onClose: () => void;
  th: boolean;
}) {
  const set = (patch: Partial<Look>) => onChange({ ...look, ...patch });
  const t = (n: Named | Swatch) => (th ? n.th : n.en);
  const freshIn = (lists: Wearable[][]) => lists.some((l) => l.some((x) => fresh.has(x.id)));
  const freshTab: Partial<Record<Tab, boolean>> = { outfit: freshIn([OUTFITS]), wear: freshIn([HATS, FACE_WEAR, NECK_WEAR, HAIR_WEAR]) };
  const [tab, setTab] = useState<Tab>(freshTab.outfit ? "outfit" : freshTab.wear ? "wear" : "me");
  // (what is new comes a moment after the wardrobe opens: its tab is shown then)
  useEffect(() => { if (freshTab.outfit) setTab("outfit"); else if (freshTab.wear) setTab("wear"); }, [fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  // (and the first new card scrolled into sight: a hat's may be far down the list)
  useEffect(() => {
    if (!fresh.size) return;
    const id = window.setTimeout(() => document.querySelector("[data-wear-fresh]")?.closest("button")?.scrollIntoView({ block: "center" }), 120);
    return () => window.clearTimeout(id);
  }, [fresh, tab]);
  const TABS: Array<[Tab, string]> = [["me", th ? "ตัวเรา" : "Me"], ["outfit", th ? "ชุด" : "Outfits"], ["wear", th ? "ของตกแต่ง" : "Accessories"]];

  return (
    <section aria-labelledby="wardrobe-h" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h2 id="wardrobe-h" className="font-display text-title font-semibold text-ink"><span className="flex items-center gap-2"><TownIcon name="wardrobe" size={22} />{th ? "แต่งตัว" : "Wardrobe"}</span></h2>
        {/* (no dice any more: the owner, 2026-10-17, "เอาปุ่มสุ่มออกจากหน้า แต่งตัวเลย") */}
        <button type="button" onClick={onClose}
                className="pressable ml-auto min-h-11 rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg sm:min-h-0">
          {th ? "เสร็จ" : "Done"}
        </button>
      </div>

      {/* the tabs, and turning round, which every tab wants */}
      <div className="flex items-end gap-1 border-b border-line px-3">
        <div role="tablist" aria-label={th ? "แต่งตัว" : "Wardrobe"} className="flex gap-1">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                    className={`pressable min-h-11 border-b-2 px-3 pb-2 pt-2.5 text-ui transition-colors ${tab === id
                      ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-ink"}`}>
              <span className={`relative ${freshTab[id] ? "pr-2.5" : ""}`}>{label}{freshTab[id] && <span aria-hidden className="tk-dot" />}</span>
            </button>
          ))}
        </div>
        <div className="mb-1.5 ml-auto flex gap-1">
          <button type="button" onClick={() => onTurn(-1)} aria-label={th ? "หมุนซ้าย" : "Turn left"}
                  className="pressable grid size-11 place-items-center rounded-full border border-line-strong text-read text-ink hover:border-accent sm:size-9"><TownIcon name="turnLeft" size={18} /></button>
          <button type="button" onClick={() => onTurn(1)} aria-label={th ? "หมุนขวา" : "Turn right"}
                  className="pressable grid size-11 place-items-center rounded-full border border-line-strong text-read text-ink hover:border-accent sm:size-9"><TownIcon name="turnRight" size={18} /></button>
        </div>
      </div>

      {note && <p role="status" className="border-b border-line bg-accent/10 px-4 py-2 text-ui text-ink">{note}</p>}
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
        {tab === "outfit" && (
          <Cards label={th ? "ชุด" : "Outfits"} items={OUTFITS} value={look.outfit ?? 0} th={th} points={points} had={had} fresh={fresh} kit={kit}
                 lookFor={(outfit) => ({ ...look, outfit })} body onPick={(outfit) => set({ outfit })} />
        )}
        {tab === "wear" && <>
          <Cards label={th ? "หมวก" : "Hats"} items={HATS} value={look.hat ?? 0} th={th} points={points} had={had} fresh={fresh} kit={kit}
                 lookFor={(hat) => ({ ...look, hat })} onPick={(hat) => set(together(look, { hat }))} />
          <Cards label={th ? "แว่นตา" : "Glasses"} items={FACE_WEAR} value={look.faceWear ?? 0} th={th} points={points} had={had} fresh={fresh} kit={kit}
                 lookFor={(faceWear) => ({ ...look, faceWear })} onPick={(faceWear) => set({ faceWear })} />
          <Cards label={th ? "ที่คอ" : "Neck"} items={NECK_WEAR} value={look.neck ?? 0} th={th} points={points} had={had} fresh={fresh} kit={kit}
                 lookFor={(neck) => ({ ...look, neck })} onPick={(neck) => set({ neck })} />
          <Cards label={th ? "ที่ผม" : "In the hair"} items={HAIR_WEAR} value={look.hairWear ?? 0} th={th} points={points} had={had} fresh={fresh} kit={kit}
                 lookFor={(hairWear) => ({ ...look, hairWear })} onPick={(hairWear) => set(together(look, { hairWear }))} />
        </>}
        {tab === "me" && <>

        {/* The game's races: each opens when its pictures are made; the rest are there, locked. Gone while everybody is
            the one model (lib/town/look's ONE_MODEL). */}
        {!ONE_MODEL && <Group label={th ? "เผ่า" : "Race"}>
          <div role="group" aria-label={th ? "เผ่า" : "Race"} className="flex flex-wrap gap-1.5">
            {RACES.map((r, i) => r.open ? (
              <button key={r.id} type="button" aria-pressed={look.race === i} onClick={() => onChange(lookAsRace(look, i))}
                      className={`pressable rounded-full px-3 py-1.5 text-ui ${look.race === i
                        ? "bg-accent/20 font-semibold text-accent ring-1 ring-accent/60" : "border border-line-strong text-ink hover:border-accent"}`}>
                {t(r)}
              </button>
            ) : (
              <button key={r.id} type="button" disabled aria-disabled="true"
                      title={th ? "ยังไม่เปิด เร็วๆ นี้" : "Not open yet, coming soon"}
                      className="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-ui text-muted opacity-70">
                <TownIcon name="lock" size={13} />{t(r)}
                <span className="sr-only">{th ? " (ยังไม่เปิด)" : " (locked)"}</span>
              </button>
            ))}
          </div>
        </Group>}

        <Choices label={th ? "เพศ" : "Body"} items={GENDERS} value={look.gender} t={t}
                 onPick={(gender) => set({ gender, hair: hairForGender(look.hair, gender, look.race) })} />
        {/* The game's character creator's own hairstyles, each race and gender its own list. */}
        {/* (a hairstyle sold at Granny Twilla's is locked until bought: its name hidden, where it comes from shown) */}
        <Choices label={th ? "ทรงผม" : "Hairstyle"} items={hairsOf(look.race)} only={hairsFor(look.gender, look.race)} value={look.hair} t={t} onPick={(hair) => set({ hair })}
                 locked={(n) => { const sold = (n as { sold?: string }).sold; return sold && !had.has(sold) ? (th ? "ร้านผ้ายายทวิลล่า" : "Granny Twilla's shop") : null; }} />
        <Swatches label={th ? "สีผม" : "Hair colour"} items={HAIR_COLORS} value={look.hairColor} t={t} onPick={(hairColor) => set({ hairColor })} />
        <Swatches label={th ? "สีผิว" : "Skin"} items={skinsOf(look.race)} value={look.skin} t={t} onPick={(skin) => set({ skin })} />
        <Choices label={th ? "ทรงตา" : "Eyes"} items={EYES} value={look.eyes} t={t} onPick={(eyes) => set({ eyes })} />
        <Swatches label={th ? "สีตา" : "Eye colour"} items={EYE_COLORS} value={look.eyeColor} t={t} onPick={(eyeColor) => set({ eyeColor })} />
        </>}
      </div>
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">{label}</div>
      {children}
    </div>
  );
}

function Choices({ label, items, only, value, onPick, t, locked }: {
  label: string; items: Named[]; value: number; onPick: (i: number) => void; t: (n: Named) => string;
  /** Only these indices of items, in this order. */
  only?: number[];
  /** Where a choice not had yet comes from (it is shown locked), or null for one that is had. */
  locked?: (n: Named) => string | null;
}) {
  return (
    <Group label={label}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {(only ?? items.map((_, i) => i)).map((i) => [i, items[i]] as const).map(([i, n]) => {
          const whence = locked?.(n) ?? null;
          if (whence) return (
            <span key={n.id} aria-label={`??? · ${whence}`}
                  className="flex min-h-11 items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-meta text-muted sm:min-h-0">
              <TownIcon name="lock" size={12} />??? · {whence}
            </span>
          );
          return (
          <button key={n.id} type="button" aria-pressed={i === value} onClick={() => onPick(i)}
                  className={`pressable min-h-11 rounded-full px-3 py-1.5 text-ui transition-colors sm:min-h-0 ${i === value
                    ? "bg-accent/20 font-semibold text-accent ring-1 ring-accent/60"
                    : "border border-line-strong text-ink hover:border-accent"}`}>
            {t(n)}
          </button>
          );
        })}
      </div>
    </Group>
  );
}

function Swatches({ label, items, value, onPick, t }: {
  label: string; items: Swatch[]; value: number; onPick: (i: number) => void; t: (n: Swatch) => string;
}) {
  return (
    <Group label={`${label} · ${t(items[value])}`}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {items.map((c, i) => (
          <button key={c.hex + i} type="button" aria-pressed={i === value} aria-label={t(c)} title={t(c)} onClick={() => onPick(i)}
                  style={{ background: c.hex }}
                  className={`pressable size-8 rounded-full ring-offset-2 ring-offset-surface transition-shadow ${i === value
                    ? "ring-2 ring-accent" : "ring-1 ring-inset ring-black/25 hover:ring-2 hover:ring-line-strong"}`} />
        ))}
      </div>
    </Group>
  );
}

/**
 * A tab's cards: each thing on the player's own doll (an outfit, the whole doll) or head (the rest), the one worn
 * ringed. What is not had yet is only a dark shadow of it, with no name, and where it comes from (the owner,
 * 2026-10-17: "ของตกแต่งที่ยังไม่ได้ปลดล็อคให้ทำเป้นเงาดำๆไว้ ปกปิดไม่ให้เห้นรายละเอียด เห็นแค่เงา"): something to find,
 * and a way to feel towards it. One size for every card of a list, so the heads are drawn alike.
 */
function Cards({ label, items, value, onPick, lookFor, kit, points, had: bought, fresh, th, body }: {
  label: string; items: Wearable[]; value: number; onPick: (i: number) => void; lookFor: (i: number) => Look;
  kit: PixelKit | null; points: Partial<Record<LineId, number>>; had: ReadonlySet<string>; fresh: ReadonlySet<string>; th: boolean;
  /** Show the whole doll (outfits), not the head. */
  body?: boolean;
}) {
  // one picture pixel a size for the whole list: the largest every head fits at (not a whole number: the heads are small
  // things in a card, and a whole number of screen pixels left them a third of it)
  const fit = (W: number, H: number) => {
    if (!kit) return 1;
    let k = Infinity;
    for (let i = 0; i < items.length; i++) { const { w, h } = kit.headSize(lookFor(i)); k = Math.min(k, W / w, H / h); }
    return k * 0.86;
  };
  const line = (l: LineId) => (th ? LINES[l].name.th : LINES[l].name.en);
  const whence = (item: Wearable) => {
    const f = item.from;
    if (!f) return "";
    if ("lines" in f) return `${th ? "แรงค์" : "Rank"} ${f.rank}
${f.lines.map(line).join(" / ")}`;
    if ("shop" in f) return th ? "ร้านลุงขายของ" : "The uncle's shop";
    if ("merchant" in f) return th ? "พ่อค้าค้างคาว (เร็วๆ นี้)" : "The bat merchant (soon)";
    if ("craft" in f) return th ? "โต๊ะช่างของลุง" : "The uncle's workbench";
    if ("tailor" in f) return th ? "ร้านผ้ายายทวิลล่า" : "Granny Twilla's shop";
    if ("auction" in f) return th ? "ประมูลลิมิเต็ด" : "The limited auction";
    // (a drop: its chance, then the deed it comes with or else its line, and the hours or the rain it needs)
    const hours = f.hours ? ` ${String(f.hours[0]).padStart(2, "0")}–${String(f.hours[1]).padStart(2, "0")}` : "", rain = f.rain ? (th ? " ฝนตก" : " in rain") : "";
    return `${th ? "ดรอป" : "Drop"} ${+(f.chance * 100).toFixed(2)}%
${f.how ? (th ? f.how.th : f.how.en) : line(f.drop)}${hours}${rain}`;
  };
  return (
    <Group label={label}>
      {/* (three to a row on the narrowest phones, where four squeezed the names: Codex's look, 2026-10-17) */}
      <div role="group" aria-label={label} className="grid grid-cols-3 gap-2 min-[380px]:grid-cols-4">
        {items.map((item, i) => {
          const had = owns(item, points, bought), on = had && i === value;
          return (
            <button key={item.id} type="button" aria-pressed={on} disabled={!had} onClick={() => onPick(i)}
                    title={had ? (th ? item.th : item.en) : whence(item)} aria-label={had ? undefined : `??? · ${whence(item).replace("\n", " · ")}`}
                    className={`pressable flex min-h-11 flex-col items-center gap-1 rounded-xl border px-1 pb-1.5 pt-1 text-center transition-colors ${on
                      ? "border-accent bg-accent/15 text-accent" : had ? "border-line-strong text-ink hover:border-accent" : "cursor-not-allowed border-dashed border-line-strong text-ink"}`}>
              <span className={`relative rounded-lg ${had ? "" : "bg-line-strong/35"}`}>
                <DollPreview w={56} h={body ? 72 : 56} deps={[kit, JSON.stringify(lookFor(i)), had]}
                         draw={(ctx, W, H) => {
                           if (!kit) return;
                           const l = lookFor(i);
                           if (body) {
                             const s = (H * 0.92) / (kit.heightOf(l) ?? 52);
                             kit.draw(ctx, l, "front", false, W / 2, H - Math.round(H * 0.04), s, {}, 1);
                           } else {
                             const k = fit(W, H), { w, h } = kit.headSize(l);
                             kit.drawHead(ctx, l, Math.round((W - w * k) / 2), Math.round((H - h * k) / 2), k);
                           }
                           // not had: its shadow only
                           if (!had) { ctx.globalCompositeOperation = "source-in"; ctx.fillStyle = "#0a0d13"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
                         }} />
                {!had && <span className="absolute bottom-0 right-0 grid size-5 place-items-center rounded-full bg-surface ring-1 ring-line-strong"><TownIcon name="lock" size={12} /></span>}
                {/* (a lucky drop, seen here for the first time) */}
                {had && fresh.has(item.id) && <span data-wear-fresh className="absolute -left-1 -top-1 rounded-full bg-gold px-1.5 text-[10px] font-bold leading-4 text-bg shadow">{th ? "ใหม่" : "New"}</span>}
              </span>
              <span className="text-meta leading-tight">{had ? (th ? item.th : item.en) : "???"}</span>
              {!had && <span className="whitespace-pre-line text-meta leading-tight text-muted">{whence(item)}</span>}
            </button>
          );
        })}
      </div>
    </Group>
  );
}


