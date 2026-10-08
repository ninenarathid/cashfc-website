import type { WorkPlay } from "./plays";

/**
 * A board shut by its member is written down as left: how often a game is given up is how hard it is found. But a
 * board says it is done a blink after its last hit (0.24 to 0.62 s, while its last mark is seen), and can be shut in
 * that blink: its end still comes, the work is still done, and the go was not left.
 *
 * So a go that was shut waits a moment before it is told of, and is not told of at all when its own end comes
 * meanwhile. A go is known by whatever stands for it and for no other (the thing a page keeps while the board is up):
 * the next go at the same board is another one, and does not take this one's place.
 */
export const LEFT_MS = 700;

export class Leaving {
  private readonly waits = new Map<unknown, { play: WorkPlay; timer: ReturnType<typeof setTimeout> }>();
  constructor(private readonly tell: (play: WorkPlay) => void, private readonly ms = LEFT_MS) {}

  /** The go was shut: told of as left in a moment, unless it ends first. */
  left(go: unknown, play: WorkPlay) {
    this.ended(go);
    this.waits.set(go, { play, timer: setTimeout(() => { this.waits.delete(go); this.tell(play); }, this.ms) });
  }
  /** The go's own end has come (its board said so): it was not left. Called first thing, before anything is waited for. */
  ended(go: unknown) {
    const w = this.waits.get(go);
    if (!w) return;
    clearTimeout(w.timer);
    this.waits.delete(go);
  }
  /** Whatever still waits is told of now (the page is going). */
  flush() {
    for (const w of this.waits.values()) { clearTimeout(w.timer); this.tell(w.play); }
    this.waits.clear();
  }
}
