/**
 * The Popoto Casino's slot sounds (the owner's picks, 2026-10-27, from Mixkit's free slot machine sound effects,
 * mixkit.co/free-sound-effects/slot-machine, under its Sound Effects Free License): the reels turning (Mixkit 1932,
 * "Slot machine wheel"), a little coin back (1938, "Melodic bonus collect"), coins back above the price (1934, "Payout
 * award"), a prize of Gil or a thing (1929, "Slot machine win siren"); a miss is silent ("ไม่ต้องใช้เสียง").
 *
 * Fetched only once somebody in the casino has sound on, and played through one AudioContext made on a tap (browsers
 * let sound start only from one): the reels for as long as they turn, fading out as they stop.
 */
const FILES = {
  spin: "/town/casino/sfx/spin.mp3",
  small: "/town/casino/sfx/coin-small.mp3",
  big: "/town/casino/sfx/coin-big.mp3",
  prize: "/town/casino/sfx/prize.mp3",
} as const;
export type CasinoSound = keyof typeof FILES;
/** How loud each is (the reels under what comes of them). */
const LOUD: Record<CasinoSound, number> = { spin: 0.45, small: 0.6, big: 0.6, prize: 0.55 };

/** What a spin's outcome sounds like: its prize's kind, coins back above the price louder; a miss nothing. */
export function outcomeSound(spin: { price: number; prize: { kind: string; amount: number } | null }): CasinoSound | null {
  if (!spin.prize) return null;
  if (spin.prize.kind !== "coin") return "prize";
  return Number(spin.prize.amount) > spin.price ? "big" : "small";
}

export class CasinoSounds {
  private ctx: AudioContext | null = null;
  private buffers = new Map<CasinoSound, AudioBuffer>();
  private loading: Promise<void> | null = null;

  /** Made ready on a tap: the context, and the sounds fetched once. */
  wake() {
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
    this.ctx ??= new AudioContext();
    void this.ctx.resume().catch(() => {});
    this.loading ??= this.load();
  }

  private async load() {
    const ctx = this.ctx;
    if (!ctx) return;
    await Promise.all((Object.keys(FILES) as CasinoSound[]).map(async (key) => {
      try {
        const data = await (await fetch(FILES[key])).arrayBuffer();
        this.buffers.set(key, await ctx.decodeAudioData(data));
      } catch { /* that one stays silent */ }
    }));
  }

  /** One sound; the reels for `ms` only, fading out over their last quarter second. */
  play(key: CasinoSound, ms?: number) {
    const ctx = this.ctx, buffer = this.buffers.get(key);
    if (!ctx || !buffer || ctx.state !== "running") return;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = LOUD[key];
    source.connect(gain).connect(ctx.destination);
    const start = ctx.currentTime;
    source.start(start);
    if (ms !== undefined) {
      const end = start + Math.max(0.3, Math.min(ms / 1000, buffer.duration));
      gain.gain.setValueAtTime(LOUD[key], Math.max(start, end - 0.25));
      gain.gain.linearRampToValueAtTime(0.0001, end);
      source.stop(end + 0.02);
    }
  }

  close() { void this.ctx?.close().catch(() => {}); this.ctx = null; }
}
