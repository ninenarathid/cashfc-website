/**
 * Cash Town's music (the owner's call, 2026-10-02: "เพลง bgm ขึ้นอยู่กับเวลา ...
 * เหมือน animal crossing", then "ขอเพลงแนว Cozy กว่านี้ ... Lofi", then "อยากให้
 * เพลงเปลี่ยนทุก 1 ชม"): a short lofi piece of its own for every hour of the day
 * in Bangkok, played by a little
 * synthesiser in the browser. Nothing is downloaded and nobody else's music is
 * used: each piece is written here, as a key, a tempo, chords and a seed, and
 * its tune is composed from those the same way every time, so the morning
 * always sounds like the morning.
 *
 * The lofi sound: an electric piano playing jazzy sevenths and ninths, a
 * slow swung beat (a soft kick, a rim, quiet hats), a round bass, a tape that
 * wobbles a little, a warm filter over all of it, and a vinyl crackle.
 *
 * compose() is the music (pure, tested); TownMusic plays it (Web Audio).
 */

export type Voice = "keys" | "lead" | "bell" | "bass" | "kick" | "snare" | "hat";

/** One note of a piece: when (in eighths from the loop's start), how long (eighths), what. */
export interface Note { step: number; dur: number; midi: number; voice: Voice; vel: number }

