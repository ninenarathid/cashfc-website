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
      <p>{th ? "ความผูกพันที่พบระหว่างเดินทาง" : "A bond discovered along the journey"}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">{f.requires.map(id => <span key={id} className="flex items-center gap-1 text-meta">
        <TownIcon name={id as IconName} size={24} />{th ? giftOf(id)?.name.th ?? id : giftOf(id)?.name.en ?? id}
      </span>)}</div>
      <p>{th ? f.does.th : f.does.en}</p>
    </>,
  }))}/></div>;
}
