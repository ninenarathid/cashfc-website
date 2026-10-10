/** Development trial / SQL parity tests only. Never import from a production client module. */
import { giftOf, giftsOf, works } from "../gifts";
import { dayOf } from "../stamina";
import { grainOf } from "../wood-grain";
import { echoOf } from "../geology";
import type { ComboCue, ComboEffect, ComboFound, ComboState } from "../combo-types";
import type { Purse } from "../trade";

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
];
export const matchesCombo = (p: Purse, requires: readonly string[]) => requires.length >= 2 && requires.length <= 3 &&
  new Set(requires).size === requires.length && requires.every(id => ["charm","familiar"].includes(giftOf(id)?.kind ?? "") && works(p,id));
const match = (p: Purse, r: Rule) => matchesCombo(p,r.requires);
const stateOf = (p: Purse): ComboState => ({ found: p.combos?.found ?? [], used: p.combos?.used ?? {}, actions: p.combos?.actions ?? {}, ...(p.combos?.last ? { last: p.combos.last } : {}) });
const remaining = (s: ComboState, r: Rule, now: number) => !r.cap || (s.used[r.pool]?.day === dayOf(now) ? s.used[r.pool].n : 0) < r.cap;
export const comboCue = (p: Purse, context: "wear" | "wood" | "cavity" | "echo"): ComboCue | undefined =>
  SECRET_RULES.find(r => match(p, r) && (context === "wear" || context === "wood" && r.key === "SC02" || context === "cavity" && r.key === "SC03" || context === "echo" && r.key === "SC11"))?.cue;
export const comboLoadout = (p: Purse) => { const g = giftsOf(p); return JSON.stringify([[...g.charms].sort(), g.familiar]); };

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
