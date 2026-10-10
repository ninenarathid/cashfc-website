import {describe,it,expect} from "vitest";
import {RIVER_ITEMS} from "./river-items";
import {WOOD_ITEMS} from "./wood-items";
import {GEOLOGY_ITEMS} from "./geology-items";
import {GARDEN_ITEMS} from "./garden-items";
import {INSECT_ITEMS} from "./insect-items";
import {FORAGE_ITEMS} from "./foraging-items";
import {STREAM_ITEMS} from "./stream-items";
import {PREP_ITEMS} from "./preparation-items";
import {CAMP_ITEMS} from "./camp-items";
import {ITEMS,MAKES,DISHES,type ItemId} from "./items";
import {CRAFTS} from "./crafting";
import {sources,usesOf} from "./uses";
import atlas from "./icon-atlas.json";

describe("all nine profession item lines",()=>{
 it("has 225 distinct usable additions, with sources and pixel sprites, excluding companion scrolls and seeds",()=>{
  const lines=[RIVER_ITEMS,WOOD_ITEMS,GEOLOGY_ITEMS,GARDEN_ITEMS,INSECT_ITEMS,FORAGE_ITEMS,STREAM_ITEMS,PREP_ITEMS,CAMP_ITEMS];
  const ids=lines.flatMap(line=>Object.keys(line)) as ItemId[],found=sources();
  for(const line of lines)expect(Object.keys(line)).toHaveLength(25);
  expect(new Set(ids).size).toBe(225);
  for(const id of ids){
   expect(ITEMS[id],id).toBeDefined();expect(found.has(id),`${id} source`).toBe(true);expect(atlas.icons[id as keyof typeof atlas.icons],`${id} sprite`).toBeDefined();
   const consumed=Object.values(MAKES).some(r=>r?.needs.some(([part])=>part===id))||Object.values(DISHES).some(d=>d.recipe?.needs.some(([part])=>part===id))||Object.values(CRAFTS).some(r=>r.some(([part])=>part===id));
   expect(usesOf(id).length>0||consumed||id in MAKES||id in DISHES||["fish","crop","bug"].includes(ITEMS[id].kind),`${id} actual use`).toBe(true);
  }
 });
});
