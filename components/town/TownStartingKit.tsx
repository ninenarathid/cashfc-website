import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import { held, type Purse } from "@/lib/town/trade";
import TownIcon, { type IconName } from "./TownIcon";
import styles from "./TownAdventure.module.css";

/** Only public starting equipment; never a list of undiscovered recipe ingredients. */
export default function TownStartingKit({ items, bag, th }: { items: readonly (readonly [ItemId, number])[]; bag: Purse["bag"]; th: boolean }) {
  return <ul className={styles.startingKit} aria-label={th ? "ของที่ต้องเตรียม" : "Starting supplies"}>
    {items.map(([id, need]) => {
      const have = held(bag, id), missing = have < need;
      return <li key={id} data-missing={missing ? "" : undefined}>
        <TownIcon name={iconOf(id) as IconName} size={24} />
        <span>{ITEMS[id].name[th ? "th" : "en"]}</span>
        <small>{missing ? th ? "ยังขาด" : "Missing" : th ? "พร้อม" : "Ready"} · {have}/{need}</small>
      </li>;
    })}
  </ul>;
}
