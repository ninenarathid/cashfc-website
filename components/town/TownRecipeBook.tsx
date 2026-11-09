"use client";

import { whispersOf } from "@/lib/town/cooking";
import { cureWords } from "@/lib/town/farm";
import { WISH } from "@/lib/town/fountain";
import { toldOf } from "@/lib/town/hints";
import { DISHES, ITEMS, MAKES, iconOf, type DishId, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { Purse } from "@/lib/town/trade";
import { recipeCategory } from "@/lib/town/recipe-category";
import { SPECIAL_DISH_IDS } from "@/lib/town/special-dishes";
import { isLegend } from "@/lib/town/special-uses";
import TownNotebook from "./TownNotebook";
import TownIcon, { type IconName } from "./TownIcon";
import { ItemIcon } from "./TownTrade";
import { Secret } from "./TownScroll";

/** The bag's bound recipe book. A found recipe keeps the same secret as its scroll. */
export default function TownRecipeBook({ keeper, purse, th }: { keeper: Keeper; purse: Purse; th: boolean }) {
  const known = [...keeper.known(), ...keeper.knownMakes()];
  const whispers = whispersOf(purse), lang = th ? "th" : "en";
  const name = (id: ItemId) => ITEMS[id].name[lang];
  // (v325: the specials' dishes nobody has made yet, each a shadow with its secret thing's clue, the existing rule's: lib/town/special-dishes)
  const shadows = keeper.specialUses() ? SPECIAL_DISH_IDS.filter((id) => !known.includes(id)) : [];
  if (!known.length && !shadows.length) return null;
  return <div data-recipe-book><TownNotebook title={th ? "สมุดสูตรอาหาร" : "The recipe notebook"} icon="recipes" th={th} entries={[...known.map(id => {
    const dish = id in DISHES ? DISHES[id as DishId] : null;
    const hasRecipe = !!dish?.recipe || !!MAKES[id];
    const recipe = hasRecipe ? toldOf(id, keeper.madeBefore(id) || whispers.includes(id), keeper.triesAt(id)) : null;
    const method = recipe?.in.includes("grill") ? ["ย่าง", "Grilled"] : recipe?.in.includes("oven") ? ["อบ", "Baked"] : recipe?.in.includes("steamer") ? ["นึ่ง", "Steamed"] : recipe?.in.includes("pan") || recipe?.in.includes("wok") ? ["กระทะ", "Skillet"] : recipe?.in.includes("pot") ? ["หม้อ", "Pots"] : recipe?.in.includes("jar") ? ["หมัก / ดอง", "Fermented / pickled"] : ["อาหารอื่น ๆ", "Other food"];
    const category = recipeCategory(id, th);
    const first = keeper.finder(id), does = cureWords(id);
    return { key: id, title: name(id), searchText: `${ITEMS[id].name.th} ${ITEMS[id].name.en}`, icon: iconOf(id) as IconName, category, body: <div data-recipe-page={id}>
      <p>{ITEMS[id].about[lang]}</p>
      {dish && <p><small>{method[th ? 0 : 1]}</small></p>}
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
  }), ...shadows.map((id) => {
    const told = toldOf(id), legend = isLegend(id);
    return { key: id, title: "???", searchText: "???", icon: iconOf(id) as IconName, shade: true, category: recipeCategory(id, th), body: <div data-recipe-page={id} data-recipe-shadow>
      <ul className="flex flex-col gap-2">{told.last && <Secret hidden={told.last} th={th}/>}</ul>
      <p className="flex items-center gap-2"><TownIcon name={(legend ? "people" : "mystery") as IconName} size={20}/><small>{legend ? (th ? `ช่วยกัน ${told.cooks} คน · ${told.gives} ที่` : `${told.cooks} cooks · ${told.gives} helpings`) : th ? "ยังไม่มีใครทำได้" : "Nobody has made it yet"}</small></p>
    </div> };
  })]}/></div>;
}
