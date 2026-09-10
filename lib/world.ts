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