export interface Song {
  bpm: number;
  /** MIDI note of the key's first degree. */
  root: number;
  /** The scale, in semitones from the root. */
  scale: number[];
  /** The chords, one a bar, as the scale degree each is built on (0 = I). */
  prog: number[];
  /** The tune's instrument: the electric piano up high, or a soft bell. */
  lead: "lead" | "bell";
  /** 0: no beat; 1: a brushed beat (rim and hats); 2: the full lofi beat. */
  groove: 0 | 1 | 2;
  /** How busy the tune is, 0 (a few long notes) to 1. */
  busy: number;
  /** How much the off-beats lag, 0 straight to 0.33 swung. */
  swing: number;
  seed: number;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

/**
 * The pieces, one for each hour in Bangkok: tempo, key (a MIDI root), scale,
 * chords, what plays the tune, the beat, how busy, how swung. Slow and
 * beatless in the small hours, a brushed beat as the town wakes, the full
 * groove through the day, slower and more swung into the evening, a music
 * box again late at night.
 */
const HOURS: Array<[bpm: number, root: number, scale: number[], prog: number[], lead: Song["lead"], groove: Song["groove"], busy: number, swing: number]> = [
  /* 00 */ [60, 57, LYDIAN, [0, 1, 0, 6], "bell", 0, 0.2, 0.15],
  /* 01 */ [58, 53, MAJOR, [0, 5, 3, 4], "bell", 0, 0.15, 0.1],
  /* 02 */ [56, 62, LYDIAN, [0, 1, 3, 0], "bell", 0, 0.15, 0.1],
  /* 03 */ [56, 58, MAJOR, [3, 0, 5, 4], "bell", 0, 0.15, 0.1],
  /* 04 */ [60, 64, MAJOR, [0, 3, 5, 4], "bell", 0, 0.2, 0.1],
  /* 05 */ [64, 63, MAJOR, [0, 5, 3, 4], "bell", 0, 0.25, 0.1],
  /* 06 */ [70, 55, MAJOR, [0, 2, 3, 4], "lead", 1, 0.35, 0.18],
  /* 07 */ [76, 60, MAJOR, [0, 5, 1, 4], "lead", 1, 0.45, 0.22],
  /* 08 */ [80, 62, MAJOR, [0, 3, 2, 5], "lead", 2, 0.5, 0.22],
  /* 09 */ [84, 57, MAJOR, [1, 4, 0, 5], "lead", 2, 0.55, 0.25],
  /* 10 */ [86, 65, MAJOR, [3, 4, 2, 5], "lead", 2, 0.6, 0.24],
  /* 11 */ [88, 58, MAJOR, [0, 5, 3, 4], "lead", 2, 0.6, 0.26],
  /* 12 */ [84, 60, MAJOR, [3, 2, 1, 0], "lead", 2, 0.55, 0.25],
  /* 13 */ [78, 55, MAJOR, [0, 2, 5, 3], "lead", 2, 0.4, 0.28],
  /* 14 */ [78, 63, MAJOR, [1, 4, 0, 5], "lead", 2, 0.45, 0.26],
  /* 15 */ [80, 56, MAJOR, [0, 3, 1, 4], "lead", 2, 0.5, 0.25],
  /* 16 */ [82, 64, MAJOR, [5, 3, 0, 4], "lead", 2, 0.5, 0.24],
  /* 17 */ [76, 62, MAJOR, [5, 3, 0, 4], "bell", 1, 0.4, 0.22],
  /* 18 */ [74, 59, MAJOR, [0, 5, 1, 4], "lead", 2, 0.4, 0.28],
  /* 19 */ [72, 61, MAJOR, [3, 2, 5, 4], "lead", 2, 0.4, 0.3],
  /* 20 */ [70, 53, MAJOR, [0, 3, 2, 5], "lead", 1, 0.35, 0.28],
  /* 21 */ [68, 60, LYDIAN, [0, 1, 0, 4], "bell", 1, 0.3, 0.22],
  /* 22 */ [64, 55, MAJOR, [0, 5, 3, 4], "bell", 0, 0.25, 0.15],
  /* 23 */ [62, 63, LYDIAN, [0, 1, 5, 0], "bell", 0, 0.2, 0.12],
];
export const SONGS: Song[] = HOURS.map(([bpm, root, scale, prog, lead, groove, busy, swing], h) =>
  ({ bpm, root, scale, prog, lead, groove, busy, swing, seed: 101 + h * 37 }));

/** The piece for an hour of the day (0–23, Bangkok). */
export function songAt(hour: number): Song {
  return SONGS[((Math.floor(hour) % 24) + 24) % 24];
}

/** Eighths a bar, and bars a loop. */
export const STEPS = 8;
export const BARS = 8;

function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A scale degree (0 the root, 7 the octave above) as a MIDI note. */
export function midiOf(song: Song, degree: number): number {
  const n = song.scale.length, d = ((degree % n) + n) % n;
  return song.root + song.scale[d] + 12 * Math.floor(degree / n);
}

/** The degree a bar's chord is built on; the loop's last bar is always home (I). */
export function chordRoot(song: Song, bar: number): number {
  return bar === BARS - 1 ? 0 : song.prog[bar % song.prog.length];
}

/** A bar's chord tones (root, third, fifth, seventh), for the tune to land on. */
export function chordTones(song: Song, bar: number): number[] {
  const d = chordRoot(song, bar);
  return [d, d + 2, d + 4, d + 6];
}

/** A degree moved into the octave under the root, for the bass. */
const low = (d: number) => (((d % 7) + 7) % 7) - 7;

/** Rhythms for a bar of tune: each slot an onset's length in eighths, 0 for none. */
const BUSY = [
  [2, 0, 1, 1, 0, 0, 2, 0], [0, 1, 2, 0, 2, 0, 0, 0], [3, 0, 0, 1, 2, 0, 0, 0],
  [0, 0, 1, 1, 4, 0, 0, 0], [2, 0, 0, 1, 1, 0, 2, 0],
];
const CALM = [[4, 0, 0, 0, 0, 0, 2, 0], [6, 0, 0, 0, 0, 0, 0, 0], [0, 0, 2, 0, 4, 0, 0, 0], [3, 0, 0, 3, 0, 0, 0, 0]];

/**
 * A piece's loop: eight bars of electric-piano chords (sevenths with a ninth,
 * the root left to the bass), a bass line, the beat if it has one, and a tune
 * shaped A A' B A-and-home, its strong beats on the chord.
 */
export function compose(song: Song): Note[] {
  const rnd = seeded(song.seed), notes: Note[] = [];
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  for (let bar = 0; bar < BARS; bar++) {
    const d = chordRoot(song, bar), at = bar * STEPS;
    // the chord, rootless (third, fifth, seventh, ninth), struck on one and, in a
    // busier piece, pushed again just before three
    const voicing = [d + 2, d + 4, d + 6, d + 8];
    for (const v of voicing) notes.push({ step: at, dur: song.groove ? 3 : 7, midi: midiOf(song, v), voice: "keys", vel: 0.9 });
    if (song.groove && bar % 2 === 1) for (const v of voicing) notes.push({ step: at + 3, dur: 4, midi: midiOf(song, v), voice: "keys", vel: 0.6 });
    // the bass: the root on one, the fifth later
    notes.push({ step: at, dur: 4, midi: midiOf(song, low(d)), voice: "bass", vel: 1 });
    if (song.groove) notes.push({ step: at + 5, dur: 2, midi: midiOf(song, low(d + 4)), voice: "bass", vel: 0.7 });
    // the beat: kick on one and the and of three, the rim on two and four, hats on the eighths
    if (song.groove === 2) for (const s of [0, 5]) notes.push({ step: at + s, dur: 1, midi: 0, voice: "kick", vel: s ? 0.7 : 1 });
    if (song.groove) {
      for (const s of [2, 6]) notes.push({ step: at + s, dur: 1, midi: 0, voice: "snare", vel: song.groove === 2 ? 0.9 : 0.5 });
      for (let s = 0; s < STEPS; s++) notes.push({ step: at + s, dur: 1, midi: 0, voice: "hat", vel: s % 2 ? 0.45 : 0.7 });
    }
  }
  // the tune: two bars of motif, made to fit wherever they are played
  const rhythms = rnd() < song.busy ? BUSY : CALM;
  const motif = [pick(song.busy > 0.4 ? BUSY : rhythms), pick(rhythms)];
  const other = [pick(rhythms), pick(rhythms)];
  const plan = [motif[0], motif[1], motif[0], other[1], other[0], other[1], motif[0], [6, 0, 0, 0, 0, 0, 0, 0]];
  let cur = 9;
  for (let bar = 0; bar < BARS; bar++) {
    const chord = chordTones(song, bar).map((d) => d + 7), rhythm = plan[bar];
    // the same motif comes back with the same shape: reseed by which half it is in
    const shape = seeded(song.seed * 31 + (bar % 2) + (bar >= 4 && bar < 6 ? 7 : 0));
    for (let s = 0; s < STEPS; s++) {
      const dur = rhythm[s];
      if (!dur) continue;
      let deg: number;
      if (bar === BARS - 1) deg = 7;
      else if (s === 0 || s === 4) {
        // strong beats land on the chord, near where the tune is
        const options = chord.flatMap((d) => [d, d + 7, d - 7]).filter((d) => d >= 5 && d <= 15);
        options.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur));
        deg = options[Math.min(options.length - 1, Math.floor(shape() * 2))];
      } else {
        // off the beat: a step or two, keeping off the fourth and seventh (the pentatonic's gaps)
        const move = [-2, -1, -1, 1, 1, 2][Math.floor(shape() * 6)];
        deg = Math.min(15, Math.max(5, cur + move));
        const k = ((deg % 7) + 7) % 7;
        if (k === 3 || k === 6) deg += move > 0 ? 1 : -1;
      }
      cur = deg;
      notes.push({ step: bar * STEPS + s, dur, midi: midiOf(song, deg), voice: song.lead, vel: s === 0 ? 1 : 0.8 });
    }
  }
  return notes.sort((a, b) => a.step - b.step);
}

