/**
 * Where the pasture's places are: the farm's new north-east rows (local y -32..-1, global x 128..187), shared by the
 * page's map (lib/town/world.ts), the trial and the database's catalog row `animals` (v291). The page piece owns the
 * layout and may move these; whatever it settles is what the catalog carries.
 */
export const PASTURE = {
  /** Rows added north-east of the farm's old rim, at negative local y. */
  rows: 32,
  /** The farm's origin (unchanged) and its bounds with the pasture: x 128..187, y -32..85. */
  origin: [128, 0] as const,
  rect: [128, -32, 60, 118] as const,
} as const;

/** Spots of the meadow where a bird out may lay (global tiles); `SpotOf` picks one by a seed. */
export const EGG_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [134, -28], [140, -26], [146, -29], [152, -27], [158, -25], [164, -28], [170, -26], [176, -29], [182, -27],
  [136, -20], [143, -18], [149, -21], [156, -19], [162, -22], [168, -18], [175, -21], [181, -19],
  [138, -12], [145, -10], [151, -13], [157, -11], [163, -14], [170, -10], [177, -13],
];
export const spotOf = (seed: number): [number, number] => {
  const s = EGG_SPOTS[((seed % EGG_SPOTS.length) + EGG_SPOTS.length) % EGG_SPOTS.length];
  return [s[0], s[1]];
};
/** The meadow's twelve forage spots (lib/town/animals' MEADOW), in their order. */
export const MEADOW_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [133, -24], [139, -30], [147, -23], [153, -31], [160, -24], [166, -30], [173, -23], [179, -31], [185, -24],
  [142, -15], [159, -16], [176, -15],
];
/** The hay wagon's stops: one by each map's gate (a new map adds one here and nothing else). */
export const WAGON_STOPS: Readonly<Record<string, readonly [number, number]>> = {
  farm: [150, -4],
  town: [30, 40],
  forest: [150, 120],
};
