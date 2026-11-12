import {
  KIND_COLOR, catalogue, coversSeat, endsAt, headcount, lootText,
  partyStatus, progressText, resolveParty, shortfallOf, spotText, worldText,
} from "@/lib/party";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { everyone } from "@/lib/people";
import type { ContentDef, Party, SlotRole } from "@/lib/party";
import { partySeeds } from "@/lib/party-seeds";

/**
 * The party board, as one Discord message.
 *
 * Written in Thai, because the FC reads the site in Thai and a board that
 * addresses them in another language is a board somebody has to translate
 * before they can decide whether to come.
 *
 * One message that edits itself rather than a post per party. A channel that
 * announces every seat becomes a channel people mute, and a muted channel is
 * worse than no channel — the parties would be there and nobody would see
 * them.
 *
 * Everything it says is worked out by the same functions the website uses:
 * headcount, needsByRole, partyStatus. Two renderers drifting apart is how a
 * board ends up advertising a seat the site knows is taken.
 */

const SITE = "https://cashfc-website.vercel.app";

/**
 * Which build drew the card, as part of its address.
 *
 * Discord keeps an embed's image for a year and only asks again when the URL
 * changes, so everything that can change the picture has to be in the URL. The
 * party's own state was in it from the start; the site that draws the card was
 * not, and the day three hundred duty banners landed every card in the channel
 * went on showing the version with no picture in it. A deploy can change how
 * the card looks, so a deploy changes its address.
 *
 * "dev" off Vercel, where there is no deployment and nothing cached.
 */
const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 7);

/**
 * Who is running it, by character id.
 *
 * Off the roster rather than out of the party's own members, because a lead
 * does not have to be in their own party — that was a whole bug once — and a
 * board reading the name off the seats would leave the emptiest parties
 * anonymous, which are exactly the ones somebody has to decide about.
 */
interface Lead { name: string; avatar: string | null }

const roster = (): Map<number, Lead> => {
  const out = new Map<number, Lead>();
  for (const q of everyone(raw as unknown as BoardData)) {
    out.set(q.id, { name: q.name, avatar: q.avatar });
  }
  return out;
};

/**
 * Where it is up to, in words.
 *
 * Once a coloured dot led and the word followed. The dots were emoji, and the
 * board now draws nothing that is not the game's own art or plain text
 * (the owner, 2026-11-12); the word was always the part to be sure of.
 */
const STATUS_WORD: Record<string, string> = {
  live: "กำลังเล่น", soon: "ใกล้เริ่ม", upcoming: "ยังรับอยู่",
  justEnded: "เพิ่งจบ", done: "จบแล้ว",
};

/** Discord allows ten embeds, and a select may offer twenty-five options. */
const MAX_EMBEDS = 9;

/**
 * When it starts, in words, for somewhere Discord will not do it for us.
 *
 * The <t:...> stamps render in a message and in an embed, and nowhere else —
 * inside a select option they come out as raw text. So the one place that
 * cannot use them gets this instead, in Bangkok time, which is where the FC
 * is and what the rest of the site shows.
 */
export function whenShort(iso: string, now = Date.now()): string {
  const at = new Date(iso).getTime();
  const mins = Math.round((at - now) / 60000);
  if (mins <= 0) return "กำลังเล่น";
  const clock = new Date(iso).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit",
  });
  if (mins < 60) return `${clock} · อีก ${mins} นาที`;
  if (mins < 24 * 60) return `${clock} · อีก ${Math.round(mins / 60)} ชม.`;
  const day = new Date(iso).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit",
  });
  return `${day} ${clock}`;
}

/** Unix seconds, which is what Discord's own clock formatting wants. */
const stamp = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

const byKey = (): Record<string, ContentDef> => {
  const out: Record<string, ContentDef> = {};
  for (const c of catalogue(partySeeds())) out[c.key] = c;
  return out;
};

/** The fight's own name, falling back to whatever the key says. */
const nameOf = (p: Party, defs: Record<string, ContentDef>) =>
  defs[p.contentKey]?.duty ?? defs[p.contentKey]?.name ?? p.contentKey;

/**
 * Which parties the board carries.
 *
 * Only what somebody could still act on: not deleted, not called off, and not
 * already over. A board listing last night is a board people stop reading.
 */
