/**
 * Cash Town's music (the owner's calls: 2026-10-02, "เพลง bgm ขึ้นอยู่กับเวลา ...
 * เหมือน animal crossing", a piece for each hour in Bangkok; 2026-10-04, pieces
 * made with Suno in place of the little synthesiser that was here, open and
 * sparse, "เพลงที่ฟังแล้ว ไม่ต้องตั้งใจฟัง").
 *
 * A piece is a file in public/town named by its content, listed in music.json
 * under the hour it was made for. The fc-cash-town skill's
 * scripts/music/build-music.mjs writes both, brings every piece to one loudness
 * and leaves a pause at each one's end. There is to be a piece for every hour;
 * until there is, an hour with none of its own plays the nearest piece of its
 * part of the day.
 *
 * pieceAt() is which piece (pure, tested); TownMusic plays it (an audio element
 * through Web Audio).
 */
import PIECES from "./music.json";

/** The hours that have a piece of their own. */
export const HAVE: number[] = Object.keys(PIECES).map(Number).sort((a, b) => a - b);

/** The parts of the day, each from its first hour to its last: night, morning, afternoon, evening. */
export const PARTS: Array<[from: number, to: number]> = [[22, 5], [6, 11], [12, 17], [18, 21]];

const wrap = (hour: number) => ((Math.floor(hour) % 24) + 24) % 24;
const within = (hour: number, [from, to]: [number, number]) => (from <= to ? hour >= from && hour <= to : hour >= from || hour <= to);
/** The hours between two hours, the short way round the clock. */
const apart = (a: number, b: number) => Math.min(wrap(a - b), wrap(b - a));

/** The part of the day an hour is in, as its place in PARTS. */
export function partOf(hour: number): number {
  return PARTS.findIndex((p) => within(wrap(hour), p));
}

/**
 * The piece for an hour of the day (0–23, Bangkok), as the hour it was made
 * for: its own if it has one, or else the nearest of its part of the day (of
 * two as near, the lower hour), or of the whole day if its part has none.
 */
export function pieceAt(hour: number, have: number[] = HAVE): number {
  const h = wrap(hour);
  if (have.includes(h)) return h;
  const same = have.filter((x) => partOf(x) === partOf(h));
  return [...(same.length ? same : have)].sort((a, b) => apart(a, h) - apart(b, h) || a - b)[0];
}

/** Where the piece for an hour is. */
export function fileAt(hour: number): string {
  return `/town/${(PIECES as Record<string, string>)[String(pieceAt(hour)).padStart(2, "0")]}`;
}

/**
 * The slider's 0 to 1 as a gain. At the 0.3 it starts at the pieces are as
 * loud as the synthesiser's were there (measured in the town, both), and at 1
 * a piece is as loud as its file and no louder, so nothing clips.
 */
export function gainOf(volume: number): number {
  return Math.pow(Math.min(1, Math.max(0, volume)), 1.5);
}

/* ── the player ──────────────────────────────────────────────────────────── */

/** How long a piece takes to fade in, and to fade away before the next (seconds). */
const FADE = 2.5;

/**
 * The town's music player. Starts only from a tap (browsers allow sound only
 * after one) and plays the piece for the hour, over and over.
 *
 * One audio element, kept: a phone lets an element play again by itself only
 * if a tap started it, so the next hour's piece is put on the same one. That
 * is also why a new piece comes after the old has faded away and not over it
 * (and two pieces in two keys sound wrong together). The element plays through
 * a gain, since a phone ignores an element's own volume.
 */