/* ── the player ──────────────────────────────────────────────────────────── */

const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** The shared sound of the room: a tape wobble, a warm filter, a crackle, a noise for the drums. */
interface Room { ctx: AudioContext; bus: AudioNode; wobble: AudioNode; noise: AudioBuffer }

/** One piece playing into its own gain, so pieces can cross-fade. */
class Player {
  readonly out: GainNode;
  private readonly byStep = new Map<number, Note[]>();
  private next = 0;
  private at: number;
  constructor(private readonly room: Room, private readonly song: Song) {
    const { ctx, bus } = room;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(bus);
    for (const n of compose(song)) { const list = this.byStep.get(n.step) ?? []; list.push(n); this.byStep.set(n.step, list); }
    this.at = ctx.currentTime + 0.1;
  }
  /** Plays what falls before `until` (seconds on the audio clock). */
  schedule(until: number) {
    const eighth = 30 / this.song.bpm;
    while (this.at < until) {
      const step = this.next % (BARS * STEPS);
      const t = this.at + (step % 2 ? this.song.swing * eighth : 0);
      const notes = this.byStep.get(step) ?? [];
      let strum = 0;
      for (const n of notes) {
        // a chord is rolled, a little, like a hand on the keys
        const when = n.voice === "keys" ? t + 0.012 * strum++ : t;
        this.play(n, when, n.dur * eighth);
      }
      this.next++;
      this.at += eighth;
    }
  }
  private env(t: number, peak: number, attack: number, hold: number, release: number): GainNode {
    const g = this.room.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    g.connect(this.out);
    return g;
  }
  private osc(type: OscillatorType, f: number, t: number, end: number, to: AudioNode, wobble = true) {
    const o = this.room.ctx.createOscillator();
    o.type = type; o.frequency.value = f;
    if (wobble) this.room.wobble.connect(o.detune);
    o.connect(to); o.start(t); o.stop(end);
    o.onended = () => { try { this.room.wobble.disconnect(o.detune); } catch { /* already gone */ } };
    return o;
  }
  /** An electric piano: a sine with a little FM bark at the start, fading slowly. */
  private epiano(midi: number, t: number, len: number, peak: number) {
    const ctx = this.room.ctx, f = freq(midi), end = t + len + 1.2;
    const g = this.env(t, peak, 0.008, Math.max(0.05, len * 0.4), Math.max(0.8, len));
    const carrier = this.osc("sine", f, t, end, g);
    const mod = this.osc("sine", f, t, end, ctx.createGain(), false);
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(f * 1.4, t);
    depth.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.5);
    mod.disconnect();
    mod.connect(depth);
    depth.connect(carrier.frequency);
  }
  private play(n: Note, t: number, len: number) {
    const ctx = this.room.ctx;
    switch (n.voice) {
      case "keys": this.epiano(n.midi, t, len, 0.05 * n.vel); break;
      case "lead": this.epiano(n.midi + 12, t, len, 0.075 * n.vel); break;
      case "bell": {
        // a soft music-box bell an octave up, and a quiet partial
        const g = this.env(t, 0.07 * n.vel, 0.006, 0, 1.6);
        this.osc("sine", freq(n.midi + 12), t, t + 1.7, g);
        const h = this.env(t, 0.012 * n.vel, 0.004, 0, 0.4);
        this.osc("sine", freq(n.midi + 12) * 3, t, t + 0.5, h);
        break;
      }
      case "bass": {
        const g = this.env(t, 0.22 * n.vel, 0.02, Math.max(0.05, len - 0.15), 0.18);
        this.osc("sine", freq(n.midi), t, t + len + 0.3, g);
        break;
      }
      case "kick": {
        const g = this.env(t, 0.28 * n.vel, 0.003, 0.02, 0.28);
        const o = this.osc("sine", 110, t, t + 0.35, g, false);
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
        break;
      }
      case "snare": {
        // a soft rim: a short knock of filtered noise
        const g = this.env(t, 0.07 * n.vel, 0.002, 0.005, 0.11);
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1700; bp.Q.value = 1.2; bp.connect(g);
        const s = ctx.createBufferSource(); s.buffer = this.room.noise; s.connect(bp); s.start(t); s.stop(t + 0.15);
        break;
      }
      case "hat": {
        const g = this.env(t, 0.018 * n.vel, 0.002, 0.005, 0.04);
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7500; hp.connect(g);
        const s = ctx.createBufferSource(); s.buffer = this.room.noise; s.connect(hp); s.start(t); s.stop(t + 0.06);
        break;
      }
    }
  }
}

