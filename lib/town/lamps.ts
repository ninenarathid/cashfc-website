import { between } from "./line";
import { isSpent, spend } from "./stamina";
import { handOf, type Purse } from "./trade";
import { CAMP, FARM, FOREST, type Vec } from "./world";

/**
 * The lamp relay at dusk (the owner, 2026-10-08, of three games like the bucket line, "เอา 1 2 3", and then of this
 * one: "ส่งไฟจุดโคมตอนค่ำ เหลือไฟในมือ 5 วินาทีพอ ยิ่งจุดเยอะ แมพยิ่งสวย ขอให้เป็นบรรยากาศสวยๆน่าจดจำไปเลย"; it takes the place of
 * the lamps he had meant as a builder's works, "แทนงานโคมลุงก่อสร้างเลย"; and he had asked before for the farm and the
 * forest, which are dark at night, to be lighter and easier to play in then).
 *
 * From half past five in the evening (Bangkok) until five in the morning, the farm has twenty-eight lamp posts and
 * the forest fifty-six, and each one fire in its middle: the forest's camp fire, and a brazier beside the farm's well.
 * Twelve of a map's posts stand along its ways, as they did from the first night. **The others stand about its
 * fields and its edges, and a flame lives three seconds where it lived five** (the owner, 2026-10-09, the morning
 * after the first night: "ช่วยลดเวลาโคมยามค่ำ เหลือ ไฟ 3 วิพอ (5 วิง่ายไป)", and "เพิ่มโคมรอบๆแมพฟาร์ม และ ป่า
 * ให้มากกว่านี้ นอกจากทางเดิน อยากให้มีขอบๆแมพด้วย"; and, of a first layout of twenty-eight a map, "แมพป่าใหญ่กว่า
 * ควรจะมีโคมเยอะกว่าฟาร์มครับ"; and at noon, of the forty the forest then had, none further than fifty tiles of path from
 * the camp fire: "ช่วยทำให้โคมไฟ กระจายทั่วแมพกว่านี้ได้ไหม", "ในป่าดูไม่ครอบคลุมทั้งแมพ").
 *
 * - **A flame is taken at the fire with empty hands**: it is in the hands, never in the bag, and it lives **three
 *   seconds** there (about ten tiles of walking), by the clock of whoever keeps the game.
 * - It is **handed on** to somebody who stands still with empty hands within three tiles: it is fresh again, three
 *   seconds. **A handing on asked for up to a second after the flame's time still counts** (`grace`): lag is never
 *   somebody's fault. The same second is given to the lighting.
 * - **Never from a lamp**: a flame is taken only at a fire, never from a post that is lit (or one member would light
 *   the whole map alone).
 * - **A post is lit** from within two tiles of it, with a live flame: it is lit for everybody until five in the
 *   morning, and the flame is spent. One stamina; with none it is lit all the same, by a button held a little over a
 *   second (`holdFor`), and the flame is good for that much longer in tired hands, so that the hold cannot fail.
 *   **No board, and no test of quick hands, at any stamina.**
 * - **Everybody whose hands that flame went through** (the last eight) has three points on the helpers' line
 *   (lib/town/line-points) and is among the night's lighters.
 * - One member alone lights the few posts nearest the fire; the others take a relay, the furthest of the farm's some
 *   three hands and of the forest's six. (Two who hand a flame back and forth as they go reach any post: a flame is
 *   fresh again in hands it has been in before.) Nothing is lost if nobody lights: the night is as dark as it was.
 * - No coins come of it, nothing that can be sold, and no thing: a flame is not in `items.ts`.
 *
 * What a lit lamp does is the page's (components/town/TownLamps): it lights six tiles round it for everybody, the
 * night's dark lifted in its ring; and the more of a map's lamps are lit, the more of the night comes out (`tierOf`).
 *
 * Pure. The database does the same (v163: `town.flame_take`, `flame_pass`, `lamp_light`). It cannot know where
 * anybody stands (lib/town/line says why), so who is near enough to be handed a flame is the page's to hold to; the
 * tile somebody takes a flame or lights a post from is the page's word, held to the catalog's tiles.
 */
