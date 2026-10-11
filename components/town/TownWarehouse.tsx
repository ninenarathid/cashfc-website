"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Keeper } from "@/lib/town/keeper";
import { WAREHOUSE, type Warehouse, type WarehouseInput } from "@/lib/town/warehouse";
import { held } from "@/lib/town/trade";
import { ITEMS } from "@/lib/town/items";
import { StackIcon } from "./TownTrade";

interface Member { id: string; character_name: string | null; display_name: string | null; discord_username: string | null }
const nameOf = (p: Member) => p.character_name ?? p.display_name ?? p.discord_username ?? "Member";
const WHY: Record<string, [string, string]> = {
  changed: ["ของในช่องเปลี่ยนแล้ว กรุณาเลือกใหม่", "This slot changed. Select it again."],
  denied: ["เจ้าของคลังยังไม่ได้ให้สิทธิ์คุณ หรือยกเลิกสิทธิ์แล้ว", "The owner has not granted access, or has removed it."],
  full: ["กระเป๋าหรือรายชื่อเพื่อนเต็มแล้ว", "The bag or guest list is full."],
  packed: ["คลังเต็มแล้ว", "The warehouse is full."],
  far: ["ต้องยืนใกล้กล่องเก็บของ", "Stand beside the storage counter."],
  wood: ["ท่อนไม้ในกระเป๋าไม่พอ", "Not enough logs in your bag."],
  coins: ["เหรียญไม่พอ", "Not enough coins."],
  member: ["เพื่อนต้องยืนยันตัวละครก่อน", "Your friend must verify their character first."],
  exists: ["คุณมีคลังร่วมแล้ว", "You already own a shared warehouse."],
};

