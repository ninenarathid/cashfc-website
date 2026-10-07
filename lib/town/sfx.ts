import type { Tier } from "./items";

/**
 * The sounds of fishing (the owner, 2026-10-03: "ช่วย gen sound effect ตอนตกปลา ให้
 * ด้วย ขอดีๆไปเลย"), made in code like the town's music (lib/town/music): noise
 * through moving filters for water, air and the reel's ratchet, and short tones
 * for the plop of a float, the twang of a line and the little tunes at the end.
 * Nothing is downloaded.
 *
 * - **A nibble and the bite sound different, as they look different**: a nibble
 *   is a light double "plip"; the bite a deep gulp with a splash. An ear helps
 *   the eye, it does not replace it: both are water, and the strike still has
 *   to come within moments.
 * - **The reel ticks while it is held**: quick and bright while line is being
 *   won, slow and dull while it is not, so the hand knows without looking.
 * - **A bigger fish ends on a bigger tune**: `landed` is told the fish's tier.
 *
 * - **Somebody else's fishing is heard too, softer, and fainter the further
 *   off they are, until it is not heard at all** (the owner: "เวลาคนอื่นตกปลา ช่วย
 *   ทำให้เสียง effect ตกปลาเบาลงหน่อย และจะยิ่งเบาลงจนไม่ได้ยินถ้าออกห่างมากๆ"): `heard`
 *   says how loud, from how far.
 *
 * The plots, the kitchen and the washing tub have sounds of their own (the
 * owner, 2026-10-03: "การทำอาหาร และ ปลูกพืช ช่วยใช้ vfx ที่เหมาะสมด้วยนะครับ ตอนนี้เหมือน ตกปลา
 * เลย"): a hoe in the earth, seeds patted in, a can's sprinkle, a wooden spoon
 * on a pot, a brush on one (`WorkSound`, `work`). None of them is water on a
 * line.
 *
 * On or off is kept on the device, with the town's other sound settings.
 */
export type FishSound =
  | "cast" | "nibble" | "bite" | "strike" | "perfect" | "early" | "missed"
  | "surge" | "strain" | "landed" | "flotsam" | "record" | "snapped" | "slipped";

/**
 * The sounds of work done by hand: in a plot, with water, at the stove, at the tub; and (the owner, 2026-10-05, asked
 * whether the forest and the insects had sounds of their own: "ถ้าไม่มี ทำใหม่ขึ้นมาเลยได้นะ") in the forest, with a net,
 * and at the camp's fire.
 */
export type WorkSound =
  | "hoe" | "knock" | "sow" | "water" | "feed" | "spray" | "pick" | "pull" | "dip" | "pour"
  | "stir" | "clang" | "cooked" | "odd" | "nothing" | "made" | "ladle" | "down" | "soak" | "scrub" | "squeak" | "clean"
  | "rustle" | "pluck" | "wrong" | "brush" | "bruise" | "shake" | "basket" | "thud"
  | "swish" | "netted" | "flit" | "chirp" | "cicada" | "drip" | "gust" | "lull"
  | "crackle" | "sizzle" | "turn" | "charred";
export const WORK_SOUNDS: WorkSound[] = ["hoe", "knock", "sow", "water", "feed", "spray", "pick", "pull", "dip", "pour",
  "stir", "clang", "cooked", "odd", "nothing", "made", "ladle", "down", "soak", "scrub", "squeak", "clean",
  "rustle", "pluck", "wrong", "brush", "bruise", "shake", "basket", "thud", "swish", "netted", "flit", "chirp", "cicada", "drip", "gust", "lull", "crackle", "sizzle", "turn", "charred"];

const KEY = "cashtown.sfx.off";
/** Another's fishing: how loud it is beside them, as a share of one's own, and how many tiles off it is last heard. */
export const OTHERS = { loud: 0.4, far: 14 };
/** How loud somebody else's fishing is from so many tiles off: softer than one's own even beside them, and fading to nothing. */
export function heard(tiles: number): number {
  const near = Math.max(0, 1 - Math.max(0, tiles) / OTHERS.far);
  return OTHERS.loud * near * near;
}
type Ctx = BaseAudioContext;