export function boardParties(all: readonly Party[], now = Date.now()): Party[] {
  return all
    .filter((p) => !p.endedAt)
    .filter((p) => new Date(endsAt(p)).getTime() > now)
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
}

/**
 * What is missing, as marks rather than as a sentence.
 *
 * "🛡️ 2 · 💚 1" is read at a glance where "ขาด 2 Tank · ขาด 1 Healer" has to
 * be read as words — and on a board somebody is scanning for somewhere to go,
 * glancing is the whole interaction.
 *
 * `words` for the dropdown, which cannot draw custom emoji in its description
 * line and would show the raw <:tank:123> text instead.
 */
function shortfall(p: Party): string {
  if (p.shape === "open") return "เปิดรับทุกคน";
  const cut = shortfallOf(p);
  if (!cut.total) return "เต็มแล้ว";
  const label: Record<string, string> = {
    tank: "Tank", healer: "Healer", dps: "DPS",
  };
  const say = (r: string) => label[r];

  const parts: string[] = [];
  for (const r of ["tank", "healer", "dps"] as SlotRole[]) {
    if (!cut.need[r]) continue;
    parts.push(`${cut.need[r]} ${say(r)}`);
  }
  /*
   * And the part the movers leave open, said as the choice it is.
   *
   * "🛡/💚 1" is one more person, either way round. It lines up with the seat
   * list above, which is where somebody reading it goes to find out which
   * chairs that means — five seats named, four people wanted, and the reason
   * printed between them.
   */
  if (cut.either) {
    const marks = cut.either.roles.map(say).join("/");
    parts.push(`${cut.either.n} ${marks}`);
  } else if (cut.spare) {
    // The remainder with no role safely attached to it. The seat list in the
    // field below says which chairs are going, which is the honest version of
    // what "any role" was trying to say.
    parts.push(`${cut.spare} คน`);
  }
  if (cut.free) parts.push(`${cut.free} คน`);
  return parts.join(" · ") || `${cut.total} คน`;
}

