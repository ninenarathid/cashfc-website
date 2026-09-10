import { guestHome } from "@/lib/guest-data";

/**
 * Which world somebody plays on, and the line you would type to message them.
 *
 * A tell needs a world because the game needs one: `/tell Name` only works if
 * they are standing on your own, and half the reason to look somebody up here
 * is that they are not.
 */

/**
 * The Free Company's world.
 *
 * Every member is on it — a member row has no "which world" field for exactly
 * that reason — and the same literal is already the last fallback on the member
 * page and its link card. Guests are the ones who vary, and guestHome is what
 * answers for them.
 *
 * A default rather than a fact: anywhere the real value is to hand, pass it.
 */
export const FC_WORLD = "Tonberry";

/** And the data centre it sits on, which is the other half of an address. */
export const FC_DC = "Elemental";

/**
 * The worlds, by data centre.
 *
 * Here because a hunt train, a FATE farm and a treasure night are arrangements
 * to be in a particular place, and since world visiting the place has two
 * halves: which world, and where on it. Somebody reading "Kozama'uka (12.4,
 * 30.1)" on a board full of people from one Free Company will assume Tonberry,
 * and the one night that assumption is wrong is the night somebody travels.
 *
 * Typed out rather than fetched. The list changes when Square Enix opens a
 * world, which is roughly once a year and always with an announcement — a
 * build-time fetch for something that stable is a moving part with nothing to
 * do. The physical data centres are here; the Korean and Chinese ones run on
 * their own clients and nobody on this board can travel to them.
 */
export const DATACENTRES: Record<string, string[]> = {
  // Japan, which is where this Free Company lives.
  Elemental: ["Aegis", "Atomos", "Carbuncle", "Garuda", "Gungnir", "Kujata",
              "Tonberry", "Typhon"],
  Gaia: ["Alexander", "Bahamut", "Durandal", "Fenrir", "Ifrit", "Ridill",
         "Tiamat", "Ultima"],
  Mana: ["Anima", "Asura", "Chocobo", "Hades", "Ixion", "Masamune",
         "Pandaemonium", "Titan"],
  Meteor: ["Belias", "Mandragora", "Ramuh", "Shinryu", "Unicorn", "Valefor",
           "Yojimbo", "Zeromus"],
  // North America.
  Aether: ["Adamantoise", "Cactuar", "Faerie", "Gilgamesh", "Jenova",
           "Midgardsormr", "Sargatanas", "Siren"],
  Primal: ["Behemoth", "Excalibur", "Exodus", "Famfrit", "Hyperion", "Lamia",
           "Leviathan", "Ultros"],
  Crystal: ["Balmung", "Brynhildr", "Coeurl", "Diabolos", "Goblin", "Malboro",
            "Mateus", "Zalera"],
  Dynamis: ["Cuchulainn", "Golem", "Halicarnassus", "Kraken", "Maduin",
            "Marilith", "Rafflesia", "Seraph"],
  // Europe.
  Chaos: ["Cerberus", "Louisoix", "Moogle", "Omega", "Phantom", "Ragnarok",
          "Sagittarius", "Spriggan"],
  Light: ["Alpha", "Lich", "Odin", "Phoenix", "Raiden", "Shiva", "Twintania",
          "Zodiark"],
  // Oceania.
  Materia: ["Bismarck", "Ravana", "Sephirot", "Sophia", "Zurvan"],
};

/** Which data centre a world is on, for a value that arrived without one. */
export const dcOf = (world: string | undefined | null): string | undefined =>
  Object.keys(DATACENTRES).find((dc) => DATACENTRES[dc].includes(world ?? ""));

export const worldOf = (
  characterId: number | null | undefined, fallback?: string | null,
): string =>
  (characterId != null ? guestHome(characterId)?.world : null)
  || fallback || FC_WORLD;

/**
 * The line, ready to paste into the game.
 *
 * Names go in as they are. The Lodestone spells a character exactly the way the
 * game does, including the apostrophes and hyphens that make Br'aax and
 * Toto-Rak awkward everywhere else, so anything this "tidied up" would be a
 * name the game does not recognise.
 */
export const tellCommand = (
  name: string, characterId?: number | null, world?: string | null,
): string => `/tell ${name}@${worldOf(characterId, world)}`;
