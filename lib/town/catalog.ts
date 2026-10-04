import { COOKING, COOKWARE_IDS, NOT_PUT_IN, ODD, RECIPE_IDS, needsOf, tidy } from "./cooking";
import { DEAL } from "./deal";
import { BEDS, BLADES, FARMING, TREE_PICKS, WATER, toolOf } from "./farm";
import { FIGHT, NIBBLES_APART, STRIKE } from "./fishing";
import { CARRIES, FIELD, KITCHEN_GEAR, ROD_IDS, TACKLE } from "./gear";
import { HINT_IDS, HINT_PRICE } from "./hints";
import {
  BAITS, BOWL, BUFFS, BUFF_HOURS, CROPS, CROP_IDS, DISHES, DISH_IDS, FISH, FISH_IDS, FLOTSAM, FLOTSAM_IDS, ITEMS, ITEM_IDS, KEPT_BAITS, MAKES, SCROLLS, STAGE_AT, TIER_WEIGHT,
  inBowl, type ItemId,
} from "./items";
import { BASIC, ORDER, UNLOCKS, mayAsk, sourcesAt } from "./orders";
import { INSIDE, foundScrolls } from "./scrolls";
import { STAMINA } from "./stamina";
import { GOODS, RULES } from "./trade";
import { BEDS_IN_FARM, COLS, FARM, ROWS, WELL, bedCorner, bedOf, fishFrom } from "./world";

/**
 * What the database is told of the game: the numbers its functions decide by.
 *
 * The rules of Cash Town are the pure functions of this folder, and the
 * database's functions are the same rules written again in SQL (the owner,
 * 2026-10-03: "DB ตามที่คุณเสนอ ทุกอย่าง": the database decides every number, the
 * browser is believed only about how a mini-game went). Two copies of a rule
 * can drift, so they are held together twice: the SQL reads its numbers from
 * a table seeded with exactly what is here (`town_catalog`, a document to a
 * key), and each migration's dry run feeds the same cases to both copies and
 * wants the same answers (lib/town/db-vectors, .claude/skills/fc-cash-town/
 * scripts/db).
 *
 * Only what the database's rules read is here: no names, no pictures' lines,
 * nothing of how a fight feels. Each migration seeds the keys it needs
 * (`catalogFor`), and a key once seeded is the database's to keep: an admin
 * changes a number there, and a migration run again does not put it back.
 */

/** The first count of the uncle's opened things at which something holds, given that it never stops holding once it does; −1 when it never does. */
function firstStage(holds: (stage: number) => boolean): number {
  for (let s = 0; s <= UNLOCKS.length; s++) if (holds(s)) return s;
  return -1;
}

/** What he may ask for of a kind, in the list's own order, each with the stage it can first be asked for at. */
function asks(kind: "fish" | "crop" | "made"): Array<[ItemId, number]> {
  return mayAsk(UNLOCKS.length)[kind].map((id) => [id, firstStage((s) => mayAsk(s)[kind].includes(id))]);
}

/** How many plots a bed has along a side: counted along the first bed's first row. */
function bedSide(): number {
  const [x, y] = bedCorner(0);
  let n = 0;
  while (bedOf(x + n, y) === 0) n++;
  return n;
}

