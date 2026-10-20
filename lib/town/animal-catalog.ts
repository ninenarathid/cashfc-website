/**
 * The catalog's row `animals` (v291): everything public.town_animals reads, from the rules the page plays by, so that
 * the two cannot drift (lib/town/catalog.ts writes it into the migration; animals.db test holds the SQL to animal-act).
 */
import {
  ANIMALS, ANY_FEED, BREEDS, DAWN_BOOSTS, DEW_GROW, FINDS, FIND_ODDS, FLOWERS, GRAPH, LEAST_SECS, MEADOW, MINERALS, OFFERINGS, SPECIES,
  SPECIES_IDS, starterOf,
} from "./animals";
import { ANIMAL_GIFTS, POPOTO_SHOP, TOOL_OF } from "./animal-act";
import { ANIMAL_GRADED, FAMILY, FARM_FAMILY, FORAGE_BANDS } from "./animal-items";
import { EGG_SPOTS, WAGON_STOPS } from "./pasture";

export function animalsRow() {
  return {
    knobs: ANIMALS,
    species: Object.fromEntries(SPECIES_IDS.map((id) => {
      const s = SPECIES[id];
      return [id, { price: s.price, grow: s.grow, cycle: s.cycle, bank: s.bank, game: s.game, kind: s.kind, sack: s.sack, sackPrice: s.sackPrice,
        growItem: s.growItem, growPrice: s.growPrice, feeds: s.feeds, treats: s.treats, bredBack: s.bredBack }];
    })),
    starters: Object.fromEntries(SPECIES_IDS.map((id) => [id, starterOf(id).id])),
    breeds: Object.fromEntries(BREEDS.map((b) => [b.id, { species: b.species, letter: b.letter, tier: b.tier, produce: b.produce }])),
    graph: GRAPH,
    offerings: OFFERINGS,
    kinds: { mineral: MINERALS, flower: FLOWERS },
    dawn: DAWN_BOOSTS,
    finds: FINDS,
    findOdds: FIND_ODDS,
    meadow: MEADOW,
    forage: FORAGE_BANDS,
    eggSpots: EGG_SPOTS,
    wagonStops: WAGON_STOPS,
    shop: POPOTO_SHOP,
    tools: TOOL_OF,
    gifts: ANIMAL_GIFTS,
    anyFeed: ANY_FEED,
    dewGrow: DEW_GROW,
    leastSecs: LEAST_SECS,
    produce: BREEDS.map((b) => b.produce),
    graded: ANIMAL_GRADED,
    family: FAMILY,
    farmFamily: FARM_FAMILY,
  };
}
