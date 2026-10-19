/**
 * Everything a keeper does with animals, as one pure step: the page's trial runs it, and the database's town_animals
 * (v291) is the same, case for case. The rules it stands on are lib/town/animals.ts; the design is
 * docs/plans/animals/README.md.
 *
 * Only an animal's owner collects, breeds, sells, names or moves it ("การเก็บผลผลิตต้องเป็นเจ้าของสัตว์ถึงจะเก็บได้").
 * Somebody the owner allows may pet it, give it a treat and put food in its trough, for helpers points (30 a day at the
 * most). Nothing here makes an animal grow at once ("จะไม่มีของที่ทำให้โตทันที แต่มีของเร่งโตได้").
 */
import {
  ANIMALS, ANY_FEED, BREED, DAWN_BOOSTS, DEW_GROW, OFFERINGS, SPECIES, SPECIES_IDS, adultAt, breedAt, breedOf, crossOf,
  feeOf, freePlace, heartsOf, kindOf, mayCare, newHerd, rangeOf, realOf, rollOf, scoreOf, sellBackOf, settle, stageOf,
  starterOf, stepKey, stepsOf, unitsOf, LEAST_SECS, MEADOW, bandOf, findOf, forageAt,
  type Animal, type Book, type Ctx, type GateLog, type Herd, type Place, type Play, type SpeciesId,
} from "./animals";
import { put, roomFor, take, held, type Purse } from "./trade";
import { dayOf, spend, staminaOf } from "./stamina";
import { HOUR } from "./trade";
import type { ItemId } from "./items";
import { FORAGE_BANDS } from "./animal-items";
import { useGift, works, hasThing, wearing, type CharmId, type ThingId } from "./gifts";

/** The gifts of the line, by rank (lib/town/gifts' MORE_ lists hold them). */
export const ANIMAL_GIFTS = {
  bell: "charmHerdBell", cat: "thingBarnCat", bottle: "thingWarmBottle", collar: "charmStarCollar", cradle: "thingCradle",
  ram: "famCloudRam", twin: "thingTwinCradle", harp: "thingHarp", wind: "thingSpringWind", wagon: "thingHayWagon",
} as const;

/** A run of the hay wagon: who called it, when it set off, its stops in order (a map's stop each), and who rides. */
export interface WagonRun { id: string; by: string; from: number; stops: string[]; riders: Array<{ who: string; on: number; leg: number }> }
/** A gift's hour that others share: spring wind (owners on the farm in it) and the pasture harp (those near). */
export interface Spell { kind: "wind" | "harp"; by: string; from: number; until: number; who?: string[] }

export interface AnimalWorld {
  animals: Animal[];
  herds: Herd[];
  gate: GateLog;
  /** Who first bred each breed, and when. */
  found: Record<string, { by: string; at: number }>;
  spells: Spell[];
  wagons: WagonRun[];
}

export type AnimalInput =
  | { action: "look" }
  | { action: "buy"; species: SpeciesId }
  | { action: "shop"; item: string; n: number }
  | { action: "keeping" }
  | { action: "facade" }
  | { action: "sell"; id: string }
  | { action: "name"; id: string; name: string }
  | { action: "move"; id: string; place: Place }
  | { action: "feed"; id: string; item: string; grade?: 0 | 1 | 2 | 3 }
  | { action: "pet"; id: string }
  | { action: "treat"; id: string; item: string }
  | { action: "collect"; id: string; play?: Play | null; cracked?: number }
  | { action: "pick"; id: string; spot: number }
  | { action: "breed"; a: string; b: string; offering: string | null; dawn?: string | null }
  | { action: "lend"; id: string; to: string | null; mins?: number }
  | { action: "cradle"; id: string }
  | { action: "care"; care: Herd["care"]; carers: string[] }
  | { action: "gate"; open: boolean }
  | { action: "enter" }
  | { action: "wind" }
  | { action: "harp"; near: string[] }
  | { action: "wagon"; stops: string[] }
  | { action: "ride"; run: string; leg: number }
  | { action: "rode"; run: string }
  | { action: "forage"; spot: number };

export type AnimalWhy =
  | "none" | "theirs" | "coins" | "room" | "places" | "stage" | "hungry" | "nothing" | "spent" | "stamina" | "rest"
  | "hearts" | "species" | "offering" | "gift" | "used" | "lent" | "far" | "name" | "soon" | "full";

