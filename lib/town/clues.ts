import { KINDS, SPOT_KINDS, type SpotKind } from "./forest";
import { CROPS, CROP_IDS, FISH, ITEMS, MAKES, growIconOf, type CropId, type Fish, type FishId, type ItemId, type ItemKind, type Tier } from "./items";
import { BASIC, UNLOCKS } from "./orders";
import type { Line } from "./talk";
import { GEOLOGY_RAW } from "./geology-items";
import { WOOD_RAW } from "./wood-items";
import { FORAGE_PARTS } from "./foraging-parts";
import { STREAM_RAW } from "./stream-items";
import { CRAFTS, isCraft } from "./crafting";
import { PREP_MAKES } from "./preparation-items";
import { PREPARATION, type PrepId } from "./preparation";
import type { Zone } from "./world";

/**
 * What a recipe's hidden thing is told by (the owner, 2026-10-06: "อยากให้ใบ้ง่ายขึ้น เพราะมี่คนเจอ ของป่าอะไรซักอย่าง แล้ว
 * ขอบเขตุการหามันเยอะเกินไป อยากให้ใบ้เพิ่มทุกเมนู").
 *
 * A found recipe never names its last thing (lib/town/hints). Until now it said only the thing's kind, and a kind
 * is wide: "something from the forest" was one of thirty-five things, "some fish" one of fifty, and each wrong guess
 * cost everything put in. Now it says two things more, both read off the game's own data, so they cannot be wrong
 * and a new dish has them without anybody writing a word:
 *
 * - **which sort it is** (`sort`): a mushroom, something dug up, a plant grown from a bulb, a common fish, something
 *   made in a jar;
 * - **where it is had** (`from`): the part of the forest, the water and the hours of a fish (never its bait: what a
 *   bait brings is for the anglers to find, the owner, 2026-10-03), how long a plant takes, how early the uncle has
 *   it, how many things it is made of.
 *
 * Together they leave a handful to choose among, not the name. Everything here can be learnt by playing: the parts
 * of the forest by walking it, a fish's hours by fishing them, what something is made in by making it. Only a
 * plant's time could not be, short of growing it, so a seed's card says it now in the same words (`seedTime`; the
 * owner: "ควรต้องเปิดเผยเวลาในการปลูกพืชแต่ละต้นในถุงเมล็ด", "บอกไปเลย").
 *
 * Pure: words out of data.
 */
export interface Clue { sort: Line; from: Line | null }

/**
 * How many times a recipe has to be missed by its hidden thing alone (lib/town/cooking counts them) before it says
 * more: what the thing looks like after the first (it was three), and its shadow after the third. Never its name.
 */
export const CLUES = { looks: 1, shadow: 3 };

/** What a thing of each kind is called by a recipe that will not name it. */
export const KIND_WORD: Record<ItemKind, Line> = {
  tool: { th: "เครื่องมือสักอย่าง", en: "some tool" },
  bait: { th: "เหยื่อสักอย่าง", en: "some bait" },
  staple: { th: "ของคู่ครัวสักอย่าง", en: "some staple" },
  seed: { th: "เมล็ดสักอย่าง", en: "some seed" },
  crop: { th: "ผักหรือผลไม้สักอย่าง", en: "some vegetable or fruit" },
  fish: { th: "ปลาหรือสัตว์น้ำสักอย่าง", en: "some fish or river creature" },
  catch: { th: "ของที่ลอยมากับน้ำสักอย่าง", en: "something the river brings" },
  wild: { th: "ของป่าสักอย่าง", en: "something from the forest" },
  bug: { th: "แมลงสักตัว", en: "some insect" },
  goods: { th: "ของแปรรูปสักอย่าง", en: "something that is made" },
  dish: { th: "อาหารสักอย่าง", en: "some dish" },
  scroll: { th: "ม้วนกระดาษสักม้วน", en: "some scroll" },
  wood: { th: "ไม้สักอย่าง", en: "some wood" },
  mineral: { th: "หินหรือแร่สักอย่าง", en: "some stone or ore" },
};

const line = (th: string, en: string): Line => ({ th, en });
/** Several clues as one, in the order given: "ลานตกปลา · ตอนกลางคืน". */
const both = (parts: Array<Line | null>): Line | null => {
  const all = parts.filter((p): p is Line => !!p);
  return all.length ? line(all.map((p) => p.th).join(" · "), all.map((p) => p.en).join(" · ")) : null;
};

/* ── how long a plant takes ─────────────────────────────────────────────── */