/** Guests may deposit and withdraw even while the owner is offline. */
export default function TownWarehouse({ keeper, at, th }: { keeper: Keeper; at: [number, number]; th: boolean }) {
  const [rows, setRows] = useState<Warehouse[] | null>(null);
  const [owner, setOwner] = useState(keeper.id);
  const [members, setMembers] = useState<Member[]>([]);
  const [guest, setGuest] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const pending = useRef<{ input: WarehouseInput; request: string } | null>(null);
  const locked = useRef(false), alive = useRef(true);
  const read = useCallback(async () => {
    if (locked.current || pending.current) return;
    const reply = await keeper.warehouse({ action: "look" });
    if (alive.current) {
      setUnavailable(!reply?.ok);
      if (reply?.ok) setRows(reply.warehouses);
    }
  }, [keeper]);
  useEffect(() => {
    alive.current = true; void read();
    const timer = setInterval(() => { if (!document.hidden) void read(); }, 5000);
    const db = createClient();
    if (db) void db.from("profiles").select("id,character_name,display_name,discord_username")
      .or("is_admin.eq.true,and(character_id.not.is.null,character_verified_at.not.is.null)")
      .order("character_name").limit(500).then(({data}) => { if (alive.current) setMembers((data ?? []) as Member[]); });
    return () => { alive.current = false; clearInterval(timer); };
  }, [keeper, read]);
  const act = async (input?: WarehouseInput) => {
    if (locked.current) return;
    if (!pending.current && input) pending.current = { input: { ...input, at }, request: crypto.randomUUID() };
    const intent = pending.current;
    if (!intent) return;
    locked.current = true; setBusy(true);
    try {
      const reply = await keeper.warehouse(intent.input, intent.request);
      if (!alive.current) return;
      if (!reply) { setNote(th ? "ยังยืนยันผลไม่ได้ กดตรวจสอบรายการเดิมอีกครั้ง" : "The result is unconfirmed. Retry the same request."); return; }
      pending.current = null; setRows(reply.warehouses);
      if (intent.input.action === "create" && reply.ok) setOwner(keeper.id);
      if (reply.ok) { setGuest(""); setNote(th ? "เรียบร้อยแล้ว" : "Done."); }
      else setNote(WHY[reply.why ?? ""]?.[th ? 0 : 1] ?? (th ? "ทำรายการไม่ได้ กรุณาตรวจของและลองใหม่" : "Unable to complete this action. Check your items and try again."));
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  };
  if (!rows) return <section className="mt-5 border-t border-line pt-4" role="status">
    <p className="text-meta text-muted">{unavailable ? (th ? "ยังเปิดคลังร่วมไม่ได้ กรุณาลองใหม่" : "Shared storage is unavailable. Please try again.") : (th ? "กำลังเปิดคลังร่วม…" : "Opening shared storage…")}</p>
    {unavailable && <button type="button" className="pressable mt-3 min-h-11 rounded-lg border border-line-strong px-3 py-2 text-ui" onClick={() => void read()}>{th ? "ลองใหม่" : "Try again"}</button>}
  </section>;
  const selected = rows.find(w => w.owner === owner) ?? rows[0], own = rows.find(w => w.owner === keeper.id), purse = keeper.purse();
  const disabled = busy || !!pending.current;
  const button = "pressable min-h-11 rounded-lg border border-line-strong px-3 py-2 text-ui disabled:opacity-50";
  return <section data-town-warehouse className="mt-5 border-t border-line pt-4">
    <h3 className="font-display text-title font-semibold">{th ? "คลังร่วมกับเพื่อน" : "Shared warehouses"}</h3>
    <p className="mt-1 text-meta text-muted">{th ? "แยกจากกล่องส่วนตัว เพื่อนที่ได้รับสิทธิ์ฝากและหยิบของได้แม้เจ้าของออฟไลน์" : "Separate from your private box. Invited friends can deposit and withdraw while the owner is offline."}</p>
    {!own && <button type="button" className={`${button} mt-3 w-full`} disabled={disabled || purse.coins < WAREHOUSE.coins || held(purse.bag, "log") < WAREHOUSE.wood} onClick={() => void act({action: "create"})}>
      {th ? `เปิดคลัง ${WAREHOUSE.slots} ช่อง · ${WAREHOUSE.coins.toLocaleString()} เหรียญ + ท่อนไม้ ${WAREHOUSE.wood} ในกระเป๋า` : `Open ${WAREHOUSE.slots} slots · ${WAREHOUSE.coins.toLocaleString()} coins + ${WAREHOUSE.wood} logs in your bag`}
    </button>}
    {selected && <>
      <label className="mt-3 block text-meta">{th ? "เลือกคลัง" : "Choose a warehouse"}<select value={selected.owner} disabled={disabled} onChange={e => setOwner(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3 text-ink">
        {rows.map(w => <option key={w.owner} value={w.owner}>{w.owner === keeper.id ? (th ? "คลังของฉัน" : "My warehouse") : w.name}</option>)}
      </select></label>
      {selected.owner === keeper.id && <div className="mt-3">
        <p className="text-meta text-muted">{th ? "ให้สิทธิ์เฉพาะเพื่อนที่ไว้ใจ ทุกคนในคลังหยิบของได้ทั้งหมด" : "Invite people you trust. Every guest can withdraw any stored item."}</p>
        <label className="mt-2 block text-meta">{th ? "เพิ่มเพื่อน" : "Invite a friend"}<select value={guest} disabled={disabled} onChange={e => setGuest(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-card px-3">
          <option value="">{th ? "เลือกตัวละคร" : "Choose a character"}</option>
          {members.filter(m => m.id !== keeper.id && !selected.members.includes(m.id)).map(m => <option key={m.id} value={m.id}>{nameOf(m)}</option>)}
        </select></label>
        <button type="button" className={`${button} mt-2`} disabled={disabled || !guest || selected.members.length >= WAREHOUSE.members} onClick={() => void act({action:"invite",owner:selected.owner,member:guest})}>{th ? "ให้สิทธิ์" : "Grant access"}</button>
        <ul className="mt-2 space-y-2">{selected.members.map(id => <li key={id} className="flex items-center justify-between gap-2 text-meta"><span className="min-w-0 break-words">{members.find(m => m.id === id) ? nameOf(members.find(m => m.id === id)!) : id}</span><button type="button" className={button} disabled={disabled} onClick={() => void act({action:"remove",owner:selected.owner,member:id})}>{th ? "ถอนสิทธิ์" : "Remove"}</button></li>)}</ul>
      </div>}
      <h4 className="mb-2 mt-4 text-ui font-semibold">{th ? "ในคลัง · แตะเพื่อหยิบทั้งกอง" : "Stored · tap to withdraw the stack"}</h4>
      <ul className="grid grid-cols-4 gap-2">{selected.things.map((s,slot) => <li key={slot}><button type="button" className={`${button} flex w-full flex-col items-center gap-1 px-1`} disabled={disabled || !s} onClick={() => s && void act({action:"take",owner:selected.owner,slot,expected:s})} aria-label={s ? `${th ? "หยิบ" : "Take"} ${ITEMS[s.item]?.name[th?"th":"en"] ?? s.item} ×${s.n}` : (th ? "ช่องว่าง" : "Empty slot")}>{s ? <><StackIcon stack={s} size={28}/><span className="w-full truncate text-label">{ITEMS[s.item]?.name[th?"th":"en"] ?? s.item}</span><span className="text-label">×{s.n}</span></> : "—"}</button></li>)}</ul>
      <h4 className="mb-2 mt-4 text-ui font-semibold">{th ? "ในกระเป๋า · แตะเพื่อฝากทั้งกอง" : "Your bag · tap to deposit the stack"}</h4>
      <ul className="space-y-2">{purse.bag.map((s,slot) => s && <li key={slot}><button type="button" className={`${button} flex w-full items-center gap-2 text-left`} disabled={disabled} onClick={() => void act({action:"put",owner:selected.owner,slot,expected:s})}><StackIcon stack={s} size={24}/><span>{ITEMS[s.item]?.name[th?"th":"en"] ?? s.item} ×{s.n}</span></button></li>)}</ul>
    </>}
    <p role="status" className="mt-3 text-meta text-gold">{note}</p>
    {pending.current && <button type="button" disabled={busy} className={button} onClick={() => void act()}>{th ? "ตรวจสอบรายการเดิมอีกครั้ง" : "Retry the same request"}</button>}
  </section>;
}
