"use client";

import { FISH, type FishId, type BaitId } from "@/lib/town/items";
import type { FishingHabitat } from "@/lib/town/river-items";
import { ITEMS } from "@/lib/town/items";
import { BANDS } from "@/lib/town/bands";
import TownNotebook from "./TownNotebook";
import TownIcon, { type IconName } from "./TownIcon";
import { GIANTS } from "@/lib/town/giant-fish";
import type { FishBookLine, GiantRecord } from "@/lib/town/fish-book";

/**
 * The village's book of fish (the owner, 2026-10-27: "อยากให้เพิ่มสมุดปลาด้วย"), the insect book's twin
 * (TownBugBook): only the kinds somebody has landed, each with who landed the first and the biggest the village has
 * landed and by whom; and the giants, landed together, with the angler's and the netter's names.
 */

const WATER: Record<FishingHabitat, [string, string]> = { town: ["ท่าน้ำในเมือง", "The town's water"], creek: ["ลำธาร", "The creek"], headwater: ["ต้นน้ำ", "The headwater"], pool: ["แอ่งน้ำตก", "The falls pool"] };
const TIER: Record<string, [string, string]> = { common: ["พบบ่อย", "Common"], uncommon: ["ไม่บ่อย", "Uncommon"], rare: ["หายาก", "Rare"], legend: ["ตำนาน", "Legend"] };

/** The time bands a fish bites in, from its hours. */
function bandsOf(hours: Array<[number, number]>): string[] {
  const on = (h: number) => hours.some(([a, b]) => h >= a && h < b);
  return BANDS.filter((band) => { for (let h = band.from; h !== band.to; h = (h + 1) % 24) if (on(h)) return true; return false; }).map((b) => b.id);
}

export default function TownFishBook({ book, giants, th }: { book: Partial<Record<FishId, FishBookLine>>; giants: GiantRecord[]; th: boolean }) {
  const found = (Object.keys(FISH) as FishId[]).filter((id) => book[id]), lang = th ? 0 : 1, all = Object.keys(FISH).length;
  if (!found.length && !giants.length) return null;
  const giantCat = th ? "ปลายักษ์" : "Giants";
  const fish = found.map((id) => {
    const f = FISH[id], line = book[id]!, waters = f.habitat ?? ["town"];
    const fav = (Object.entries(f.baits) as Array<[BaitId, number]>).filter(([, w]) => w >= 1).map(([b]) => ITEMS[b]?.name[th ? "th" : "en"] ?? b);
    return { key: id, title: ITEMS[id].name[th ? "th" : "en"], searchText: `${ITEMS[id].name.th} ${ITEMS[id].name.en}`, icon: id as IconName, category: WATER[waters[0]][lang], body: <div data-fish={id}>
      <p>{ITEMS[id].about[th ? "th" : "en"]}</p>
      <p><small>{th ? "ที่และเวลา" : "Where and when"}</small><br/>{waters.map((w) => WATER[w][lang]).join(" · ")} · {bandsOf(f.hours).map((b) => { const band = BANDS.find((x) => x.id === b)!; return th ? band.th : band.en; }).join(" · ")}</p>
      <p><small>{th ? "เหยื่อที่ชอบ" : "Favourite bait"}</small><br/>{fav.join(" · ")}</p>
      <p><small>{th ? "ความยาว" : "Length"}</small><br/>{f.size[0]}–{f.size[1]} {th ? "ซม." : "cm"} · {TIER[f.tier][lang]}</p>
      {line.best && <p><small>{th ? "ตัวใหญ่สุดของหมู่บ้าน" : "The village's biggest"}</small><br/><b>{line.best[0]} {th ? "ซม." : "cm"}</b> · {line.best[1]}</p>}
      <p><small>{th ? "ตกได้คนแรก" : "First landed by"}</small><br/>{line.first}</p>
      <p><small>{th ? `หมู่บ้านบันทึกแล้ว ${found.length} / ${all} ชนิด` : `The village has recorded ${found.length} / ${all} species`}</small></p>
    </div> };
  });
  const big = giants.filter((r) => r.id in GIANTS).map((r) => { const g = GIANTS[r.id]; return { key: `giant-${r.id}`, title: th ? g.th : g.en, searchText: `${g.th} ${g.en}`, icon: r.id as IconName, category: giantCat, body: <div data-giant-fish={r.id}>
    <p>{g.look[lang]}</p>
    <p><small>{th ? "ที่" : "Where"}</small><br/>{WATER[g.water][lang]}</p>
    <p><small>{th ? "ตัวใหญ่สุดของหมู่บ้าน" : "The village's biggest"}</small><br/><b>{r.size} {th ? "ซม." : "cm"} · {r.weight} {th ? "กก." : "kg"}</b></p>
    <p className="flex flex-wrap items-center gap-2"><TownIcon name="rodMaster" size={18}/>{th ? "คนตก" : "Angler"} {r.angler} <span aria-hidden>·</span> <TownIcon name="netLong" size={18}/>{th ? "คนช้อน" : "Netter"} {r.netter}</p>
    <p><small>{th ? "ปลายักษ์ขึ้นคนเดียวไม่ได้: คนตกกับคนช้อนได้ชื่ออยู่ในสมุดด้วยกัน" : "No giant is landed alone: the angler and the netter share the page."}</small></p>
  </div> }; });
  return <div data-fish-book><TownNotebook title={th ? "สมุดปลาของหมู่บ้าน" : "The village's book of fish"} th={th} icon="fishBook" entries={[...big, ...fish]}/></div>;
}
