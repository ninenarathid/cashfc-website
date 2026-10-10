"use client";

import { whispersOf } from "@/lib/town/cooking";
import { cureWords } from "@/lib/town/farm";
import { WISH } from "@/lib/town/fountain";
import { toldOf } from "@/lib/town/hints";
import { DISHES, ITEMS, MAKES, iconOf, type DishId, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { Purse } from "@/lib/town/trade";
import TownNotebook from "./TownNotebook";
import TownIcon, { type IconName } from "./TownIcon";
import { ItemIcon } from "./TownTrade";
import { Secret } from "./TownScroll";

/** The bag's bound recipe book. A found recipe keeps the same secret as its scroll. */
export default function TownRecipeBook({ keeper, purse, th }: { keeper: Keeper; purse: Purse; th: boolean }) {
  const known = [...keeper.known(), ...keeper.knownMakes()];
  const whispers = whispersOf(purse), lang = th ? "th" : "en";
  const name = (id: ItemId) => ITEMS[id].name[lang];
  if (!known.length) return null;
  return <div data-recipe-book><TownNotebook title={th ? "สมุดสูตรอาหาร" : "The recipe notebook"} icon="recipes" th={th} entries={known.map(id => {
    const dish = id in DISHES ? DISHES[id as DishId] : null;
    const hasRecipe = !!dish?.recipe || !!MAKES[id];
    const recipe = hasRecipe ? toldOf(id, keeper.madeBefore(id) || whispers.includes(id), keeper.triesAt(id)) : null;
    const method = recipe?.in.includes("grill") ? ["ย่าง", "Grilled"] : recipe?.in.includes("oven") ? ["อบ", "Baked"] : recipe?.in.includes("steamer") ? ["นึ่ง", "Steamed"] : recipe?.in.includes("pan") || recipe?.in.includes("wok") ? ["กระทะ", "Skillet"] : recipe?.in.includes("pot") ? ["หม้อ", "Pots"] : recipe?.in.includes("jar") ? ["หมัก / ดอง", "Fermented / pickled"] : ["อาหารอื่น ๆ", "Other food"];
    const category = dish ? method[th ? 0 : 1] : th ? "ของแปรรูป / ของใช้" : "Processed / crafted";
    const first = keeper.finder(id), does = cureWords(id);
    return { key: id, title: name(id), searchText: `${ITEMS[id].name.th} ${ITEMS[id].name.en}`, icon: iconOf(id) as IconName, category, body: <div data-recipe-page={id}>
      <p>{ITEMS[id].about[lang]}</p>
      {recipe ? <>
        <h5>{th ? "วัตถุดิบ" : "Ingredients"}</h5>
        <ul className="flex flex-col gap-2">{recipe.needs.map(([item, n]) => <li key={item} className="flex items-center gap-2"><ItemIcon id={item} size={24}/><span>{name(item)}</span><strong className="ml-auto whitespace-nowrap">×{n}</strong></li>)}{recipe.last && <Secret hidden={recipe.last} th={th}/>}</ul>
        <p><small>{th ? "อุปกรณ์" : "Cookware"}</small><br/>{recipe.in.length ? recipe.in.map(name).join(" · ") : th ? "มือเปล่า ที่โต๊ะ" : "Bare hands, at a worktable"}</p>
        <p><small>{th ? "ทำได้" : "Makes"}</small><br/>{dish ? th ? `${recipe.gives} ที่` : `${recipe.gives} helpings` : `×${recipe.gives}`}{recipe.cooks > 1 && (th ? ` · ช่วยกัน ${recipe.cooks} คน` : ` · ${recipe.cooks} cooks together`)}</p>
      </> : <p>{th ? "ซื้อได้จากลุงขายของ" : "Available from the uncle's stall."}</p>}
      {dish && <><h5>{th ? "กินแล้วได้" : "Eating it gives"}</h5><p className="flex items-center gap-2"><TownIcon name="stamina" size={22}/>Stamina +{dish.stamina}</p>{dish.buff && <p><strong>{WISH[dish.buff].name[lang]}</strong><br/>{WISH[dish.buff].about[lang]}</p>}</>}
      {does && <p><strong>{th ? "สรรพคุณ" : "What it does"}</strong><br/>{does[lang]}</p>}
      {first && <p><small>{th ? "ทำได้คนแรก" : "First made by"}</small><br/>{first}</p>}
    </div> };
  })}/></div>;
}
