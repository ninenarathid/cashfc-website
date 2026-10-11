import { DISHES, type ItemId } from "./items";

/** Keep meals, carrying equipment and other crafts on separate notebook tabs. */
export function recipeCategory(id: ItemId, th: boolean): string {
  if (id in DISHES) return th ? "อาหาร" : "Food";
  if (["basket", "krabung", "yoke", "forageBasket"].includes(id)) return th ? "เสริมกระเป๋า" : "Carrying equipment";
  return th ? "ของแปรรูป / ของใช้" : "Ingredients / supplies";
}