/** The whole catalog, a document to a key. */
export function catalogOf() {
  return {
    /** Every thing: its kind, its tier, how many stack in a slot, what the uncle's relatives pay. */
    items: Object.fromEntries(ITEM_IDS.map((id) => [id, { kind: ITEMS[id].kind, tier: ITEMS[id].tier, stack: ITEMS[id].stack, pays: ITEMS[id].pays }])),
    /** What the stall sells: its price, its stock a round for the village, how many one person may buy a round. */
    goods: GOODS,
    /** What is on the shelf from the first day, and what the orders open, in order. */
    shelf: { basic: BASIC, unlocks: UNLOCKS },
    /** The bag's first slots, the hours of the uncle's rounds, the hour a day begins. */
    rules: { slots: RULES.slots, rounds: RULES.rounds, dawn: STAMINA.dawn },
    /** What is worn to carry more: the slots each adds. */
    carries: CARRIES,
    /** The uncle's order: how many he wants of each kind of thing, and what he may ask for from which stage. */
    order: { n: ORDER.n, asks: { fish: asks("fish"), crop: asks("crop"), made: asks("made") } },
    /** His hints: the price by tier, and each thing there is a hint of, in the order they are sold, with the stage it can first be made at. */
    hints: { price: HINT_PRICE, ids: HINT_IDS.map((id): [ItemId, number] => [id, firstStage((s) => sourcesAt(s).has(id))]) },
    /** Stamina and meals: the gauge, a meal's minutes, what company adds, the meals' hours, how long a buff lasts, and how much each buff is. */
    stamina: {
      max: STAMINA.max, minutes: STAMINA.minutes, together: STAMINA.together, company: STAMINA.company, meals: STAMINA.meals, hours: BUFF_HOURS,
      buffs: Object.fromEntries(Object.entries(BUFFS).map(([id, b]) => [id, b.by])),
    },
    /** Every dish: the stamina a helping gives, the buff it leaves, and its recipe (what goes in, in what, how many helpings, how many cooks). */
    dishes: Object.fromEntries(DISH_IDS.map((id) => [id, { stamina: DISHES[id].stamina, buff: DISHES[id].buff ?? null, recipe: DISHES[id].recipe ?? null }])),
    /** The dish each scroll has written on it. */
    scrolls: SCROLLS,
    /** Every fish: how rare, which baits it takes and how readily, its hours, what rain does, how long it waits, how long it is, what a fight with it costs and how much line there is to win. */
    fish: Object.fromEntries(FISH_IDS.map((id) => [id, {
      tier: FISH[id].tier, baits: FISH[id].baits, hours: FISH[id].hours, rain: FISH[id].rain, wait: FISH[id].wait, size: FISH[id].size,
      effort: FISH[id].fight.effort, line: FISH[id].fight.line,
    }])),
    /** What comes up that is no fish. */
    flotsam: FLOTSAM,
    /**
     * Fishing's own numbers: the fish and what is no fish in the order they are weighed, how often each tier bites,
     * what goes on a hook, which baits are not eaten, the rods, what each float adds to the strike's moment, the
     * strike's moment itself and what having no stamina leaves of it, how far apart two twitches of the float are,
     * how fast line is won; and what the database alone needs: how much the two clocks may differ by when a strike
     * is judged (`slack`, milliseconds: a strike is early only if it comes that long before the bite, and late
     * only that long after its moment), the least share of the quickest possible fight a landing is believed after,
     * and the seconds after which a line still out is given up. Last, where a line can be dropped from: each tile,
     * and whether its water is deep.
     */
    fishing: {
      fish: FISH_IDS, flotsam: FLOTSAM_IDS, tiers: TIER_WEIGHT, baits: BAITS, kept: KEPT_BAITS, rods: ROD_IDS,
      floats: Object.fromEntries(Object.entries(TACKLE).filter(([, t]) => t!.strike).map(([id, t]) => [id, t!.strike])),
      strike: STRIKE.window, spent: STAMINA.spent.strike, apart: NIBBLES_APART, reel: FIGHT.reel,
      slack: { early: 300, late: 1500 }, least: 0.5, longest: 900,
      places: Object.fromEntries(Array.from({ length: COLS * ROWS }, (_, i): [number, number] => [i % COLS, Math.floor(i / COLS)])
        .flatMap(([x, y]) => { const f = fishFrom(x, y); return f ? [[`${x},${y}`, f.deep] as [string, boolean]] : []; })),
    },
    /** Every vegetable: its seed, the hours from sowing to ripe, how many a picking gives (least and most), and, for one that bears again, the hours until it is ripe again and how many times it is picked in all. */
    crops: Object.fromEntries(CROP_IDS.map((id) => [id, { seed: CROPS[id].seed, hours: CROPS[id].hours, yield: CROPS[id].yield, again: CROPS[id].again ?? null, picks: CROPS[id].picks ?? 1 }])),
    /**
     * The farm's own numbers: what each deed costs in stamina; what a watering adds and how often; how much faster a
     * fed plant grows; the hours the other fertiliser covers; the pests' hours, their chance and how long they take
     * to kill; how many swings of the hoe a plot takes; what a dead plant leaves; how far through its hours a plant
     * is when each stage begins; what each thing does in the hand, and which vegetable each seed grows; what a
     * better can adds; the blades that pick one more, and how many pickings make a tree; what the cans and buckets
     * hold, and the well; what carrying water costs; how long a bed is kept, and how many one person may hold; and
     * where things are: each bed's corner tile, how many plots it has along a side, and the well's tile. Last, what
     * the database alone needs: the most misses of the hoe it counts against stamina in one go (what a browser says
     * of its own game is believed, within bounds).
     */
    farming: {
      costs: FARMING.costs, water: FARMING.water, feed: FARMING.feed, guard: FARMING.guard, pests: FARMING.pests, swings: FARMING.swings, pulled: FARMING.pulled,
      stages: STAGE_AT,
      tools: Object.fromEntries(ITEM_IDS.flatMap((id) => { const kind = toolOf(id); return kind ? [[id, kind] as [ItemId, string]] : []; })),
      seeds: Object.fromEntries(CROP_IDS.map((id) => [CROPS[id].seed, id])),
      field: FIELD, blades: BLADES, tree: TREE_PICKS,
      cans: WATER.cans, buckets: WATER.buckets, well: WATER.well, chores: WATER.costs, beds: BEDS,
      bedsAt: Array.from({ length: BEDS_IN_FARM }, (_, bed) => bedCorner(bed)), side: bedSide(), wellAt: [WELL.x, WELL.y],
      misses: 30,
    },
    /** What else is made, at the yard or by hand: what goes in, in what, and how many come of it. */
    makes: MAKES,
    /**
     * The kitchen's own numbers: what a dish costs to begin; how many stirs it takes (so many, and one for each kind
     * of thing); how many kinds go in at most; what a ladle adds; how many pots one person may leave standing about;
     * how near a pot one stands to ladle from it (and from one on a rattan table); the odd dish (which it is, and how
     * its helpings are counted); how many misses by a recipe's last thing before it says what that thing looks like.
     * Then, in order (a document's keys keep none): everything there is a recipe for, as the code looks through them;
     * and what each takes, tidied (each kind once), for telling whether some things are exactly a recipe's.
     * The cookware; what better cookware multiplies; the kinds of thing that are never put in; what a helping is
     * ladled into, and the dishes that are eaten out of one. What may hold a scroll: how often, and which scrolls, in
     * the order one is drawn from. Where a pot may be set down: the town's tiles and the farm's. Last, what the
     * database alone needs: the most misses of the ladle it counts in one go.
     */
    cooking: {
      cost: COOKING.cost, stirs: COOKING.stirs, kinds: COOKING.kinds, ladle: COOKING.ladle, pots: COOKING.pots, reach: COOKING.reach, tok: COOKING.tok,
      odd: COOKING.odd, oddDish: ODD, clue: COOKING.clue,
      recipes: RECIPE_IDS, needs: Object.fromEntries(RECIPE_IDS.map((id) => [id, Object.fromEntries(tidy(needsOf(id)))])), cookware: COOKWARE_IDS, gear: KITCHEN_GEAR, never: NOT_PUT_IN, bowl: BOWL, bowled: DISH_IDS.filter(inBowl),
      inside: Object.fromEntries(Object.entries(INSIDE).map(([id, x]) => [id, { chance: x!.chance, scrolls: foundScrolls(x!.tiers) }])),
      map: { town: [COLS, ROWS], farm: [FARM.x, FARM.y, FARM.w, FARM.h] },
      misses: 30,
    },
    /**
     * Deals between two members: how many kinds of thing one side may lay out, and how near the two stand to open one
     * (the room's to know). And what the database alone needs: the seconds an open deal may lie untouched before it
     * is off (so that nobody is kept from dealing by a deal they never answered), and the seconds a deal that has
     * ended is still told to its two sides, so that each sees how it ended.
     */
    deals: { kinds: DEAL.kinds, near: DEAL.near, idle: 600, shown: 10 },
  };
}
export type Catalog = ReturnType<typeof catalogOf>;