/** What a step did that is written down: the line's points (`animals`) or the helpers' (`helpers`), and what for. */
export interface AnimalNote { what: string; n: number; line?: "animals" | "helpers"; pts?: number; doc?: Record<string, unknown> }

export interface AnimalReply {
  ok: boolean;
  why?: AnimalWhy;
  world: AnimalWorld;
  purse: Purse;
  notes: AnimalNote[];
  /** What a collection, a cross or the cradle came to, for the page to tell. */
  got?: { find?: ItemId | null; item?: ItemId; n?: number; grades?: number[]; whole?: boolean; child?: string; first?: boolean; right?: boolean; clue?: boolean; spot?: [number, number] };
}

/** Where eggs laid out on the meadow lie: a spot of the pasture, picked from the animal and the round (the page's world.ts puts the pasture's tiles in order). */
export type SpotOf = (seed: number) => [number, number];

export interface Env {
  me: string;
  now: number;
  /** A roll in [0, 1): the database's own, or Math.random in the trial. */
  rand: () => number;
  /** A new animal's id. */
  newId: () => string;
  /** Where on the meadow a bird out may lay (lib/town/world's pasture). */
  spot: SpotOf;
  /** Whether I stand on the farm map now (spring wind's hour asks it of those who come in it). */
  onFarm?: boolean;
}

const herdOf = (w: AnimalWorld, owner: string): Herd => w.herds.find((h) => h.owner === owner) ?? newHerd(owner);
const withHerd = (w: AnimalWorld, h: Herd): AnimalWorld => ({ ...w, herds: [...w.herds.filter((x) => x.owner !== h.owner), h] });
const withAnimal = (w: AnimalWorld, a: Animal): AnimalWorld => ({ ...w, animals: w.animals.map((x) => (x.id === a.id ? a : x)) });
const ctxFor = (w: AnimalWorld, ownerPurse: Pick<Purse, "gifts"> | null): Ctx => ({ gate: w.gate, bottle: !!ownerPurse && hasThing(ownerPurse, ANIMAL_GIFTS.bottle as ThingId) });

/** A purse's book of the line's breeding (misses per step), made sound. */
export const bookOf = (p: Purse): Book => {
  const b = (p as Purse & { animalBook?: Book }).animalBook;
  return { misses: b && typeof b.misses === "object" ? { ...b.misses } : {} };
};
const withBook = (p: Purse, book: Book): Purse => ({ ...p, animalBook: book } as Purse);
/** Helpers points from animal care counted today, for the 30 a day. */
const careOf = (p: Purse, now: number) => {
  const c = (p as Purse & { animalCare?: { day: number; n: number } }).animalCare;
  return c && c.day === dayOf(now) ? c.n : 0;
};
const withCare = (p: Purse, now: number, n: number): Purse => ({ ...p, animalCare: { day: dayOf(now), n } } as Purse);

/** The feed an item is for a species: fed hours, or none. */
export function feedHours(species: SpeciesId, item: string): number {
  return (SPECIES[species].feeds as Record<string, number>)[item] ?? (SPECIES[species].sack === item ? 24 : (ANY_FEED as Record<string, number>)[item] ?? 0);
}
/** Whether an item is a speed-up feed for a species, and for how long. */
export function growFor(species: SpeciesId, item: string): number {
  return SPECIES[species].growItem === item ? ANIMALS.growFeed : item === DEW_GROW ? ANIMALS.dewFeed : 0;
}
/** What Uncle Popoto sells besides the animals, and for how much. */
export const POPOTO_SHOP: Record<string, number> = {
  ...Object.fromEntries(SPECIES_IDS.flatMap((sp) => [[SPECIES[sp].sack, SPECIES[sp].sackPrice], [SPECIES[sp].growItem, SPECIES[sp].growPrice]])),
  milker: 180, woolShears: 60, eggBasket: 24,
};
/** The tool each game asks for. */
export const TOOL_OF = { eggs: "eggBasket", shear: "woolShears", milk: "milker" } as const;

/**
 * One step. `purses`: the purses of others it may touch, by id (a friend whose animal is lent, the owner of an animal
 * cared for: only for their gifts, never written). The answer brings the world and my purse after it.
 */
