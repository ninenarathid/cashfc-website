"use client";

import { useEffect, useMemo, useState } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { BANDS, bandAt, bandOf, type BandId } from "@/lib/town/bands";
import { bangkokMinute } from "@/lib/town/daylight";
import { FAMILIES, NEW_FISH_ROWS, NEW_INSECTS, outNow, type Rarity, type TimeIcon, type Window } from "@/lib/town/band-species";
import type { HauntKind } from "@/lib/town/insects";
import { ITEMS, type FishId, type ItemId } from "@/lib/town/items";
import type { FishingHabitat } from "@/lib/town/river-items";
import type { Place } from "@/lib/town/world";
import TownNotebook, { type NotebookEntry } from "./TownNotebook";
import TownIcon, { type IconName } from "./TownIcon";
import { PLACE as HAUNT_PLACE } from "./TownBugBook";

const MAP: Record<Place, [string, string]> = { town: ["ในเมือง", "Town"], farm: ["ฟาร์ม", "Farm"], forest: ["ป่า", "Forest"], mountain: ["ภูเขา", "Mountain"], cave: ["ถ้ำ", "Cave"] };
const WATER: Record<FishingHabitat, [string, string]> = { town: ["แม่น้ำในเมือง", "The town river"], creek: ["ลำธารในป่า", "The forest creek"], pool: ["แอ่งน้ำ", "Pools"], headwater: ["ต้นน้ำ", "Headwaters"] };
const RARITY: Record<Rarity, [string, string]> = { C: ["พบบ่อย", "Common"], U: ["ไม่บ่อย", "Uncommon"], R: ["หายาก", "Rare"], V: ["หายากมาก", "Very rare"] };
const TIME: Record<TimeIcon, [IconName, string, string]> = { sun: ["noon", "ออกกลางวัน", "A day insect"], moon: ["night", "ออกกลางคืน", "A night insect"], mist: ["timeMist", "ออกในหมอกรุ่ง", "A dawn-mist insect"] };
const KIND: Record<Window["kind"], [string, string]> = { insect: ["แมลง", "Insects"], fish: ["สัตว์น้ำ", "Water life"], find: ["ของหายาก", "Rare finds"] };
const ORDER: Record<Rarity, number> = { C: 0, U: 1, R: 2, V: 3 };
const bandName = (id: BandId, th: boolean) => { const b = BANDS.find((x) => x.id === id)!; return th ? b.th : b.en; };
const span = (b: { from: number; to: number }) => `${String(b.from % 24).padStart(2, "0")}–${String(b.to % 24).padStart(2, "0")}`;

/**
 * What is out now (the owner, AGENTS.md "Cash Town time of day": "Show what is out now"): the time bands' newcomers
 * out on this map in this band, opened from the clock's band. One not yet found is a dark shape, with where, when and
 * its habit or its bait: an insect is found once anybody in the village has caught one (the village's book), a fish
 * once I have (my longest of it), and a rare find is named.
 */