/**
 * The rows of `town_catalog` each migration that has not run yet writes: none, today. v106 seeded items, goods,
 * shelf, rules, carries, order and hints; v107 stamina, dishes and scrolls; v108 fish, flotsam and fishing; v109
 * wrote seven of those over; v110 seeded crops and farming; v111 makes and cooking, and wrote items, goods, shelf,
 * order and hints over again (for the things that went with the dirty pot); v112 seeded deals; v113 wrote rules over
 * (a bag begins with ten slots); v116 wrote crops and farming over (a bigger harvest, a lighter hoe). All of them have run (v111 to v113 and v116 on 2026-10-04), so every row is the database's now, and the files are the record of what ran, not
 * to be written again.
 *
 * v117 (ran 2026-10-04) wrote nine over: the scroll of how the cure for pests is made, on the shelf from the first
 * day (items, goods, shelf, scrolls); the cure made of what that shelf grows (makes, cooking), so that it can be
 * asked for and hinted at from the first day too (order, hints); and the strike's moment with no stamina left
 * (fishing).
 *
 * v118 (ran 2026-10-04) wrote items over: an old boot and an old chest, which fetched nothing, fetch 3 coins and 20
 * (the same file gave the town its weather and let rain water the plots: tables and functions, no other row).
 *
 * v120 (ran 2026-10-05) wrote three over, for fishing as he asked for it on the game's second night: the strike's
 * moment with no stamina left is 0.6 of its length again, where v117 made it 0.3 (fishing: few fished with none, it
 * was too hard); and a bite comes in half the time (fish and flotsam: every `wait` halved).
 *
 * A seed adds a row only where there is none (`keys`: so that a number an admin changed outlives the file being run
 * twice). What the code itself changes after a row was seeded has to be written over it by the next migration
 * (`over`): name that migration here with the rows it writes, and `TOWN_WRITE=1 npx vitest run
 * lib/town/catalog.test.ts` writes its block; the ordinary test then fails whenever the block and the code differ.
 * **Changing any number the catalog carries (a price, a recipe, a thing) needs such a migration before it is true in
 * the database.**
 */