const F = (u: number, v: number): [number, number] => [FARM.x + u, FARM.y + v];
const W = (u: number, v: number): [number, number] => [FOREST.x + u, FOREST.y + v];

export const LAMPS = {
  /** When: from this minute of Bangkok's day (17:30) until that minute of the next (05:00). A lamp lit stays lit until then. */
  from: 17 * 60 + 30, until: 5 * 60,
  /** How long a flame lives in a hand, in seconds; and for how long after that a handing on or a lighting asked for still counts. */
  life: 3, grace: 1,
  /** How far apart two may stand for a flame to be handed on, in tiles as the path goes (the page's to hold to). */
  reach: 3,
  /** How near the fire one stands to take a flame, and how near a post to light it, in tiles. */
  near: 2,
  /** The stamina lighting a post costs. Taking a flame and handing it on cost nothing. */
  cost: 1,
  /** How long the button is held to light a post with no stamina left, in seconds: the flame is good that much longer in tired hands. */
  hold: 1.2,
  /** How far a lit lamp lights round it, in tiles (the page's). */
  light: 6,
  /** How many of those whose hands a flame went through are remembered (the last so many). */
  hands: 8,
  /** The points on the helpers' line a post lit is worth to each of them. */
  point: 3,
  /** At how many lit posts of a map more of the night comes out, before all of them (the page's). The first is as it was with twelve posts, so that a few members see it soon. */
  more: [4, 10],
  /**
   * Each map's fire and its posts, by their tiles. **The first twelve are the ways' own, as they were, and keep their
   * numbers** (a lamp lit is kept by its number); the ones after them were added on 2026-10-09. The farm's sixteen:
   * twelve round its rim, two or three tiles in from the edge (clockwise from the north-west corner), and one in the
   * middle of each quarter of the beds. The forest's forty-four, **spread over the whole of the map**, its four corners,
   * its rims and the deep woods across the stream among them: each was put, one at a time, on the free tile furthest
   * from every post there was, so that no open ground is further than eleven tiles from a lamp (it was thirty-seven
   * from one in the north-west while no post stood further than fifty tiles of path from the fire). They are written
   * **the nearest to the camp fire first, as one walks**; the furthest is some seventy-eight tiles of path away, and
   * seven are further than sixty.
   *
   * The twelve of the ways, as they were laid out: The farm's: a brazier beside the well, and posts along its
   * two lanes: three to the west, four to the east, one where the lanes cross (it lights the well and the brazier)
   * and two more north of it, two south. The forest's: the camp
   * fire, and posts along the trail to the gate, the trail to the great tree and the trail to the waterfall, four
   * each. **They are only drawn: no tile's walking changes for a post or for the brazier**, and none stands on a way,
   * on a plot, where something else stands, or behind a tree as the screen sees it (lib/town/lamps.test holds them to
   * that, and to how far each is from its fire).
   */
  maps: {
    farm: {
      fire: F(27, 24),
      posts: [F(18, 23), F(8, 20), F(3, 23), F(38, 23), F(44, 20), F(50, 23), F(56, 20), F(31, 20), F(28, 10), F(31, 3), F(28, 31), F(31, 39),
        // the rim, clockwise from the north-west corner
        F(3, 3), F(16, 2), F(45, 3), F(55, 3), F(57, 11), F(57, 32), F(57, 40), F(45, 41), F(16, 41), F(3, 39), F(2, 32), F(2, 12),
        // the middle of each quarter of the beds
        F(15, 11), F(44, 11), F(15, 32), F(44, 32)],
    },
    forest: {
      fire: [CAMP.fire.x, CAMP.fire.y] as [number, number],
      posts: [W(50, 56), W(48, 65), W(46, 70), W(46, 74), W(49, 36), W(48, 29), W(50, 20), W(45, 12), W(61, 46), W(69, 46), W(74, 38), W(80, 34),
        // off the trails, over the whole map, the nearest to the camp fire first: within thirty tiles of path
        W(40, 54), W(38, 45), W(63, 57), W(58, 31), W(33, 61), W(26, 48), W(32, 35), W(59, 69),
        // within forty-two
        W(35, 71), W(70, 66), W(79, 49), W(20, 38), W(81, 59), W(15, 55), W(66, 24), W(12, 45), W(20, 69), W(57, 12), W(89, 48), W(76, 25), W(80, 70),
        // within sixty: the rims, and the deep woods across the stream
        W(33, 21), W(36, 11), W(19, 26), W(91, 58), W(53, 2), W(91, 37), W(7, 36), W(2, 50), W(6, 61), W(67, 7), W(78, 15), W(91, 68), W(38, 2), W(9, 27), W(19, 15), W(2, 71),
        // the furthest: the north-east, the north-west and its corner
        W(91, 19), W(24, 5), W(2, 21), W(9, 12), W(87, 2), W(14, 2), W(2, 2)],
    },
  },
};

