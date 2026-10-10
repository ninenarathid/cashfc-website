"use client";

import { BUGS, BUG_IDS, type Habit, type HauntKind } from "@/lib/town/insects";
import { insectCareMode } from "@/lib/town/insect-garden";
import { ITEMS } from "@/lib/town/items";
import TownNotebook from "./TownNotebook";
import { type IconName } from "./TownIcon";

const HABIT: Record<Habit, [string, string]> = {
  path: ["บินตามเส้นทาง", "Flying routes"], spot: ["บินวนและหยุดพัก", "Hover and rest"],
  behind: ["ไวต่อการเข้าใกล้", "Watchful"], sound: ["ส่งเสียง", "Singing"],
  look: ["พรางตัว", "Camouflaged"], lamp: ["ชอบแสงไฟ", "Drawn to light"],
  lure: ["ชอบเหยื่อล่อ", "Drawn to bait"], crawl: ["เดินตามพื้น", "Ground walkers"],
};
const HABIT_DETAIL: Record<Habit, [string, string]> = {
  path: ["บินผ่านจุดพักเป็นเส้นทาง สังเกตแนวบินก่อนวางสวิง", "Flies between perches along a route. Watch its path before aiming the net."],
  spot: ["ลอยตัวพักสลับกับบินหนี จังหวะที่หยุดคือโอกาสเข้าหา", "Alternates hovering with quick darts. Its pause is a chance to approach."],
  behind: ["มองเห็นผู้เข้าใกล้จากด้านหน้าได้ดี ลองสังเกตทิศที่มันหัน", "Notices an approach from the front. Watch which way it faces."],
  sound: ["เสียงช่วยบอกตำแหน่ง เมื่อมีคนเดินใกล้อาจเงียบหรือบินหนี", "Its song gives away its location. Nearby footsteps may silence or startle it."],
  look: ["มองหาการขยับเล็ก ๆ หรือแสงกะพริบระหว่างสิ่งรอบตัว", "Look for a small movement or a flicker among its surroundings."],
  lamp: ["บินวนใกล้แสงไฟ สังเกตวงบินรอบโคม", "Circles a light. Watch its flight around a lamp."],
  lure: ["ลงมาหาของหวานที่ถืออยู่นิ่ง ๆ แล้วจึงเปลี่ยนไปใช้สวิง", "Comes down to something sweet held still; then switch to the net."],
  crawl: ["เดินจากที่หนึ่งไปอีกที่หนึ่ง และหยุดพักตามทาง", "Walks from perch to perch with rests along the way."],
};
const PLACE: Record<HauntKind, [string, string]> = {
  blooms: ["ดอกไม้", "Flowers"], water: ["ริมน้ำ", "Water's edge"], field: ["ทุ่ง", "Fields"],
  lamp: ["โคมไฟ", "Lamps"], tree: ["ต้นไม้", "Trees"], litter: ["ใบไม้บนพื้น", "Leaf litter"],
  glade: ["ที่โล่งในป่า", "Forest clearings"], falls: ["น้ำตก", "Waterfalls"],
};

export default function TownBugBook({ book, th }: { book: Record<string, string>; th: boolean }) {
  const found = BUG_IDS.filter(id => book[id] !== undefined), lang = th ? 0 : 1;
  if (!found.length) return null;
  return <div data-bug-book><TownNotebook title={th ? "สมุดแมลงของหมู่บ้าน" : "The village's book of insects"} th={th} icon="bugNet" entries={found.map(id => {
    const bug = BUGS[id], care = insectCareMode(id);
    return { key: id, title: ITEMS[id].name[th ? "th" : "en"], searchText: `${ITEMS[id].name.th} ${ITEMS[id].name.en}`, icon: id as IconName, category: HABIT[bug.habit][lang], body: <div data-bug={id}>
      <p>{ITEMS[id].about[th?"th":"en"]}</p>
      <p>{HABIT_DETAIL[bug.habit][lang]}</p>
      <p><small>{th ? "พบแถว" : "Often near"}</small><br/>{bug.at.map(p => PLACE[p][lang]).join(" · ")}</p>
      {care && <p><small>{th ? "ช่วยดูแลสวน" : "Garden care"}</small><br/>{care === "pollinate" ? th ? "ปล่อยบนต้นของคุณที่ยังไม่สุก เพื่อช่วยผสมเกสร ใช้แมลง 1 ตัว" : "Release one on your unripe plant to help pollination. Uses one insect." : th ? "ปล่อยบนต้นที่มีศัตรูพืชเพื่อช่วยกำจัด ใช้แมลง 1 ตัว" : "Release one on a plant with pests to help remove them. Uses one insect."}</p>}
      <p><small>{th ? "จับได้คนแรก" : "First caught by"}</small><br/>{book[id] || (th ? "ใครสักคน" : "Somebody")}</p>
      <p><small>{th ? `หมู่บ้านบันทึกแล้ว ${found.length} / ${BUG_IDS.length} ชนิด` : `The village has recorded ${found.length} / ${BUG_IDS.length} species`}</small></p>
    </div> };
  })}/></div>;
}
