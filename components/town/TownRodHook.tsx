"use client";

import { useRef, useState } from "react";
import { isRod } from "@/lib/town/gear";
import { HOOK_IDS, hookOf, type HookId } from "@/lib/town/rod-hook";
import { ITEMS } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { Purse } from "@/lib/town/trade";
import { ItemIcon } from "./TownTrade";
import TownIcon from "./TownIcon";
import styles from "./TownAdventure.module.css";

export default function TownRodHook({ keeper, purse, th }: { keeper: Keeper; purse: Purse; th: boolean }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [note, setNote] = useState<string | null>(null);
  const pending = useRef(false);
  const current = hookOf(purse), owned = HOOK_IDS.filter(id => purse.bag.some(s => s?.item === id && s.n >= 1));
  if (!purse.bag.some(s => s && isRod(s.item))) return null;
  const name = (id: HookId) => th ? ITEMS[id].name.th : ITEMS[id].name.en;
  const choose = async (id: HookId | null) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setNote(null);
    try {
      const did = await keeper.rodHook(id);
      if (did.ok) setOpen(false);
      else setNote(th ? "ใส่เบ็ดไม่สำเร็จ ลองอีกครั้ง" : "Could not fit the hook. Try again.");
    } catch {
      setNote(th ? "ยังบันทึกไม่ได้ ลองอีกครั้งได้โดยไม่เสียของ" : "Could not save. Retrying will not consume anything.");
    } finally { pending.current = false; setBusy(false); }
  };
  return <div className={styles.rod} data-town-rod-hook>
    <p className="text-ui font-semibold">{th ? "อุปกรณ์คันเบ็ด" : "Rod equipment"}</p>
    <div className={styles.rodRig}>
      <span className={styles.rigLine} aria-hidden/>
      <button type="button" aria-expanded={open} aria-label={th ? `ช่องใส่เบ็ด: ${current ? name(current) : "ว่าง"}` : `Hook slot: ${current ? name(current) : "empty"}`}
        onClick={() => setOpen(!open)} disabled={busy} className="tk tk-slot grid size-14 shrink-0 place-items-center disabled:opacity-50" data-hook-slot={current ?? "empty"}>
        {current ? <ItemIcon id={current} size={32} /> : <TownIcon name="hook" size={26} className="opacity-45" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-ui">{current ? name(current) : th ? "ยังไม่ได้ใส่เบ็ดเสริม" : "No extra hook fitted"}</p>
        <p className="text-meta text-[#c9a877]">{th ? "เบ็ดยังอยู่ในกระเป๋า ใส่และถอดได้ฟรี" : "Kept in your bag. Free to fit or remove."}</p>
      </div>
      {current && <button type="button" onClick={() => void choose(null)} disabled={busy} className="tk tk-btn-wood min-h-11 px-3 text-ui disabled:opacity-50" data-hook-remove>{th ? "ถอด" : "Remove"}</button>}
    </div>
    {open && <div role="group" className="mt-3 flex flex-wrap gap-2" aria-label={th ? "เบ็ดที่มี" : "Your hooks"}>
      {owned.length ? owned.map(id => <button key={id} type="button" onClick={() => void choose(id)} disabled={busy} aria-pressed={current === id}
        className={`tk ${current === id ? "tk-btn" : "tk-btn-wood"} flex min-h-11 items-center gap-2 px-3 text-ui disabled:opacity-50`} data-hook-fit={id}>
        <ItemIcon id={id} size={22} />{name(id)}
      </button>) : <p className="text-meta text-[#c9a877]">{th ? "ยังไม่มีเบ็ดเสริมในกระเป๋า" : "No extra hooks in your bag yet."}</p>}
    </div>}
    {note && <p role="status" className="mt-2 text-meta text-[#ffb09c]">{note}</p>}
  </div>;
}