/** One party, as an embed. */
function embedFor(
  p: Party, defs: Record<string, ContentDef>, names: Map<number, Lead>,
  faces: Map<number, string>,
) {
  const def = defs[p.contentKey];
  const lead = names.get(p.ownerCharacterId);
  /*
   * The picture they chose, before the one the game took of them.
   *
   * Same order as everywhere else on the site: somebody who set their own
   * portrait is that portrait on the member board, in the seat grid and beside
   * their messages, and a board in another window showing their Lodestone
   * headshot would be the one place that disagreed about what they look like.
   */
  const face = faces.get(p.ownerCharacterId) ?? lead?.avatar ?? null;
  const { here, seats } = headcount(p);
  const status = partyStatus(p);
  const at = stamp(p.startsAt);

  /*
   * The chairs on offer, which include the ones somebody has offered to give
   * up. A party whose healer can tank has a healer seat; leaving it off this
   * line told every healer reading the board the opposite. See Resolved.
   */
  const res = resolveParty(p);
  const freeSeats = res.takeable.filter((sl) => !sl.free).map((sl) => sl.label);
  /*
   * And the sentence that stops the list over-promising.
   *
   * Five seats named and four people wanted is not a mistake: one of the five
   * is already somebody's, and she ends the night in one of the ones she can
   * play. Said in the same field as the list, because the list is what it
   * corrects — read apart it is a riddle, read together it is the ordinary
   * thing every static does five minutes before a pull.
   */
  /*
   * Everybody in it whose seat is not settled, in one list.
   *
   * Three things can be true of a member: they picked a seat and that is the
   * seat; they picked several and will end in one of them; or they have not
   * picked and will play whatever is left. The last two are the same state
   * wearing different numbers of options, and the first is what they both
   * become once one option is left — so they belong in one line, not two.
   *
   * Not "ยังไม่เลือกตำแหน่ง", which is wrong about all of them: flex is a
   * choice, not the absence of one. Somebody who ticked every DPS seat chose
   * four seats and has told the lead more than a person who ticked one, and
   * somebody who ticked none chose the widest offer there is. The seats each
   * of them named are printed beside their name, because this is the only
   * window with no grid to draw them on.
   *
   * It is also the other half of why the seat list above is longer than the
   * shortage: six chairs, two people already inside who will take two of
   * them, four people wanted.
   */
  /*
   * And not at all where no seat has a role to lock.
   *
   * A Bozja night or a map run is eight people and any job: nobody has a
   * position, so nobody's position is unsettled, and a line saying so would
   * be a heading over the obvious on the parties that need the fewest words.
   */
  const roled = res.takeable.some((sl) => !sl.free);
  const unsettled = (roled ? [...res.movers, ...res.loose] : []).map((f) => {
    const could = res.takeable.filter((sl) => coversSeat(f.flex, sl));
    return could.length === 0 || could.length === res.takeable.length
      ? `${f.name} (ทุกตำแหน่ง)`
      : `${f.name} (${could.map((sl) => sl.label).join(" · ")})`;
  });
  const extras = [
    progressText(p.progress),
    lootText(p.loot),
    spotText(p.spot),
    worldText(p.spot),
  ].filter(Boolean);

  /*
   * The board's own picture of the party (app/party/[id]/banner).
   *
   * Not the card a pasted link unfurls into: that one was drawn for a link
   * preview, and shrunk into a row of this board its type came out at ten
   * pixels. This one carries the picture, when, the roles still wanted as the
   * game's icons and how full it is, at a size that survives the shrink — so
   * the text below it no longer says any of that again (2026-11-12).
   *
   * The version in the query is what keeps it honest. Discord caches an image
   * by its URL and would otherwise show the seat count as it stood the first
   * time anybody looked — so the URL changes whenever the card would.
   */
  /*
   * Every row id in it, so the URL cannot repeat.
   *
   * A headcount alone is not enough: one person leaving and another arriving
   * leaves it where it was, and the picture would keep whatever it said before
   * both of them — Discord holds these for a year and asks again only when the
   * address changes. Row ids only ever climb, so any change to who is in it is
   * a change to this.
   */
  const who = [
    ...Object.values(p.seats).map((m) => m.seatRowId ?? 0),
    ...(p.floating ?? []).map((m) => m.seatRowId ?? 0),
  ].sort((a, b) => a - b).join("-");
  /*
   * And which picture it wears (v332). The edit that changes it moves
   * updated_at as well, but this is the one thing on the card a member
   * changes by hand and then goes to Discord to look for — so it is in the
   * address by name, not by inference. The file's random part is enough to
   * tell two pictures apart, and short.
   */
  const pic = p.cover?.match(/-([a-z0-9]+)\.[a-z]+$/)?.[1] ?? "d";
  const version = `${BUILD}.${here}.${seats}.${stamp(p.updatedAt ?? p.createdAt)}.${who}.${pic}`;
  const card = `${SITE}/party/${p.id}/banner?v=${version}`;

  return {
    // The lead, with their face and nothing else. An embed with somebody in
    // it reads as an invitation; the same embed without reads as a listing —
    // and the name in that position is already plainly whose party it is.
    ...(lead ? {
      author: {
        name: lead.name,
        ...(face ? { icon_url: face } : {}),
        url: `${SITE}/member/${p.ownerCharacterId}`,
      },
    } : {}),
    title: nameOf(p, defs),
    url: `${SITE}/party/${p.id}`,
    /*
     * Where it is up to and when, on one line, then the lead's note.
     *
     * The time is Discord's own clock, so everybody reads it in their own
     * timezone — the one thing the picture (Bangkok time) cannot do. The date
     * is in the picture, which is why this line is only the hour and how long
     * until it.
     */
    description: [
      `**${STATUS_WORD[status] ?? ""}** · เริ่ม <t:${at}:t> · <t:${at}:R>`,
      p.note ? p.note.slice(0, 400) : null,
    ].filter(Boolean).join("\n"),
    color: def ? Number.parseInt(KIND_COLOR[def.kind].slice(1), 16) : 0x8b93a1,
    // How full and what is wanted are in the picture now; these are the
    // details that read better as words.
    fields: [
      /*
       * Which chairs are empty, by name.
       *
       * "ขาด 2 Tank" says how many and not which, and on an eight-man those
       * are different questions — somebody who can only main tank needs to
       * know MT is the one going spare. Left out where the seats are only
       * numbers, since "1, 2, 3, 4" names nothing.
       */
      ...(freeSeats.length
        ? [{ name: "ที่นั่งว่าง", value: freeSeats.join(" · "), inline: false }]
        : []),
      ...(unsettled.length
        ? [{
            name: "Flex",
            value: unsettled.join(" · ").slice(0, 1000),
            inline: false,
          }]
        : []),
      ...(extras.length
        ? [{ name: "รายละเอียด", value: extras.join(" · ").slice(0, 1000), inline: false }]
        : []),
    ],
    image: { url: card },
  };
}

