"use client";

import type { ReactNode } from "react";
import { farmBook, type BookCross, type BookKind, type BookPage, type Sky } from "@/lib/town/farm-book";
import { ITEMS } from "@/lib/town/items";
import { coverOffsets, type Role, type Shape } from "@/lib/town/quality";
import TownNotebook, { type NotebookEntry } from "./TownNotebook";
import TownIcon, { type IconName } from "./TownIcon";

/**
 * The village's farm book (lib/town/farm-book): every crop a page, in pictures and a few words (the owner, 2026-11-07: "อย่าเขียน
 * ตัวอักษรอธิบายเยอะๆ"). `finds`: v322's book, each found child and who found it first ("" when nobody is known); `mine`: my
 * own `gardenBook`, which counts as found while the village's is not read yet. `extra`: pages of my own to add (the farm's
 * insect visitors).
 */
const KIND: Record<BookKind, [string, string]> = { uncle: ["ผักของลุง", "The uncle's crops"], helper: ["ผักช่วย", "Helper plants"], hybrid: ["ลูกผสม", "Hybrids"], mist: ["พันธุ์หมอก", "Mist forms"] };
const ROLE: Record<Role, { icon: IconName; th: string; en: string; dark: string }> = {
  soil: { icon: "compost", th: "ดิน", en: "Soil", dark: "#b07a3e" }, water: { icon: "can", th: "น้ำ", en: "Water", dark: "#4a9be0" },
  pollen: { icon: "pollenBrush", th: "เกสร", en: "Pollen", dark: "#e3b23c" }, guard: { icon: "guardFert", th: "ป้องกัน", en: "Guard", dark: "#d65a48" },
};
const SKY: Record<Sky, { icon: IconName; th: string; en: string }> = {
  sun: { icon: "noon", th: "แมลงกลางวัน", en: "a day pollinator" }, moon: { icon: "night", th: "แมลงกลางคืน", en: "a night pollinator" },
  mist: { icon: "timeMist", th: "แมลงในหมอกรุ่ง", en: "a dawn-mist pollinator" },
};
const CHIP = "inline-flex min-h-7 items-center gap-1 rounded border border-[#bda578] bg-[#f0dfb6] px-2 text-meta text-[#4a3520]";
const name = (id: string, th: boolean) => ITEMS[id as keyof typeof ITEMS]?.name[th ? "th" : "en"] ?? id;
const Icon = ({ id, size = 24, shade = false }: { id: string; size?: number; shade?: boolean }) =>
  <TownIcon name={id as IconName} size={size} className={shade ? "brightness-0 opacity-50" : ""} />;

/** Where a helper reaches, as a little grid: the plant in the middle, its reach in its role's colour. */
function Reach({ shape, role }: { shape: Shape; role: Role }) {
  const reach = new Set(coverOffsets(shape, 0).map(([u, v]) => `${u},${v}`)), r = 3;
  return <span aria-hidden className="inline-grid shrink-0 gap-px rounded-sm bg-[#bda578] p-px" style={{ gridTemplateColumns: `repeat(${2 * r + 1}, 6px)` }}>
    {Array.from({ length: (2 * r + 1) ** 2 }, (_, i) => { const u = (i % (2 * r + 1)) - r, v = Math.floor(i / (2 * r + 1)) - r;
      return <i key={i} className="block size-1.5" style={{ background: u === 0 && v === 0 ? "#4a3520" : reach.has(`${u},${v}`) ? ROLE[role].dark : "#f0dfb6" }} />; })}
  </span>;
}

function CrossRow({ x, th }: { x: BookCross; th: boolean }) {
  return <li className="flex flex-wrap items-center gap-1.5" data-book-cross={x.child}
    aria-label={`${name(x.a, th)} + ${name(x.b, th)}${x.sky ? ` · ${th ? SKY[x.sky].th : SKY[x.sky].en}` : ""} → ${name(x.child, th)}`}>
    <Icon id={x.a} /><span aria-hidden>+</span><Icon id={x.b} />
    {x.sky && <span className={CHIP} title={th ? SKY[x.sky].th : SKY[x.sky].en}><TownIcon name={SKY[x.sky].icon} size={16} /></span>}
    <span aria-hidden className="text-[#a8792a]">→</span><Icon id={x.child} /><span className="text-meta font-semibold">{name(x.child, th)}</span>
  </li>;
}

