/**
 * Granny Twilla's clothes shop (the owner, 2026-10-25: "NPC ใหม่เป็น popoto ยายขายเสื้อผ้า จะมี เครื่องตกแต่งใหม่ราวๆ 40
 * รายการ (กระจายๆกันไปหลายๆส่วน หลายราคา) มีระบบลองใส่ดูได้", and of the list and its prices: "ตามนี้เลย"): forty things to
 * wear, bought for coins straight into the wardrobe (no bag slot taken), as many as anybody likes: a sink for the coins
 * the village makes (the town must not inflate). Their prices were set from a member's day (lib/town's measured figures:
 * the middle member about 500 coins a day, the top quarter 1,600, the top tenth 3,300), from 250 to 6,000; the four
 * marked with a season are sold only from 1 October to 2 November, the season of the town's pumpkins, each year.
 * The database keeps the same row (the catalog's `tailor`, v297) and charges by it. Pure.
 */

/** A thing on the shop's rails: its price in coins, and the season it is sold in ([month, day] to [month, day], Bangkok). */
export interface TailorGood { price: number; season?: readonly [number, number, number, number] }

const HALLOWEEN = [10, 1, 11, 2] as const;

/** Every thing Granny sells, by the id it has in lib/town/wear's lists. */
export const TAILOR: Record<string, TailorGood> = {
  // outfits
  knit: { price: 1200 }, beach: { price: 600 }, party: { price: 4500 }, aviator: { price: 3000 }, track: { price: 500 },
  academy: { price: 2500 }, pyjamas: { price: 400 }, ranch: { price: 1500 }, bard: { price: 2000 }, skeleton: { price: 900, season: HALLOWEEN },
  // hats
  tophat: { price: 3500 }, cowboy: { price: 1200 }, newsboy: { price: 500 }, sunhat: { price: 800 }, fedora: { price: 1500 },
  bearhat: { price: 700 }, aviatorcap: { price: 2000 }, tricorn: { price: 2500 }, ghostcap: { price: 600, season: HALLOWEEN },
  // on the face
  heartshades: { price: 900 }, cateye: { price: 1200 }, eyepatch: { price: 400 }, masquerade: { price: 3000 }, starshades: { price: 700 },
  halfmoon: { price: 500 },
  // at the neck
  pearls: { price: 6000 }, jabot: { price: 2500 }, headphones: { price: 1800 }, camera: { price: 3500 }, pocketwatch: { price: 2000 },
  cord: { price: 300 }, batpendant: { price: 500, season: HALLOWEEN },
  // in the hair
  bearears: { price: 800 }, foxears: { price: 1000 }, halo: { price: 5000 }, antennae: { price: 600 }, cherry: { price: 250 },
  fanpin: { price: 1500 }, hibiscus: { price: 500 }, batclip: { price: 400, season: HALLOWEEN },
  // hairstyles (lib/town/look's HAIRS, each by its `sold`: the owner, 2026-10-25, "ทรงผมใหม่ในร้านขายเสื้อผ้า ซัก 3-4 ทรง
  // สำหรับ ชาย หญิง"; the prices are mine, a little dearer than the middle of the clothes)
  hairbuns: { price: 1800 }, hairwaves: { price: 2500 }, hairpixie: { price: 1500 }, hairhime: { price: 2200 },
  hairundercut: { price: 1800 }, hairmullet: { price: 2200 }, haircurly: { price: 1500 }, hairhalfbun: { price: 2500 },
};

/** The Bangkok month and day of a moment. */
export function bangkokDay(ms: number): [number, number] {
  const d = new Date(ms + 7 * 3600_000);
  return [d.getUTCMonth() + 1, d.getUTCDate()];
}

/** Whether a thing is on the rails at a moment: always, or within its season (which may run over the year's end). */
export function inSeason(good: TailorGood | undefined, ms: number): boolean {
  if (!good) return false;
  if (!good.season) return true;
  const [m, d] = bangkokDay(ms), at = m * 100 + d, [m1, d1, m2, d2] = good.season, from = m1 * 100 + d1, to = m2 * 100 + d2;
  return from <= to ? at >= from && at <= to : at >= from || at <= to;
}

/** Why a thing cannot be bought now, or null: not sold here, out of its season, already had, or too dear for the purse. */
export function cannotBuy(id: string, coins: number, had: ReadonlySet<string>, ms: number): "none" | "season" | "known" | "coins" | null {
  const good = TAILOR[id];
  if (!good) return "none";
  if (!inSeason(good, ms)) return "season";
  if (had.has(id)) return "known";
  return coins < good.price ? "coins" : null;
}

/** Why the shop or the auction says no (the database's words, v297). */
export type TailorRefusal = "season" | "known" | "coins" | "none" | "low" | "closed";