/**
 * The town's music player. Starts only from a tap (browsers allow sound only
 * after one), plays the piece for the part of the day, and cross-fades when
 * the day moves on.
 */
export class TownMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private room: Room | null = null;
  private crackle: AudioBufferSourceNode | null = null;
  private now: { hour: number; player: Player } | null = null;
  private fading: Player[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private volume = 0.5;

  get playing() { return this.timer !== null; }

  /** Begin (from a tap) with the piece for an hour (0–23, Bangkok). */
  start(hour: number) {
    if (this.timer) return;
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    void ctx.resume();
    this.setVolume(this.volume);
    // the record's crackle, under everything
    const c = ctx.createBufferSource();
    c.buffer = crackleOf(ctx);
    c.loop = true;
    c.connect(this.master!);
    c.start();
    this.crackle = c;
    this.now = null;
    this.setHour(hour);
    this.timer = setInterval(() => this.tick(), 50);
  }

  private build() {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = this.ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(comp);
    // warm: the top taken off everything
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass"; warm.frequency.value = 3400; warm.Q.value = 0.4;
    warm.connect(this.master);
    // the tape: everything's pitch drifting a few cents, slowly
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 0.35; depth.gain.value = 7;
    lfo.connect(depth); lfo.start();
    const len = ctx.sampleRate * 0.3, noise = ctx.createBuffer(1, len, ctx.sampleRate), d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.room = { ctx, bus: warm, wobble: depth, noise };
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const ctx = this.ctx;
    if (!ctx) return;
    const was = [this.now?.player, ...this.fading];
    for (const p of was) if (p) { p.out.gain.cancelScheduledValues(ctx.currentTime); p.out.gain.setTargetAtTime(0, ctx.currentTime, 0.15); }
    const crackle = this.crackle;
    this.now = null; this.fading = []; this.crackle = null;
    setTimeout(() => { for (const p of was) p?.out.disconnect(); try { crackle?.stop(); } catch { /* stopped */ } void ctx.suspend(); }, 900);
  }

  /** 0 to 1, heard as an even step each way. */
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume * this.volume * 1.4, this.ctx.currentTime, 0.05);
  }

  /** The hour: a new piece fades in over the old one. */
  setHour(hour: number) {
    const room = this.room;
    if (!room || this.now?.hour === hour) return;
    const ctx = room.ctx;
    if (this.now) {
      const old = this.now.player;
      old.out.gain.setTargetAtTime(0, ctx.currentTime, 1.2);
      this.fading.push(old);
      setTimeout(() => { old.out.disconnect(); this.fading = this.fading.filter((p) => p !== old); }, 7000);
    }
    const player = new Player(room, songAt(hour));
    player.out.gain.setTargetAtTime(1, ctx.currentTime, this.now ? 1.5 : 0.4);
    this.now = { hour, player };
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const until = ctx.currentTime + 0.25;
    this.now?.player.schedule(until);
    for (const p of this.fading) p.schedule(until);
  }

  close() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
    this.room = null;
  }
}

/** Four seconds of vinyl: a faint hiss with a pop and a tick here and there. */
function crackleOf(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    lp = lp * 0.9 + (Math.random() * 2 - 1) * 0.1;
    d[i] = lp * 0.012;
    if (Math.random() < 6 / ctx.sampleRate) {
      const amp = 0.05 + Math.random() * 0.12;
      for (let k = 0; k < 40 && i + k < len; k++) d[i + k] += amp * (Math.random() * 2 - 1) * Math.exp(-k / 8);
    }
  }
  return b;
}
