/** Production casino rehearsal shares Trial, but must never ship town recipes.
 * Real town combinations run on the server; dev trials keep the parity model. */
import * as rules from './private/combos';
import { guardSeed as devGuardSeed, sharedMealBond as devSharedMealBond } from './private/combo-garden';
import { continueRow as devContinueRow } from './private/combo-rows';
import { rootAfterFell as devRootAfterFell } from './private/combo-roots';
import { listenForest as devListenForest } from './private/combo-forest';
import { warmCooking as devWarmCooking } from './private/combo-warm';
import { comboWearKey } from './combo-types';

// Compile-time conditions remove the private imports even from lazy TEST chunks.
export const matchesCombo: typeof rules.matchesCombo = process.env.NODE_ENV !== 'production' ? rules.matchesCombo : () => false;
export const comboCue: typeof rules.comboCue = process.env.NODE_ENV !== 'production' ? rules.comboCue : () => undefined;
export const comboLoadout = comboWearKey;
export const prepareCombo: typeof rules.prepareCombo = process.env.NODE_ENV !== 'production' ? rules.prepareCombo : () => null;
export const rescueCombo: typeof rules.rescueCombo = process.env.NODE_ENV !== 'production' ? rules.rescueCombo : () => null;
export const resourceCorrection: typeof rules.resourceCorrection = process.env.NODE_ENV !== 'production' ? rules.resourceCorrection : () => null;
export const commitCombo: typeof rules.commitCombo = process.env.NODE_ENV !== 'production' ? rules.commitCombo : () => null;
export const fishQuiet: typeof rules.fishQuiet = process.env.NODE_ENV !== 'production' ? rules.fishQuiet : () => null;
export const dominoPreview: typeof rules.dominoPreview = process.env.NODE_ENV !== 'production' ? rules.dominoPreview : () => null;
export const guardSeed: typeof devGuardSeed = process.env.NODE_ENV !== 'production' ? devGuardSeed : (purse, plot) => ({ purse, plot });
export const sharedMealBond: typeof devSharedMealBond = process.env.NODE_ENV !== 'production' ? devSharedMealBond : (mine, theirs) => ({ mine, theirs });
export const continueRow: typeof devContinueRow = process.env.NODE_ENV !== 'production' ? devContinueRow : (_before, after) => after;
export const rootAfterFell: typeof devRootAfterFell = process.env.NODE_ENV !== 'production' ? devRootAfterFell : (_before, did) => did.purse;
export const listenForest: typeof devListenForest = process.env.NODE_ENV !== 'production' ? devListenForest : () => null;
export const warmCooking: typeof devWarmCooking = process.env.NODE_ENV !== 'production' ? devWarmCooking : () => null;