/** The maps that have lamps. */
export type LampMap = "farm" | "forest";
export const LAMP_MAPS: readonly LampMap[] = ["farm", "forest"];
export const isLampMap = (v: unknown): v is LampMap => v === "farm" || v === "forest";

/**
 * What is the page's alone, and only drawn: where the board stands by each fire (how to play, how many are lit
 * tonight, the night's lighters); and which posts follow one another out from the fire along one way (`ARMS`: what
 * goes along the way between two lit posts goes by these; the posts off the ways are on no arm).
 */
export const BOARD_AT: Record<LampMap, [number, number]> = { farm: F(27, 26), forest: W(51, 48) };
export const ARMS: Record<LampMap, number[][]> = { farm: [[0, 1, 2], [3, 4, 5, 6], [7, 8, 9], [10, 11]], forest: [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]] };
/** As the bucket line's and the bridge's: how near somebody has to stand to be named with what they lack, and how many are offered at once. */
export const OFFER = { beside: 4, most: 3 };
/** In how many embers the ring round a flame's bearer shows what is left of it. */
export const RING = 10;

const DAY = 86_400_000, BANGKOK = 7 * 3_600_000, MIN = 60_000;

/**
 * **The night a moment is in**: the number of the Bangkok day its evening is of (the same from half past five until
 * five the next morning), or null by day. Lamps lit are kept by it.
 */
export function nightOf(now: number): number | null {
  const t = now + BANGKOK - LAMPS.until * MIN, day = Math.floor(t / DAY);
  return t - day * DAY >= (LAMPS.from - LAMPS.until) * MIN ? day : null;
}
/** When a night ends, and when the night after a moment by day begins (the keeper's clock, in ms). */
export const nightEnds = (night: number): number => (night + 1) * DAY + LAMPS.until * MIN - BANGKOK;
export const nightBegins = (now: number): number => {
  const t = now + BANGKOK - LAMPS.until * MIN, day = Math.floor(t / DAY);
  return day * DAY + LAMPS.from * MIN - BANGKOK;
};

/** A flame in somebody's hands: at which map's fire it was taken, the moment it dies, and whose hands it has been through (the holder last). */
export interface Flame { from: LampMap; until: number; hands: string[] }

/**
 * Why something of the lamps was not done: it is day (`day`); every lamp of that map is lit already (`whole`); a live
 * flame in the hands already (`held`); a thing in the hand (`hand`); a stone in the hands (`stone`: lib/town/bridge);
 * not standing where it is done (`far`); no flame to hand on or to light with (`none`); the flame has gone out
 * (`out`); the post is lit already (`lit`).
 */
export type LampRefusal = "day" | "whole" | "held" | "hand" | "stone" | "far" | "none" | "out" | "lit";
type No = { ok: false; why: LampRefusal };
const no = (why: LampRefusal): No => ({ ok: false, why });

