/** Casino test contracts. Financial decisions belong to the database, never the animation. */
export const SYMBOLS = ['seven', 'cherry', 'gold', 'popoto'] as const;
export type SymbolId = typeof SYMBOLS[number];
export type CasinoPrize = {
  id: SymbolId; name: string; kind: 'gil' | 'physical' | 'coin'; amount: number;
  chance: number; stock: number; issued: number; announce: boolean; active: boolean;
};
export type PrizeSnapshot = Pick<CasinoPrize, 'id' | 'name' | 'kind' | 'amount' | 'announce'> & { test: boolean };
export type CasinoSettings = {
  id: number; revision: number; title: string; open: boolean; mode: 'weighted' | 'pool';
  price: number; per_player: number; budget: number; reserved: number; spins: number;
  pool_size: number; pool_draws: number; starts_at: string | null; ends_at: string | null;
  updated_at: string; updated_by: string | null;
};
export type CasinoSpin = {
  id: string; user_id: string; player_name: string; machine: number; revision: number;
  price: number; reels: SymbolId[]; prize: PrizeSnapshot | null; forced: boolean;
  created_at: string; reveal_at: string;
};
export type CasinoReceipt = {
  id: string; spin_id: string; user_id: string; player_name: string; prize: PrizeSnapshot;
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled'; created_at: string;
  requested_at: string | null; handled_by: string | null; fulfilled_at: string | null; note: string;
};
export type CasinoState = {
  room_epoch?: string;
  user_id: string; settings: CasinoSettings; prizes: CasinoPrize[];
  account: { coins: number; spins: number }; spins: CasinoSpin[];
  receipts: CasinoReceipt[]; queue: CasinoReceipt[]; server_now: string; paid_gil: number;
};
export type CasinoDraft = Pick<CasinoSettings,
  'title' | 'open' | 'mode' | 'price' | 'per_player' | 'budget' | 'pool_size' | 'starts_at' | 'ends_at'> & { prizes: CasinoPrize[] };
export function draftOf(state: CasinoState): CasinoDraft {
  const { title, open, mode, price, per_player, budget, pool_size, starts_at, ends_at } = state.settings;
  return { title, open, mode, price, per_player, budget, pool_size, starts_at, ends_at, prizes: state.prizes.map(p => ({ ...p })) };
}
export function effectiveChance(p: CasinoPrize, s: CasinoSettings, all: CasinoPrize[]): number {
  if (!p.active || p.issued >= p.stock || (p.kind === 'gil' && p.amount > s.budget - s.reserved)) return 0;
  if (s.mode === 'pool') return s.pool_size > s.pool_draws ? 100 * (p.stock - p.issued) / (s.pool_size - s.pool_draws) : 0;
  // Depleted chances become misses; they are never secretly redistributed to another prize.
  return Number(p.chance);
}
export function draftProblem(d: CasinoDraft, s: CasinoSettings): string | null {
  if (!d.title.trim() || d.title.length > 100) return 'ชื่อกิจกรรมต้องมี 1–100 ตัวอักษร';
  if (![d.price, d.per_player, d.budget, d.pool_size].every(Number.isSafeInteger) ||
    d.price < 1 || d.price > 100000 || d.per_player < 1 || d.per_player > 10000 ||
    d.budget < s.reserved || d.budget > 1e12 || d.pool_size < Math.max(1, s.pool_draws) || d.pool_size > 1e7) return 'ตรวจสอบราคา โควตา และงบที่จองไว้แล้ว';
  if (d.starts_at && d.ends_at && Date.parse(d.ends_at) <= Date.parse(d.starts_at)) return 'เวลาจบต้องอยู่หลังเวลาเริ่ม';
  for (const p of d.prizes) {
    if (!p.name.trim() || p.name.length > 100 || !Number.isFinite(Number(p.chance)) || p.chance < 0 || p.chance > 100 ||
      !Number.isSafeInteger(p.stock) || p.stock < p.issued || p.stock > 1e6 ||
      !Number.isSafeInteger(p.amount) || p.amount < 0 || p.amount > 1e9 || (p.kind !== 'physical' && p.amount === 0)) return 'ตรวจสอบชื่อ โอกาส จำนวนรางวัล และสต็อก';
  }
  if (d.prizes.reduce((n, p) => n + (p.active ? Number(p.chance) : 0), 0) > 100) return 'โอกาสรวมต้องไม่เกิน 100%';
  if (d.mode === 'pool') {
    const left = d.prizes.filter(p => p.active);
    if (left.reduce((n, p) => n + p.stock - p.issued, 0) > d.pool_size - s.pool_draws) return 'รางวัลมากกว่าสิทธิ์ที่เหลือในกอง';
    if (left.reduce((n, p) => n + (p.kind === 'gil' ? (p.stock - p.issued) * p.amount : 0), 0) > d.budget - s.reserved) return 'งบไม่พอสำหรับรางวัล Gil ที่เหลือในกอง';
  }
  return null;
}
export function reelAt(spin: CasinoSpin, reel: number, now: number, reduced = false): SymbolId {
  const start = Date.parse(spin.created_at), end = Date.parse(spin.reveal_at);
  const stop = end - (3 - reel) * 450;
  if (now >= stop) return spin.reels[reel];
  if (reduced) return SYMBOLS[reel];
  return SYMBOLS[(Math.floor(Math.max(0, now - start) / 75) + reel * 3) % SYMBOLS.length];
}
export function spinRevealed(spin: CasinoSpin, now: number) { return now >= Date.parse(spin.reveal_at); }
export const money = (n: number) => n.toLocaleString('en-US');
export const CLAIM_LABEL = { pending: 'รอรับ', processing: 'กำลังส่งมอบ', fulfilled: 'ส่งมอบแล้ว', cancelled: 'ยกเลิก' };
