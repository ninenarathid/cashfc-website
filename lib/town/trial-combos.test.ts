import { afterEach, expect, it, vi } from 'vitest';
import type { Purse } from './trade';
import type { Plot } from './farm';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function sowingFixture() {
 const { newPurse } = await import('./trade');
 const purse: Purse = { ...newPurse(), gifts: { had: ['charmHoe','famButterfly'], charms: ['charmHoe'], familiar: 'famButterfly', used: {}, owed: 0 } };
 const plot: Plot = { soil: 'tilled', plant: { by: 'player', crop: 'pumpkin', sown: 1000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } };
 return { purse, plot };
}

it('development trials retain the real sowing bond for server parity', async () => {
 vi.stubEnv('NODE_ENV','test'); vi.resetModules();
 const { guardSeed } = await import('./trial-combos');
 const { purse, plot } = await sowingFixture();
 const result = guardSeed(purse,plot,'134,6',1000);
 expect(result.plot.plant?.wingGuard).toBe(7_201_000);
 expect(result.purse.combos?.found.map(f=>f.key)).toContain('SC06');
});

it('production rehearsal keeps inventory and coins without granting private town bonds', async () => {
 vi.stubEnv('NODE_ENV','production'); vi.resetModules();
 const { guardSeed, prepareCombo, matchesCombo } = await import('./trial-combos');
 const { purse, plot } = await sowingFixture();
 const before = structuredClone({ purse, plot });
 expect(guardSeed(purse,plot,'134,6',1000)).toEqual({purse,plot});
 expect(matchesCombo(purse,['charmHoe','famButterfly'])).toBe(false);
 expect(prepareCombo(purse,'wood','trunk',1000,{})).toBeNull();
 expect({purse,plot}).toEqual(before);
 const { casinoMemoryKeeper } = await import('./keeper-trial');
 const first=casinoMemoryKeeper('player'),other=casinoMemoryKeeper('player');
 first.coins(1234); other.coins(50);
 expect(first.keeper.purse().coins).toBe(1234);
 expect(other.keeper.purse().coins).toBe(50);
 expect(first.keeper.purse().combos?.found??[]).toEqual([]);
});