/** Whether somebody on a tile stands near enough another to do something at it: within so many tiles of it, either way. */
export const byTile = (at: readonly [number, number] | null | undefined, tile: readonly [number, number] | null | undefined, reach = LAMPS.near): boolean =>
  !!at && !!tile && Number.isInteger(at[0]) && Number.isInteger(at[1]) && Math.max(Math.abs(at[0] - tile[0]), Math.abs(at[1] - tile[1])) <= reach;
/** A map's fire, and one of its posts: null for a map that has no lamps, or a post it has none of. */
export const fireOf = (map: string): [number, number] | null => (isLampMap(map) ? LAMPS.maps[map].fire : null);
export const postOf = (map: string, post: number): [number, number] | null => (isLampMap(map) && Number.isInteger(post) ? LAMPS.maps[map].posts[post] ?? null : null);
/** How many posts a map has. */
export const postsOf = (map: string): number => (isLampMap(map) ? LAMPS.maps[map].posts.length : 0);

/** Whether a flame is alive at a moment: it has not reached its time. */
export const alive = (flame: Flame | null | undefined, now: number): flame is Flame => !!flame && now < flame.until;
/** How much of a flame is left at a moment, in ms: nothing, of none. */
export const leftOf = (flame: { until: number } | null | undefined, now: number): number => (flame ? Math.max(0, flame.until - now) : 0);
/** How many embers of the ring round its bearer still glow with so much left (none to `RING`). */
export const embers = (left: number): number => Math.max(0, Math.min(RING, Math.ceil((left / (LAMPS.life * 1000)) * RING)));
/** Whether a flame can still be handed on or lit with at a moment: up to its time and the second of grace (and so many seconds more, for tired hands that hold the button). */
const good = (flame: Flame, now: number, more = 0): boolean => now <= flame.until + Math.round((LAMPS.grace + more) * 1000);

/**
 * Take a flame at a map's fire: by night, from a tile by the fire, with nothing in the hand, no stone in the hands
 * and no live flame already, while that map still has a post unlit (`lit`: how many of its posts are lit tonight).
 * It costs nothing. The flame begins with its taker's hands on it and nobody else's, and lives five seconds.
 */
export function take(purse: Purse, flame: Flame | null, stone: boolean, lit: number, map: string, at: readonly [number, number] | null, me: string, now: number):
  { ok: true; flame: Flame } | No {
  if (nightOf(now) === null) return no("day");
  if (!isLampMap(map)) return no("far");
  if (lit >= postsOf(map)) return no("whole");
  if (alive(flame, now)) return no("held");
  if (handOf(purse)) return no("hand");
  if (stone) return no("stone");
  if (!byTile(at, fireOf(map))) return no("far");
  return { ok: true, flame: { from: map, until: now + LAMPS.life * 1000, hands: [me] } };
}

/**
 * Hand the flame I hold on to somebody: they have nothing in the hand, no stone and no live flame. It costs nothing,
 * and the flame is fresh again: five seconds from this moment. It goes with the hands it came by, the taker's last
 * (once: somebody it comes back to is its last hand, not two of them), the last so many remembered. A handing on
 * asked for up to a second after the flame's time still counts.
 */
export function pass(flame: Flame | null, to: string, theirs: Purse, theirFlame: Flame | null, theirStone: boolean, now: number): { ok: true; flame: Flame } | No {
  if (!flame) return no("none");
  if (!good(flame, now)) return no("out");
  if (alive(theirFlame, now)) return no("held");
  if (handOf(theirs)) return no("hand");
  if (theirStone) return no("stone");
  return { ok: true, flame: { from: flame.from, until: now + LAMPS.life * 1000, hands: [...flame.hands.filter((id) => id !== to), to].slice(-LAMPS.hands) } };
}

