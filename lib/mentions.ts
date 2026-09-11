import type { PersonOption } from "@/lib/people";

/**
 * The people named in a message.
 *
 * "@Aqua Eleison can you bring food" names one person, and a name with a space
 * in it is most of the roster — so this cannot be "@ followed by a word". It
 * reads the roster instead: at every @, the longest name that actually fits is
 * the one meant, which is the only reading that tells "@Aqua" and "@Aqua
 * Eleison" apart when both are real people.
 *
 * Recorded when a message is sent rather than worked out when it is drawn,
 * because who is on the roster changes and a message means what it meant when
 * it was written. The drawing side uses the same matcher so the highlight and
 * the notification agree about which words were names.
 */

export interface Mention {
  /** Null for the room rather than a person. See EVERYONE. */
  id: number | null;
  name: string;
  /** Where the "@" is, and how far the whole thing runs. */
  at: number;
  len: number;
}

/**
 * The words that mean the whole party.
 *
 * Two spellings because this board is read in two languages and somebody
 * reaching for it is not going to switch first. "@everyone" is what everybody
 * who has used Discord types without thinking; "@ทุกคน" is what the sentence
 * around it is written in.
 *
 * It reaches the party and stops there. A shout that could be sent to five
 * hundred people by typing two words is a shout somebody eventually sends to
 * five hundred people.
 */
export const EVERYONE = ["everyone", "ทุกคน"] as const;

/**
 * Longest first, so "Aqua Eleison" is tried before "Aqua".
 *
 * Built once per call rather than per @: a message with six names in it would
 * otherwise sort five hundred people six times.
 */
const byLength = (people: PersonOption[]) =>
  [...people].sort((a, b) => b.name.length - a.name.length);

export function findMentions(
  text: string, people: PersonOption[],
): Mention[] {
  if (!text.includes("@") || !people.length) return [];
  const sorted = byLength(people);
  const lower = text.toLowerCase();
  const out: Mention[] = [];

  for (let i = text.indexOf("@"); i >= 0; i = text.indexOf("@", i + 1)) {
    // Not inside a word: an email address and a Discord handle both contain an
    // @ with something in front of it, and neither is naming anybody here.
    if (i > 0 && !/[\s(\[{>]/.test(text[i - 1])) continue;
    // The room first: nobody on the roster is called "everyone", but somebody
    // could be, and the room is what the word means when it is typed.
    const all = EVERYONE.find((w) => lower.startsWith(w, i + 1));
    if (all) {
      out.push({ id: null, name: text.slice(i + 1, i + 1 + all.length),
                 at: i, len: all.length + 1 });
      i += all.length;
      continue;
    }
    const found = sorted.find(
      (p) => lower.startsWith(p.name.toLowerCase(), i + 1));
    if (!found) continue;
    out.push({ id: found.id, name: found.name, at: i, len: found.name.length + 1 });
    // Past the whole name, so a name containing another name is read once.
    i += found.name.length;
  }
  return out;
}

/** Just the ids, deduplicated, which is what a message stores. */
export const mentionIds = (text: string, people: PersonOption[]): number[] =>
  [...new Set(findMentions(text, people)
    .map((m) => m.id).filter((id): id is number => id != null))];

/** Whether the message named the room, which is its own column. */
export const mentionsAll = (text: string, people: PersonOption[]): boolean =>
  findMentions(text, people).some((m) => m.id == null);

/**
 * What to put in the box when somebody presses reply.
 *
 * Their name and a space, unless it is already the first thing there — pressing
 * reply twice should not write the name twice, and somebody who has started
 * typing keeps what they wrote.
 */
export function withMention(draft: string, name: string): string {
  const tag = `@${name}`;
  if (draft.startsWith(tag)) return draft;
  return draft ? `${tag} ${draft}` : `${tag} `;
}