export class TownMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private fade: GainNode | null = null;
  private el: HTMLAudioElement | null = null;
  private now: { hour: number; file: string } | null = null;
  private on = false;
  /** While the old piece fades away, the new one waiting. */
  private next: ReturnType<typeof setTimeout> | null = null;
  /** After a stop, the element and the context about to rest. */
  private rest: ReturnType<typeof setTimeout> | null = null;
  /** Waiting for a finger to come up, to play (see kick). */
  private asking = false;
  private volume = 0.5;

  get playing() { return this.on; }

  /** Begin (from a tap) with the piece for an hour (0–23, Bangkok). */
  start(hour: number) {
    if (this.on) return;
    if (!this.ctx) this.build();
    if (this.rest) { clearTimeout(this.rest); this.rest = null; }
    this.on = true;
    this.setVolume(this.volume);
    this.play(hour);
  }

  private build() {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.fade = ctx.createGain();
    this.fade.gain.value = 0;
    this.fade.connect(this.master);
    const el = this.el = new Audio();
    el.loop = true;
    el.preload = "auto";
    ctx.createMediaElementSource(el).connect(this.fade);
    el.addEventListener("loadedmetadata", () => this.seek());
    // it fades in once it sounds, not while it is still being fetched
    el.addEventListener("playing", () => this.rise());
  }

  /** To where the piece is by the clock: everybody in town hears about the same bar, and nobody always its opening. */
  private seek() {
    const el = this.el;
    if (el && Number.isFinite(el.duration) && el.duration > 0) el.currentTime = (Date.now() / 1000) % el.duration;
  }

  private rise() {
    if (!this.on || this.next || !this.ctx || !this.fade) return;
    this.fade.gain.cancelScheduledValues(this.ctx.currentTime);
    this.fade.gain.setTargetAtTime(1, this.ctx.currentTime, FADE / 3);
  }

  /** Put the piece for an hour on, from silence. */
  private play(hour: number) {
    const el = this.el!, ctx = this.ctx!, file = fileAt(hour);
    this.now = { hour, file };
    this.fade!.gain.cancelScheduledValues(ctx.currentTime);
    this.fade!.gain.setValueAtTime(0, ctx.currentTime);
    if (el.getAttribute("src") !== file) el.src = file; else this.seek();
    this.kick();
  }

  /**
   * Play; and if the browser will not yet, again when the next finger comes
   * up. It wants a tap first, and on a phone a finger going down is not one
   * until it comes up, while the tap that starts the music is heard as it
   * goes down.
   */
  private kick() {
    const el = this.el, ctx = this.ctx;
    if (!this.on || !el || !ctx) return;
    const again = () => {
      if (this.asking) return;
      this.asking = true;
      window.addEventListener("pointerup", () => { this.asking = false; this.kick(); }, { once: true });
    };
    void ctx.resume().catch(() => {});
    el.play().then(() => { if (ctx.state !== "running") again(); },
      (e: unknown) => { if ((e as { name?: string } | null)?.name === "NotAllowedError") again(); });
  }

  stop() {
    if (!this.on) return;
    this.on = false;
    if (this.next) { clearTimeout(this.next); this.next = null; }
    const ctx = this.ctx!, el = this.el!;
    this.fade!.gain.cancelScheduledValues(ctx.currentTime);
    this.fade!.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    // (closing the music stops it first, and by the time this runs its context is closed: nothing to suspend then)
    this.rest = setTimeout(() => { this.rest = null; el.pause(); if (ctx.state !== "closed") void ctx.suspend().catch(() => {}); }, 900);
  }

  /** 0 to 1, heard as an even step each way. */
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(gainOf(this.volume), this.ctx.currentTime, 0.05);
  }

  /** The hour: if it brings another piece, the one playing fades away and the new one comes in after it. */
  setHour(hour: number) {
    if (!this.on || !this.now || this.now.hour === hour) return;
    this.now.hour = hour;
    if (this.next) { clearTimeout(this.next); this.next = null; }
    if (fileAt(hour) === this.now.file) { this.rise(); return; }
    const ctx = this.ctx!;
    this.fade!.gain.cancelScheduledValues(ctx.currentTime);
    this.fade!.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
    this.next = setTimeout(() => { this.next = null; if (this.on) this.play(hour); }, FADE * 1000);
  }

  close() {
    this.stop();
    if (this.rest) { clearTimeout(this.rest); this.rest = null; }
    const el = this.el;
    if (el) { el.pause(); el.removeAttribute("src"); el.load(); }
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.fade = null;
    this.el = null;
    this.now = null;
  }
}