/**
 * Light a post with the flame I hold: by night, from a tile by the post, which is not lit yet (`lit`: the posts of
 * that map lit tonight). One stamina (none left: lit all the same, and the flame is good for the hold's time
 * longer). The flame is spent. Says whose hands it came by (each is counted it), how many of the map's posts are lit
 * now and of how many, and whether that is all of them.
 */
export function light(purse: Purse, flame: Flame | null, lit: readonly number[], map: string, post: number, at: readonly [number, number] | null, now: number):
  { ok: true; purse: Purse; hands: string[]; n: number; of: number; full: boolean } | No {
  if (nightOf(now) === null) return no("day");
  if (!flame) return no("none");
  if (!good(flame, now, isSpent(purse, now) ? LAMPS.hold : 0)) return no("out");
  const tile = postOf(map, post);
  if (!tile || !byTile(at, tile)) return no("far");
  if (lit.includes(post)) return no("lit");
  const n = lit.length + 1, of = postsOf(map);
  return { ok: true, purse: spend(purse, LAMPS.cost, now), hands: flame.hands, n, of, full: n >= of };
}

/* ── what is kept, and what a page is told ───────────────────────────────── */

/** A post lit: on which night, which map's, which post, when, and whose hands the flame came by (whoever lit it last). */
export interface LitKept { night: number; map: LampMap; post: number; at: number; hands: string[] }
/** Everything of the lamps that is kept: every post lit (tonight's are what shows), the flame each member holds, and the nights every lamp of a map was lit. */
export interface LampsKept { lit: LitKept[]; flames: Record<string, Flame>; full: Array<{ night: number; map: LampMap; at: number }> }
export const newLamps = (): LampsKept => ({ lit: [], flames: {}, full: [] });
/** The posts of a map lit on a night, by their numbers. */
export const litOf = (kept: LampsKept, map: string, night: number | null): number[] =>
  (night === null ? [] : kept.lit.filter((l) => l.night === night && l.map === map).map((l) => l.post).sort((a, b) => a - b));
/** The lamps with a flame in somebody's hands (taken, or handed to them: whoever handed it has none), and with none in somebody's. */
export const held = (kept: LampsKept, who: string, flame: Flame, from?: string): LampsKept => {
  const flames = { ...kept.flames, [who]: flame };
  if (from !== undefined) delete flames[from];
  return { ...kept, flames };
};
/** The lamps with a post lit, at a moment: the flame is spent, the post is lit for the night, and the night is one of the map's whole ones if that was its last. */
export function lighted(kept: LampsKept, me: string, map: LampMap, post: number, hands: readonly string[], full: boolean, now: number): LampsKept {
  const night = nightOf(now);
  if (night === null) return kept;
  const flames = { ...kept.flames };
  delete flames[me];
  return {
    lit: [...kept.lit, { night, map, post, at: now, hands: [...hands] }], flames,
    full: full && !kept.full.some((f) => f.night === night && f.map === map) ? [...kept.full, { night, map, at: now }] : kept.full,
  };
}

/** Somebody named: who, and what they are called. */
export interface Named { id: string; name: string }
/** A post lit tonight as a page is told it: which, when, and the hands its flame came by, in the order it went through them. */
export interface LitTold { post: number; at: number; hands: Named[] }
/**
 * A map's lamps as a member is told them: the posts lit tonight; **the night's lighters, everybody whose hands a
 * flame that lit a post went through, in the order they first came, with no numbers and no ranking**; and how many
 * nights the village has lit every lamp of this map.
 */
export interface MapTold { lit: LitTold[]; lighters: Named[]; full: number }
/** The lamps as a member is told them: the night it is (null by day), each map's, and the flame I hold (the moment it dies, and how many hands it has been through). */
export interface LampsTold { night: number | null; maps: Record<LampMap, MapTold>; flame: { until: number; hands: number } | null }

