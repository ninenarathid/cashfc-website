import { draftProblem, type CasinoDraft, type CasinoPrize, type CasinoSettings } from './casino';

export const DEFAULT_CASINO_SIMULATION_SPINS = 100;
export const MAX_CASINO_SIMULATION_SPINS = 10000;

export type CasinoSimulation = {
  requested: number;
  spins: number;
  wins: number;
  misses: number;
  coinSpent: number;
  coinWon: number;
  gilWon: number;
  gilRemaining: number;
  poolRemaining: number | null;
  prizes: Array<Pick<CasinoPrize, 'id' | 'name' | 'kind' | 'amount'> & { wins: number; remaining: number }>;
};

/** Aggregate event forecast, using copies of the draft and committed stock/budget.
 * Player wallets, quotas, opening hours and reel animations do not limit a forecast.
 * Sampling follows casino_live_spin: eligible prizes in id order, without redistributing depleted odds.
 */
export function simulateCasino(
  draft: CasinoDraft,
  current: CasinoSettings,
  requested = DEFAULT_CASINO_SIMULATION_SPINS,
  random: () => number = Math.random,
): CasinoSimulation {
  if (!Number.isSafeInteger(requested) || requested < 1 || requested > MAX_CASINO_SIMULATION_SPINS) {
    throw new Error('จำนวนครั้งต้องเป็นจำนวนเต็ม 1–10,000');
  }
  const issue = draftProblem(draft, current);
  if (issue) throw new Error(issue);
  const prizes = draft.prizes.map(p => ({
    id: p.id, name: p.name, kind: p.kind, amount: p.amount,
    wins: 0, remaining: p.stock - p.issued,
  }));
  const ordered = draft.prizes.map((prize, index) => ({ prize, result: prizes[index] }))
    .sort((a, b) => a.prize.id < b.prize.id ? -1 : a.prize.id > b.prize.id ? 1 : 0);
  let poolRemaining = draft.mode === 'pool' ? draft.pool_size - current.pool_draws : null;
  let gilRemaining = draft.budget - current.reserved;
  let spins = 0, wins = 0, coinWon = 0, gilWon = 0;
  while (spins < requested && poolRemaining !== 0) {
    let sample = poolRemaining === null ? random() * 100 : Math.floor(random() * poolRemaining);
    for (const { prize, result } of ordered) {
      if (!prize.active || result.remaining === 0 || (prize.kind === 'gil' && prize.amount > gilRemaining)) continue;
      sample -= poolRemaining === null ? Number(prize.chance) : result.remaining;
      if (sample >= 0) continue;
      result.remaining--; result.wins++; wins++;
      if (prize.kind === 'gil') { gilWon += prize.amount; gilRemaining -= prize.amount; }
      if (prize.kind === 'coin') coinWon += prize.amount;
      break;
    }
    spins++;
    if (poolRemaining !== null) poolRemaining--;
  }
  return { requested, spins, wins, misses: spins - wins, coinSpent: spins * draft.price,
    coinWon, gilWon, gilRemaining, poolRemaining, prizes };
}
