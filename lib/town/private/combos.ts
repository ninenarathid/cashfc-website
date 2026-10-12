/** Development trial / SQL parity tests only. Never import from a production client module. */
import { giftOf, giftsOf, works } from "../gifts";
import{comboWearKey}from'../combo-types';
import { dayOf } from "../stamina";
import { grainOf } from "../wood-grain";
import { echoOf } from "../geology";
import type { ComboCue, ComboEffect, ComboFound, ComboState } from "../combo-types";
import type { Purse } from "../trade";
import {axeOf,treeOf,farFrom,isGrown,bites,heldBy,WOOD,type Grove,type Standing} from "../trees";
import {dominoGroup,validDominoDirection,type DominoDirection} from "../reward-domino";
import {usesLeft} from "../gifts";

interface Rule { key: string; version: number; cue: ComboCue; requires: string[]; pool: string; cap?: number; name: ComboFound["name"]; does: ComboFound["does"] }
export const SECRET_RULES: readonly Rule[] = [
  { key: "SC13", version: 1, cue: "water", requires: ["charmFloat", "charmLine", "famOtter"], pool: "rescue", cap: 3,
    name: { th: "สายใยพากลับ", en: "A thread home" }, does: { th: "นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง", en: "The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond." } },
  { key: "SC01", version: 1, cue: "water", requires: ["charmFloat", "famOtter"], pool: "rescue", cap: 3,
    name: { th: "นากจำทางน้ำ", en: "The otter remembers" }, does: { th: "นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง", en: "The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day." } },
  { key: "SC02", version: 1, cue: "wood", requires: ["charmEchoAxe", "famWoodpecker"], pool: "notch",
    name: { th: "จังหวะของเนื้อไม้", en: "The grain's rhythm" }, does: { th: "ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว", en: "Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence." } },
  { key: "SC03", version: 1, cue: "echo", requires: ["charmMinerLamp", "famBat"], pool: "cavity",
    name: { th: "แสงฟังโพรง", en: "Light hears hollows" }, does: { th: "ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง", en: "Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence." } },
  { key: "SC11", version: 1, cue: "echo", requires: ["charmMinerLamp", "famWoodpecker"], pool: "echo",
    name: { th: "เพลงใต้หิน", en: "A song under stone" }, does: { th: "นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน", en: "The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence." } },
  {key:"SC15",version:1,cue:"echo",requires:["charmGemColor","famSprite"],pool:"gemCorrection",cap:1,name:{th:"แสงจำสี",en:"Light remembers colour"},does:{th:"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย",en:"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},
  {key:"SC14",version:1,cue:"echo",requires:["charmDomino","famBat"],pool:"dominoPreview",name:{th:"เสียงอ่านแนวล้ม",en:"Echoes read the fall"},does:{th:"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน",en:"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},
  {key:'SC16',version:1,cue:'water',requires:['charmLunarReel','famFrog'],pool:'fishQuiet',cap:5,name:{th:'จันทร์ฟังเสียงฝน',en:'Moon listens to rain'},does:{th:'เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง',en:'Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself.'}},
  {key:'SC18',version:1,cue:'water',requires:['charmFloat','charmWind'],pool:'fishQuiet',cap:5,name:{th:'ลมโอบทุ่น',en:'Wind cradles the float'},does:{th:'เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย',en:'Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines.'}},

  {key:'SC06',version:1,cue:'wood',requires:['charmHoe','famButterfly'],pool:'seedWings',cap:5,name:{th:'ปีกเฝ้าต้นกล้า',en:'Wings guard the seed'},does:{th:'ป้องกันแมลงครั้งแรกในสองชั่วโมงหลังปลูก ห้ารากต่อวัน ไม่เร่งโตและไม่ซ้อนการคุ้มกันที่ยาวกว่า',en:'Skips the first pest strike within two hours of planting, five roots/day. No growth boost; longer protection takes precedence.'}},
  {key:'SC08',version:1,cue:'echo',requires:['charmRing','famSprite'],pool:'sharedMeal',cap:3,name:{th:'ไออุ่นถึงเพื่อน',en:'Warmth reaches a friend'},does:{th:'ปรุงอาหารแล้วเสิร์ฟจากโต๊ะหรือผ้าปิกนิก ให้เพื่อนกินจนจบ จากนั้นแบ่งแรงให้เพื่อนคนนั้นภายในสิบนาที ขยายเฉพาะบัฟจากมื้อนั้นสิบห้านาที ครั้งเดียวต่อมื้อ สามครั้งต่อวัน ใช้สิทธิ์แหวนเดิม ถ้วยที่ตักใส่กระเป๋าธรรมดาใช้ไม่ได้',en:'Cook and serve at a shared table or picnic. After your friend finishes it, share stamina with that friend within ten minutes to extend only that meal’s buffs by fifteen minutes, once/meal and three/day within the ring allowance. Ordinary ladled bag food does not qualify.'}},
  {key:'SC07',version:1,cue:'water',requires:['charmGloves','famFrog'],pool:'rainCare',cap:5,name:{th:'กบเก็บไอฝน',en:'The frog keeps rain'},does:{th:'ถือบัวที่มีน้ำ ยืนข้างต้นเพื่อนระหว่างฝนโลกจริง กด “ประคองไอฝน” แล้วเล่นสามจังหวะ ใช้น้ำหนึ่งหน่วยกับแรงหนึ่งเพื่อเก็บความชื้นถึงหนึ่งชั่วโมงหลังฝนหยุด ห้ารากต่อวัน ไม่เพิ่มการโตหรือ XP',en:'Hold a filled can beside a friend’s root during real world rain. Open Keep the rain and play three beats. One water and one stamina keep it wet until one hour after the rain ends, five roots/day. No growth or XP boost.'}},
  {key:'SC12',version:1,cue:'wood',requires:['charmGuard','famGnome'],pool:'tiredGarden',cap:3,name:{th:'โนมประคองมือ',en:'The gnome steadies your hands'},does:{th:'เมื่อแรงหมดและถางหรือพรวนแถวสวนเพื่อนพลาด ถือจอบเดิมกลับไปช่องที่พลาด กด “ประคองจังหวะสวน” แล้วเล่นสามจังหวะเพื่อทำงานเดิมหนึ่งราก สามครั้งต่อวัน ยังต้องเล่นให้ผ่าน ไม่เพิ่มแรง XP หรือพื้นที่รดน้ำ',en:'After an exhausted clearing or tilling miss in a friend’s row, hold the original hoe at the missed plot, open Steady the garden beat and play three beats, three/day. Play it yourself; no extra stamina, XP or watering area.'}},
  {key:'SC17',version:1,cue:'wood',requires:['charmHoe','charmGloves'],pool:'gardenContinuation',cap:3,name:{th:'แนวดินต่อจังหวะ',en:'Furrows carry the rhythm'},does:{th:'ถือจอบ ถางหรือพรวนแถวสวนเพื่อนครบโดยไม่พลาด จากตำแหน่งเดิมกด “ต่อจังหวะแถวติดกัน” แล้วเล่นแถวถัดไปเอง วันละสามครั้ง ใช้ทุกจังหวะและแรงตามเดิม แถวที่ต่อไม่เปิดแถวที่สาม',en:'After a perfect friend’s clearing or tilling row, manually play one adjacent row from your position, three/day. Every beat and ordinary cost still apply. A continuation never opens a third row.'}},
  {key:'SC10',version:1,cue:'wood',requires:['charmEchoAxe','famPiglet'],pool:'stumpRoot',cap:3,name:{th:'เสียงขวานตามราก',en:'The axe follows roots'},does:{th:'หลังเล่นโค่นต้นหลักด้วยตัวเอง เปิด “รอยรากใต้ตอ” ใกล้ตอเดิมแล้วเล่นสกัดอีกสามจังหวะ วันละสามตอ ใช้สิทธิ์หมูและแรงหนึ่ง มีส่วนต่อต้นได้ไม่เกินสองส่วนรวมมีดกับเครื่องรางฟังไม้',en:'After manually felling the primary trunk, the pig points out a root for three extra played beats, three stumps/day. Uses a piglet allowance and one stamina. Shares the two-part/trunk budget with knife and listener.'}},
  {key:'SC04',version:1,cue:'water',requires:['charmApron','famFrog'],pool:'rainCooking',cap:2,name:{th:'ไอฝนประคองไฟ',en:'Rain steadies the flame'},does:{th:'ระหว่างฝนโลกจริง ปรุงสูตรที่รู้จักด้วยเกมคนอาหาร หลังทำถูกอย่างน้อยหนึ่งช่วงแล้วพลาด กดปุ่มย้อนจังหวะที่กบเสนอ จากนั้นเล่นต่อเองจากจุดที่ทำถูกล่าสุด สองหม้อต่อวัน วัตถุดิบจ่ายครั้งเดียว ไม่เพิ่มอาหาร',en:'During real world rain, after at least one successful cooking beat, the frog offers a replay from the last successful checkpoint. Two pots/day, same ingredients once, no extra servings.'}},
  {key:'SC05',version:1,cue:'wood',requires:['charmNet','famStag'],pool:'quietApproach',cap:5,name:{th:'รอยเท้าไม่ปลุกปีก',en:'Footsteps spare the wings'},does:{th:'ถือสวิง กดเมนูเข้าหาเงียบ เลือกแมลงหนึ่งตัว แล้วยืนนิ่งหนึ่งวินาที จากนั้นเข้าไปจับภายในสิบวินาที ลดระยะตกใจเหลือครึ่งหนึ่งนานสิบวินาที จนจับหรือหนีครั้งแรก ห้าครั้งต่อวัน ไม่เพิ่มความเร็วหรือเก็บผลไว้หลังสลับสัตว์',en:'Stand one second for one chosen insect: halve its fright distance for ten seconds until the first catch or flight, five/day. No extra speed and no carrying it across familiar changes.'}},
  {key:'SC09',version:1,cue:'echo',requires:['charmFirefly','famBat'],pool:'secretPlantRead',cap:3,name:{th:'แสงฟังส่วนพืช',en:'Light hears the living part'},does:{th:'ยืนใกล้จุดลับที่เคยเก็บสำเร็จ กดฟังส่วนพืชแล้วเลือกไลเคนหรือสปอร์หนึ่งชิ้นแทนของหลัก ถือเครื่องมือที่จุดนั้นต้องใช้และผ่านสองเกม ใช้ส่วนแบ่งเดิม สามจุดต่อวัน เลนส์หรือบัฟอ่านร่องรอยให้ข้อมูลนี้โดยไม่กินคอมโบ',en:'At a previously harvested secret site, listen and choose one lichen or spore instead of its main find. Hold the required tool, win both games and use the same share, three sites/day. Trace tools or buffs supply this information without spending a bond.'}},
];
export const matchesCombo = (p: Purse, requires: readonly string[]) => requires.length >= 2 && requires.length <= 3 &&
  new Set(requires).size === requires.length && requires.every(id => ["charm","familiar"].includes(giftOf(id)?.kind ?? "") && works(p,id));
const match = (p: Purse, r: Rule) => matchesCombo(p,r.requires);
const stateOf = (p: Purse): ComboState => ({ found: p.combos?.found ?? [], used: p.combos?.used ?? {}, actions: p.combos?.actions ?? {}, ...(p.combos?.last ? { last: p.combos.last } : {}) });
const remaining = (s: ComboState, r: Rule, now: number) => !r.cap || (s.used[r.pool]?.day === dayOf(now) ? s.used[r.pool].n : 0) < r.cap;
export const comboCue = (p: Purse, context: "wear" | "wood" | "cavity" | "echo"): ComboCue | undefined =>
  SECRET_RULES.find(r => match(p, r) && (context === "wear" || context === "wood" && r.key === "SC02" || context === "cavity" && r.key === "SC03" || context === "echo" && r.key === "SC11"))?.cue;
export const comboLoadout = comboWearKey;

function grant(p: Purse, r: Rule, action: string, now: number, effect: Omit<ComboEffect, "cue" | "fresh">): { purse: Purse; effect: ComboEffect } | null {
  if (!action || action.length > 180 || !match(p, r)) return null;
  const s = stateOf(p), previous = s.actions?.[action];
  if (previous) return previous.key === r.key ? { purse: p, effect: { ...effect, cue: r.cue, fresh: false } } : null;
  if (!remaining(s, r, now)) return null;
  const fresh = !s.found.some(f => f.key === r.key);
  const used = { ...s.used };
  if (r.cap) used[r.pool] = { day: dayOf(now), n: (used[r.pool]?.day === dayOf(now) ? used[r.pool].n : 0) + 1 };
  const actions = Object.fromEntries(Object.entries(s.actions ?? {}).filter(([,v]) => now - v.at < 86_400_000).slice(-63));
  actions[action] = { key: r.key, cue: r.cue, at: now, ...effect };
  return { purse: { ...p, combos: { found: fresh ? [...s.found, { key: r.key, version: r.version, cue: r.cue, requires: [...r.requires], name: r.name, does: r.does, at: now }] : s.found,
    used, actions, last: { action, key: r.key, cue: r.cue, at: now, fresh } } }, effect: { ...effect, cue: r.cue, fresh } };
}

export function prepareCombo(p: Purse, context: "wood" | "cavity" | "echo", action: string, now: number,
  target: { tree?: number; notches?: unknown; hints?: number; seed?: number; cavities?: boolean; hint?: boolean; loadout?: string }) {
  if (!target.loadout || target.loadout !== comboLoadout(p)) return null;
  if (context === "wood") {
    if (!Number.isInteger(target.tree) || !Array.isArray(target.notches) || target.notches.length !== 3 || !target.notches.every(x => x === -1 || x === 1)) return null;
    const prior = stateOf(p).actions?.[action];
    if (prior) return prior.key === "SC02" && match(p, SECRET_RULES[2]) ? { purse: p, effect: { cue: "wood" as const, fresh: false, index: prior.index, side: prior.side as -1 | 1 } } : null;
    const plan = grainOf(target.tree!), notches = target.notches;
    const index = plan.notches.findIndex((side,i) => i >= (target.hints ?? 0) && notches[i] !== side);
    if (index < 0) return null;
    return grant(p, SECRET_RULES[2], action, now, { index, side: plan.notches[index] });
  }
  if (!Number.isInteger(target.seed)) return null;
  if (context === "cavity") return target.cavities ? null : grant(p, SECRET_RULES[3], action, now, { cavities: true });
  return target.hint ? null : grant(p, SECRET_RULES[4], action, now, { echo: echoOf(target.seed!) });
}
export function rescueCombo(p: Purse, action: string, now: number, startLoadout: string) {
  if (startLoadout !== comboLoadout(p)) return null;
  const r = SECRET_RULES.find(r => r.pool === "rescue" && match(p,r));
  return r ? grant(p,r,action,now,{ resume: r.key === "SC13" ? 0.35 : 0.20 }) : null;
}
export function resourceCorrection(p:Purse,action:string,now:number,startLoadout:string){
  if(startLoadout!==comboLoadout(p))return null;
  const r=SECRET_RULES.find(r=>r.key==="SC15")!;
  return grant(p,r,action,now,{});
}
/** Used only at an authoritative action's commit; nothing in the public catalog names these recipes. */
export function commitCombo(p:Purse,key:string,action:string,now:number,e:Omit<ComboEffect,'cue'|'fresh'>={}){const r=SECRET_RULES.find(r=>r.key===key);return r?grant(p,r,action,now,e):null;}
export function fishQuiet(p:Purse,key:string,mode:'hook'|'lunar',current:string,rain:boolean,now:number,startLoadout:string){
 if(startLoadout!==comboLoadout(p)||(mode==='hook'?current!=='run':!rain))return null;
 const r=SECRET_RULES.find(r=>r.key===(mode==='lunar'?'SC16':'SC18'))!;
 return grant(p,r,`quiet:${key}`,now,{quiet:mode==='lunar'?2:1.5});
}
export function dominoPreview(p:Purse,grove:Grove,tree:number,direction:DominoDirection,at:[number,number],now:number,wood:readonly Standing[]=WOOD,me?:string){
 const first=treeOf(tree,wood),axe=axeOf(p),rule=SECRET_RULES.find(r=>r.key==="SC14")!;
 if(!first||!axe||!validDominoDirection(direction)||first.elder||!isGrown(grove,first,now)||bites(axe,first)||heldBy(grove,first.id,now,me)||farFrom(first,at)>1||usesLeft(p,"charmDomino",now)<1||!match(p,rule))return null;
 const group=dominoGroup(p,grove,first,axe,now,direction,wood,me);if(!group.length)return null;
 const last=group[group.length-1],stop=group.length===3?null:wood.filter(t=>!group.some(g=>g.id===t.id)&&isGrown(grove,t,now)).map(t=>({t,n:Math.max(Math.abs(t.x-last.x),Math.abs(t.y-last.y))})).filter(({t,n})=>n>=1&&n<=4&&t.x-last.x===direction[0]*n&&t.y-last.y===direction[1]*n).sort((a,b)=>a.n-b.n||a.t.id-b.t.id)[0]?.t.id??null;
 return grant(p,rule,`domino:${tree}:${direction.join(',')}:${dayOf(now)}`,now,{path:group.map(t=>t.id),stop,previewAt:now});
}