export function animalAction(world: AnimalWorld, purse: Purse, input: AnimalInput, env: Env, purses: Record<string, Purse> = {}): AnimalReply {
  const { me, now } = env;
  const notes: AnimalNote[] = [];
  const no = (why: AnimalWhy): AnimalReply => ({ ok: false, why, world, purse, notes: [] });
  const yes = (w: AnimalWorld, p: Purse, got?: AnimalReply["got"]): AnimalReply => ({ ok: true, world: w, purse: p, notes, got });
  const ownerPurse = (owner: string) => (owner === me ? purse : purses[owner] ?? null);
  const settled = (a: Animal) => settle(a, now, ctxFor(world, ownerPurse(a.owner)));
  const find = (id: string) => world.animals.find((a) => a.id === id) ?? null;
  const mineOf = (id: string) => { const a = find(id); return a && a.owner === me ? settled(a) : null; };

  switch (input.action) {
    case "look": return yes(world, purse);

    case "buy": {
      const sp = SPECIES[input.species];
      if (!sp) return no("none");
      if (purse.coins < sp.price) return no("coins");
      const herd = herdOf(world, me), place = freePlace(herd, world.animals, "producing");
      if (!place) return no("places");
      const a: Animal = {
        id: env.newId(), owner: me, species: sp.id, breed: starterOf(sp.id).id, name: "", born: now, bought: true, place,
        at: now, food: 0, grown: 0, made: 0, banked: 0, hearts: 0, today: { day: dayOf(now) }, speedUntil: 0, windUntil: 0,
        narrow: 0, rest: 0, lent: null, outside: [], outBands: 0,
      };
      notes.push({ what: "animal_buy", n: 1, doc: { species: sp.id, coins: sp.price } });
      return yes(withHerd({ ...world, animals: [...world.animals, a] }, herd), { ...purse, coins: purse.coins - sp.price }, { child: a.breed });
    }

    case "shop": {
      const price = POPOTO_SHOP[input.item], n = Math.floor(input.n);
      if (!price || !(n >= 1 && n <= 99)) return no("none");
      if (purse.coins < price * n) return no("coins");
      if (roomFor(purse.bag, input.item as ItemId) < n) return no("room");
      notes.push({ what: "animal_shop", n, doc: { item: input.item, coins: price * n } });
      return yes(world, { ...purse, coins: purse.coins - price * n, bag: put(purse.bag, input.item as ItemId, n) });
    }

    case "keeping": {
      const herd = herdOf(world, me);
      let total = 0, step = 0;
      while (step < ANIMALS.keeping.length && total < herd.keeping) total += ANIMALS.keeping[step++][0];
      const next = total === herd.keeping ? ANIMALS.keeping[step] : undefined;
      if (!next) return no("full");
      if (purse.coins < next[1]) return no("coins");
      notes.push({ what: "animal_places", n: next[0], doc: { coins: next[1] } });
      return yes(withHerd(world, { ...herd, keeping: herd.keeping + next[0] }), { ...purse, coins: purse.coins - next[1] });
    }

    case "facade": {
      const herd = herdOf(world, me), price = ANIMALS.facades[herd.facade];
      if (price === undefined) return no("full");
      if (purse.coins < price) return no("coins");
      notes.push({ what: "animal_facade", n: herd.facade + 1, doc: { coins: price } });
      return yes(withHerd(world, { ...herd, facade: herd.facade + 1 }), { ...purse, coins: purse.coins - price });
    }

    case "sell": {
      const a = mineOf(input.id);
      if (!a) return no("theirs");
      if (stageOf(a, now) === "coming") return no("stage");
      const coins = sellBackOf(a);
      notes.push({ what: "animal_sell", n: 1, doc: { species: a.species, breed: a.breed, coins } });
      return yes({ ...world, animals: world.animals.filter((x) => x.id !== a.id) }, { ...purse, coins: purse.coins + coins });
    }

    case "name": {
      const a = mineOf(input.id), name = (input.name ?? "").trim().slice(0, 16);
      if (!a) return no("theirs");
      if (/[<>]/.test(name)) return no("name");
      return yes(withAnimal(world, { ...a, name }), purse);
    }

    case "move": {
      const a = mineOf(input.id);
      if (!a) return no("theirs");
      if (a.place === input.place) return yes(world, purse);
      const herd = herdOf(world, me), all = { producing: ANIMALS.places.producing, nursery: ANIMALS.places.nursery, keeping: herd.keeping };
      const used = world.animals.filter((x) => x.owner === me && x.place === input.place).length;
      if (!(input.place in all) || used >= all[input.place]) return no("places");
      return yes(withAnimal(world, { ...a, place: input.place }), purse);
    }

    case "feed": {
      const a0 = find(input.id);
      if (!a0) return no("none");
      const helper = a0.owner !== me;
      if (helper && !mayCare(herdOf(world, a0.owner), me)) return no("theirs");
      const a = settled(a0);
      if (stageOf(a, now) === "coming") return no("stage");
      const grade = input.grade ?? 0;
      const hours = feedHours(a.species, input.item), grow = growFor(a.species, input.item);
      if (!hours && !grow) return no("species");
      if (held(purse.bag, input.item as ItemId, grow ? undefined : grade) < 1) return no("nothing");
      let b: Animal = a;
      if (grow) {
        if (stageOf(a, now) === "adult") return no("stage");
        b = { ...a, speedUntil: Math.max(a.speedUntil, now) + grow };
      } else {
        if (a.food >= ANIMALS.trough - 0.01) return no("full");
        const add = Math.min(hours, ANIMALS.trough - a.food);
        b = { ...a, food: a.food + add, narrow: Math.max(a.narrow, ANIMALS.quality.narrowBy[grade] ?? 0) };
        if (helper) {
          const left = ANIMALS.care.cap - careOf(purse, now), pts = Math.min(left, Math.floor(add / ANIMALS.care.foodHours));
          if (pts > 0) { purse = withCare(purse, now, careOf(purse, now) + pts); notes.push({ what: "animal_care", n: 1, line: "helpers", pts, doc: { id: a.id, owner: a.owner, food: add } }); }
        } else if (!b.today.points?.feed) {
          b = { ...b, today: { ...b.today, points: { ...b.today.points, feed: true } } };
          notes.push({ what: "animal_feed", n: 1, line: "animals", pts: ANIMALS.points.feed, doc: { id: a.id } });
        }
      }
      const p = { ...purse, bag: take(purse.bag, input.item as ItemId, 1, grow ? undefined : grade) };
      return yes(withAnimal(world, b), p);
    }

    case "pet": case "treat": {
      const a0 = find(input.id);
      if (!a0) return no("none");
      const helper = a0.owner !== me;
      if (helper && !mayCare(herdOf(world, a0.owner), me)) return no("theirs");
      const a = settled(a0);
      if (stageOf(a, now) === "coming") return no("stage");
      const k = input.action;
      if (a.today[k]) return no("used");
      let p = purse;
      if (k === "treat") {
        const item = (input as { item: string }).item;
        if (!SPECIES[a.species].treats.includes(item as ItemId)) return no("species");
        if (held(p.bag, item as ItemId) < 1) return no("nothing");
        p = { ...p, bag: take(p.bag, item as ItemId, 1) };
      }
      let b: Animal = { ...a, hearts: Math.min(ANIMALS.hearts * ANIMALS.perHeart, a.hearts + ANIMALS.heart[k]), today: { ...a.today, [k]: true } };
      if (helper) {
        const left = ANIMALS.care.cap - careOf(p, now), pts = Math.min(left, ANIMALS.care[k]);
        if (pts > 0) { p = withCare(p, now, careOf(p, now) + pts); notes.push({ what: "animal_care", n: 1, line: "helpers", pts, doc: { id: a.id, owner: a.owner, [k]: true } }); }
      } else if (!b.today.points?.[k]) {
        b = { ...b, today: { ...b.today, points: { ...b.today.points, [k]: true } } };
        notes.push({ what: `animal_${k}`, n: 1, line: "animals", pts: ANIMALS.points[k], doc: { id: a.id } });
      }
      return yes(withAnimal(world, b), p);
    }

    case "collect": {
      const a = mineOf(input.id);
      if (!a) return no("theirs");
      if (stageOf(a, now) !== "adult") return no("stage");
      const sp = SPECIES[a.species];
      if (a.banked < 1) return no("nothing");
      const tool = TOOL_OF[sp.game];
      if (held(purse.bag, tool as ItemId) < 1) return no("nothing");
      const play = input.play ?? null;
      if (sp.game !== "eggs" && (!play || play.secs < LEAST_SECS[sp.game])) return no("soon");
      // eggs out on the meadow are not in the coop: those rounds are laid outside, for the owner to pick up
      let banked = a.banked, outside = a.outside;
      if (sp.game === "eggs" && a.outBands) {
        const out = Math.min(banked - 1, Math.floor(banked * ANIMALS.outsideShare + env.rand()));
        if (out > 0) { banked -= out; outside = [...outside, { at: env.spot(Math.floor(env.rand() * 1e9)), n: out }].slice(-6); }
      }
      const { units, whole } = unitsOf(sp.game, banked, play, input.cracked ?? 0);
      const st = ANIMALS.stamina[sp.game];
      const breed = breedOf(a.breed)!;
      const r = rangeOf(a), collar = wearing(purse, ANIMAL_GIFTS.collar as CharmId);
      const grades = Array.from({ length: units }, () => rollOf(r, env.rand(), collar));
      let p = spend(purse, st, now), bag = p.bag;
      const byGrade = [0, 0, 0, 0];
      for (const q of grades) byGrade[q >= 95 ? 3 : q >= 70 ? 2 : q >= 40 ? 1 : 0] += 1;
      for (let g = 0; g < 4; g++) if (byGrade[g] && roomFor(bag, breed.produce, g as 0 | 1 | 2 | 3) < byGrade[g]) return no("room");
      for (let g = 0; g < 4; g++) if (byGrade[g]) bag = put(bag, breed.produce, byGrade[g], g as 0 | 1 | 2 | 3);
      // a day's manure, at the first collection of the day
      if (!a.today.manure && roomFor(bag, "manure" as ItemId) > 0) bag = put(bag, "manure" as ItemId, 1);
      // a round it was out in may bring a find back with it (lib/town/animals FINDS)
      const find = findOf(a.species, a.outBands, env.rand(), env.rand());
      if (find && roomFor(bag, find) > 0) bag = put(bag, find, 1);
      p = { ...p, bag };
      const b: Animal = { ...a, banked: 0, narrow: 0, outside, outBands: 0, today: { ...a.today, manure: true } };
      notes.push({ what: "animal_collect", n: units, line: "animals", pts: units * ANIMALS.points.unit, doc: { id: a.id, breed: a.breed, item: breed.produce, grades: byGrade, whole, score: play ? scoreOf(play) : null } });
      return yes(withAnimal(world, b), p, { item: breed.produce, n: units, grades, whole, find });
    }

    case "pick": {
      const a = mineOf(input.id);
      if (!a) return no("theirs");
      const s = a.outside[input.spot];
      if (!s) return no("nothing");
      const breed = breedOf(a.breed)!, r = rangeOf(a), collar = wearing(purse, ANIMAL_GIFTS.collar as CharmId);
      let bag = purse.bag;
      const grades = Array.from({ length: s.n }, () => rollOf(r, env.rand(), collar));
      for (const q of grades) { const g = (q >= 95 ? 3 : q >= 70 ? 2 : q >= 40 ? 1 : 0) as 0 | 1 | 2 | 3; if (roomFor(bag, breed.produce, g) < 1) return no("room"); bag = put(bag, breed.produce, 1, g); }
      notes.push({ what: "animal_pick", n: s.n, line: "animals", pts: s.n * ANIMALS.points.unit, doc: { id: a.id, item: breed.produce } });
      return yes(withAnimal(world, { ...a, outside: a.outside.filter((_, i) => i !== input.spot) }), { ...purse, bag }, { item: breed.produce, n: s.n, grades, spot: s.at });
    }

    case "lend": {
      const a = mineOf(input.id);
      if (!a) return no("theirs");
      const mins = Math.max(5, Math.min(120, input.mins ?? 60));
      return yes(withAnimal(world, { ...a, lent: input.to ? { to: input.to, until: now + mins * 60_000 } : null }), purse);
    }

    case "breed": {
      const a = mineOf(input.a), b0 = find(input.b);
      if (!a || !b0 || a.id === b0.id) return no("none");
      const borrowed = b0.owner !== me;
      if (borrowed && !(b0.lent && b0.lent.to === me && b0.lent.until > now)) return no("lent");
      const b = settled(b0);
      if (stageOf(a, now) !== "adult" || stageOf(b, now) !== "adult") return no("stage");
      if (a.species !== b.species) return no("species");
      if (a.hearts < ANIMALS.breedHearts || b.hearts < ANIMALS.breedHearts) return no("hearts");
      if (a.rest > now || b.rest > now) return no("rest");
      const ba = breedOf(a.breed)!, bb = breedOf(b.breed)!;
      const offering = input.offering ?? null, dawn = input.dawn && DAWN_BOOSTS.includes(input.dawn as ItemId) ? input.dawn : null;
      if (offering && held(purse.bag, offering as ItemId) < 1) return no("offering");
      if (dawn && held(purse.bag, dawn as ItemId) < (dawn === offering ? 2 : 1)) return no("offering");
      const x = crossOf(ba, bb, offering, !!dawn), fee = feeOf(x.target, ba, bb);
      if (purse.coins < fee) return no("coins");
      const herd = herdOf(world, me), place = freePlace(herd, world.animals, "nursery");
      if (!place) return no("places");
      const hit = x.right && env.rand() * 100 < x.odds;
      const child = hit ? x.target! : env.rand() < 0.5 ? ba : bb;
      const sp = SPECIES[a.species];
      const born = now + ANIMALS.hatch[sp.kind];
      const mk = (owner: string, pl: Place): Animal => ({
        id: env.newId(), owner, species: a.species, breed: child.id, name: "", born, bought: false, place: pl,
        at: born, food: 0, grown: 0, made: 0, banked: 0, hearts: 0, today: { day: dayOf(born) }, speedUntil: 0, windUntil: 0,
        narrow: 0, rest: 0, lent: null, outside: [], outBands: 0,
      });
      let w: AnimalWorld = { ...world, animals: [...world.animals, mk(me, place)] };
      // the twin cradle (rank 7): a cross with a friend's animal gives a baby to its owner too, once a day
      let twin = false;
      let p: Purse = purse;
      if (borrowed && works(p, ANIMAL_GIFTS.twin)) {
        const used = useGift(p, ANIMAL_GIFTS.twin, now);
        const theirPlace = used.ok ? freePlace(herdOf(w, b.owner), w.animals, "nursery") : null;
        if (used.ok && theirPlace) { p = used.purse; w = { ...w, animals: [...w.animals, mk(b.owner, theirPlace)] }; twin = true; }
      }
      const rest = now + ANIMALS.rest;
      w = withAnimal(withAnimal(w, { ...a, rest }), { ...b, rest, lent: borrowed ? null : b.lent });
      let bag = p.bag;
      if (offering) bag = take(bag, offering as ItemId, 1);
      if (dawn) bag = take(bag, dawn as ItemId, 1);
      p = { ...p, coins: p.coins - fee, bag };
      // the book: a miss at a step counts towards its clue; a first breed is the village's to know whose
      let first = false, clue = false;
      if (x.step && !hit) {
        const book = bookOf(p), k = stepKey(a.species, x.step.child), n = (book.misses[k] ?? 0) + 1;
        book.misses[k] = n; clue = n >= ANIMALS.clueAfter; p = withBook(p, book);
      }
      if (hit && !w.found[child.id]) { first = true; w = { ...w, found: { ...w.found, [child.id]: { by: me, at: now } } }; }
      notes.push({ what: "animal_breed", n: 1, line: "animals", pts: ANIMALS.points.breed + (first ? ANIMALS.points.found : 0), doc: { a: a.breed, b: b.breed, offering, dawn, child: child.id, hit, twin, fee } });
      return yes(w, p, { child: child.id, first, right: x.right, clue });
    }

    case "cradle": {
      const a = mineOf(input.id);
      if (!a) return no("theirs");
      if (stageOf(a, now) !== "adult") return no("stage");
      const herd = herdOf(world, me), place = freePlace(herd, world.animals, "nursery");
      if (!place) return no("places");
      const used = useGift(purse, ANIMAL_GIFTS.cradle, now);
      if (!used.ok) return no(used.why === "spent" ? "spent" : "gift");
      const reals = realOf(a.species);
      const breed = env.rand() < ANIMALS.cradleRare ? reals[Math.floor(env.rand() * reals.length) % reals.length] : breedOf(a.breed)!;
      const c: Animal = {
        id: env.newId(), owner: me, species: a.species, breed: breed.id, name: "", born: now, bought: false, place,
        at: now, food: 0, grown: 0, made: 0, banked: 0, hearts: 0, today: { day: dayOf(now) }, speedUntil: 0, windUntil: 0,
        narrow: 0, rest: 0, lent: null, outside: [], outBands: 0,
      };
      notes.push({ what: "animal_cradle", n: 1, line: "animals", pts: ANIMALS.points.cradle, doc: { id: a.id, child: breed.id } });
      return yes({ ...world, animals: [...world.animals, c] }, used.purse, { child: breed.id });
    }

    case "care": {
      const herd = herdOf(world, me);
      const carers = [...new Set(input.carers.filter((x) => typeof x === "string" && x !== me))].slice(0, 20);
      if (!["none", "named", "anybody"].includes(input.care)) return no("none");
      return yes(withHerd(world, { ...herd, care: input.care, carers }), purse);
    }

    case "gate": {
      const last = world.gate[world.gate.length - 1];
      const open = !!last && last[1] === null;
      if (open === input.open) return yes(world, purse);
      // settle everybody's animals to this moment first: the gate changes how fast their troughs go
      const animals = world.animals.map((a) => settle(a, now, ctxFor(world, ownerPurse(a.owner))));
      const gate: GateLog = input.open ? [...world.gate, [now, null] as const].slice(-64) : world.gate.map((g, i) => (i === world.gate.length - 1 ? ([g[0], now] as const) : g));
      notes.push({ what: "animal_gate", n: input.open ? 1 : 0 });
      return yes({ ...world, animals, gate }, purse);
    }

    case "enter": {
      // coming onto the farm: the barn cat's pets (rank 2), and spring wind's gifts if one blows (rank 9's, anybody's)
      let w = world, p = purse;
      const mine = w.animals.filter((a) => a.owner === me);
      if (works(p, ANIMAL_GIFTS.cat)) {
        const used = useGift(p, ANIMAL_GIFTS.cat, now);
        if (used.ok) {
          p = used.purse;
          for (const a0 of mine) {
            const a = settled(a0);
            if (stageOf(a, now) === "coming" || a.today.pet) continue;
            w = withAnimal(w, { ...a, hearts: Math.min(ANIMALS.hearts * ANIMALS.perHeart, a.hearts + ANIMALS.heart.pet), today: { ...a.today, pet: true } });
          }
        }
      }
      const wind = w.spells.find((s) => s.kind === "wind" && s.from <= now && now < s.until);
      if (wind) {
        for (const a0 of w.animals.filter((a) => a.owner === me)) {
          const a = settle(a0, now, ctxFor(w, p));
          if ((a.today as { wind?: boolean }).wind || stageOf(a, now) === "coming") continue;
          let b: Animal = { ...a, today: { ...a.today, wind: true } as Animal["today"] };
          if (stageOf(a, now) === "adult") {
            if (a.place === "producing" && a.made > 0 && a.banked < SPECIES[a.species].bank) b = { ...b, made: 0, banked: a.banked + 1 };
          } else b = { ...b, windUntil: wind.until };
          w = withAnimal(w, b);
        }
      }
      return yes(w, p);
    }

    case "wind": case "harp": {
      const id = input.action === "wind" ? ANIMAL_GIFTS.wind : ANIMAL_GIFTS.harp;
      const used = useGift(purse, id, now);
      if (!used.ok) return no(used.why === "spent" ? "spent" : "gift");
      const mins = input.action === "wind" ? ANIMALS.wind.mins : ANIMALS.harp.mins;
      const spell: Spell = { kind: input.action, by: me, from: now, until: now + mins * 60_000, ...(input.action === "harp" ? { who: [...new Set([me, ...input.near])].slice(0, 30) } : {}) };
      const spells = [...world.spells.filter((s) => s.until > now - 6 * HOUR), spell];
      notes.push({ what: `animal_${input.action}`, n: 1 });
      return yes({ ...world, spells }, used.purse);
    }

    case "wagon": {
      const used = useGift(purse, ANIMAL_GIFTS.wagon, now);
      if (!used.ok) return no(used.why === "spent" ? "spent" : "gift");
      const stops = input.stops.filter((x) => typeof x === "string").slice(0, 3);
      if (!stops.includes("farm") || stops.length < 2) return no("none");
      const run: WagonRun = { id: env.newId(), by: me, from: now, stops, riders: [] };
      notes.push({ what: "animal_wagon", n: 1, doc: { stops } });
      return yes({ ...world, wagons: [...world.wagons.filter((r) => r.from > now - DAY_MS), run] }, used.purse);
    }

    case "ride": {
      const run = world.wagons.find((r) => r.id === input.run);
      if (!run || now > wagonEnds(run)) return no("none");
      if (run.riders.some((r) => r.who === me)) return yes(world, purse);
      const run2 = { ...run, riders: [...run.riders, { who: me, on: now, leg: Math.max(0, Math.floor(input.leg)) }] };
      return yes({ ...world, wagons: world.wagons.map((r) => (r.id === run.id ? run2 : r)) }, purse);
    }

    case "rode": {
      const run = world.wagons.find((r) => r.id === input.run), rider = run?.riders.find((r) => r.who === me);
      if (!run || !rider) return no("none");
      // two legs ridden: a leg is the wagon's way from one stop to the next, at its own pace
      const legMs = (ANIMALS.wagon.mins * 60_000) / Math.max(1, run.stops.length);
      if (now < rider.on + ANIMALS.wagon.legs * legMs - 1000) return no("soon");
      const k = `wagon:${dayOf(now)}`;
      if ((purse as Purse & { animalRode?: string }).animalRode === k) return no("used");
      let w = world;
      for (const a0 of w.animals.filter((a) => a.owner === me)) {
        const a = settled(a0);
        if (stageOf(a, now) === "coming") continue;
        w = withAnimal(w, { ...a, hearts: Math.min(ANIMALS.hearts * ANIMALS.perHeart, a.hearts + ANIMALS.wagonHeart) });
      }
      notes.push({ what: "animal_rode", n: 1, doc: { run: run.id } });
      return yes(w, { ...purse, animalRode: k } as Purse);
    }
    case "forage": {
      const spot = Math.floor(input.spot);
      if (!(spot >= 0 && spot < MEADOW.spots)) return no("none");
      const day = dayOf(now), band = bandOf(now), key = day * 8 + band;
      const taken = (purse as Purse & { meadow?: { k: number; spots: number[] } }).meadow;
      const spots = taken && taken.k === key ? taken.spots : [];
      if (spots.includes(spot)) return no("used");
      const item = forageAt(FORAGE_BANDS, day, band, spot);
      if (!item) return no("nothing");
      if (roomFor(purse.bag, item) < 1) return no("room");
      const p = { ...spend(purse, MEADOW.stamina, now), bag: put(purse.bag, item, 1), meadow: { k: key, spots: [...spots, spot] } } as Purse;
      notes.push({ what: "animal_forage", n: 1, line: "animals", pts: MEADOW.points, doc: { item, spot, band } });
      return yes(world, p, { item, n: 1 });
    }
  }
  return no("none");
}

