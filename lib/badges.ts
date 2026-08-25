/**
 * Where a member sits against the rest of the FC on a given stat, for the bars under
 * the collection tiles.
 *
 * This file used to also hand out restaurant-themed badges — Head Chef of
 * Collecting, Popoto King and so on. They were retired because the playstyle and job
 * chips already say what somebody is known for, in a way that is earned against the
 * whole game rather than against whoever happens to be in the FC this week.
 */
export function percentile(
  values: (number | null | undefined)[],
  me: number | null | undefined,
): number | null {
  if (me == null) return null;
  const v = values.filter((x): x is number => x != null);
  if (!v.length) return null;
  const below = v.filter((x) => x < me).length;
  return Math.round((below / v.length) * 100);
}
