/**
 * Who a meal is eaten with: the count the page tells whoever keeps the game as a helping is eaten (lib/town/stamina:
 * each of them adds a tenth of the dish's stamina, up to five).
 *
 * The owner's rules, 2026-10-08. Who counts: those who are eating ("เฉพาะคนที่กำลังกิน"), seated within reach or in
 * the cooking yard with me. And, the same day, of a member whose company was gone the moment a quicker eater was
 * done ("เวลากินข้าวด้วยกันอยากให้ stack ยังอยู่ ถ้าคนที่กินเสร็จก่อนกินหมดแล้ว บางคนกดเร็ว กินไม่ทันเขา stack หายเลย"):
 * **whoever was eating beside me goes on counting until my helping ends, for as long as they stay seated there.**
 * Whoever gets up or goes is company no more, and does not come back into it by sitting down again with nothing to
 * eat; and nobody who only sat by, and never ate while I did, counts at all.
 *
 * "Stay seated" is held to the sitting itself, not to what a look happens to see: the stay numbers each sitting of
 * each person (`Avatar.sat` in lib/town/session: a new number each time they sit down), and somebody is remembered
 * at the sitting they ate at. Got up and sat down again between two looks, they are at another sitting.
 *
 * The page's own (the room is the page's: nothing that keeps the game knows where anybody sits). Pure, and tested.
 */

/** Somebody else, as the map has them: whether they eat now, sit (and at which sitting of theirs), and are within my meal's reach. */
export interface Beside { id: string; eating: boolean; seated: boolean; near: boolean; sat: number }

/**
 * My company now, and who has eaten with me this helping, each at which sitting (`ate`, to be handed back the next
 * time: a new map, never the one given). With no helping of mine begun there is none and nobody is remembered.
 */
export function companyOf(others: Beside[], ate: ReadonlyMap<string, number>, mine: boolean): { n: number; ate: Map<string, number> } {
  const kept = new Map<string, number>();
  if (!mine) return { n: 0, ate: kept };
  let n = 0;
  for (const o of others) {
    if (!o.seated || !o.near) continue;
    if (o.eating || ate.get(o.id) === o.sat) { n++; kept.set(o.id, o.sat); }
  }
  return { n, ate: kept };
}