const DAY_MS = 24 * HOUR;
/** When a wagon's tour is done. */
export const wagonEnds = (run: WagonRun) => run.from + ANIMALS.wagon.mins * 60_000;
/** Where along its tour a wagon is: which leg and how far into it (0..1). */
export function wagonAt(run: WagonRun, now: number): { leg: number; part: number; done: boolean } {
  const legs = Math.max(1, run.stops.length), legMs = (ANIMALS.wagon.mins * 60_000) / legs, t = Math.max(0, now - run.from);
  const leg = Math.min(legs - 1, Math.floor(t / legMs));
  return { leg, part: Math.min(1, (t - leg * legMs) / legMs), done: now >= wagonEnds(run) };
}

/** What the page shows of an animal now: settled, its stage, hearts, the range and how far each clock has run. */
export function viewOf(a: Animal, now: number, ctx: Ctx) {
  const s = settle(a, now, ctx), sp = SPECIES[s.species], stage = stageOf(s, now), g = sp.grow;
  return {
    animal: s, stage, hearts: heartsOf(s), range: rangeOf(s),
    grown: stage === "adult" ? 1 : stage === "young" ? (s.grown - g[0]) / g[1] : stage === "baby" ? s.grown / g[0] : 0,
    round: stage === "adult" && s.banked < sp.bank ? s.made / sp.cycle : s.banked >= sp.bank ? 1 : 0,
    food: s.food, hungry: s.food <= 0 && stage !== "coming", ready: s.banked,
    adultIn: stage === "adult" ? 0 : Math.max(0, adultAt(s.species) - s.grown),
  };
}
export { BREED, OFFERINGS, kindOf, stepsOf, breedAt };