/** How long a plant takes from seed to ripe, in round words: [up to so many hours, the words]. Never the hours themselves. */
const GROWS: Array<[number, Line]> = [
  [12, line("ไม่ถึงครึ่งวัน", "under half a day")],
  [30, line("ราว 1 วัน", "about a day")],
  [54, line("ราว 2 วัน", "about two days")],
  [84, line("ราว 3 วัน", "about three days")],
  [132, line("4–5 วัน", "four or five days")],
  [204, line("ราว 1 สัปดาห์", "about a week")],
  [Infinity, line("เกิน 1 สัปดาห์", "over a week")],
];
/** So many hours of growing, in round words. */
export const growsIn = (hours: number): Line => GROWS.find(([most]) => hours <= most)![1];
const SEED_OF = new Map<ItemId, CropId>(CROP_IDS.map((c) => [CROPS[c].seed, c]));
/** What a seed's card says of its plant: how long it takes to ripen, in round words. Null for anything that is no seed. */
export function seedTime(id: ItemId): Line | null {
  const crop = SEED_OF.get(id);
  if (!crop) return null;
  return ripens(CROPS[crop].hours);
}
/** How long a plant takes, as a seed's card and a recipe's clue both say it: the same words, so that one can be matched to the other. */
const ripens = (hours: number): Line => { const t = growsIn(hours); return line(`ใช้เวลาโต ${t.th}`, `ripe in ${t.en}`); };

/* ── vegetables ─────────────────────────────────────────────────────────── */

/** What a plant is grown from, by what its plot shows first (lib/town/items' growIconOf). */
const SOWN_AS: Record<string, Line> = {
  plotSeeds: line("ผักที่ปลูกจากเมล็ดเล็กๆ", "a plant grown from small seeds"),
  plotSeedsBig: line("ผักที่ปลูกจากเมล็ดใหญ่", "a plant grown from big seeds"),
  plotBulb: line("ผักที่ปลูกจากหัว", "a plant grown from a bulb"),
  plotRoot: line("ผักที่ปลูกจากเหง้า", "a plant grown from a root"),
  plotCutting: line("ผักที่ปลูกจากกิ่งหรือหน่อ", "a plant grown from a cutting"),
  plotNut: line("ผลไม้ที่ปลูกจากลูกทั้งผล", "a tree grown from a whole fruit"),
};
function cropClue(crop: CropId): Clue {
  return { sort: SOWN_AS[growIconOf(crop, 1)] ?? KIND_WORD.crop, from: ripens(CROPS[crop].hours) };
}

/* ── fish ───────────────────────────────────────────────────────────────── */

const TIER_WORD: Record<Tier, Line> = {
  common: line("ปลาหรือสัตว์น้ำที่พบบ่อย", "a common fish or river creature"),
  uncommon: line("ปลาหรือสัตว์น้ำที่พบไม่บ่อย", "an uncommon fish or river creature"),
  rare: line("ปลาหรือสัตว์น้ำหายาก", "a rare fish or river creature"),
  legend: line("ปลาในตำนาน", "a fish of legend"),
};
const WATER_WORD = {
  bank: line("ริมตลิ่ง", "off the bank"),
  deck: line("ลานตกปลา", "off the deck"),
  both: line("ริมตลิ่งหรือลานตกปลา", "off the bank or the deck"),
};
/**
 * Which part of the day some hours are, in a word. A fish's hours are told as widely as this and no closer: in the
 * morning, by day, at dawn and dusk, in the evening, by night, from morning till night, at any hour.
 */
export function dayPart(hours: Array<[number, number]>): Line {
  const on = new Set<number>();
  for (const [from, to] of hours) for (let h = from; h < to; h++) on.add(((h % 24) + 24) % 24);
  const all = [...on], within = (ok: (h: number) => boolean) => all.every(ok), some = (ok: (h: number) => boolean) => all.some(ok);
  const dawn = (h: number) => h >= 4 && h < 10, dusk = (h: number) => h >= 16 && h < 21;
  if (all.length >= 22) return line("ทั้งวันทั้งคืน", "at any hour");
  if (within((h) => h >= 4 && h < 12)) return line("ตอนเช้า", "in the morning");
  if (within((h) => h >= 5 && h < 19)) return line("ตอนกลางวัน", "by day");
  if (within((h) => dawn(h) || dusk(h)) && some(dawn) && some(dusk)) return line("ตอนเช้าตรู่และพลบค่ำ", "at dawn and dusk");
  if (within((h) => h >= 16)) return line("ตอนเย็นถึงค่ำ", "in the evening");
  if (within((h) => h >= 17 || h < 7)) return line("ตอนกลางคืน", "by night");
  if (within((h) => h >= 5 && h < 23)) return line("ตั้งแต่เช้าจนค่ำ", "from morning till night");
  return line("บางช่วงของวัน", "at certain hours");
}
function fishClue(f: Fish): Clue {
  const water = f.water ?? (f.tier === "common" ? "both" : "deck");
  const sky = f.rain === 0 ? line("ตอนฝนไม่ตก", "never in the rain") : f.dry === 0 ? line("เฉพาะตอนฝนตก", "only in the rain") : null;
  // (what a fish waits for beyond the hour and the sky is a secret of the river's: only that there is something)
  const waits = f.needs?.length ? line("เฉพาะบางโอกาส", "only on certain occasions") : null;
  const regional = f.habitat?.map(h => h === "creek" ? line("ลำธารในป่า", "forest creek") : h === "pool" ? line("แอ่งน้ำ", "deep pool") : line("ต้นน้ำ", "headwaters"));
  return { sort: TIER_WORD[f.tier], from: both([regional?.length ? line(regional.map(l=>l.th).join("หรือ"),regional.map(l=>l.en).join(" or ")) : WATER_WORD[water], dayPart(f.hours), sky, waits]) };
}

