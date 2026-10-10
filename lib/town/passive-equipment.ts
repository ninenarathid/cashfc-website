import type { ItemId } from "./items";
import type { Purse } from "./trade";
import { COOK_EASE, TACKLE } from "./gear";

type Effect = { th: string; en: string };
const effect = (th: string, en: string): Effect => ({ th, en });
/** Only reusable tools whose benefit is checked by possession, never ingredients or hand tools. */
export const PASSIVE_EQUIPMENT: Partial<Record<ItemId, Effect>> = {
  apron: effect(`ช่วงความเร็วคนอาหารกว้างขึ้นประมาณ ${Math.round((Math.sqrt(COOK_EASE.apron!) - 1) * 100)}%`, "Wider safe stirring pace (about 14%)"),
  stoveBig: effect("จำนวนเสิร์ฟ ×1.25 ใช้โบนัสเครื่องครัวที่ดีที่สุด", "Helpings ×1.25; best cookware bonus applies"),
  ladle: effect("จำนวนเสิร์ฟอาหาร +1 ต่อหม้อ", "+1 helping per cooked pot"),
  tok: effect("หม้อที่วางนอกลานใช้โตก ตักได้ไกล 3.2 ช่อง", "Pots set outside the yard use a table; serving reach 3.2 tiles"),
  notchGauge: effect("เห็นคำใบ้ลายไม้ 1 จุด", "Shows 1 grain hint"),
  grainLens: effect("เห็นคำใบ้ลายไม้ 3 จุด ใช้คำใบ้ที่ดีที่สุด", "Shows 3 grain hints; strongest hint applies"),
  fellingWedge: effect("ช่วยอ่านทิศทางโค่น", "Reveals the felling direction"),
  braceStake: effect("ให้อภัยพลาดลายไม้ 1 ครั้ง", "Forgives 1 wood-grain mistake"),
  barkKnife: effect("เก็บเปลือกไม้ได้ 2 ชิ้น", "Collects 2 bark pieces"),
  sapTap: effect("เก็บยางสนได้ 2 ชิ้น", "Collects 2 pine-pitch pieces"),
  echoHammer: effect("แสดงคำใบ้เสียงชั้นแร่", "Shows a mineral-layer echo hint"),
  cavityLens: effect("แสดงตำแหน่งหินแข็งก่อนเริ่มขุด", "Shows hard-rock pockets before mining"),
  crystalWrap: effect("จีโอดสมบูรณ์ +1 เมื่อเลือกถูกและพบผลึก", "+1 whole geode on a correct crystal choice"),
  oreSieve: effect("วัตถุดิบแร่ที่แยกได้ +1", "+1 separated mineral material"),
  seamChisel: effect("แกนควอตซ์ +1 เมื่ออ่านชั้นแร่ถูก", "+1 quartz core on a correct layer choice"),
  surveyCord: effect("แกนควอตซ์ +1 เมื่ออ่านชั้นแร่ถูก ไม่บวกซ้ำกับสิ่ว", "+1 quartz core on a correct layer choice; does not stack with the chisel"),
  pollenBrush: effect("แสดงคำใบ้ผสมพันธุ์พืช", "Shows crop-crossing hints"),
  graftKnife: effect("เมล็ดพันธุ์ลูกผสม 2 เมล็ด จากเดิม 1 เมื่อผสมสำเร็จ", "Crossing produces 2 hybrid seeds instead of 1"),
  rootGuide: effect("ช่วยอ่านพื้นที่ปลูกพืชแผ่กอ", "Shows sprawling crop layouts"),
  soilScoop: effect("เร่งโต 1 ชั่วโมงเมื่อปลูกพืชแผ่กอ", "Adds 1 growth hour when sowing a sprawling crop"),
  seedTray: effect("คืนเมล็ด 1 เมล็ดเมื่อเก็บพืชแผ่กอรอบสุดท้าย", "Returns 1 seed at the final sprawling-crop harvest"),
  gardenTwine: effect("ผลผลิตพืชแผ่กอ +1 ต่อการเก็บ", "+1 sprawling-crop yield per harvest"),
  routeLens: effect("แสดงเส้นทางแมลง", "Shows insect routes"),
  scentSatchel: effect("จังหวะจับแมลงช้าลง 15% ใช้ผลที่ดีที่สุด", "Insect timing 15% slower; strongest effect applies"),
  releaseCage: effect("ช่วงผสมเกสร 90 นาที จากเดิม 60 นาที", "Pollination lasts 90 minutes instead of 60"),
  pollenFan: effect("เร่งโตจากผสมเกสร 45 นาที จากเดิม 30 นาที", "Pollination adds 45 growth minutes instead of 30"),
  pestWhistle: effect("ป้องกันศัตรูพืช 120 นาทีหลังปล่อยแมลงกำจัด", "120-minute protection after releasing a pest predator"),
  traceLens: effect("มองเห็นร่องรอยของป่า", "Reveals foraging traces"),
  rootSpade: effect("ขุดรากได้ และลดเวลาฟื้นจุดเก็บเป็น 15 นาที", "Enables root gathering; recovery reduced to 15 minutes"),
  pruningKnife: effect("ของจากส่วนใบ +1 ใช้โบนัสถนอมสูงสุดหนึ่งครั้ง", "+1 leaf yield; protection bonuses do not stack"),
  specimenPress: effect("ไลเคนป่า +1 ใช้โบนัสถนอมสูงสุดหนึ่งครั้ง", "+1 forest lichen; protection bonuses do not stack"),
  seedSieve: effect("เมล็ดผลป่าหรือสปอร์ +1 ไม่บวกซ้ำกับโบนัสถนอม", "+1 berry pip or spore; protection bonuses do not stack"),
  forageBasket: effect("ให้อภัยพลาดเก็บส่วนของป่า 1 ครั้ง", "Forgives 1 foraging-part mistake"),
  sealedFlask: effect("อายุคุณสมบัติน้ำ ×2 ใช้ผลที่ดีที่สุด", "Water-property duration ×2; strongest effect applies"),
  tastingSpoon: effect("แก้พลาดเตรียมอาหารได้ 1 จุดเมื่อเลือกชิม", "Saves 1 preparation mistake when you choose to taste"),
  provisionChest: effect("เสบียงค่าย 5 ครั้ง จากเดิม 3 ใช้อาหารตามจำนวน", "Camp holds 5 charges instead of 3; needs matching rations"),
  signalPennant: effect("เปิดคุณสมบัติค่ายวงกว้าง", "Enables the wide-camp property"),
  campLantern: effect("เปิดคุณสมบัติค่ายมีแสง", "Enables the lit-camp property"),
  weatherAwning: effect("ค่ายอยู่ได้ 45 นาที จากเดิม 30 นาที", "Camp lasts 45 minutes instead of 30"),
};
for (const [id, stats] of Object.entries(TACKLE)) {
  const t = stats!;
  const k = t.strike ?? t.slip ?? t.snap ?? t.line!;
  const percent = Math.round(Math.abs(k - 1) * 100);
  PASSIVE_EQUIPMENT[id as ItemId] = t.strike ? effect(`เวลาตวัดเบ็ด +${percent}%`, `Strike time +${percent}%`)
    : t.slip ? effect(`ทนสายหย่อน +${percent}%${id.startsWith("hook") ? " ต้องติดตั้งในช่องเบ็ด" : ""}`, `Slack tolerance +${percent}%${id.startsWith("hook") ? "; fit in the hook slot" : ""}`)
    : t.snap ? effect(`ทนแรงดึงสาย +${percent}%`, `Line strain tolerance +${percent}%`)
    : effect(`ระยะสายที่ต้องเก็บลดลง ${percent}%`, `${percent}% less line to reel in`);
}
export const isPassiveEquipment = (id: ItemId): boolean => Object.hasOwn(PASSIVE_EQUIPMENT, id);
/** A read-only view for effect calculations. Never use it for transfers, costs, slot indexes or capacity. */
export function carriedBag(purse: Purse): Purse["bag"] {
  const equipment = [...new Set(purse.wears ?? [])].filter(isPassiveEquipment);
  return equipment.length ? [...purse.bag, ...equipment.map(item => ({ item, n: 1 }))] : purse.bag;
}
export const equipmentEffect = (id: ItemId, th: boolean): string | null => {
  const e = PASSIVE_EQUIPMENT[id];
  return e ? (th ? e.th : e.en) : null;
};
