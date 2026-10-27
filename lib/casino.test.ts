import { describe, expect, it } from 'vitest';
import { backAverage, backRows, chipsOf, coinsBack, draftOf, draftProblem, effectiveChance, prizeWithAmount, reelAt, spinRevealed, whereItGoes, wipedWords, wonWords, type CasinoState, type CasinoSpin } from './casino';
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
  it('renames a prize named by its amount, and leaves any other name alone', () => {
    const p = { name: '250,000 Gil', kind: 'gil' as const, amount: 250000 };
    expect(prizeWithAmount(p, 500000)).toEqual({ name: '500,000 Gil', kind: 'gil', amount: 500000 });
    expect(prizeWithAmount({ ...p, amount: 300000 }, 400000).name).toBe('400,000 Gil');
    expect(prizeWithAmount(p, 1000, 'coin').name).toBe('1,000 Coin');
    expect(prizeWithAmount(p, 0, 'physical').name).toBe('250,000 Gil');
    expect(prizeWithAmount({ ...p, name: 'Gil ก้อนใหญ่' }, 500000).name).toBe('Gil ก้อนใหญ่');
  });
  it('stops reels in sequence and keeps reduced motion from revealing a win early', () => {
    const s = { created_at: new Date(1000).toISOString(), reveal_at: new Date(4600).toISOString(), reels: ['seven', 'seven', 'seven', 'seven'] } as CasinoSpin;
    expect(reelAt(s, 0, 3250)).toBe('seven');
    expect(reelAt(s, 3, 4599, true)).toBe('popoto');
    expect(spinRevealed(s, 4599)).toBe(false);
    expect(reelAt(s, 3, 4600, true)).toBe('seven'); expect(spinRevealed(s, 4600)).toBe(true);
  });
  it('says what of the trial was withdrawn already, when anything was (v299)', () => {
    expect(wipedWords({ spins: 3, withdrawn: 0 })).toBe('ล้างผลทดสอบแล้ว');
    expect(wipedWords(null)).toBe('ล้างผลทดสอบแล้ว');
    expect(wipedWords({ spins: 3, withdrawn: 1000000 })).toContain('1,000,000');
  });
  it('takes the rate and the free Casino Coins into the desk only from a database that has them (v303)', () => {
    const s = fixture();
    expect('chip_rate' in draftOf(s)).toBe(false);
    expect(chipsOf(s)).toBe(null);
    s.settings.chip_rate = 1; s.settings.free_chips = 100; s.account.chips = 250; s.account.free_today = true;
    const d = draftOf(s);
    expect([d.chip_rate, d.free_chips, chipsOf(s)]).toEqual([1, 100, 250]);
    expect(draftProblem(d, s.settings)).toBe(null);
    expect(draftProblem({ ...d, chip_rate: 0 }, s.settings)).toContain('อัตราแลก');
    expect(draftProblem({ ...d, free_chips: 100001 }, s.settings)).toContain('อัตราแลก');
    expect(draftProblem({ ...d, chip_rate: 1.5 }, s.settings)).toContain('อัตราแลก');
  });
  it('names Casino Coins as Casino Coins, and says where they go', () => {
    expect(prizeWithAmount({ name: '100 Casino Coin', kind: 'coin' as const, amount: 100 }, 200).name).toBe('200 Casino Coin');
    expect(prizeWithAmount({ name: '50 Coin', kind: 'coin' as const, amount: 50 }, 80).name).toBe('80 Coin');
    expect(whereItGoes({ kind: 'coin' }, true)).toBe('หมุนต่อได้เลย');
    expect(whereItGoes({ kind: 'coin' })).toBe('เข้ากระเป๋า Cash Town แล้ว');
  });
  it('pays a pair by the paytable: a part of the price, rounded down, the pair chance shared out (v304)', () => {
    const t = [{ sym: 'cherry' as const, pct: 10, share: 40 }, { sym: 'popoto' as const, pct: 20, share: 30 }, { sym: 'gold' as const, pct: 30, share: 18 }, { sym: 'seven' as const, pct: 50, share: 9 }, { sym: 'evercold' as const, pct: 80, share: 3 }];
    expect(backAverage(t, 100)).toBeCloseTo(22.3);
    const rows = backRows(t, 100, 20);
    expect(rows.map(r => r.amount)).toEqual([10, 20, 30, 50, 80]);
    expect(rows.map(r => +r.chance.toFixed(2))).toEqual([8, 6, 3.6, 1.8, 0.6]);
    expect(backRows(t, 7, 20).map(r => r.amount)).toEqual([0, 1, 2, 3, 5]);
    const s = fixture(); s.settings.back_table = t; s.prizes.push({ id: 'pair', name: '50 Casino Coin', kind: 'coin', amount: 50, chance: 20, stock: 100000, issued: 0, announce: false, active: true });
    const d = draftOf(s);
    expect(coinsBack(d, s.settings)).toBeCloseTo(4.46);
    expect(draftProblem(d, s.settings)).toBe(null);
    expect(draftProblem({ ...d, back_table: t.map((r, i) => i ? r : { ...r, pct: 1001 }) }, s.settings)).toContain('ตาราง');
    expect(draftProblem({ ...d, back_table: t.map((r, i) => i ? r : { ...r, pct: 300 }) }, s.settings)).toBe(null);
    expect(draftProblem({ ...d, back_table: t.map(r => ({ ...r, pct: 1000 })) }, s.settings)).toContain('น้อยกว่าราคาหมุน');
    expect(draftProblem({ ...d, back_table: t.map(r => ({ ...r, share: 0 })) }, s.settings)).toContain('ตาราง');
    expect(draftProblem({ ...d, price: 5 }, s.settings)).toContain('อย่างน้อย 1');
    expect(wonWords({ name: '20 Casino Coin', amount: 20, pct: 20 })).toBe('ได้ Casino Coin คืน 20 (20%)');
    expect(wonWords({ name: '250,000 Gil', amount: 250000 })).toBe('ได้ 250,000 Gil');
    expect(wonWords({ name: '150 Casino Coin', amount: 150, pct: 150 })).toBe('ได้ 150 Casino Coin (150%) กำไร');
  });
});
