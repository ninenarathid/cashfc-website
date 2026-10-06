import { BOX } from "./box";
import { giftsRow } from "./gifts";
import { linesRow } from "./line-points";
import { COOKING, COOKWARE_IDS, NOT_PUT_IN, ODD, RECIPE_IDS, needsOf, tidy } from "./cooking";
import { DEAL } from "./deal";
import { DITCH } from "./ditch";
import { BEDS, BLADES, FARMING, HOES, TREE_PICKS, WATER, toolOf } from "./farm";
// ── gifts: farming ──
import { HOURGLASS } from "./farm";
import { FIGHT, NIBBLES_APART, SIGNS, STRIKE } from "./fishing";
import { FORAGING, KINDS, SPOTS } from "./forest";
import { HEAT } from "./heat";
import { CARRIES, FIELD, KITCHEN_GEAR, ROD_IDS, TACKLE } from "./gear";
import { GROUND, GROUND_MAPS } from "./ground";
import { HINT_IDS, HINT_PRICE } from "./hints";
import { BUGS, BUG_IDS, COMEBACK, HAUNTS, HAUNT_KINDS, LURES, NET, NETS, SCARCE } from "./insects";
import { JAR } from "./jar";
import { LINE } from "./line";
import {
  BAITS, BOWL, BUFFS, BUFF_HOURS, BUFF_LEVELS, BUFF_STEPS, CROPS, CROP_IDS, DISHES, DISH_IDS, FISH, FISH_IDS, FLOTSAM, FLOTSAM_IDS, ITEMS, ITEM_IDS, KEPT_BAITS, MAKES, SCROLLS, STAGE_AT, TIER_WEIGHT,
  inBowl, type ItemId,
} from "./items";
import { BASIC, ORDER, UNLOCKS, mayAsk, sourcesAt } from "./orders";
import { INSIDE, insideOf } from "./scrolls";
import { STAMINA } from "./stamina";
import { THANKS } from "./thanks";
import { GOODS, RULES } from "./trade";
import { WATERS } from "./waters";
import { WELL_BOOK } from "./well";
import { BEDS_IN_FARM, COLS, FARM, KITCHEN, ROWS, STOREBOX, WELL, asBuilt, bedCorner, bedOf, fishFrom } from "./world";
import { YARD } from "./yard";

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
    hints: { price: HINT_PRICE, ids: HINT_IDS.map((id): [ItemId, number] => [id, firstStage((s) => sourcesAt(s, true).has(id))]) },
    /** Stamina and meals: the gauge, a meal's minutes, what company adds, the meals' hours, how long a buff lasts, and how much each buff is. */
    stamina: {
      max: STAMINA.max, minutes: STAMINA.minutes, together: STAMINA.together, company: STAMINA.company, meals: STAMINA.meals, hours: BUFF_HOURS,
      buffs: Object.fromEntries(Object.entries(BUFFS).map(([id, b]) => [id, b.by])),
      // (since v146: the helpings a meal's hours take, and what a meal's buff does at each of its levels; `buffs` is
      // each one's first, as it always was, for whatever still reads it)
      bowls: STAMINA.bowls, levels: BUFF_LEVELS, steps: BUFF_STEPS,
    },
    /** Every dish: the stamina a helping gives, the buff it leaves, and its recipe (what goes in, in what, how many helpings, how many cooks). */
    dishes: Object.fromEntries(DISH_IDS.map((id) => [id, { stamina: DISHES[id].stamina, buff: DISHES[id].buff ?? null, recipe: DISHES[id].recipe ?? null }])),
    /** The dish each scroll has written on it. */
    scrolls: SCROLLS,
    /**
     * Every fish: how rare, which baits it takes and how readily, its hours, what rain does, how long it waits, how
     * long it is, what a fight with it costs and how much line there is to win; and, for one that says so, what a dry
     * sky does (`dry`), the water it keeps to (`water`) and the signs it waits for (`needs`).
     */
    fish: Object.fromEntries(FISH_IDS.map((id) => [id, {
      tier: FISH[id].tier, baits: FISH[id].baits, hours: FISH[id].hours, rain: FISH[id].rain, wait: FISH[id].wait, size: FISH[id].size,
      effort: FISH[id].fight.effort, line: FISH[id].fight.line,
      ...(FISH[id].dry === undefined ? {} : { dry: FISH[id].dry }), ...(FISH[id].water ? { water: FISH[id].water } : {}), ...(FISH[id].needs ? { needs: FISH[id].needs } : {}),
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
      // what some fish wait for (lib/town/fishing's SIGNS): how many others' lines make a crowd and how lately dropped,
      // the minutes after rain, the days either side of a full moon, the weekend's days
      signs: SIGNS,
      // (with the deck finished, whatever is shown where this is asked: lib/town/world's asBuilt)
      places: asBuilt(() => Object.fromEntries(Array.from({ length: COLS * ROWS }, (_, i): [number, number] => [i % COLS, Math.floor(i / COLS)])
        .flatMap(([x, y]) => { const f = fishFrom(x, y); return f ? [[`${x},${y}`, f.deep] as [string, boolean]] : []; }))),
    },
    /** Every vegetable: its seed, the hours from sowing to ripe, how many a picking gives (least and most), and, for one that bears again, the hours until it is ripe again and how many times it is picked in all. */
    crops: Object.fromEntries(CROP_IDS.map((id) => [id, { seed: CROPS[id].seed, hours: CROPS[id].hours, yield: CROPS[id].yield, again: CROPS[id].again ?? null, picks: CROPS[id].picks ?? 1 }])),
    /**
     * The farm's own numbers: what each deed costs in stamina; what a watering adds and how often; how much faster a
     * fed plant grows; the hours the other fertiliser covers, how often each cover that eats pests takes off one
     * that is there (`rids`), and the hours each cure that keeps pests off afterwards does (`cures`); the pests' hours, their chance, how long they take
     * to kill, and what the farm's own insects add to that chance (`pests.swarm`); how many swings of the hoe a plot takes; what a dead plant leaves; how far through its hours a plant
     * is when each stage begins; what each thing does in the hand, and which vegetable each seed grows; what a
     * better can adds; the blades that pick one more, and how many pickings make a tree; what the cans and buckets
     * hold, and the well; what carrying water costs; how long a bed is kept, and how many one person may hold; and
     * where things are: each bed's corner tile, how many plots it has along a side, and the well's tile. Last, what
     * the database alone needs: the most misses of the hoe it counts against stamina in one go (what a browser says
     * of its own game is believed, within bounds).
     */
    farming: {
      costs: FARMING.costs, water: FARMING.water, feed: FARMING.feed, guard: FARMING.guard, rids: FARMING.rids, cures: FARMING.cures, pests: FARMING.pests, swings: FARMING.swings, pulled: FARMING.pulled,
      stages: STAGE_AT,
      tools: Object.fromEntries(ITEM_IDS.flatMap((id) => { const kind = toolOf(id); return kind ? [[id, kind] as [ItemId, string]] : []; })),
      seeds: Object.fromEntries(CROP_IDS.map((id) => [CROPS[id].seed, id])),
      field: FIELD, blades: BLADES, tree: TREE_PICKS,
      cans: WATER.cans, buckets: WATER.buckets, well: WATER.well, chores: WATER.costs, beds: BEDS,
      bedsAt: Array.from({ length: BEDS_IN_FARM }, (_, bed) => bedCorner(bed)), side: bedSide(), wellAt: [WELL.x, WELL.y],
      misses: 30,
      // ── gifts: farming ── what the farming line's gifts go by, beyond each one's own number (the gifts' row): the hours an hourglass runs, and how many turnings a plant remembers
      gifted: { glass: { hours: HOURGLASS.hours, kept: HOURGLASS.kept } },
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
      // (`scrolls` is what may be inside, whatever it is: a fish's belly may hold a seed)
      inside: Object.fromEntries((Object.keys(INSIDE) as ItemId[]).map((id) => [id, { chance: INSIDE[id]!.chance, scrolls: insideOf(id) }])),
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
    /**
     * The forest (lib/town/forest): each kind of place (how its things are gathered, how many minutes its turn lasts,
     * the chance a turn has anything, how many may take from it, what it costs, and what it may have: each thing with
     * how often beside the others, how many, and what has to hold: `zones`, `hours`, `rain` within so many hours,
     * a `day` of its own, the full `moon`); the places themselves, by their number (kind, tile, part of the
     * forest); how near one stands; what a wrong one taken among mushrooms is, and how many at most; what digs. Last,
     * what the database alone needs: the most misses of a game it counts in one go.
     */
    forest: {
      kinds: KINDS,
      spots: SPOTS.map((s): [string, number, number, string] => [s.kind, s.x, s.y, s.zone]),
      reach: FORAGING.reach, decoy: FORAGING.decoy, decoys: FORAGING.decoys, hoes: HOES, misses: 30,
    },
    /**
     * Insects (lib/town/insects): each of them in the order they are weighed (its habit, the haunts it keeps to, how
     * often beside the others, how many a catch gives, what it costs, and what has to hold: `places`, `zones`,
     * `hours`, a `dry` sky, a `day` of its own, the full `moon`); each kind of haunt (its turn's minutes, the
     * chance of an insect, how many may catch it); the haunts themselves, by their number (kind, map, part of the
     * forest, perches); the net (how far it reaches, how far beyond that somebody may stand from a perch and still
     * have caught what is there, how many misses are counted); what catches, and what brings a beetle down; when one
     * comes back after a catch (`comeback`), and how a kind that is hunted grows scarce (`scarce`). How an
     * insect moves, and the net's ring, are the page's: the database is told of a catch, as of any game's end.
     */
    insects: {
      order: BUG_IDS,
      bugs: Object.fromEntries(BUG_IDS.map((id) => { const { size: _size, quick: _quick, tracks: _tracks, shy: _shy, like: _like, ...kept } = BUGS[id]; return [id, kept]; })),
      kinds: HAUNT_KINDS,
      haunts: HAUNTS.map((h): [string, string, string | null, Array<[number, number]>] => [h.kind, h.place, h.zone, h.perches.map((p): [number, number] => [p.x, p.y])]),
      net: { reach: NET.reach, far: NET.far, misses: NET.misses }, nets: NETS, lures: LURES,
      // an insect caught comes back at another haunt of its map: how many seconds after, and how many its turn there must have left
      comeback: { after: COMEBACK.after, least: COMEBACK.least },
      // hunted, a kind grows scarce: the hours a catch counts against it for, less with each, and how many counting halve it
      scarce: { day: SCARCE.day, half: SCARCE.half },
    },
    /** The well's book (lib/town/well): the bucketfuls poured, all told, at which each rank begins; what the well has for whoever reaches a rank; how many of a day's carriers it lists. */
    well: { ranks: WELL_BOOK.ranks, gifts: WELL_BOOK.gifts, listed: WELL_BOOK.listed },
    /** Thanks (lib/town/thanks): how many the board lists. */
    thanks: { listed: THANKS.listed },
    /** The jar at the well (lib/town/jar): how many waterings a bucketful poured counts as when it is shared, and the kinds of thing it takes. */
    jar: { bucket: JAR.bucket, kinds: JAR.kinds },
    /** A hot afternoon (lib/town/heat): the hours of the day it can be hot in, the skies it is hot under, and how much more a watering does then. */
    heat: { from: HEAT.from, to: HEAT.to, skies: HEAT.skies, by: HEAT.by },
    /** A bucket poured over a bed (lib/town/ditch): how many plants a bucketful waters, and the stamina it costs. */
    ditch: { plants: DITCH.plants, cost: DITCH.cost },
    /**
     * The cooking yard's water jar (lib/town/yard): how many bucketfuls it holds, the helpings more a pot cooked with
     * its water has, what pouring into it costs, the cookware whose dishes take no water; and what the database
     * alone needs, the tiles one stands on to pour into it (the same wherever this is asked: the yard's own picture
     * says where the jar stands, finished or not).
     */
    yard: { holds: YARD.holds, gives: YARD.gives, cost: YARD.cost, dry: YARD.dry, at: asBuilt(() => KITCHEN.wash.map(([x, y]): [number, number] => [x, y])) },
    /** A bucket line (lib/town/line): how far apart two may stand for water to be handed on (the page's to hold to: the database knows where nobody stands), what handing on costs, and how many of the hands the water went through are remembered. */
    line: { reach: LINE.reach, cost: LINE.cost, hands: LINE.hands },
    /** Waters that differ (lib/town/waters): the hours the dew is drawn in, the hours of a night for the moon's (a night the moon is full, by `fishing.signs`), the minutes a bucketful keeps the well's nature and at most, and what a watering has more under each. */
    waters: { dawn: WATERS.dawn, night: WATERS.night, lasts: WATERS.lasts, most: WATERS.most, adds: WATERS.adds, guards: WATERS.guards },
    /** The storage box in the plaza (lib/town/box): the slots a member's has for nothing, how near it one stands to use it, and the tile it stands on. */
    box: { slots: BOX.slots, reach: BOX.reach, at: [STOREBOX.x, STOREBOX.y] },
    /** The lines of work (lib/town/lines, line-points): every ladder's marks and day's bound, and what each thing is worth on its line. */
    work: linesRow(),
    /** The gifts of the lines' ranks (lib/town/gifts): the places for charms, and of each gift its kind, the rank that gives it, and its number. */
    gifts: giftsRow(),
    /** Things dropped on the ground (lib/town/ground): the seconds one lies before it is gone, how near it one stands to pick it up, and the maps one may be dropped on, each as the box of its tiles. */
    ground: { lasts: GROUND.lasts, reach: GROUND.reach, maps: GROUND_MAPS },
  };
}
export type Catalog = ReturnType<typeof catalogOf>;

/**
 * The rows of `town_catalog` each migration that has not run yet writes: v122's ten, today. v106 seeded items, goods,
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
 * v122 (ran 2026-10-05) wrote ten over, for the twenty fish the owner asked for on 2026-10-05, each found its own way
 * and each good for something of its own: the fish and what they wait for (fish, fishing), the things they and what
 * is made of them are (items), what they are eaten and cooked as (dishes, scrolls, cooking), what is made of three of
 * them by hand (makes), the three that are put on a plant (farming), and what the uncle may ask for and hint at
 * (order, hints). With them the rule of what takes a bait was written again (`town.odds`: a fish's water, a dry sky,
 * the signs), which is why the code went out before the file: a page built before cannot draw a fish it has not
 * heard of.
 *
 * v127 (ran 2026-10-05) seeded `well` and wrote two over, for the members who carry water for the others (the owner,
 * 2026-10-05): what the well's book counts by (well), the two yokes the well gives its carriers (items) and how many
 * bucketfuls each carries (farming).
 *
 * v129 (ran 2026-10-05) seeded `thanks` and `jar`: how many the board of thanks lists, and what the jar at the well counts a
 * bucketful as and takes.
 *
 * v130 (ran 2026-10-05) seeded `heat`, `ditch` and `yard`, for the same members' third round: a hot afternoon's hours and
 * what a watering does in them, what a bucket poured over a bed waters and costs, and the cooking yard's water jar.
 * And it wrote three over, for their last round, a water cart (lib/town/cart): the thing (items), the six
 * bucketfuls it carries (farming), and the rank the well gives it at (well). Whole rows, made from the tree at the
 * push (it ran after v131, which had written `items` over too: whoever replays them keeps that order).
 *
 * v132 (ran 2026-10-05) seeded `line`, for their fourth: how far water is handed on, what that costs, and how many hands a
 * bucketful remembers.
 *
 * v133 (ran 2026-10-05) seeded `waters`, for their fifth: when water has a nature, how long the well keeps it, and what a
 * watering has more under each.
 *
 * A seed adds a row only where there is none (`keys`: so that a number an admin changed outlives the file being run
 * twice). What the code itself changes after a row was seeded has to be written over it by the next migration
 * (`over`): name that migration here with the rows it writes, and `TOWN_WRITE=1 npx vitest run
 * lib/town/catalog.test.ts` writes its block; the ordinary test then fails whenever the block and the code differ.
 * **Changing any number the catalog carries (a price, a recipe, a thing) needs such a migration before it is true in
 * the database.**
 *
 * v125 (ran 2026-10-05) seeded two and wrote thirteen over, for the forest and the insects the owner asked for on
 * 2026-10-05: what the forest's places have and where they are (forest), the insects and their haunts (insects); the
 * things themselves, the net on the first day's shelf and its price (items, goods, shelf); what is cooked and made of
 * them, with a skewer as cookware and an insect never put in a pot (dishes, scrolls, makes, cooking); the insects
 * that go on a hook as a bait there already was (fish, flotsam, fishing) and on a plant (farming); and what the
 * uncle may ask for and hint at (order, hints).
 *
 * v126 (ran 2026-10-05) wrote one over, for something the owner asked of the ladybird on 2026-10-05: one caught has about one
 * chance in ten of taking a pest off some plant of the farm with it (`rids`), and it is out the whole of the day, as
 * the pests are (insects).
 *
 * v131 (ran 2026-10-05, after v126) wrote two over, for two more things he asked of the insects the same day: an insect caught
 * is one member's and gone for everybody, and comes back at another haunt a little later (insects: every kind's
 * `shares`, and `comeback`); and the common insects fetch about a third less, a common fish's worth for the stamina
 * (items: the `pays` of twelve of them).
 *
 * v134 (ran 2026-10-05) seeded `box`, for the storage box the owner asked for in the plaza that day: the slots a member's box has
 * for nothing, how near it one stands, and where it is. It wrote no row over: nothing that was seeded changed.
 *
 * v137 (ran 2026-10-05) seeded `ground`, for things dropped from the bag onto the ground, which he asked for the same day:
 * how long one lies, how near it one stands, and the maps as boxes of tiles. It wrote no row over either.
 *
 * v138 (ran 2026-10-05, 16:45) wrote one over, for what he asked of the ladybird that afternoon, with the village running after them: few of
 * them, and on every map (insects: the ladybird's `weight`, 6 for 60; no `places`; the others' `hours` and `dry` sky,
 * so that it is never the only insect of a haunt).
 *
 * v139 (ran 2026-10-05, 19:42) wrote it over again, for what he asked of every insect the same afternoon: the more of a kind are caught the
 * scarcer it is, and a day on it is as it was (insects: `scarce`, new).
 *
 * v145 (ran 2026-10-06, 19:54, after v146) wrote two over, for what he asked that day of the two insects that eat pests and of the cure: let go on a
 * plant that has a pest the insects are to work again, a ladybird half the time and a mantis seven times in ten, and
 * to keep nothing off afterwards (farming: `rids`, new; v140 had kept every cover off such a plant), where the pest
 * cure keeps pests off for a day after it has rid a plant (farming: `cures`, new); and there are to be twice as many
 * of the two insects (insects: the ladybird's `weight`, 13 for 6, and the mantis's, 50 for 22), hunted scarce as every
 * insect is.
 *
 * v147 (ran 2026-10-06, 20:16) wrote one over, for what he asked the same day of the pests: in an hour the farm was counted with insects on it
 * they strike a little oftener (farming: `pests.swarm`, new: how many are some and many, and what each adds).
 *
 * v149 (ran 2026-10-06, about 20:45) seeded one row, new, for the lines of work he asked for that day: the seven
 * lines, the marks of their ten ranks, a day's bound, and what each thing done is worth on its line (`work`).
 *
 * v151 (ran 2026-10-06, about 23:38) seeded one row, new, for the gifts of those ranks: the places for charms, and of
 * each gift its kind, the rank that gives it, and its number (`gifts`).
 *
 * v152 (ran 2026-10-07, about 01:58) wrote three over: the three familiars of the lines' second rank, what of a gift
 * is counted and the first charms' numbers as they were laid out anew (`gifts`); twice the uncle's two baits, a member's
 * share and his stock (`goods`: worm and dough, nothing else); and half the stamina a common fish's fight takes (`fish`).
 */
export const CATALOG_KEYS: Record<string, { keys: Array<keyof Catalog>; over: Array<keyof Catalog> }> = {
  // the gifts of ranks 1 to 6, as each line's are built (every row a line's rules change is named here when its file is put together)
  v153: { keys: [], over: ["gifts", "farming"] },
};

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