/** What a member is told of the lamps at a moment. `name` says what somebody is called. */
export function told(kept: LampsKept, me: string, name: (id: string) => string, now: number): LampsTold {
  const night = nightOf(now), named = (id: string): Named => ({ id, name: name(id) });
  const maps = {} as Record<LampMap, MapTold>;
  for (const map of LAMP_MAPS) {
    const rows = night === null ? [] : kept.lit.filter((l) => l.night === night && l.map === map);
    // (the order they first came: by the moment of the first post they had a hand in, then by that post's number, then as the flame went)
    const first = [...rows].sort((a, b) => a.at - b.at || a.post - b.post), seen = new Set<string>(), lighters: Named[] = [];
    for (const l of first) for (const id of l.hands) if (!seen.has(id)) { seen.add(id); lighters.push(named(id)); }
    maps[map] = {
      lit: [...rows].sort((a, b) => a.post - b.post).map((l) => ({ post: l.post, at: l.at, hands: l.hands.map(named) })),
      lighters, full: kept.full.filter((f) => f.map === map).length,
    };
  }
  const mine = kept.flames[me];
  return { night, maps, flame: alive(mine, now) ? { until: mine.until, hands: mine.hands.length } : null };
}

/** The lamps as a keeper was told them, made sound: null for what is no telling of them (a database that has not had its file answers nothing). */
export function lampsOf(v: unknown): LampsTold | null {
  const t = v as Partial<LampsTold> | null;
  if (!t || typeof t !== "object" || !t.maps || typeof t.maps !== "object" || Array.isArray(t.maps)) return null;
  const names = (list: unknown): Named[] => (Array.isArray(list) ? list : []).flatMap((h: Partial<Named> | null) => (h && typeof h.id === "string" ? [{ id: h.id, name: typeof h.name === "string" ? h.name : "" }] : []));
  const maps = {} as Record<LampMap, MapTold>;
  for (const map of LAMP_MAPS) {
    const raw = (t.maps as Partial<Record<LampMap, Partial<MapTold> | null>>)[map], seen = new Set<number>();
    const lit = (Array.isArray(raw?.lit) ? raw.lit : []).flatMap((l: Partial<LitTold> | null) => {
      const post = Number(l?.post);
      if (!l || !Number.isInteger(post) || post < 0 || post >= postsOf(map) || seen.has(post)) return [];
      seen.add(post);
      return [{ post, at: Number.isFinite(Number(l.at)) ? Number(l.at) : 0, hands: names(l.hands) }];
    }).sort((a, b) => a.post - b.post);
    const full = Number(raw?.full);
    maps[map] = { lit, lighters: names(raw?.lighters), full: Number.isFinite(full) && full > 0 ? Math.floor(full) : 0 };
  }
  const f = t.flame, until = Number(f?.until), hands = Number(f?.hands);
  return {
    night: typeof t.night === "number" && Number.isInteger(t.night) ? t.night : null, maps,
    flame: f && typeof f === "object" && Number.isFinite(until) && until > 0 ? { until, hands: Number.isInteger(hands) && hands > 0 ? hands : 1 } : null,
  };
}

/* ── tired hands: a button held, never a board ───────────────────────────── */

/**
 * **How long the button is held to light a post, in seconds**: none with stamina (a press, and it is lit); a little
 * over a second with none left. The button fills as it is held; let go of early, nothing is done and nothing is
 * lost; held to the end the post is lit, always: a flame that was alive when the hold began is good until its end
 * (`light`). **No board at any stamina, nothing to be quick at, nothing that can fail** (the owner, 2026-10-08).
 */
export const holdFor = (spent: boolean): number => (spent ? LAMPS.hold : 0);

/* ── what the night looks like ───────────────────────────────────────────── */

/**
 * **How much of the night has come out on a map**, by how many of its posts are lit: nothing more than each lamp's
 * own light (0), from four (1: fireflies along the lane, and over the stream), from eight (2: the farm's pumpkins
 * glow from within, glowing mushrooms line the trail), and with every one lit (3, "คืนโคมเต็ม": sky lanterns rise
 * from every post and the well's water gives the light back; the great tree's lights drift out along the trail and
 * the waterfall glows).
 */
