/** Casino test contracts. Financial decisions belong to the database, never the animation. */
export const SYMBOLS = ['seven', 'cherry', 'gold', 'popoto', 'evercold'] as const;
export type SymbolId = typeof SYMBOLS[number];
/**
 * Every prize, in the order the desk lists them: one a symbol (four of it on the reels), and the pair (the first two
 * reels alike, the owner's coin back, 2026-10-27: "เพิ่มการสุ่มแจก casino coin กลับ"). Two reels alike anywhere would be
 * nearly every miss of four reels and five symbols, so the pair is the first two: a miss never shows them alike.
 */
export const PRIZE_IDS = [...SYMBOLS, 'pair'] as const;
export type PrizeId = typeof PRIZE_IDS[number];
/** Who may spin LIVE: nobody, the admins trying it first (every spin marked a test, wiped before opening), or everybody. */
export type CasinoAccess = 'closed' | 'admins' | 'everyone';
export const ACCESS_LABEL: Record<CasinoAccess, string> = { closed: 'ปิด', admins: 'แอดมินทดสอบ', everyone: 'เปิดทุกคน' };
export const PRIZE_LABEL: Record<PrizeId, string> = {
  seven: '7 สี่ตัว', cherry: 'เชอร์รี่สี่ตัว', gold: 'ทองสี่ตัว', popoto: 'Popoto สี่ตัว', evercold: 'Evercold สี่ตัว', pair: 'สองช่องแรกตรงกัน',
};
export type CasinoPrize = {
  id: PrizeId; name: string; kind: 'gil' | 'physical' | 'coin'; amount: number;
  chance: number; stock: number; issued: number; announce: boolean; active: boolean;
};
export type PrizeSnapshot = Pick<CasinoPrize, 'id' | 'name' | 'kind' | 'amount' | 'announce'> & { test: boolean };
export type CasinoSettings = {
  id: number; revision: number; title: string; open: boolean; mode: 'weighted' | 'pool';
  price: number; per_player: number; budget: number; reserved: number; spins: number;
  pool_size: number; pool_draws: number; starts_at: string | null; ends_at: string | null;
  updated_at: string; updated_by: string | null;
  /** v299's; a database before it has only `open` (accessOf). */
  access?: CasinoAccess;
};
export type CasinoSpin = {
  id: string; user_id: string; player_name: string; machine: number; revision: number;
  price: number; reels: SymbolId[]; prize: PrizeSnapshot | null; forced: boolean;
  created_at: string; reveal_at: string;
  /** Spun while only the admins were let in (v299): wiped with the rest of the trial before opening. */
  test?: boolean;
};
export type CasinoReceipt = {
  id: string; spin_id: string; user_id: string; player_name: string; prize: PrizeSnapshot;
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled'; created_at: string;
  requested_at: string | null; handled_by: string | null; fulfilled_at: string | null; note: string;
};
/** A win as the admins see it (v299): the thing in the winner's prize box, or the Gil in their wallet. */
export type CasinoWinner = {
  spin_id: string; user_id: string; player_name: string; prize: PrizeSnapshot; test: boolean; created_at: string;
  /** The row of prize_wins (its 1-1 thread) of a thing to hand over; the wallet's payment of Gil. */
  win_id: number | null; drop_id: number | null; claimed_at: string | null; delivered_at: string | null;
};
export type CasinoState = {
  room_epoch?: string;
  user_id: string; settings: CasinoSettings; prizes: CasinoPrize[];
  account: { coins: number; spins: number }; spins: CasinoSpin[];
  receipts: CasinoReceipt[]; queue: CasinoReceipt[]; server_now: string; paid_gil: number;
  /** The admins' list of who won what (v299). */
  winners?: CasinoWinner[];
  /** How many spins of the admins' trial are still to be wiped (v299). */
  tests?: number;
  /** Whether the database takes me for an admin (v299): what the page offers the admins goes by it. */
  admin?: boolean;
};
export type CasinoDraft = Pick<CasinoSettings,
  'title' | 'open' | 'mode' | 'price' | 'per_player' | 'budget' | 'pool_size' | 'starts_at' | 'ends_at'> & { access: CasinoAccess; prizes: CasinoPrize[] };