export const CATALOG_KEYS: Record<string, { keys: Array<keyof Catalog>; over: Array<keyof Catalog> }> = {};

/** One document as text the SQL editor takes: its top entries a line each, so that a change shows as the lines that changed. */
function lines(doc: unknown): string {
  if (Array.isArray(doc) || typeof doc !== "object" || doc === null) return JSON.stringify(doc);
  const entries = Object.entries(doc as Record<string, unknown>);
  return `{\n${entries.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n  }`;
}

/** The seed a migration carries: the rows of `town_catalog` it adds, and those it writes over, as SQL. Between the two marked lines of its file. */
export function seedFor(version: string): string {
  const all = catalogOf() as Record<string, unknown>;
  const { keys, over } = CATALOG_KEYS[version];
  const insert = (list: string[], then: string) => (list.length ? [
    `insert into public.town_catalog (key, data) values`,
    list.map((key) => `  ('${key}', $town$${lines(all[key])}$town$::jsonb)`).join(",\n"),
    then,
  ] : []);
  return [
    `-- <catalog:${version}> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)`,
    ...insert(keys, `  on conflict (key) do nothing;`),
    ...insert(over, `  on conflict (key) do update set data = excluded.data, updated_at = now();`),
    `-- </catalog:${version}>`,
  ].join("\n");
}