export const tierOf = (n: number, of: number): 0 | 1 | 2 | 3 => (of > 0 && n >= of ? 3 : n >= LAMPS.more[1] ? 2 : n >= LAMPS.more[0] ? 1 : 0);

/**
 * Which of how it is done is to be done now (0 to 2): take a flame at the fire; walk it, or hand it on; light a post
 * that is dark. What the strip over the buttons and the board both light.
 */
export const stepOf = (flame: boolean, byPost: boolean): 0 | 1 | 2 => (!flame ? 0 : byPost ? 2 : 1);

/* ── whom a page offers ──────────────────────────────────────────────────── */

/** Somebody on the map, as a page has them: where, whether they are walking, what they hold in the hand, what they carry in both hands, the flame they bear (the moment it dies), and what the room says of them besides. */
export interface Bearer { id: string; name: string; x: number; y: number; moving: boolean; hold: string | null; carry?: string | null; flame?: number | null; away?: boolean; spent?: boolean }
/** What somebody close by lacks to be handed a flame: they bear one already, they have a thing in the hand, they carry a stone, or they are walking. */
export type Lack = "held" | "hand" | "stone" | "walking";

/** How far a point is from a map's fire, as the path goes. */
export const toFire = (p: Vec, map: LampMap) => { const [x, y] = LAMPS.maps[map].fire; return between(p, { x: x + 0.5, y: y + 0.5 }); };

/**
 * Whom the flame in my hands can be handed on to from where I stand, and, when there is nobody, who stands close by
 * and what they lack (as the bucket line and the bridge offer: lib/town/line's `takers`).
 *
 * - **Offered**: everybody within reach who stands still with empty hands. Those further from the fire than I am
 *   come first, the furthest first: that is the way a flame goes. Then the others, the nearest to me first.
 *   `OFFER.most` at the most.
 * - **Lacking**, only when nobody is offered: the nearest within `OFFER.beside`, with what they lack.
 */
export function takers(me: string, at: Vec, people: readonly Bearer[], map: LampMap, now: number): { offered: Bearer[]; lacks: { who: Bearer; why: Lack } | null } {
  const mine = toFire(at, map), onward: Array<[Bearer, number]> = [], others: Array<[Bearer, number]> = [];
  let lacking: [Bearer, number, Lack] | null = null;
  for (const p of people) {
    if (p.id === me) continue;
    const far = between(at, p);
    if (far > Math.max(LAMPS.reach, OFFER.beside)) continue;
    const why: Lack | null = (p.flame ?? 0) > now ? "held" : p.carry ? "stone" : p.hold ? "hand" : p.moving ? "walking" : null;
    if (!why && far <= LAMPS.reach) { const f = toFire(p, map); if (f > mine) onward.push([p, -f]); else others.push([p, far]); }
    else if (why && far <= OFFER.beside && (!lacking || far < lacking[1] || (far === lacking[1] && p.id < lacking[0].id))) lacking = [p, far, why];
  }
  const nearest = (a: [Bearer, number], b: [Bearer, number]) => a[1] - b[1] || (a[0].id < b[0].id ? -1 : 1);
  const offered = [...onward.sort(nearest), ...others.sort(nearest)].slice(0, OFFER.most).map(([p]) => p);
  return { offered, lacks: offered.length || !lacking ? null : { who: lacking[0], why: lacking[2] } };
}

/** The unlit post of a map nearest a tile and near enough to light from it, by its number: none (-1) where there is none. */
export function postBy(map: LampMap, at: readonly [number, number] | null, lit: readonly number[]): number {
  let best = -1, far = Infinity;
  if (!at) return best;
  LAMPS.maps[map].posts.forEach((tile, i) => {
    if (lit.includes(i) || !byTile(at, tile)) return;
    const d = Math.hypot(tile[0] - at[0], tile[1] - at[1]);
    if (d < far) { far = d; best = i; }
  });
  return best;
}
