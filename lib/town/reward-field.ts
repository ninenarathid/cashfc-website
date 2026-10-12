import { WOOD_MAKES } from "./wood-items";
import { GEOLOGY_MAKES } from "./geology-items";
import { cook } from "./cooking";
import { carriedBag } from "./passive-equipment";
import { works, useGift } from "./gifts";
import { held, type Purse } from "./trade";
import type { ItemId, Make } from "./items";

export const FIELD_RECIPES = { wood:WOOD_MAKES,mineral:GEOLOGY_MAKES };
export type FieldRecipe = keyof typeof WOOD_MAKES | keyof typeof GEOLOGY_MAKES;
export function fieldRecipes(p:Purse,kind:"wood"|"mineral"):FieldRecipe[] {
  return Object.keys(FIELD_RECIPES[kind]).filter(id=>(p.made??[]).includes(id as ItemId)) as FieldRecipe[];
}
/** Location changes; recipe, actual inputs, required implements and original action cost do not. */
export function fieldProcess(p:Purse,kind:"wood"|"mineral",recipe:string,now:number) {
  const gift=kind==="wood"?"thingPocketSawmill":"famDwarf";
  if (!works(p,gift) || !fieldRecipes(p,kind).includes(recipe as FieldRecipe)) return {ok:false as const,why:"none" as const};
  const r=(FIELD_RECIPES[kind] as Record<string,Make>)[recipe];
  if (r.in.some(id=>held(carriedBag(p),id)<1)) return {ok:false as const,why:"tool" as const};
  // The original recipe uses these implements; the travelling reward supplies no substitute.
  const made=cook(p,r.needs,r.in.length?r.in:[null],0,now);
  if (!made.ok) return made;
  if (made.made!==recipe) return {ok:false as const,why:"none" as const};
  const used=useGift(made.purse,gift,now);
  if (!used.ok) return used;
  return {ok:true as const,purse:used.purse,got:[[recipe as ItemId,made.n]] as Array<[ItemId,number]>,left:used.left};
}