/* ── the forest ─────────────────────────────────────────────────────────── */

const SPOT_WORD: Record<SpotKind, Line> = {
  sticks: line("ของที่ร่วงอยู่ใต้ต้นไม้", "something fallen under the trees"),
  leaves: line("ของที่อยู่ตามกองใบไม้", "something among the fallen leaves"),
  flowers: line("ดอกไม้ป่าสักอย่าง", "some wild flower"),
  bamboo: line("ของจากกอไผ่", "something of the bamboo"),
  clay: line("ดินจากริมน้ำ", "some earth from the waterside"),
  mushrooms: line("เห็ดสักอย่าง", "some mushroom"),
  greens: line("ใบไม้หรือสมุนไพรสักอย่าง", "some leaf or herb"),
  berries: line("ผลเบอร์รีสักอย่าง", "some berry"),
  nook: line("ของที่ซ่อนอยู่ตามซอกไม้", "something tucked in a nook"),
  mound: line("ของที่ต้องขุดขึ้นมาจากดิน", "something dug out of the ground"),
  fruit: line("ผลไม้ที่ต้องเขย่าลงมาจากต้น", "something shaken down from a tree"),
  glint: line("ของที่ตกลงมาจากฟ้า", "something fallen from the sky"),
};
const ZONE_WORD: Record<Zone, Line> = {
  edge: line("ชายป่า", "the forest's edge"),
  woods: line("กลางป่า", "the woods"),
  bamboo: line("ดงไผ่", "the bamboo grove"),
  stream: line("ริมลำธาร", "the stream's banks"),
  deep: line("ป่าลึก", "the deep woods"),
  rise: line("เนินหิน", "the rocky rise"),
  camp: line("ลานกองไฟ", "the camp"),
};
/** Where in the forest each thing is found: the kinds of place, and the parts of the forest (none: anywhere). */
const WILD = (() => {
  const all = new Map<ItemId, { kinds: SpotKind[]; zones: Zone[]; anywhere: boolean }>();
  for (const kind of SPOT_KINDS) for (const f of KINDS[kind].finds) {
    const w = all.get(f.item) ?? { kinds: [], zones: [], anywhere: false };
    if (!w.kinds.includes(kind)) w.kinds.push(kind);
    if (f.zones?.length) { for (const z of f.zones) if (!w.zones.includes(z)) w.zones.push(z); } else w.anywhere = true;
    all.set(f.item, w);
  }
  return all;
})();
function wildClue(id: ItemId): Clue | null {
  const w = WILD.get(id);
  if (!w) return null;
  const from = w.anywhere ? line("พบได้ทั่วป่า", "anywhere in the forest")
    : w.zones.length > 2 ? line("พบได้หลายส่วนของป่า", "in several parts of the forest")
      : line(`แถว${w.zones.map((z) => ZONE_WORD[z].th).join("หรือ")}`, `around ${w.zones.map((z) => ZONE_WORD[z].en).join(" or ")}`);
  return { sort: SPOT_WORD[w.kinds[0]], from };
}

/* ── the uncle's shelf, and what is made ────────────────────────────────── */

/** How early the uncle has a thing: from the first, or in which third of what his orders open. Null for what he never sells. */
function shelfClue(id: ItemId): Line | null {
  if (BASIC.includes(id)) return line("ลุงมีขายตั้งแต่แรก", "on the uncle's shelf from the first");
  const i = UNLOCKS.indexOf(id);
  if (i < 0) return null;
  return [
    line("ลุงเอามาขายเป็นอย่างแรกๆ", "among the first things the uncle adds"),
    line("ลุงเอามาขายช่วงกลาง", "added to the uncle's shelf midway"),
    line("ลุงเอามาขายช่วงท้าย", "among the last things the uncle adds"),
  ][Math.min(2, Math.floor((3 * i) / UNLOCKS.length))];
}
function madeClue(id: ItemId): Clue | null {
  const m = MAKES[id];
  if (!m) return null;
  const tool = m.in[0];
  return {
    sort: tool ? line(`ของที่ทำด้วย${ITEMS[tool].name.th}`, `something made with a ${ITEMS[tool].name.en.toLowerCase()}`) : line("ของที่ทำด้วยมือเปล่า", "something made by hand"),
    from: line(`ทำจากของ ${m.needs.length} อย่าง`, `made of ${m.needs.length === 1 ? "one thing" : `${m.needs.length} things`}`),
  };
}