/** Who may spin, from a database with v299 or one without. */
export const accessOf = (s: Pick<CasinoSettings, 'open' | 'access'>): CasinoAccess => s.access ?? (s.open ? 'everyone' : 'closed');
/** Whether this account may spin and walk in now (the hours aside): the database says so again at every spin. */
export const letIn = (s: Pick<CasinoSettings, 'open' | 'access'>, admin: boolean) => accessOf(s) === 'everyone' || (admin && accessOf(s) === 'admins');
/** A room kept from before the evercold and the pair (the TEST room's saved setup) has four prizes: the two are added unused. */
export function allPrizes(prizes: CasinoPrize[]): CasinoPrize[] {
  return PRIZE_IDS.map(id => prizes.find(p => p.id === id) ?? UNUSED[id]);
}
const UNUSED: Record<PrizeId, CasinoPrize> = {
  seven: { id: 'seven', name: '7', kind: 'physical', amount: 0, chance: 0, stock: 0, issued: 0, announce: false, active: false },
  cherry: { id: 'cherry', name: 'Cherry', kind: 'physical', amount: 0, chance: 0, stock: 0, issued: 0, announce: false, active: false },
  gold: { id: 'gold', name: 'Gold', kind: 'physical', amount: 0, chance: 0, stock: 0, issued: 0, announce: false, active: false },
  popoto: { id: 'popoto', name: 'Popoto', kind: 'physical', amount: 0, chance: 0, stock: 0, issued: 0, announce: false, active: false },
  evercold: { id: 'evercold', name: 'Evercold', kind: 'physical', amount: 0, chance: 0, stock: 0, issued: 0, announce: true, active: false },
  pair: { id: 'pair', name: '50 Coin', kind: 'coin', amount: 50, chance: 0, stock: 100000, issued: 0, announce: false, active: false },
};
export function draftOf(state: CasinoState): CasinoDraft {
  const { title, open, mode, price, per_player, budget, pool_size, starts_at, ends_at } = state.settings;
  return { title, open, access: accessOf(state.settings), mode, price, per_player, budget, pool_size, starts_at, ends_at, prizes: state.prizes.map(p => ({ ...p })) };
}
export function effectiveChance(p: CasinoPrize, s: CasinoSettings, all: CasinoPrize[]): number {
  if (!p.active || p.issued >= p.stock || (p.kind === 'gil' && p.amount > s.budget - s.reserved)) return 0;
  if (s.mode === 'pool') return s.pool_size > s.pool_draws ? 100 * (p.stock - p.issued) / (s.pool_size - s.pool_draws) : 0;
  // Depleted chances become misses; they are never secretly redistributed to another prize.
  return Number(p.chance);
}
/**
 * The coins a spin pays back on average: under the price, or the casino would print the town's coins (the owner's rule,
 * the town must not inflate). Weighted: each coin prize's chance of its amount; a pool: every coin left in it over the
 * draws left.
 */
export function coinsBack(d: Pick<CasinoDraft, 'mode' | 'prizes' | 'pool_size'>, s: Pick<CasinoSettings, 'pool_draws'>): number {
  const coins = d.prizes.filter(p => p.active && p.kind === 'coin');
  if (d.mode === 'pool') { const left = d.pool_size - s.pool_draws; return left > 0 ? coins.reduce((n, p) => n + (p.stock - p.issued) * p.amount, 0) / left : 0; }
  return coins.reduce((n, p) => n + Number(p.chance) / 100 * p.amount, 0);
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
    if (p.id === 'pair' && p.kind !== 'coin') return 'สองช่องแรกตรงกันให้ได้เป็น Coin คืนเท่านั้น';
  }
  if (d.prizes.reduce((n, p) => n + (p.active ? Number(p.chance) : 0), 0) > 100) return 'โอกาสรวมต้องไม่เกิน 100%';
  if (d.mode === 'pool') {
    const left = d.prizes.filter(p => p.active);
    if (left.reduce((n, p) => n + p.stock - p.issued, 0) > d.pool_size - s.pool_draws) return 'รางวัลมากกว่าสิทธิ์ที่เหลือในกอง';
    if (left.reduce((n, p) => n + (p.kind === 'gil' ? (p.stock - p.issued) * p.amount : 0), 0) > d.budget - s.reserved) return 'งบไม่พอสำหรับรางวัล Gil ที่เหลือในกอง';
  }
  if (coinsBack(d, s) >= d.price) return 'Coin ที่ได้คืนเฉลี่ยต่อครั้งต้องน้อยกว่าราคาหมุน ไม่ให้เหรียญในเมืองเฟ้อ';
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
/** A Gil or Coin prize named by its amount alone ("250,000 Gil") is renamed with it; any other name is the admin's own. */
export function prizeWithAmount<P extends Pick<CasinoPrize, 'name' | 'kind' | 'amount'>>(p: P, amount: number, kind: CasinoPrize['kind'] = p.kind): P {
  const label = kind === 'gil' ? `${money(amount)} Gil` : kind === 'coin' ? `${money(amount)} Coin` : null;
  return { ...p, kind, amount, name: label && Number.isSafeInteger(amount) && /^\s*[\d,]+\s*(gil|coin)\s*$/i.test(p.name) ? label : p.name };
}
export const CLAIM_LABEL = { pending: 'รอรับ', processing: 'กำลังส่งมอบ', fulfilled: 'ส่งมอบแล้ว', cancelled: 'ยกเลิก' };
/** Where a prize goes once won, said to the winner. */
export function whereItGoes(p: Pick<PrizeSnapshot, 'kind'>): string {
  return p.kind === 'gil' ? 'เข้ากระเป๋าเงิน Gil ในโปรไฟล์' : p.kind === 'coin' ? 'เข้ากระเป๋า Cash Town แล้ว' : 'อยู่ในกล่องรางวัล กดขอรับแล้วคุยกับแอดมินได้';
}