/** A second of white noise, for water and air. */
function noiseOf(ctx: Ctx): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = buf.getChannelData(0);
  // (a fixed run, so a sound is the same every time)
  let a = 20261003;
  for (let i = 0; i < d.length; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    d[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
  return buf;
}

/** What a sound is made on: where it goes, and the noise it may use. */
interface Bench { ctx: Ctx; out: AudioNode; noise: AudioBuffer }

/** A swell and a fall: up to `peak` in `attack` seconds, then away over `decay`. */
function swell(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
/** A tone sliding from one pitch to another. */
function tone(b: Bench, t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number, attack = 0.004, wobble?: { hz: number; by: number }) {
  const o = b.ctx.createOscillator(), g = b.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  if (wobble) {
    const l = b.ctx.createOscillator(), d = b.ctx.createGain();
    l.frequency.value = wobble.hz; d.gain.value = wobble.by;
    l.connect(d).connect(o.frequency);
    l.start(t); l.stop(t + dur + 0.05);
  }
  swell(g, t, peak, attack, Math.max(0.01, dur - attack));
  o.connect(g).connect(b.out);
  o.start(t); o.stop(t + dur + 0.05);
}
/** Noise through a filter that moves: water, air, a ratchet's tick. */
function hiss(b: Bench, t: number, kind: BiquadFilterType, f0: number, f1: number, q: number, dur: number, peak: number, attack = 0.005) {
  const s = b.ctx.createBufferSource(), f = b.ctx.createBiquadFilter(), g = b.ctx.createGain();
  s.buffer = b.noise; s.loop = true;
  f.type = kind; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  swell(g, t, peak, attack, Math.max(0.01, dur - attack));
  s.connect(f).connect(g).connect(b.out);
  s.start(t, (t * 0.37) % 0.6); s.stop(t + dur + 0.05);
}
/** A note of the little tunes: a soft bell, its octave faintly over it. */
function bell(b: Bench, t: number, hz: number, peak: number, ring = 0.42) {
  tone(b, t, "sine", hz, hz, ring, peak, 0.003);
  tone(b, t, "triangle", hz * 2, hz * 2, ring * 0.6, peak * 0.28, 0.003);
}

/** The tune a landed fish ends on, by its tier: the notes (Hz) and when each comes (seconds). A legend's is twice the length. */
export const TUNES: Record<Tier | "flotsam", Array<[number, number]>> = {
  flotsam: [[392, 0], [330, 0.13]],
  common: [[523.25, 0], [659.25, 0.09], [783.99, 0.18], [1046.5, 0.3]],
  uncommon: [[523.25, 0], [659.25, 0.08], [783.99, 0.16], [1046.5, 0.26], [1318.51, 0.38]],
  rare: [[587.33, 0], [739.99, 0.08], [880, 0.16], [1174.66, 0.26], [1479.98, 0.36], [1760, 0.5]],
  legend: [[523.25, 0], [659.25, 0.1], [783.99, 0.2], [1046.5, 0.3], [1318.51, 0.42], [1567.98, 0.54], [2093, 0.7], [1567.98, 0.86], [2093, 0.98], [2637.02, 1.14]],
};
/** How often the reel ticks, in seconds: quick while line is being won, slow while it is not; a little quicker as the tension rises. */
export const tickEvery = (winning: boolean, tension: number) => (winning ? 0.075 - 0.02 * Math.min(1, Math.max(0, tension)) : 0.14);

/** Make one sound on a bench, from a moment on. */
function make(b: Bench, name: FishSound, t: number, tier: Tier | "flotsam" = "common") {
  switch (name) {
    case "cast":
      // the line through the air, then the float's plop and its ripple
      hiss(b, t, "bandpass", 500, 2600, 0.9, 0.24, 0.22, 0.09);
      tone(b, t + 0.27, "sine", 520, 140, 0.13, 0.5);
      hiss(b, t + 0.27, "bandpass", 1900, 1500, 1.2, 0.09, 0.2);
      hiss(b, t + 0.3, "lowpass", 900, 300, 0.7, 0.4, 0.07, 0.02);
      break;
    case "nibble":
      tone(b, t, "sine", 980, 760, 0.07, 0.24);
      tone(b, t + 0.075, "sine", 1280, 1050, 0.055, 0.14);
      hiss(b, t, "highpass", 2600, 2600, 0.7, 0.035, 0.06);
      break;
    case "bite":
      // the float pulled under: a deep gulp, a thump, and the splash it leaves
      tone(b, t, "sine", 300, 85, 0.22, 0.6);
      tone(b, t, "sine", 115, 58, 0.14, 0.42);
      hiss(b, t + 0.02, "bandpass", 1300, 480, 0.8, 0.34, 0.3, 0.01);
      break;
    case "strike":
    case "perfect":
      // the rod swept up, the line singing, and the hook home
      hiss(b, t, "highpass", 1800, 5200, 0.7, 0.14, 0.26, 0.03);
      tone(b, t + 0.03, "triangle", 900, 2100, 0.11, 0.14, 0.01);
      bell(b, t + 0.12, 1567.98, 0.2, 0.3);
      bell(b, t + 0.12, 2349.32, 0.1, 0.24);
      if (name === "perfect") { bell(b, t + 0.2, 3135.96, 0.12, 0.3); hiss(b, t + 0.18, "highpass", 6500, 9000, 0.5, 0.3, 0.05, 0.02); }
      break;
    case "early":
      // a sweep at nothing, and the fish gone
      hiss(b, t, "highpass", 1800, 4200, 0.7, 0.13, 0.2, 0.03);
      tone(b, t + 0.1, "sine", 190, 95, 0.12, 0.3);
      tone(b, t + 0.26, "triangle", 392, 392, 0.14, 0.16, 0.01);
      tone(b, t + 0.4, "triangle", 311.13, 311.13, 0.2, 0.16, 0.01);
      break;
    case "missed":
      // bubbles where it was, and a sigh of two notes
      tone(b, t, "sine", 260, 520, 0.07, 0.2);
      tone(b, t + 0.11, "sine", 330, 640, 0.06, 0.14);
      tone(b, t + 0.3, "triangle", 329.63, 329.63, 0.15, 0.15, 0.01);
      tone(b, t + 0.45, "triangle", 261.63, 261.63, 0.24, 0.15, 0.01);
      break;
    case "surge":
      // the fish thrashing at the top of the water
      hiss(b, t, "bandpass", 2600, 700, 0.7, 0.42, 0.34, 0.005);
      tone(b, t, "sine", 150, 70, 0.16, 0.36);
      hiss(b, t + 0.12, "bandpass", 1800, 900, 0.9, 0.22, 0.14, 0.01);
      break;
    case "strain":
      // the line creaking, near its end
      tone(b, t, "sawtooth", 640, 700, 0.2, 0.16, 0.02, { hz: 31, by: 70 });
      hiss(b, t, "bandpass", 1500, 1700, 4, 0.18, 0.2, 0.02);
      break;
    case "landed": {
      // out of the water with a splash, and its tune
      hiss(b, t, "bandpass", 3000, 520, 0.7, 0.5, tier === "common" ? 0.32 : 0.4, 0.005);
      tone(b, t, "sine", 170, 80, 0.18, 0.3);
      for (const [hz, at] of TUNES[tier]) bell(b, t + 0.16 + at, hz, tier === "legend" ? 0.2 : 0.17, tier === "legend" ? 0.6 : 0.42);
      if (tier === "rare" || tier === "legend") hiss(b, t + 0.3, "highpass", 6000, 9000, 0.5, tier === "legend" ? 1.5 : 0.7, 0.045, 0.1);
      if (tier === "legend") for (const hz of [523.25, 659.25, 783.99, 1046.5]) tone(b, t + 1.45, "sine", hz, hz, 1.1, 0.09, 0.02);
      break;
    }
    case "flotsam":
      // something comes up that is no fish
      hiss(b, t, "bandpass", 1600, 600, 0.8, 0.3, 0.2, 0.005);
      for (const [hz, at] of TUNES.flotsam) tone(b, t + 0.1 + at, "triangle", hz, hz, 0.2, 0.24, 0.01);
      break;
    case "record":
      for (const [i, hz] of [1567.98, 2093, 2637.02, 3135.96].entries()) bell(b, t + i * 0.065, hz, 0.13, 0.3);
      break;
    case "snapped":
      // the line gone with a crack and a twang
      hiss(b, t, "highpass", 3200, 3200, 0.7, 0.025, 0.55, 0.001);
      tone(b, t + 0.005, "triangle", 340, 105, 0.3, 0.36, 0.002, { hz: 36, by: 26 });
      hiss(b, t + 0.12, "bandpass", 1500, 800, 1, 0.22, 0.12, 0.01);
      break;
    case "slipped":
      // the hook out, and the fish away under
      tone(b, t, "sine", 430, 130, 0.2, 0.36);
      hiss(b, t + 0.03, "lowpass", 1300, 500, 0.7, 0.32, 0.13, 0.01);
      tone(b, t + 0.32, "triangle", 349.23, 349.23, 0.14, 0.14, 0.01);
      tone(b, t + 0.46, "triangle", 261.63, 261.63, 0.24, 0.14, 0.01);
      break;
  }
}
/** Make one sound of work on a bench, from a moment on. */
function makeWork(b: Bench, name: WorkSound, t: number) {
  switch (name) {
    case "hoe":
      // the blade into the earth: a thud, the grit giving, a pebble
      tone(b, t, "sine", 150, 58, 0.13, 0.55);
      hiss(b, t, "bandpass", 950, 320, 0.8, 0.17, 0.34, 0.004);
      hiss(b, t + 0.05, "highpass", 3200, 2400, 0.7, 0.03, 0.1, 0.002);
      break;
    case "knock":
      // the blade glancing off: nothing gives
      tone(b, t, "triangle", 230, 180, 0.07, 0.26, 0.002);
      hiss(b, t, "bandpass", 620, 520, 1.4, 0.05, 0.12, 0.002);
      break;
    case "sow":
      // seeds dropped, and the earth patted over them: three soft pats
      for (const [i, at] of [0, 0.075, 0.16].entries()) {
        hiss(b, t + at, "lowpass", 760 - i * 90, 380, 0.7, 0.055, 0.2, 0.003);
        tone(b, t + at, "sine", 330 - i * 30, 250, 0.045, 0.1, 0.002);
      }
      break;
    case "water":
      // a can's sprinkle, and the drops landing
      hiss(b, t, "highpass", 2600, 4300, 0.7, 0.55, 0.15, 0.09);
      hiss(b, t + 0.05, "bandpass", 1500, 1100, 1, 0.45, 0.07, 0.1);
      for (const [i, hz] of [1480, 1890, 1320, 2100, 1650].entries()) tone(b, t + 0.1 + i * 0.075, "sine", hz, hz * 0.7, 0.04, 0.07, 0.002);
      break;
    case "feed":
      // something dry shaken out of a sack
      hiss(b, t, "bandpass", 1900, 1200, 0.9, 0.16, 0.16, 0.02);
      hiss(b, t + 0.14, "bandpass", 1500, 950, 0.9, 0.2, 0.13, 0.02);
      break;
    case "spray":
      hiss(b, t, "highpass", 4800, 7200, 0.7, 0.2, 0.2, 0.012);
      hiss(b, t + 0.16, "highpass", 5200, 6800, 0.7, 0.12, 0.1, 0.01);
      break;
    case "pick":
      // a stem snapped, and the thing in the hand: two small bright notes
      tone(b, t, "triangle", 520, 940, 0.05, 0.3, 0.002);
      hiss(b, t, "bandpass", 2100, 1700, 1.5, 0.035, 0.16, 0.001);
      bell(b, t + 0.09, 659.25, 0.13, 0.26);
      bell(b, t + 0.17, 987.77, 0.11, 0.3);
      break;
    case "pull":
      // something dead pulled out by its roots
      hiss(b, t, "bandpass", 1300, 500, 0.9, 0.22, 0.26, 0.01);
      tone(b, t + 0.04, "sine", 190, 90, 0.12, 0.3);
      break;
    case "dip":
      // a bucket into the river: the plunge, and the gulp as it fills
      hiss(b, t, "bandpass", 1500, 520, 0.8, 0.34, 0.3, 0.006);
      tone(b, t + 0.04, "sine", 300, 110, 0.2, 0.4);
      tone(b, t + 0.26, "sine", 210, 330, 0.09, 0.18);
      break;
    case "pour":
      // water poured out, glugging
      hiss(b, t, "lowpass", 1900, 850, 0.7, 0.56, 0.22, 0.06);
      for (const [i, at] of [0.06, 0.2, 0.33].entries()) tone(b, t + at, "sine", 420 - i * 50, 190, 0.09, 0.2, 0.004);
      break;
    case "stir":
      // a wooden spoon against the pot, a bubble rising, a little sizzle
      tone(b, t, "triangle", 640, 540, 0.04, 0.24, 0.002);
      tone(b, t + 0.012, "sine", 1280, 1100, 0.03, 0.07, 0.002);
      tone(b, t + 0.06, "sine", 250, 520, 0.08, 0.2, 0.01);
      hiss(b, t, "bandpass", 2500, 1800, 1, 0.14, 0.07, 0.01);
      break;
    case "clang":
      // the spoon on the rim: off the beat
      tone(b, t, "square", 880, 830, 0.05, 0.09, 0.001);
      tone(b, t, "triangle", 1320, 1250, 0.09, 0.09, 0.001);
      break;
    case "cooked":
      // the lid off, steam out, and three notes like a bell at a kitchen hatch
      hiss(b, t, "highpass", 3000, 6200, 0.7, 0.42, 0.13, 0.05);
      tone(b, t, "triangle", 420, 380, 0.05, 0.16, 0.002);
      for (const [hz, at] of [[659.25, 0.1], [783.99, 0.2], [1046.5, 0.32]]) bell(b, t + at, hz, 0.17, 0.44);
      break;
    case "odd":
      // something that should not bubble like that, and two notes going down
      tone(b, t, "sine", 180, 320, 0.11, 0.22, 0.01);
      tone(b, t + 0.13, "sine", 150, 260, 0.1, 0.2, 0.01);
      hiss(b, t, "lowpass", 900, 500, 0.7, 0.34, 0.1, 0.02);
      tone(b, t + 0.3, "triangle", 311.13, 311.13, 0.16, 0.15, 0.01);
      tone(b, t + 0.46, "triangle", 233.08, 233.08, 0.26, 0.15, 0.01);
      break;
    case "nothing":
      // a puff, and that is all
      hiss(b, t, "lowpass", 1300, 300, 0.7, 0.32, 0.2, 0.02);
      tone(b, t + 0.05, "sine", 170, 90, 0.16, 0.2);
      break;
    case "made":
      // something put together by hand: a tap, and two notes
      tone(b, t, "triangle", 500, 460, 0.04, 0.2, 0.002);
      bell(b, t + 0.08, 587.33, 0.14, 0.3);
      bell(b, t + 0.17, 880, 0.12, 0.34);
      break;
    case "ladle":
      // a helping lifted out, and the ladle against the bowl
      hiss(b, t, "lowpass", 1500, 700, 0.7, 0.22, 0.16, 0.03);
      tone(b, t + 0.07, "sine", 380, 230, 0.08, 0.14, 0.004);
      tone(b, t + 0.2, "triangle", 1760, 1700, 0.06, 0.09, 0.001);
      break;
    case "down":
      // a heavy pot set on the ground
      tone(b, t, "sine", 125, 66, 0.11, 0.46);
      hiss(b, t, "lowpass", 520, 300, 0.7, 0.07, 0.2, 0.002);
      break;
    case "soak":
      // a pot let down into the tub
      hiss(b, t, "bandpass", 1300, 480, 0.8, 0.36, 0.24, 0.01);
      tone(b, t + 0.03, "sine", 240, 100, 0.2, 0.3);
      for (const [i, hz] of [520, 700, 610].entries()) tone(b, t + 0.24 + i * 0.07, "sine", hz, hz * 1.5, 0.05, 0.08, 0.004);
      break;
    case "scrub":
      // a brush to and fro, and a bubble popping
      hiss(b, t, "bandpass", 2600, 3500, 1.3, 0.07, 0.3, 0.006);
      hiss(b, t + 0.085, "bandpass", 3500, 2500, 1.3, 0.075, 0.26, 0.006);
      tone(b, t + 0.15, "sine", 1400, 1950, 0.035, 0.08, 0.002);
      break;
    case "squeak":
      tone(b, t, "sine", 1500, 2250, 0.09, 0.11, 0.004);
      break;
    case "clean":
      // rinsed, and shining
      hiss(b, t, "lowpass", 1700, 800, 0.7, 0.3, 0.14, 0.03);
      for (const [i, hz] of [1567.98, 2093, 2637.02].entries()) bell(b, t + 0.14 + i * 0.075, hz, 0.12, 0.34);
      break;

    /* ── the forest ── */
    case "rustle":
      // dry leaves turned over by a hand, and something lifted out of them
      hiss(b, t, "bandpass", 3400, 2300, 0.8, 0.09, 0.2, 0.01);
      hiss(b, t + 0.08, "bandpass", 2600, 3600, 0.8, 0.11, 0.17, 0.012);
      hiss(b, t + 0.19, "highpass", 4200, 3000, 0.7, 0.07, 0.1, 0.008);
      bell(b, t + 0.24, 698.46, 0.1, 0.24);
      break;
    case "pluck":
      // a stalk nipped off between finger and thumb: the right one
      tone(b, t, "triangle", 760, 1180, 0.035, 0.26, 0.002);
      hiss(b, t, "bandpass", 2800, 2200, 2, 0.03, 0.12, 0.001);
      bell(b, t + 0.05, 880, 0.12, 0.2);
      break;
    case "wrong":
      // one that only looked like it: a soft squash, and a note going down
      hiss(b, t, "lowpass", 700, 300, 0.8, 0.12, 0.22, 0.006);
      tone(b, t, "sine", 240, 150, 0.11, 0.24, 0.004);
      tone(b, t + 0.1, "triangle", 277.18, 207.65, 0.2, 0.14, 0.01);
      break;
    case "brush":
      // loose earth swept off with the flat of the blade
      hiss(b, t, "bandpass", 1500, 2600, 0.7, 0.16, 0.22, 0.03);
      hiss(b, t + 0.04, "lowpass", 600, 380, 0.7, 0.1, 0.12, 0.01);
      break;
    case "bruise":
      // the blade into what was already bare: a dull knock, and a wince
      tone(b, t, "sine", 210, 120, 0.09, 0.4, 0.002);
      hiss(b, t, "lowpass", 520, 260, 1, 0.07, 0.2, 0.002);
      tone(b, t + 0.09, "triangle", 233.08, 174.61, 0.22, 0.13, 0.01);
      break;
    case "shake":
      // a trunk shaken: the creak of it, and the whole crown hissing
      tone(b, t, "sawtooth", 96, 132, 0.2, 0.1, 0.03, { hz: 13, by: 14 });
      hiss(b, t + 0.03, "bandpass", 3000, 4600, 0.6, 0.5, 0.2, 0.1);
      hiss(b, t + 0.2, "highpass", 5200, 3800, 0.7, 0.34, 0.1, 0.06);
      break;
    case "basket":
      // something falls into wicker: a small hollow knock, and it settles
      tone(b, t, "sine", 400, 250, 0.07, 0.34, 0.002);
      hiss(b, t, "bandpass", 1300, 900, 2.2, 0.05, 0.16, 0.002);
      tone(b, t + 0.07, "sine", 310, 230, 0.05, 0.12, 0.002);
      break;
    case "thud":
      // and one that fell past it, into the grass
      tone(b, t, "sine", 130, 62, 0.13, 0.42, 0.003);
      hiss(b, t, "lowpass", 480, 220, 0.7, 0.1, 0.18, 0.004);
      break;

    /* ── a net ── */
    case "swish":
      // the hoop through the air, and the mesh after it
      hiss(b, t, "bandpass", 900, 3800, 1.1, 0.19, 0.3, 0.06);
      hiss(b, t + 0.1, "highpass", 5200, 2600, 0.7, 0.12, 0.1, 0.02);
      break;
    case "netted":
      // wings against the mesh, and three bright notes going up
      for (const [i, at] of [0, 0.05, 0.1, 0.15, 0.2].entries()) hiss(b, t + at, "bandpass", 2300 + i * 260, 1800, 3, 0.03, 0.13, 0.002);
      for (const [hz, at] of [[783.99, 0.16], [987.77, 0.25], [1318.51, 0.35]]) bell(b, t + at, hz, 0.15, 0.36);
      break;
    case "flit":
      // off it goes: a quick whirr of wings, rising and gone
      tone(b, t, "triangle", 310, 620, 0.16, 0.12, 0.01, { hz: 46, by: 60 });
      hiss(b, t, "highpass", 3600, 6200, 0.7, 0.16, 0.07, 0.02);
      break;
    case "chirp":
      // a cricket: three quick strokes of one high note
      for (const at of [0, 0.07, 0.14]) tone(b, t + at, "sine", 4300, 4180, 0.045, 0.13, 0.004, { hz: 62, by: 130 });
      break;
    case "cicada":
      // a cicada: a dry buzz that swells and falls away
      tone(b, t, "sawtooth", 3100, 3250, 0.85, 0.045, 0.3, { hz: 88, by: 420 });
      hiss(b, t, "bandpass", 5600, 5200, 6, 0.85, 0.11, 0.3);
      break;
    /* ── the gifts of the insects' ranks (lib/town/gifts) ── */
    case "drip":
      // a drop of nectar let fall: one round plip, and a sweet note that hangs a moment
      tone(b, t, "sine", 1180, 620, 0.09, 0.2, 0.002);
      bell(b, t + 0.07, 1318.51, 0.07, 0.5);
      break;
    case "gust":
      // the wind net: a breath of air that comes down all at once
      hiss(b, t, "bandpass", 420, 2600, 0.8, 0.2, 0.34, 0.012);
      hiss(b, t + 0.03, "highpass", 2400, 5200, 0.7, 0.16, 0.16, 0.01);
      tone(b, t, "sine", 240, 110, 0.12, 0.16, 0.003);
      break;
    case "lull":
      // the lulling flute: five slow breathy notes going down to sleep, each with a little air in it
      for (const [hz, at, len] of [[783.99, 0, 0.42], [659.25, 0.34, 0.42], [587.33, 0.68, 0.42], [659.25, 1.02, 0.36], [523.25, 1.34, 0.9]]) {
        tone(b, t + at, "sine", hz, hz, len, 0.2, 0.06, { hz: 5.2, by: hz * 0.006 });
        tone(b, t + at, "triangle", hz * 2, hz * 2, len * 0.8, 0.03, 0.08);
        hiss(b, t + at, "bandpass", hz * 2, hz * 2, 3, len * 0.7, 0.03, 0.05);
      }
      break;

    /* ── the camp's fire ── */
    case "crackle":
      // a stick settling in the fire: three small snaps
      for (const [i, at] of [0, 0.09, 0.21].entries()) {
        hiss(b, t + at, "highpass", 2600 + i * 500, 1900, 0.9, 0.022, 0.24 - i * 0.05, 0.001);
        tone(b, t + at, "triangle", 300 - i * 30, 160, 0.03, 0.1, 0.001);
      }
      break;
    case "sizzle":
      // fat on the embers
      hiss(b, t, "highpass", 4600, 6800, 0.8, 0.42, 0.15, 0.03);
      hiss(b, t + 0.03, "bandpass", 2600, 3200, 2, 0.32, 0.07, 0.04);
      break;
    case "turn":
      // the stick turned in the hand: a small wooden knock, and the hiss of the other side
      tone(b, t, "triangle", 430, 360, 0.04, 0.22, 0.002);
      tone(b, t + 0.012, "sine", 860, 760, 0.03, 0.06, 0.002);
      hiss(b, t + 0.03, "highpass", 5000, 6400, 0.8, 0.2, 0.1, 0.02);
      break;
    case "charred":
      // left a moment too long: a puff, and a note going down
      hiss(b, t, "lowpass", 1100, 360, 0.7, 0.3, 0.2, 0.02);
      tone(b, t + 0.06, "triangle", 293.66, 220, 0.24, 0.14, 0.01);
      break;
  }
}
/** One tick of the reel's ratchet: bright while line is won, dull while it is not. */
function tick(b: Bench, t: number, winning: boolean, n: number) {
  const hz = (winning ? 2700 : 1500) * (n % 2 ? 1.07 : 1);
  hiss(b, t, "bandpass", hz, hz, 5, 0.03, winning ? 0.6 : 0.36, 0.001);
  tone(b, t, "square", winning ? 1900 : 1100, winning ? 1700 : 1000, 0.016, winning ? 0.09 : 0.06, 0.001);
}

// ── gifts: helpers ──
/**
 * The pitch of the so-manieth note of the anklet's tune (lib/town/helping: a note a plant watered, of a run): a
 * five-note scale climbing a step a plant, an octave every five, no higher than its twentieth note, where the run is
 * at its most.
 */
export const chimeHz = (step: number): number => {
  const i = Math.max(0, Math.min(19, Math.floor(step) - 1));
  return 196 * 2 ** (([0, 2, 4, 7, 9][i % 5] + 12 * Math.floor(i / 5)) / 12);
};

export class FishSfx {
  private bench: Bench | null = null;
  private off = false;
  private ticks = 0;
  private nextTick = 0;

  constructor() {
    try { this.off = window.localStorage.getItem(KEY) === "1"; } catch { /* no storage: on */ }
  }
  get on() { return !this.off; }
  /** Sounds on or off, kept on the device. */
  setOn(on: boolean) {
    this.off = !on;
    try { if (on) window.localStorage.removeItem(KEY); else window.localStorage.setItem(KEY, "1"); } catch { /* not kept, then */ }
  }
  /** Call from a tap or a key: the browser lets sound begin only then. */
  wake() {
    if (this.off) return;
    if (!this.bench) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC(), press = ctx.createDynamicsCompressor(), master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(press).connect(ctx.destination);
      this.bench = { ctx, out: master, noise: noiseOf(ctx) };
    }
    const ctx = this.bench.ctx as AudioContext;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  }
  /** Make a sound: as loud as it is (my own), or a share of that (somebody else's, by how far off they are). */
  play(name: FishSound, tier: Tier | "flotsam" = "common", loud = 1) {
    const b = this.bench;
    if (this.off || !b || (b.ctx as AudioContext).state !== "running" || !(loud > 0.005)) return;
    if (loud >= 1) { make(b, name, b.ctx.currentTime + 0.01, tier); return; }
    const quiet = b.ctx.createGain();
    quiet.gain.value = loud;
    quiet.connect(b.out);
    make({ ...b, out: quiet }, name, b.ctx.currentTime + 0.01, tier);
  }
  /** Make a sound of work done by hand: mine, as loud as it is. */
  work(name: WorkSound, loud = 1) {
    const b = this.bench;
    if (this.off || !b || (b.ctx as AudioContext).state !== "running" || !(loud > 0.005)) return;
    if (loud >= 1) { makeWork(b, name, b.ctx.currentTime + 0.01); return; }
    const quiet = b.ctx.createGain();
    quiet.gain.value = loud;
    quiet.connect(b.out);
    makeWork({ ...b, out: quiet }, name, b.ctx.currentTime + 0.01);
  }
  // ── gifts: helpers ──
  /** A note of the anklet's tune (lib/town/helping): the so-manieth of a run, quiet; at the run's most it has its fifth over it. */
  chime(step: number, top = false) {
    const b = this.bench;
    if (this.off || !b || (b.ctx as AudioContext).state !== "running") return;
    const t = b.ctx.currentTime + 0.01, hz = chimeHz(step);
    bell(b, t, hz, 0.11, 0.5);
    if (top) bell(b, t + 0.08, hz * 1.5, 0.08, 0.6);
  }
  /** The duet bell (lib/town/helping): two bells a fifth apart, the second a breath after the first, and once more, softer. */
  duet() {
    const b = this.bench;
    if (this.off || !b || (b.ctx as AudioContext).state !== "running") return;
    const t = b.ctx.currentTime + 0.01;
    bell(b, t, 659.25, 0.17, 0.9);
    bell(b, t + 0.13, 987.77, 0.14, 1.1);
    bell(b, t + 0.55, 659.25, 0.07, 0.7);
    bell(b, t + 0.68, 987.77, 0.06, 0.9);
  }
  /** The reel, counted on each frame of a fight: ticks while it is held, at the pace its line is coming in. */
  reel(holding: boolean, winning: boolean, tension: number) {
    const b = this.bench;
    if (this.off || !b || (b.ctx as AudioContext).state !== "running" || !holding) return;
    const now = b.ctx.currentTime;
    if (now < this.nextTick) return;
    tick(b, now + 0.005, winning, this.ticks++);
    this.nextTick = now + tickEvery(winning, tension);
  }
  close() {
    const ctx = this.bench?.ctx as AudioContext | undefined;
    this.bench = null;
    void ctx?.close().catch(() => {});
  }
}

/**
 * A sound made where nobody hears it, and measured: how loud at its loudest,
 * how loud on the whole, and how long until it has died away. For checking, in
 * a browser, that every sound is there and none is clipped.
 */
export async function measure(name: FishSound | WorkSound | "tick", tier: Tier | "flotsam" = "common"): Promise<{ peak: number; rms: number; secs: number }> {
  const rate = 44100, ctx = new OfflineAudioContext(1, rate * 4, rate);
  const master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);
  const b = { ctx, out: master, noise: noiseOf(ctx) };
  if (name === "tick") tick(b, 0.01, true, 0);
  else if ((WORK_SOUNDS as string[]).includes(name)) makeWork(b, name as WorkSound, 0.01);
  else make(b, name as FishSound, 0.01, tier);
  const d = (await ctx.startRendering()).getChannelData(0);
  let peak = 0, sum = 0, last = 0;
  for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += v * v; if (v > 0.003) last = i; }
  return { peak: Math.round(peak * 1000) / 1000, rms: Math.round(Math.sqrt(sum / Math.max(1, last)) * 1000) / 1000, secs: Math.round((last / rate) * 100) / 100 };
}