function Page({ p, finder, found, all, th }: { p: BookPage; finder?: string; found: number; all: number; th: boolean }): ReactNode {
  if (!p.open) return <div className="space-y-3" data-farm-page={p.id} data-shut>
    <p className="flex flex-wrap items-center gap-1.5" data-book-hint><Icon id={p.hint!} /><span className="text-meta font-semibold">{name(p.hint!, th)}</span><span aria-hidden>+</span><span className={CHIP}>?</span></p>
    <p className="text-label text-[#7a6040]">{th ? `ยังไม่มีใครในหมู่บ้านพบ · พบแล้ว ${found}/${all}` : `Nobody in the village has found it yet · ${found}/${all} found`}</p>
  </div>;
  return <div className="space-y-3" data-farm-page={p.id}>
    <p className="flex flex-wrap gap-1.5">
      <span className={CHIP}><TownIcon name="plotSprout" size={16} />{p.hours} {th ? "ชม." : "h"}</span>
      <span className={CHIP}><TownIcon name="basket" size={16} />{p.yield[0] === p.yield[1] ? p.yield[0] : `${p.yield[0]}–${p.yield[1]}`}</span>
      {p.again && <span className={CHIP}>↻ {p.again} {th ? "ชม." : "h"} ×{p.picks ?? 1}</span>}
      {p.giant && <span className={CHIP}><TownIcon name="giantPumpkinB" size={16} />{th ? "โตยักษ์ได้" : "Grows giant"}</span>}
    </p>
    {p.partner && <p className="flex items-center gap-1.5"><span className={CHIP}><TownIcon name="handshake" size={16} />{th ? "คู่หู" : "Partner"}</span><Icon id={p.partner} /><span className="text-meta font-semibold">{name(p.partner, th)}</span></p>}
    {p.role && p.shape && <p className="flex items-center gap-2"><span className={CHIP}><TownIcon name={ROLE[p.role].icon} size={16} />{th ? ROLE[p.role].th : ROLE[p.role].en}</span><Reach shape={p.shape} role={p.role} /></p>}
    {p.from.length > 0 && <div><p className="text-label text-[#7a6040]">{th ? "เกิดจาก" : "Comes from"}</p><ul className="mt-1 space-y-1.5">{p.from.map((x) => <CrossRow key={`${x.a}${x.b}${x.sky ?? ""}`} x={x} th={th} />)}</ul></div>}
    {(p.makes.length > 0 || p.hidden > 0) && <div><p className="text-label text-[#7a6040]">{th ? "ผสมกับ" : "Crosses"}</p><ul className="mt-1 space-y-1.5">
      {p.makes.map((x) => <CrossRow key={`${x.a}${x.b}${x.child}`} x={x} th={th} />)}
      {p.hidden > 0 && <li className="flex items-center gap-1.5" data-book-hidden={p.hidden}><Icon id={p.id} /><span aria-hidden>+</span><span className={CHIP}>?</span><span className="text-meta text-[#7a6040]">{th ? `ยังไม่พบอีก ${p.hidden} คู่` : `${p.hidden} still to find`}</span></li>}
    </ul></div>}
    {finder !== undefined && <p className="flex items-center gap-1.5 text-label text-[#7a6040]"><TownIcon name="rosette" size={16} />{th ? "พบคนแรก" : "First found by"} <b className="text-[#4a3520]">{finder || (th ? "ใครสักคน" : "Somebody")}</b></p>}
  </div>;
}

export default function TownFarmBook({ finds, mine, th, extra = [], initiallyOpen = false, first, onClose }: {
  finds: Readonly<Record<string, string>> | null; mine: readonly string[]; th: boolean; extra?: readonly NotebookEntry[];
  initiallyOpen?: boolean; first?: string | null; onClose?: () => void;
}) {
  const found = new Set([...Object.keys(finds ?? {}), ...mine]), pages = farmBook(found);
  const kids = pages.filter((p) => p.kind !== "uncle" && (p.from.length > 0 || !p.open)), foundKids = kids.filter((p) => p.open).length;
  const entries: NotebookEntry[] = [...pages.map((p): NotebookEntry => ({
    key: p.id, title: p.open ? name(p.id, th) : (th ? "ยังไม่พบ" : "Not found yet"), icon: p.id as IconName, shade: !p.open,
    category: KIND[p.kind][th ? 0 : 1], ...(p.open ? { searchText: `${ITEMS[p.id as keyof typeof ITEMS]?.name.th ?? ""} ${ITEMS[p.id as keyof typeof ITEMS]?.name.en ?? ""}` } : {}),
    body: <Page p={p} finder={p.open && p.from.length ? (finds?.[p.id] ?? (mine.includes(p.id) ? "" : undefined)) : undefined} found={foundKids} all={kids.length} th={th} />,
  })), ...extra];
  return <div data-farm-book><TownNotebook title={th ? "สมุดปลูกผักของหมู่บ้าน" : "The village's farm book"} th={th} icon="gardenNotebook" entries={entries}
    initiallyOpen={initiallyOpen} first={first} onClose={onClose} /></div>;
}