export default function TownOutNow({ keeper, th, place, hour, onClose }: { keeper: Keeper; th: boolean; place: Place; hour: number | null; onClose: () => void }) {
  const lang = th ? 0 : 1;
  // (it follows the clock while open, as TownClock does, and the keeper: what is caught is named at once)
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 15_000); const off = keeper.watch(() => setTick((n) => n + 1)); return () => { clearInterval(t); off(); }; }, [keeper]);
  const minute = hour !== null ? hour * 60 : bangkokMinute(new Date());
  const band = hour !== null ? bandAt(minute) : bandOf(new Date()), h = (((minute % 1440) + 1440) % 1440) / 60;
  const book = keeper.bugBook(), best = keeper.purse().best;
  const entries = useMemo((): NotebookEntry[] => {
    const here = outNow(place, band.id, h).sort((a, b) => (a.kind === b.kind ? ORDER[a.rarity] - ORDER[b.rarity] : 0));
    const found = (w: Window) => (w.kind === "insect" ? book[w.id] !== undefined : w.kind === "fish" ? best[w.id as FishId] !== undefined : true);
    const out = here.map((w): NotebookEntry => {
      const known = found(w), name = ITEMS[w.id as ItemId].name[th ? "th" : "en"], fam = w.family ? FAMILIES[w.family] : null;
      const insect = w.kind === "insect" ? NEW_INSECTS.find((r) => r.id === w.id) : undefined, fish = w.kind === "fish" ? NEW_FISH_ROWS.find((r) => r.id === w.id) : undefined;
      const where = insect ? `${MAP[insect.place][lang]} · ${HAUNT_PLACE[insect.at as HauntKind][lang]}` : fish ? WATER[fish.habitat][lang] : w.how ? w.how[lang] : MAP[place][lang];
      const baits: ItemId[] = fish ? (fish.bait === "smallFish" ? ["minnow", "loach"] : [fish.bait]) as ItemId[] : [];
      return {
        key: w.id, icon: w.id as IconName, shade: !known, category: KIND[w.kind][lang],
        title: known ? name : `${th ? "ยังไม่พบ" : "Not found yet"}${fam ? ` · ${th ? fam.th : fam.en}` : ""}`,
        searchText: known ? `${ITEMS[w.id as ItemId].name.th} ${ITEMS[w.id as ItemId].name.en}` : "",
        body: <div data-out-now={w.id}>
          {insect && <p className="flex items-center gap-2"><TownIcon name={TIME[insect.time][0]} size={18}/>{TIME[insect.time][th ? 1 : 2]}</p>}
          <p><small>{th ? "ที่" : "Where"}</small><br/>{where}</p>
          <p><small>{th ? "ช่วงเวลา" : "When"}</small><br/>{w.hours ? `${bandName(w.bands[0], th)} ${w.hours.map((r) => span({ from: r[0], to: r[1] })).join(" · ")}`
            : w.bands.map((b) => `${bandName(b, th)} ${span(BANDS.find((x) => x.id === b)!)}`).join(" · ")}
            {w.peak && <><br/>{th ? `ออกมากที่สุดช่วง${bandName(w.peak, th)}` : `Most out in the ${bandName(w.peak, th).toLowerCase()}`}</>}</p>
          {insect && <p><small>{th ? "วิธีจับ" : "How to catch it"}</small><br/>{insect.hint[lang]}</p>}
          {fish && <p><small>{th ? "เหยื่อ" : "Bait"}</small><br/><span className="flex flex-wrap items-center gap-2">{baits.map((b) => <span key={b} className="flex items-center gap-1"><TownIcon name={b as IconName} size={20}/>{ITEMS[b].name[th ? "th" : "en"]}</span>)}</span></p>}
          {fam && <p><small>{th ? "ตระกูล" : "Family"}</small><br/>{th ? fam.th : fam.en}{fam.now ? ` · ${fam.now[lang]}` : ""}</p>}
          <p><small>{RARITY[w.rarity][lang]}{w.kind === "insect" ? ` · ${known ? (th ? `หมู่บ้านพบแล้ว คนแรกคือ ${book[w.id] || "ใครสักคน"}` : `Found by the village, first by ${book[w.id] || "somebody"}`) : (th ? "ยังไม่มีใครในหมู่บ้านจับได้" : "Nobody in the village has caught one yet")}`
            : w.kind === "fish" ? ` · ${known ? (th ? `จับได้แล้ว ยาวที่สุด ${best[w.id as FishId]} ซม.` : `Caught, your longest ${best[w.id as FishId]} cm`) : (th ? "คุณยังไม่เคยจับได้" : "You have not caught one yet")}` : ""}</small></p>
        </div>,
      };
    });
    // the other maps, in a line each: how many are out there now (the same band)
    const elsewhere = (["town", "farm", "forest", "mountain", "cave"] as Place[]).filter((p) => p !== place).map((p) => [p, outNow(p, band.id, h)] as const).filter(([, ws]) => ws.length);
    if (elsewhere.length || !out.length) out.push({
      key: "elsewhere", icon: "walk", title: th ? "ที่อื่นตอนนี้" : "Elsewhere now",
      body: <div data-out-elsewhere>
        {!out.length && <p>{th ? "ช่วงนี้ไม่มีอะไรใหม่ออกแถวนี้" : "Nothing new is out around here in this band."}</p>}
        {elsewhere.map(([p, ws]) => <p key={p}><small>{MAP[p][lang]} · {th ? `${ws.length} อย่าง` : `${ws.length} out`}</small><br/>
          <span className="flex flex-wrap gap-1">{ws.map((w) => <TownIcon key={w.id} name={w.id as IconName} size={22} className={found(w) ? "" : "brightness-0 opacity-60"}/>)}</span></p>)}
      </div>,
    });
    return out;
  }, [place, band.id, h, book, best, th, lang, tick]);
  return <TownNotebook cover={false} initiallyOpen onClose={onClose} icon="bugNet" th={th} entries={entries}
    title={`${th ? "ออกตอนนี้" : "Out now"} · ${th ? band.th : band.en} · ${MAP[place][lang]}`}/>;
}