/**
 * The select somebody joins from.
 *
 * A dropdown rather than a button each, because components are capped at five
 * rows per message and a board of nine parties would need nine buttons. It
 * also scales the way the board does: the labels carry the same shortfall the
 * embed does, so the choice can be made without scrolling back up.
 *
 * Full parties are left in the list and marked, rather than dropped. Somebody
 * looking for the party they are already in should find it where they last saw
 * it, and "เต็มแล้ว" is an answer.
 */
function joinRow(
  parties: readonly Party[], defs: Record<string, ContentDef>,
  names: Map<number, Lead>, now: number,
) {
  if (!parties.length) return [];
  return [{
    type: 1,
    components: [{
      type: 3,
      custom_id: "party:pick",
      placeholder: "เลือกปาร์ตี้ที่จะเข้าร่วม",
      options: parties.slice(0, 25).map((p) => {
        const { here, seats } = headcount(p);
        const lead = names.get(p.ownerCharacterId)?.name;
        /*
         * The lead's name first, because that is what tells two of the same
         * fight apart. Two M4S nights on one evening have the same title and
         * nearly the same time, and the only thing that says which is which is
         * whose it is.
         *
         * Then what anybody is actually choosing on: when, how full, what is
         * missing. A hundred characters is the whole budget, so it is built in
         * that order and cut from the end.
         */
        const bits = [
          STATUS_WORD[partyStatus(p, now)] ?? null,
          lead ? `โดย ${lead}` : null,
          whenShort(p.startsAt, now),
          seats ? `${here}/${seats}` : `${here} คน`,
          `ขาด ${shortfall(p)}`,
        ].filter(Boolean).join(" · ");
        return {
          label: nameOf(p, defs).slice(0, 100),
          description: bits.slice(0, 100),
          value: p.id,
        };
      }),
    }],
  }];
}

/**
 * The two ways out to the site, as buttons under everything.
 *
 * The address used to be typed into the header's sentence, which Discord
 * shows as a long blue line. A button says what it does, and "ตั้งปาร์ตี้"
 * opens the board with the form already open (?new=1, see PartyBoard).
 * Link buttons need no handler: Discord opens the address itself.
 */
function linkRow() {
  return {
    type: 1,
    components: [
      { type: 2, style: 5, label: "ตั้งปาร์ตี้", url: `${SITE}/party?new=1` },
      { type: 2, style: 5, label: "เปิดบอร์ดบนเว็บ", url: `${SITE}/party` },
    ],
  };
}

/** Discord's ceiling on the text of all a message's embeds together. */
const EMBED_TEXT_MAX = 6000;
/** How many statics the list names before it says how many more. */
const STATICS_LISTED = 12;

/**
 * The Static finder, as the last card of the board (the owner, 2026-11-12).
 *
 * The statics are a different question from the evening's parties, "who plays
 * with us every week until this is cleared", so they get a section of their
 * own; and he wanted the board one message. A message carries ten embeds and
 * the evening takes nine, so the statics are one card: a list, not pictures,
 * the ones still looking first, each line a link to the party.
 *
 * No dropdown entry: joining from Discord is built for an evening (it refuses a
 * party whose start has passed, which a static's always has), and signing up
 * for every week is a decision to make on the page.
 *
 * Null where no static is open, so the board ends with the evening's parties
 * as it did before.
 */
