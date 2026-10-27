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
/** v304's `sym` and `pct`: the paytable's row a pair paid, a part of the price come back. */
export type PrizeSnapshot = Pick<CasinoPrize, 'id' | 'name' | 'kind' | 'amount' | 'announce'> & { test: boolean; sym?: SymbolId; pct?: number };
/** A row of the coin back's paytable (v304): which symbol on the first two reels, what part of the price, its share of the pairs. */
export type BackRow = { sym: SymbolId; pct: number; share: number };
export type CasinoSettings = {
  id: number; revision: number; title: string; open: boolean; mode: 'weighted' | 'pool';
  price: number; per_player: number; budget: number; reserved: number; spins: number;
  pool_size: number; pool_draws: number; starts_at: string | null; ends_at: string | null;
  updated_at: string; updated_by: string | null;
  /** v299's; a database before it has only `open` (accessOf). */
  access?: CasinoAccess;
  /** v303's: Popoto coins a Casino Coin, and the Casino Coins given free once a town day (0: none). */
  chip_rate?: number; free_chips?: number;
  /** v304's: the pair's paytable, five rows. */
  back_table?: BackRow[];
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
  /** `coins`: the town purse's Popoto coins. v303's `chips`: the Casino Coins a spin takes; `free_today`: today's free ones taken. */
  account: { coins: number; spins: number; chips?: number; free_today?: boolean }; spins: CasinoSpin[];
  receipts: CasinoReceipt[]; queue: CasinoReceipt[]; server_now: string; paid_gil: number;
  /** The admins' list of who won what (v299). */
  winners?: CasinoWinner[];
  /** How many spins of the admins' trial are still to be wiped (v299). */
  tests?: number;
  /** Whether the database takes me for an admin (v299): what the page offers the admins goes by it. */
  admin?: boolean;
};
export type CasinoDraft = Pick<CasinoSettings,
  'title' | 'open' | 'mode' | 'price' | 'per_player' | 'budget' | 'pool_size' | 'starts_at' | 'ends_at' | 'chip_rate' | 'free_chips' | 'back_table'> & { access: CasinoAccess; prizes: CasinoPrize[] };
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
  const { title, open, mode, price, per_player, budget, pool_size, starts_at, ends_at, chip_rate, free_chips, back_table } = state.settings;
  // (the rate and the free coins only from a database that has them, v303: a desk before it sends neither)
  return { title, open, access: accessOf(state.settings), mode, price, per_player, budget, pool_size, starts_at, ends_at,
    ...(chip_rate === undefined ? {} : { chip_rate, free_chips }), ...(back_table === undefined ? {} : { back_table: back_table.map(r => ({ ...r })) }),
    prizes: state.prizes.map(p => ({ ...p })) };
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
export function coinsBack(d: Pick<CasinoDraft, 'mode' | 'prizes' | 'pool_size'> & Partial<Pick<CasinoDraft, 'price' | 'back_table'>>, s: Pick<CasinoSettings, 'pool_draws'>): number {
  // (a pair paid by the paytable pays its average at the price, v304)
  const amountOf = (p: CasinoPrize) => p.id === 'pair' && d.back_table && d.price ? backAverage(d.back_table, d.price) : p.amount;
  const coins = d.prizes.filter(p => p.active && p.kind === 'coin');
  if (d.mode === 'pool') { const left = d.pool_size - s.pool_draws; return left > 0 ? coins.reduce((n, p) => n + (p.stock - p.issued) * amountOf(p), 0) / left : 0; }
  return coins.reduce((n, p) => n + Number(p.chance) / 100 * amountOf(p), 0);
}
/** What a row of the paytable pays at this price: a part of it, rounded down, as the database pays it (v304). */
export const backAmount = (r: Pick<BackRow, 'pct'>, price: number) => Math.floor(price * r.pct / 100);
/** What a pair pays on average at this price. */
export function backAverage(t: BackRow[], price: number): number {
  const shares = t.reduce((n, r) => n + r.share, 0);
  return shares > 0 ? t.reduce((n, r) => n + r.share * backAmount(r, price), 0) / shares : 0;
}
/** Each row of the paytable with what it pays and its chance a spin, the pair's chance shared out. */
export function backRows(t: BackRow[], price: number, chance: number) {
  const shares = t.reduce((n, r) => n + r.share, 0);
  return t.map(r => ({ ...r, amount: backAmount(r, price), chance: shares > 0 ? chance * r.share / shares : 0 }));
}
/** What a win is said to be, after the winner's name: a pair of the paytable a part of the price come back. */
export const wonWords = (p: Pick<PrizeSnapshot, 'name' | 'amount' | 'pct'>) =>
  p.pct !== undefined ? `ได้ Casino Coin คืน ${money(Number(p.amount))} (${p.pct}%)` : `ได้ ${p.name}`;
