import { BOX, nearBox, stow, unstow } from "./box";
import { held, take, type Purse, type Stack } from "./trade";

export const WAREHOUSE = { slots: 20, coins: 1000, wood: 100, members: 20 };
export interface Warehouse { owner: string; name: string; members: string[]; things: Array<Stack | null> }
export interface WarehouseInput { action: "look" | "create" | "invite" | "remove" | "put" | "take"; owner?: string; member?: string; slot?: number; expected?: Stack; at?: [number, number] }
export interface WarehouseReply { ok: boolean; why?: string; warehouses: Warehouse[] }

/** Local rehearsal uses the same whole-stack transfer rules as a private chest. */
export function warehouseAction(purse: Purse, rows: Warehouse[], me: string, name: string, input: WarehouseInput): WarehouseReply & { purse: Purse } {
  const visible = (all: Warehouse[]) => all.filter(w => w.owner === me || w.members.includes(me));
  const no = (why: string) => ({ ok: false, why, warehouses: visible(rows), purse });
  if (input.action === "look") return { ok: true, warehouses: visible(rows), purse };
  if (!input.at || !nearBox(input.at)) return no("far");
  if (input.action === "create") {
    if (rows.some(w => w.owner === me)) return no("exists");
    if (purse.coins < WAREHOUSE.coins) return no("coins");
    if (held(purse.bag, "log") < WAREHOUSE.wood) return no("wood");
    const w: Warehouse = { owner: me, name, members: [], things: Array(WAREHOUSE.slots).fill(null) };
    return { ok: true, warehouses: visible([...rows, w]), purse: { ...purse, coins: purse.coins - WAREHOUSE.coins, bag: take(purse.bag, "log", WAREHOUSE.wood) } };
  }
  const w = rows.find(w => w.owner === input.owner);
  if (!w || (w.owner !== me && !w.members.includes(me))) return no("denied");
  let updated = w;
  if (input.action === "invite" || input.action === "remove") {
    if (w.owner !== me || !input.member || input.member === me) return no("denied");
    if (input.action === "invite" && !w.members.includes(input.member) && w.members.length >= WAREHOUSE.members) return no("full");
    updated = { ...w, members: input.action === "invite" ? [...new Set([...w.members, input.member])] : w.members.filter(id => id !== input.member) };
  } else {
    if (!Number.isInteger(input.slot) || !input.expected) return no("none");
    const s = (input.action === "put" ? purse.bag : w.things)[input.slot!];
    if (JSON.stringify(s) !== JSON.stringify(input.expected)) return no("changed");
    const box = { things: w.things, more: WAREHOUSE.slots - BOX.slots };
    const did = input.action === "put" ? stow(purse, box, input.slot!, s!.n, input.at) : unstow(purse, box, input.slot!, s!.n, input.at);
    if (!did.ok) return no(did.why);
    purse = did.purse;
    updated = { ...w, things: did.box.things };
  }
  return { ok: true, warehouses: visible(rows.map(row => row.owner === w.owner ? updated : row)), purse };
}
