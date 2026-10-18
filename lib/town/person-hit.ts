export interface HitBounds { x0: number; y0: number; x1: number; y1: number }
export interface PersonHit extends HitBounds { id: string }
const contains = (b: HitBounds, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

/**
 * The chest stays usable when somebody's generously sized player hit area overlaps its picture.
 * `skip` is a doll the pointer goes through (one's own: a tap on it is for the tile, rock or plot under it).
 */
export function personHitAt(people: readonly PersonHit[], x: number, y: number, chest: HitBounds | null = null, skip: string | null = null): PersonHit | null {
  if (chest && contains(chest, x, y)) return null;
  for (let i = people.length - 1; i >= 0; i--) if (people[i].id !== skip && contains(people[i], x, y)) return people[i];
  return null;
}