export function draftProblem(d: CasinoDraft, s: CasinoSettings): string | null {
  if (!d.title.trim() || d.title.length > 100) return 'ชื่อกิจกรรมต้องมี 1–100 ตัวอักษร';
  if (![d.price, d.per_player, d.budget, d.pool_size].every(Number.isSafeInteger) ||
    d.price < 1 || d.price > 100000 || d.per_player < 1 || d.per_player > 10000 ||
    d.budget < s.reserved || d.budget > 1e12 || d.pool_size < Math.max(1, s.pool_draws) || d.pool_size > 1e7) return 'ตรวจสอบราคา โควตา และงบที่จองไว้แล้ว';
  if (d.starts_at && d.ends_at && Date.parse(d.ends_at) <= Date.parse(d.starts_at)) return 'เวลาจบต้องอยู่หลังเวลาเริ่ม';
  if (d.chip_rate !== undefined && (!Number.isSafeInteger(d.chip_rate) || d.chip_rate < 1 || d.chip_rate > 10000 ||
    !Number.isSafeInteger(d.free_chips) || d.free_chips! < 0 || d.free_chips! > 100000)) return 'อัตราแลกต้องเป็น 1–10,000 และ Casino Coin ฟรีต่อวัน 0–100,000';
  if (d.back_table !== undefined) {
    const t = d.back_table;
    if (t.length !== 5 || new Set(t.map(r => r.sym)).size !== 5 || !t.every(r => SYMBOLS.includes(r.sym) && Number.isInteger(r.pct) && r.pct >= 1 && r.pct <= 99 &&
      Number.isInteger(r.share) && r.share >= 0 && r.share <= 1000) || !t.some(r => r.share > 0)) return 'ตาราง Coin คืน: ส่วนที่คืน 1–99% และสัดส่วน 0–1,000 (มีอย่างน้อยหนึ่งแถว)';
    if (t.some(r => backAmount(r, d.price) < 1)) return 'ตาราง Coin คืน: ทุกแถวต้องคืนอย่างน้อย 1 Casino Coin ที่ราคานี้';
  }
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
  if (coinsBack(d, s) >= d.price) return 'Coin ที่ได้คืนเฉลี่ยต่อครั้งต้องน้อยกว่าราคาหมุน ไม่ให้หมุนฟรีได้ไม่สิ้นสุด';
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
  const label = kind === 'gil' ? `${money(amount)} Gil` : kind === 'coin' ? `${money(amount)} ${/casino/i.test(p.name) ? 'Casino Coin' : 'Coin'}` : null;
  return { ...p, kind, amount, name: label && Number.isSafeInteger(amount) && /^\s*[\d,]+\s*(gil|casino coin|coin)\s*$/i.test(p.name) ? label : p.name };
}
export const CLAIM_LABEL = { pending: 'รอรับ', processing: 'กำลังส่งมอบ', fulfilled: 'ส่งมอบแล้ว', cancelled: 'ยกเลิก' };
/** Where a prize goes once won, said to the winner: coins into the Casino Coins once the database has them (v303). */
export function whereItGoes(p: Pick<PrizeSnapshot, 'kind'>, chips = false): string {
  return p.kind === 'gil' ? 'เข้ากระเป๋าเงิน Gil ในโปรไฟล์' : p.kind === 'coin' ? (chips ? 'หมุนต่อได้เลย' : 'เข้ากระเป๋า Cash Town แล้ว') : 'อยู่ในกล่องรางวัล กดขอรับแล้วคุยกับแอดมินได้';
}
/** Whether the casino takes Casino Coins (v303), not the town purse's Popoto coins. */
export const chipsOf = (s: Pick<CasinoState, 'account'>): number | null => typeof s.account.chips === 'number' ? Number(s.account.chips) : null;
/** The changes the counter offers, in spins' worth: one, five, ten. */
export const CHIP_PACKS = [1, 5, 10] as const;
/** What the counter says of an answer of casino_live_buy / casino_live_free that took nothing (v303). */
export const CHIP_WHY: Record<string, string> = {
  closed: 'ตอนนี้ Casino ยังไม่เปิด แลกหรือรับไม่ได้', coins: 'Popoto coin ไม่พอ', amount: 'จำนวนไม่ถูกต้อง ลองใหม่อีกครั้ง',
  taken: 'วันนี้รับฟรีไปแล้ว รับใหม่ได้หลัง 05:00', off: 'ตอนนี้ไม่มีแจก Casino Coin ฟรี',
};
/**
 * What the wipe of the admins' trial says it did (v299): and, when a tester had already withdrawn Gil won in the trial,
 * that this much of their 'เงินสะสม' prize row is the trial's, not to be handed over.
 */
export function wipedWords(r: unknown): string {
  const out = Number((r as { withdrawn?: number } | null)?.withdrawn ?? 0);
  return out > 0 ? `ล้างผลทดสอบแล้ว แต่ Gil จากการทดสอบ ${money(out)} ถูกถอนออกไปแล้ว: ในรายการ "เงินสะสม" ของผู้ทดสอบ ส่วนนี้ไม่ต้องส่งมอบ` : 'ล้างผลทดสอบแล้ว';
}