/**
 * The clues of a thing: which sort it is, and where it is had. Every thing has a sort (its kind's own word at the
 * least); `from` is null only for what nothing here knows the whereabouts of.
 */
export function clueOf(id: ItemId): Clue {
  const kind = ITEMS[id].kind;
  if (Object.hasOwn(PREP_MAKES,id)) return {sort:[line("วัตถุดิบที่หั่นหรือผึ่งไว้","an ingredient cut or dried"),line("วัตถุดิบที่บดและผสม","an ingredient ground and mixed"),line("วัตถุดิบที่คั่วหรือตีเข้ากัน","an ingredient toasted or whisked")][PREPARATION.methods[id as PrepId]],from:line("ทดลองที่เขียงใกล้เตาในลานอาหาร","try a preparation board beside a kitchen stove")};
  if (isCraft(id)) return { sort: KIND_WORD[kind], from: line(`ประกอบที่โต๊ะงานจากวัสดุ ${CRAFTS[id].length} อย่าง`, `assembled at the workshop from ${CRAFTS[id].length} materials`) };
  if ((STREAM_RAW as readonly string[]).includes(id)) return {sort:line("ของที่แยกเก็บจากต้นน้ำ", "a part collected beside a mountain stream"),from:line("แถวแอ่งและร่องไหลบนภูเขา", "at mountain pools and running channels")};
  const part=Object.entries(FORAGE_PARTS.parts).flatMap(([spot,parts])=>Object.entries(parts).map(([part,item])=>({spot,part,item}))).find(p=>p.item===id);
  if(part)return {sort:line(part.part==="root"?"ส่วนใต้ต้นที่ต้องแยกเก็บ":"ส่วนเล็กที่เก็บโดยเหลือต้นไว้",part.part==="root"?"a part separated beneath a plant":"a small part gathered while leaving its plant"),from:line(`พบจากร่องรอยแถว${({leaves:"กองใบไม้",flowers:"ดอกไม้",bamboo:"ไผ่",greens:"พืชใบเขียว",berries:"เบอร์รี",mushrooms:"เห็ด"} as Record<string,string>)[part.spot]}`,`found by inspecting a forest ${part.spot} patch`)};
  if (kind === "fish" && id in FISH) return fishClue(FISH[id as FishId]);
  if (kind === "crop" && id in CROPS) return cropClue(id as CropId);
  if (kind === "wild") { const w = wildClue(id); if (w) return w; }
  if (kind === "goods" || kind === "staple") { const m = madeClue(id); if (m) return m; }
  if (kind === "catch") return { sort: KIND_WORD.catch, from: line("ติดเบ็ดขึ้นมาแทนปลา", "comes up on a line in a fish's place") };
  if ((GEOLOGY_RAW as readonly string[]).includes(id)) return { sort: KIND_WORD[kind], from: id === "wholeGeode" ? line("ผลึกที่รักษาไว้หลังตามเสียงในสายแร่อัญมณี", "a crystal preserved after following a gem seam's echo") : id === "quartzCore" ? line("พบตามแนวแร่ด้วยสิ่วหรือสายสำรวจ", "found along a ringing seam using a chisel or survey cord") : line("เก็บจากชั้นหินหลังฟังเสียงสะท้อนในถ้ำ", "gathered from rock layers after listening to a cave's echoes") };
  if ((WOOD_RAW as readonly string[]).includes(id)) return { sort: KIND_WORD.wood, from:
    id === "cedarSliver" ? line("ส่วนหนึ่งจากต้นไม้เก่าแก่บนภูเขา", "a part of the ancient mountain tree") :
    ["knottedWood", "straightWood", "heartwood"].includes(id) ? line("เนื้อที่เลือกเก็บหลังอ่านเสี้ยนและโค่นต้นไม้", "the selected interior after reading the grain and felling a tree") :
    line("ส่วนที่เลือกเก็บจากรอบลำต้นบนภูเขา", "a selected part around a mountain trunk") };
  if (kind === "wood") return { sort: KIND_WORD.wood, from: line("โค่นต้นไม้บนภูเขา ฟันหลบกิ่งเพื่อได้ชิ้นที่เรียบร้อย", "fell mountain trees; avoid branches to obtain clean pieces") };
  return { sort: KIND_WORD[kind], from: shelfClue(id) };
}
