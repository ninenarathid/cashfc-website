"use client";

import { foundCombos } from "@/lib/town/combo-types";
import { giftOf } from "@/lib/town/gifts";
import TownIcon, { type IconName } from "./TownIcon";
import TownNotebook from "./TownNotebook";

export default function TownComboBook({ purse, th }: { purse: { combos?: unknown }; th: boolean }) {
  const found = foundCombos(purse);
  if (!found.length) return null;
  return <div data-combo-book><TownNotebook title={th ? "สมุดความผูกพัน" : "Book of bonds"} th={th} entries={found.map(f => ({
    key: f.key, title: th ? f.name.th : f.name.en, icon: "wellBook", body: <>
      <p>{th ? "ใส่เครื่องรางและเรียกสัตว์ตามรายการนี้พร้อมกัน แล้วทำกิจกรรมที่อธิบายด้านล่าง" : "Wear the listed charms and call the listed familiar together, then perform the activity below."}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">{f.requires.map(id => <span key={id} className="flex items-center gap-1 text-meta">
        <TownIcon name={id as IconName} size={24} />{th ? giftOf(id)?.name.th ?? id : giftOf(id)?.name.en ?? id}
      </span>)}</div>
      <h5 className="font-semibold">{th ? "ใช้เมื่อไรและทำอย่างไร" : "When and how to use"}</h5>
      <p>{th ? f.does.th : f.does.en}</p>
      <p className="text-meta">{th ? "เปลี่ยนเครื่องรางหรือสัตว์ระหว่างงาน จะทำให้โอกาสคอมโบของงานที่ค้างสิ้นสุดลง แม้ใส่ชุดเดิมกลับมา สิทธิ์รายวันเริ่มใหม่ 05:00 น. ตามเวลาไทย" : "Changing charms or familiars invalidates an unfinished bond opportunity, even if you switch back. Daily allowances reset at 05:00 Bangkok time."}</p>
    </>,
  }))}/></div>;
}
