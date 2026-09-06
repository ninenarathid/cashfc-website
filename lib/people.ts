import type { BoardData } from "@/lib/types";
import { allGuestIds, guestHome } from "@/lib/guest-data";

/**
 * Somebody who can be searched for, tagged, or credited with a picture.
 *
 * Not a Member: a name, a face and the id their page is at, which is all any
 * of the pickers ever wanted from the roster.
 */
export interface PersonOption {
  id: number;
  name: string;
  avatar: string | null;
  /** Verified, with a page, and not in the Free Company. */
  guest?: boolean;
}

/**
 * Everybody with a page on this site — the roster and the guests together.
 *
 * Every list you could type a name into was built from members.json, which is
 * the FC roster and nothing else. A guest is somebody who verified a character
 * the roster does not contain: they have a page, a portrait, their parses and
 * their clears, they show up on the member board and on the leaderboards — and
 * they could not be found by the search box, tagged in a photograph, or
 * credited with one. Six people who exist everywhere except in the one place
 * you go to look somebody up.
 *
 * Roster first, so an empty search still opens on the FC, and guests after.
 * Anybody who has joined since the file was written is dropped rather than
 * listed twice: guests.json is a nightly sweep and the roster is the authority
 * on who is in the company.
 *
 * Both files are read on the server and only this array crosses to the browser
 * — members.json alone is 800 KB, and what a picker needs from it is 12.
 */
export function everyone(data: BoardData): PersonOption[] {
  const roster = data.members.map((m) => ({
    id: m.id, name: m.name, avatar: m.avatar ?? null,
  }));
  const inFc = new Set(roster.map((m) => m.id));

  const guests: PersonOption[] = [];
  for (const id of allGuestIds()) {
    if (inFc.has(id)) continue;
    const home = guestHome(id);
    // A guest the sweep has an id for but no name yet verified in the last few
    // hours. A row reading "—" is not something anybody can search for.
    if (!home?.name) continue;
    guests.push({ id, name: home.name, avatar: home.portrait ?? null, guest: true });
  }

  return [...roster, ...guests];
}
