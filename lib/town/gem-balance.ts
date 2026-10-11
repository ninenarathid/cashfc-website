/** Gameplay steps: +7 uses the first, +10 the second, matching +10 sockets the third.
 * Training remains cosmetic. These tables also feed the SQL catalog migration.
 */
export const GEM_BALANCE = {
  fire: [0.25, 0.4, 0.55, 0.65], fireTempo: [0.1, 0.2, 0.35, 0.4],
  fireHoe: [2, 3, 4, 5], fireCan: [3, 6, 9, 12],
  waterStamina: [0.2, 0.35, 0.45, 0.5],
  ice: [0.25, 0.4, 0.5, 0.6], iceCross: [2, 3, 4, 5],
  earth: [0.3, 0.5, 0.6, 0.65], lightning: [0.2, 0.35, 0.5, 0.6],
  windWalk: [0.25, 0.45, 0.65, 0.75], windQuick: [0.2, 0.35, 0.5, 0.6], windReach: [1, 2, 3, 4],
  lightBand: [0.2, 0.35, 0.5, 0.6], lightEarly: [1, 2, 3, 4], lightRead: [2, 4, 6, 8],
  darkRare: [1.5, 2, 2.5, 3], darkVeins: [1.6, 2.2, 2.8, 3.2], darkYield: [0.25, 0.4, 0.55, 0.65],
  darkSoil: [1, 1, 2, 2], darkSoilDaily: 20,
} as const;
