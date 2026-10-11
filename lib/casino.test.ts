import { describe, expect, it } from 'vitest';
import { draftOf, draftProblem, effectiveChance, reelAt, spinRevealed, type CasinoState, type CasinoSpin } from './casino';
const fixture = (): CasinoState => ({ user_id: 'tester', settings: { id: 1, revision: 1, title: 'Halloween', open: true, mode: 'weighted', price: 100, per_player: 100, budget: 100000000, reserved: 0, spins: 0, pool_size: 1800, pool_draws: 0, starts_at: null, ends_at: null, updated_at: '', updated_by: null }, prizes: [{ id: 'gold', name: 'Gil', kind: 'gil', amount: 1000000, chance: .4, stock: 20, issued: 0, announce: false, active: true }], account: { coins: 20000, spins: 0 }, spins: [], receipts: [], queue: [], server_now: '', paid_gil: 0 });
describe('Casino presentation and settings', () => {
  it('shows depleted or unaffordable prizes as zero without redistributing odds', () => {
    const s = fixture(), p = s.prizes[0];
    expect(effectiveChance(p, s.settings, s.prizes)).toBe(.4);
    p.issued = p.stock; expect(effectiveChance(p, s.settings, s.prizes)).toBe(0);
    p.issued = 0; s.settings.reserved = s.settings.budget; expect(effectiveChance(p, s.settings, s.prizes)).toBe(0);
  });
  it('uses remaining stock and remaining draws in a pool', () => {
    const s = fixture(); s.settings.mode = 'pool'; s.settings.pool_size = 100; s.settings.pool_draws = 50; s.prizes[0].issued = 10;
    expect(effectiveChance(s.prizes[0], s.settings, s.prizes)).toBe(20);
  });
  it('rejects underfunded pools and reducing committed funds', () => {
    const s = fixture(), d = draftOf(s); d.mode = 'pool'; d.budget = 1000000;
    expect(draftProblem(d, s.settings)).toContain('งบไม่พอ');
    s.settings.reserved = 2000000; expect(draftProblem(d, s.settings)).toContain('งบที่จอง');
  });
  it('stops reels in sequence and keeps reduced motion from revealing a win early', () => {
    const s = { created_at: new Date(1000).toISOString(), reveal_at: new Date(4600).toISOString(), reels: ['seven', 'seven', 'seven', 'seven'] } as CasinoSpin;
    expect(reelAt(s, 0, 3250)).toBe('seven');
    expect(reelAt(s, 3, 4599, true)).toBe('popoto');
    expect(spinRevealed(s, 4599)).toBe(false);
    expect(reelAt(s, 3, 4600, true)).toBe('seven'); expect(spinRevealed(s, 4600)).toBe(true);
  });
});
