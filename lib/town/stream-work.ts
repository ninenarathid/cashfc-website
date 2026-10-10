import { carriedBag } from "./passive-equipment";
import { WATER } from "./farm";
import { byOf, type ItemId } from "./items";
import { levelOf, spend } from "./stamina";
import { STREAM_MAKES } from "./stream-items";
import { held, put, roomFor, take, type Purse } from "./trade";
import type { Nature } from "./waters";
import { atWell } from "./world";

export type StreamRoute = "pool" | "reed";
export interface StreamGate { route: StreamRoute; until: number; by: string }
export type StreamAction = "sample" | "prepare" | "gate" | "pour";
const no = (why: "none" | "far" | "tool" | "full" | "spent") => ({ ok: false as const, why });
export const STREAM_WORK = {
  // Banks are beside the existing stream, away from numbered trees, rocks and the stone crossings.
  sites: [
    { id: "upper", x: 21, y: 252, items: ["springSample", "riverGrit", "mossFilter", "wetClay"] },
    { id: "lower", x: 42, y: 254, items: ["rushingSample", "mineralSand", "reedPith", "waterMint"] },
  ],
  reach: 2, cost: 3, every: 15 * 60_000, gateMinutes: 15, gateCooldown: 30_000,
  nature: { clearSpring: "rain", herbalWater: "moon", mineralWater: "dawn", dawnBlend: "dawn", rainBlend: "rain", moonBlend: "moon" },
  recipes: STREAM_MAKES,
} as const;
export const streamSiteAt = (at: readonly number[]) => STREAM_WORK.sites.find(s => at.length === 2 && Number.isInteger(at[0]) && Number.isInteger(at[1]) && Math.max(Math.abs(s.x-at[0]), Math.abs(s.y-at[1])) <= STREAM_WORK.reach) ?? null;
export const streamRouteAt = (gate: StreamGate | null | undefined, now: number): StreamRoute => gate && gate.until > now ? gate.route : "pool";
export const waterNature = (id: string): Nature | null => Object.hasOwn(STREAM_WORK.nature, id) ? STREAM_WORK.nature[id as keyof typeof STREAM_WORK.nature] : null;
export const propertyDuration = (p: Purse, now: number): number => Math.max(1, held(carriedBag(p),"sealedFlask") > 0 ? 2 : 1, byOf("waterProperty", levelOf(p,now,"waterProperty")));
export interface StreamResult { ok: true; purse: Purse; got?: Array<[ItemId,number]>; gate?: StreamGate; nature?: Nature; times?: number }

/** The server decides recipes, source availability, limits and property strength. */
export function streamWork(p: Purse, action: string, choice: string, at: readonly number[], gate: StreamGate | null, me: string, now: number): StreamResult | {ok:false;why:"none"|"far"|"tool"|"full"|"spent"} {
  const site = streamSiteAt(at);
  if (action === "pour" ? at.length !== 2 || !Number.isInteger(at[0]) || !Number.isInteger(at[1]) || !atWell(at[0],at[1]) : !site) return {ok:false,why:"far"};
  const route = streamRouteAt(gate, now);
  if (action === "gate") {
    if (choice !== "pool" && choice !== "reed") return no("none");
    if (held(p.bag,"sluiceKey") < 1) return no("tool");
    if (gate && gate.until > now && (gate.route === choice || gate.until - STREAM_WORK.gateMinutes*60_000 + STREAM_WORK.gateCooldown > now)) return no("spent");
    return {ok:true,purse:spend(p,STREAM_WORK.cost,now),gate:{route:choice,until:now+STREAM_WORK.gateMinutes*60_000,by:me}};
  }
  if (action === "sample") {
    if (!site!.items.includes(choice as never)) return no("none");
    if (choice === "springSample" && route !== "pool" || choice === "rushingSample" && route !== "reed") return no("none");
    if (choice.endsWith("Sample") && held(p.bag,"waterSampler") < 1 && !Object.keys(WATER.buckets).some(id=>held(p.bag,id as ItemId)>0)) return no("tool");
    const turn = Math.floor(now/STREAM_WORK.every), key = `${site!.id}:${choice}`;
    if (p.streamTaken?.[key] === turn) return no("spent");
    const id = choice as ItemId;
    if (roomFor(p.bag,id) < 1) return no("full");
    return {ok:true,got:[[id,1]],purse:{...spend(p,STREAM_WORK.cost,now),bag:put(p.bag,id,1),streamTaken:{...p.streamTaken,[key]:turn},streamBook:[...new Set([...(p.streamBook??[]),id])]}};
  }
  if (action === "prepare") {
    if (!Object.hasOwn(STREAM_MAKES,choice)) return no("none");
    const recipe = STREAM_MAKES[choice as keyof typeof STREAM_MAKES];
    if (choice.endsWith("Blend") ? held(p.bag,"mixingJug") < 1 : held(p.bag,"filterFrame") < 1) return no("tool");
    if (recipe.needs.some(([id,n])=>held(p.bag,id) < n)) return no("none");
    let bag = p.bag;
    for (const [id,n] of recipe.needs) bag = take(bag,id,n);
    const id = choice as ItemId;
    if (roomFor(bag,id) < recipe.gives) return no("full");
    return {ok:true,got:[[id,recipe.gives]],purse:{...spend(p,STREAM_WORK.cost,now),bag:put(bag,id,recipe.gives),streamBook:[...new Set([...(p.streamBook??[]),id])]}};
  }
  if (action === "pour") {
    const nature = waterNature(choice);
    if (!nature || held(p.bag,choice as ItemId) < 1) return no("none");
    return {ok:true,nature,times:propertyDuration(p,now),purse:{...spend(p,1,now),bag:take(p.bag,choice as ItemId,1)}};
  }
  return no("none");
}