export function staticsEmbed(all: readonly Party[]) {
  const defs = byKey();
  const names = roster();
  const full = (p: Party) => {
    const { here, seats } = headcount(p);
    return seats > 0 && here >= seats;
  };
  const open = all
    .filter((p) => p.isStatic && !p.endedAt)
    .sort((a, b) => Number(full(a)) - Number(full(b))
      || +new Date(b.createdAt) - +new Date(a.createdAt));
  if (!open.length) return null;
  const listed = open.slice(0, STATICS_LISTED);
  const lines = listed.map((p) => {
    const { here, seats } = headcount(p);
    const lead = names.get(p.ownerCharacterId)?.name;
    const state = full(p) ? "ครบแล้ว" : `กำลังหาคน · ขาด ${shortfall(p)}`;
    return [
      `**[${nameOf(p, defs)}](${SITE}/party/${p.id})**`,
      [state, seats ? `${here}/${seats}` : `${here} คน`, lead ? `โดย ${lead}` : null]
        .filter(Boolean).join(" · "),
    ].join("\n");
  });
  const more = open.length - listed.length;
  const looking = open.filter((p) => !full(p)).length;
  return {
    title: "CASH Static Finder",
    url: `${SITE}/party#statics`,
    description: [
      `-# ${looking} Static ที่กำลังหาคน · ทีมประจำที่เล่นด้วยกันทุกสัปดาห์`,
      ...lines,
      more > 0 ? `-# อีก ${more} Static ดูได้บนเว็บ` : null,
    ].filter(Boolean).join("\n\n").slice(0, 4000),
    color: 0x5b8def,
  };
}

/** How much of Discord's 6000 an embed spends. */
function embedText(e: {
  title?: string; description?: string; author?: { name?: string };
  fields?: { name: string; value: string }[];
}): number {
  return (e.title?.length ?? 0) + (e.description?.length ?? 0) + (e.author?.name?.length ?? 0)
    + (e.fields ?? []).reduce((n, f) => n + f.name.length + f.value.length, 0);
}

/**
 * Within Discord's 6000 characters across every embed, or it refuses the edit.
 *
 * Nine parties with long notes and flex lists could already come close; the
 * statics card adds to it. So when the total runs over, the longest texts are
 * cut first (the notes, then the details), never the time line or the seats,
 * and the statics card last of all.
 */
function fitEmbeds<T extends { description?: string; fields?: { name: string; value: string }[] }>(
  embeds: T[],
  /** Whether the last embed is the statics card, which is cut last of all. */
  sparesLast: boolean,
): T[] {
  const total = () => embeds.reduce((n, e) => n + embedText(e), 0);
  const parties = sparesLast ? embeds.slice(0, -1) : embeds;
  for (const cap of [200, 120, 60]) {
    if (total() <= EMBED_TEXT_MAX - 100) break;
    for (const e of parties) {
      if (e.description && e.description.length > cap) {
        // The first line is the status and the time; only the note is cut.
        const [first, ...rest] = e.description.split("\n");
        const note = rest.join(" ");
        e.description = note ? `${first}\n${note.slice(0, cap)}…` : first;
      }
      for (const f of e.fields ?? []) if (f.value.length > cap) f.value = `${f.value.slice(0, cap)}…`;
    }
  }
  return embeds;
}

/** The whole message: what to post the first time, and what to edit into it. */
export function boardMessage(
  all: readonly Party[], now = Date.now(),
  /** character id -> the picture they chose for themselves, where they did. */
  faces: Map<number, string> = new Map(),
  /** The open statics, listed as the board's last card. See staticsEmbed. */
  statics: readonly Party[] = [],
) {
  const defs = byKey();
  const names = roster();
  const open = boardParties(all, now);
  const shown = open.slice(0, MAX_EMBEDS);
  const rest = open.length - shown.length;

  const staticCard = staticsEmbed(statics);
  const header = open.length
    ? `## CASH Party Finder\n${open.length} ปาร์ตี้ที่ยังเปิดอยู่`
      + (rest > 0 ? ` · อีก ${rest} ปาร์ตี้ดูได้บนเว็บ` : "")
    : `## CASH Party Finder\nตอนนี้ยังไม่มีปาร์ตี้ที่เปิดอยู่`;

  return {
    content: `${header}\n-# อัปเดตล่าสุด <t:${Math.floor(now / 1000)}:R>`,
    embeds: fitEmbeds<{
      description?: string; fields?: { name: string; value: string }[];
      image?: { url: string }; url?: string; title?: string;
    }>([
      ...shown.map((p) => embedFor(p, defs, names, faces)),
      ...(staticCard ? [staticCard] : []),
    ], !!staticCard),
    components: [...joinRow(shown, defs, names, now), linkRow()],
    // Nothing this message says is worth pinging anybody for. The board is
    // read when somebody is looking for a party, not pushed at them.
    allowed_mentions: { parse: [] as string[] },
  };
}
