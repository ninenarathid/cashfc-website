import { describe, expect, it } from 'vitest';
import { draftOf, type CasinoState } from './casino';
import { simulateCasino } from './casino-simulation';

const fixture = (): CasinoState => ({
  user_id: 'tester', settings: { id: 1, revision: 1, title: 'Casino', open: false, mode: 'weighted', price: 100,
    per_player: 1, budget: 1000, reserved: 0, spins: 0, pool_size: 10, pool_draws: 0,
    starts_at: null, ends_at: null, updated_at: '', updated_by: null },
  prizes: [
    { id: 'gold', name: 'Gil', kind: 'gil', amount: 250, chance: 50, stock: 10, issued: 0, announce: false, active: true },
    { id: 'popoto', name: 'Coin', kind: 'coin', amount: 50, chance: 25, stock: 10, issued: 0, announce: false, active: true },
  ], account: { coins: 0, spins: 1 }, spins: [], receipts: [], queue: [], paid_gil: 0, server_now: '',
});

describe('casino event simulation', () => {
  it('defaults to 100 aggregate spins without modifying settings, stock or wallets', () => {
    const state = fixture(), draft = draftOf(state), before = structuredClone({ state, draft });
    const result = simulateCasino(draft, state.settings, undefined, () => .99);
    expect(result.spins).toBe(100); expect(result.misses).toBe(100); expect(result.coinSpent).toBe(10000);
    expect({ state, draft }).toEqual(before);
  });
  it('caps Gil at the remaining budget and leaves depleted odds as misses', () => {
    const state = fixture(); state.settings.reserved = 750;
    // First draw gets Gil; later draws must miss rather than become Coin wins.
    const result = simulateCasino(draftOf(state), state.settings, 10, () => .3);
    expect(result.gilWon).toBe(250); expect(result.gilRemaining).toBe(0);
    expect(result.wins).toBe(1); expect(result.misses).toBe(9); expect(result.coinWon).toBe(0);
  });
  it('respects issued stock and accounts for Coin rewards separately from spending', () => {
    const state = fixture(); state.prizes[0].active = false; state.prizes[1].issued = 8;
    const result = simulateCasino(draftOf(state), state.settings, 7, () => 0);
    expect(result.prizes[1]).toMatchObject({ wins: 2, remaining: 0 });
    expect(result.coinWon).toBe(100); expect(result.coinSpent).toBe(700); expect(result.misses).toBe(5);
  });
  it('samples finite pools without replacement and charges only completed draws', () => {
    const state = fixture(), draft = draftOf(state); draft.mode = 'pool'; draft.pool_size = 10;
    state.settings.pool_draws = 5; draft.prizes[0].stock = 3; draft.prizes[0].issued = 1;
    draft.prizes[1].stock = 2; draft.prizes[1].issued = 1;
    const result = simulateCasino(draft, state.settings, 100, () => .99);
    expect(result).toMatchObject({ requested: 100, spins: 5, wins: 3, misses: 2, coinSpent: 500,
      coinWon: 50, gilWon: 500, poolRemaining: 0 });
    expect(result.prizes.every(p => p.remaining === 0)).toBe(true);
  });
  it('keeps disabled prizes out of the pool and handles an already finished pool', () => {
    const state = fixture(), draft = draftOf(state); draft.mode = 'pool'; draft.prizes.forEach(p => p.active = false);
    expect(simulateCasino(draft, state.settings, 10, () => 0).misses).toBe(10);
    state.settings.pool_draws = 10;
    expect(simulateCasino(draft, state.settings)).toMatchObject({ spins: 0, coinSpent: 0, poolRemaining: 0 });
  });
  it('uses unsaved draft values and rejects invalid counts and invalid configuration', () => {
    const state = fixture(), draft = draftOf(state); draft.price = 13;
    expect(simulateCasino(draft, state.settings, 1234, () => .99).coinSpent).toBe(16042);
    expect(simulateCasino(draft, state.settings, 10000, () => .99).spins).toBe(10000);
    for (const n of [0, -1, 1.5, 10001, NaN, Infinity]) expect(() => simulateCasino(draft, state.settings, n)).toThrow('จำนวนครั้ง');
    draft.prizes[0].chance = 100;
    expect(() => simulateCasino(draft, state.settings)).toThrow('โอกาสรวม');
    // (coins paid back on average at or over the price would print the town's coins)
    draft.prizes[0].chance = 50; draft.price = 12;
    expect(() => simulateCasino(draft, state.settings)).toThrow('Coin ที่ได้คืน');
  });
  it('preserves probability boundaries in the same prize order as the live draw', () => {
    const state = fixture(), draft = draftOf(state);
    draft.prizes.reverse();
    const draw = (value: number) => simulateCasino(draft, state.settings, 1, () => value);
    expect(draw(.499999).gilWon).toBe(250);
    expect(draw(.5).coinWon).toBe(50);
    expect(draw(.75).misses).toBe(1);
  });
});
