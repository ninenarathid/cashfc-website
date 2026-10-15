import { works, useGift, usesLeft } from "./gifts";
import type { ItemId } from "./items";
import type { Holds, RockAt } from "./mining";
import { stowAll } from "./pouches";
import { spend } from "./stamina";
import type { Purse } from "./trade";
import { mineralKnowledge, learnMinerals } from "./reward-knowledge";
export { SCANNABLE, mineralKnowledge, learnMinerals } from "./reward-knowledge";
import { woodYield } from "./woodcutting";
import type { GrainQuality, WoodPart } from "./wood-grain";
import type { ExtractionRun, RewardReply, ScanDirection } from "./reward-types";

const tile = (v: readonly number[]) => v.length === 2 && v.every(Number.isSafeInteger);
type Result = { ok: true; purse: Purse } & RewardReply | { ok: false; why: "none" | "spent" | "far" | "full" };
const no = (why: "none" | "spent" | "far" | "full"): Result => ({ ok: false, why });
/** World fates are injected by the keeper. Only this coarse answer may leave the server. */
export function scanMineral(p: Purse, mineral: ItemId, at: [number, number], now: number,
  world: { rocks: readonly RockAt[]; ore: ItemId; gem: ItemId; stands: (id: number) => boolean; fate: (id: number) => Holds }): Result {
  if (!tile(at) || !works(p, "thingOreCompass") || !mineralKnowledge(p).includes(mineral)) return no("none");
  const used = useGift(p, "thingOreCompass", now);
  if (!used.ok) return no(used.why === "spent" ? "spent" : "none");
  const choices = world.rocks.filter(r => {
    if (!world.stands(r.id)) return false;
    const f = world.fate(r.id);
    return f.kind === "vein" ? mineral === (f.gem ? world.gem : world.ore) : f.kind === "stone" && f.shards > 0 && mineral === world.ore;
  }).sort((a,b) => Math.max(Math.abs(a.x-at[0]), Math.abs(a.y-at[1]))-Math.max(Math.abs(b.x-at[0]), Math.abs(b.y-at[1])) || a.id-b.id);
  if (!choices.length) return { ok: true, purse: used.purse, left: used.left };
  const target=choices[0], dx=Math.sign(target.x-at[0]), dy=Math.sign(target.y-at[1]);
  const direction: ScanDirection = dy < 0 ? dx < 0 ? "NW" : dx > 0 ? "NE" : "N" : dy > 0 ? dx < 0 ? "SW" : dx > 0 ? "SE" : "S" : dx < 0 ? "W" : dx > 0 ? "E" : "here";
  const distance=Math.max(Math.abs(target.x-at[0]),Math.abs(target.y-at[1]));
  return { ok:true, purse:learnMinerals(used.purse,[]), direction, distance:distance<=4 ? "near" : distance<=10 ? "mid" : "far", left:used.left };
}
export function extractionSource(p: Purse, tree: number, at: [number, number], excluded: WoodPart, quality: GrainQuality, now: number): Purse {
  if (!works(p,"thingForesterKnife")) return p;
  return { ...p, professionRewards: { ...p.professionRewards, run:null, extraction:{key:`tree:${tree}:${now}`,tree,at,excluded,quality,until:now+180_000} } };
}
export function beginExtraction(p: Purse, request: string, part: ExtractionRun["part"], at: [number, number], now: number, seed: number): Result {
  const source=p.professionRewards?.extraction;
  if (!works(p,"thingForesterKnife") || !source || now>source.until || !["bark","sap","seed"].includes(part) || source.excluded===part || !Number.isSafeInteger(seed)) return no("none");
  if (!tile(at) || Math.max(Math.abs(at[0]-source.at[0]),Math.abs(at[1]-source.at[1]))>2) return no("far");
  if (usesLeft(p,"thingForesterKnife",now)<=0) return no("spent");
  if (p.professionRewards?.run && now<=p.professionRewards.run.until) return no("none");
  const run:ExtractionRun={id:request,source:source.key,tree:source.tree,part,seed,at,began:now,until:Math.min(source.until,now+90_000)};
  return {ok:true,run,purse:{...p,professionRewards:{...p.professionRewards,run}}};
}
export function extractionMarks(seed: number): number[] {
  let n=seed>>>0;
  return Array.from({length:3},()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return 0.2+(n%61)/100;});
}
export function endExtraction(p: Purse, id: string, marks: readonly number[], at: [number, number], now: number): Result {
  const run=p.professionRewards?.run, source=p.professionRewards?.extraction;
  if (!works(p,"thingForesterKnife") || !run || !source || run.id!==id || run.source!==source.key || now<run.began+2400 || now>run.until || marks.length!==3 || !marks.every(n=>Number.isFinite(n)&&n>=0&&n<=1)) return no("none");
  if (!tile(at) || at.some((v,i)=>v!==run.at[i])) return no("far");
  const passed=extractionMarks(run.seed).filter((n,i)=>Math.abs(n-marks[i])<=0.09).length;
  const got=passed===3 ? woodYield(run.tree,false,{part:run.part,notches:[-1,-1,-1],direction:-1},source.quality,p) : [];
  const stowed=stowAll(p,got);
  if (!stowed) return no("full");
  const used=useGift(stowed,"thingForesterKnife",now);
  if (!used.ok) return no(used.why==="spent" ? "spent" : "none");
  return {ok:true,got,passed,left:used.left,purse:{...spend(used.purse,1,now),professionRewards:{...used.purse.professionRewards,extraction:null,run:null}}};
}
