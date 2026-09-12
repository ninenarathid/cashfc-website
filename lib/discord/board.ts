import {
  KIND_COLOR, catalogue, endsAt, headcount, lootText,
  partyStatus, progressText, resolveParty, spotText, worldText,
} from "@/lib/party";
import raw from "@/data/members.json";
import type { BoardData } from "@/lib/types";
import { everyone } from "@/lib/people";
import type { ContentDef, Party } from "@/lib/party";
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
 * The role marks, from the server's own emoji where it has them.
 *
 * Set DISCORD_EMOJI_TANK and friends to "<:tank:123…>" and the board uses the
 * game's own art; leave them unset and it falls back to something every device
 * can already draw. Configuration rather than code because emoji ids belong to
 * a particular server, and hard-coding one would be hard-coding somebody
 * else's.
 */
const ROLE_MARK: Record<string, string> = {
  tank: process.env.DISCORD_EMOJI_TANK || "🛡️",
  healer: process.env.DISCORD_EMOJI_HEALER || "💚",
  dps: process.env.DISCORD_EMOJI_DPS || "⚔️",
};

/** Where it is up to, at a glance, before a single word is read. */
const STATUS_MARK: Record<string, string> = {
  live: "🔴", soon: "🟠", upcoming: "🟢", justEnded: "⚪", done: "⚪",
};

/** Discord allows ten embeds, and a select may offer twenty-five options. */
const MAX_EMBEDS = 9;

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
function shortfall(p: Party, words = false): string {
  if (p.shape === "open") return "เปิดรับทุกคน";
  const res = resolveParty(p);
  if (!res.wanted) return "เต็มแล้ว";
  const need: Record<string, number> = { tank: 0, healer: 0, dps: 0 };
  let free = 0;
  for (const s of res.uncovered) {
    if (s.free) free += 1;
    else need[s.role] += 1;
  }
  const label: Record<string, string> = {
    tank: "Tank", healer: "Healer", dps: "DPS",
  };
  const parts: string[] = [];
  for (const r of ["tank", "healer", "dps"]) {
    if (!need[r]) continue;
    parts.push(words ? `${need[r]} ${label[r]}` : `${ROLE_MARK[r]} ${need[r]}`);
  }
  if (free) parts.push(`${free} คน`);
  return parts.join(" · ") || `${res.wanted} คน`;
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

  const extras = [
    progressText(p.progress),
    lootText(p.loot),
    spotText(p.spot),
    worldText(p.spot),
  ].filter(Boolean);

  /*
   * The same picture the site shows when a party is shared anywhere else.
   *
   * One template for every party rather than the fight's own art where it
   * happens to exist: a board where three rows carry a screenshot and two
   * carry nothing reads as a board that is missing something, and the card
   * already puts the art inside itself where there is any.
   *
   * The version in the query is what keeps it honest. Discord caches an image
   * by its URL and would otherwise show the seat count as it stood the first
   * time anybody looked — so the URL changes whenever the card would.
   */
  const version = `${here}.${seats}.${stamp(p.updatedAt ?? p.createdAt)}`;
  const card = `${SITE}/party/${p.id}/opengraph-image?v=${version}`;

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
    title: `${STATUS_MARK[status] ?? ""} ${nameOf(p, defs)}`.trim(),
    url: `${SITE}/party/${p.id}`,
    ...(p.note ? { description: p.note.slice(0, 400) } : {}),
    color: def ? Number.parseInt(KIND_COLOR[def.kind].slice(1), 16) : 0x8b93a1,
    /*
     * Three columns rather than three lines.
     *
     * The numbers are what the board is read for, and a paragraph makes them
     * be read in order. Side by side they can be compared across parties
     * without reading any of them.
     */
    fields: [
      {
        name: "เริ่ม",
        // Discord's own clock, so everybody sees their own timezone — the one
        // thing the website cannot do, and why a Thai FC with members abroad
        // keeps getting the hour wrong.
        value: `<t:${at}:f>
<t:${at}:R>`,
        inline: true,
      },
      { name: "ในปาร์ตี้", value: seats ? `**${here}/${seats}**` : `**${here}**`, inline: true },
      { name: "ยังขาด", value: shortfall(p), inline: true },
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
function joinRow(parties: readonly Party[], defs: Record<string, ContentDef>) {
  if (!parties.length) return [];
  return [{
    type: 1,
    components: [{
      type: 3,
      custom_id: "party:pick",
      placeholder: "เลือกปาร์ตี้ที่จะเข้าร่วม",
      options: parties.slice(0, 25).map((p) => ({
        label: `${nameOf(p, defs)}`.slice(0, 100),
        description: `${new Date(p.startsAt).toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit",
          hour: "2-digit", minute: "2-digit",
        })} · ขาด ${shortfall(p, true)}`.slice(0, 100),
        value: p.id,
      })),
    }],
  }];
}

/** The whole message: what to post the first time, and what to edit into it. */
export function boardMessage(
  all: readonly Party[], now = Date.now(),
  /** character id -> the picture they chose for themselves, where they did. */
  faces: Map<number, string> = new Map(),
) {
  const defs = byKey();
  const names = roster();
  const open = boardParties(all, now);
  const shown = open.slice(0, MAX_EMBEDS);
  const rest = open.length - shown.length;

  const header = open.length
    ? `## CASH Party Finder\n${open.length} ปาร์ตี้ที่ยังเปิดอยู่`
      + (rest > 0 ? ` · อีก ${rest} ปาร์ตี้ดูได้ที่ ${SITE}/party` : "")
    : `## CASH Party Finder\nตอนนี้ยังไม่มีปาร์ตี้ที่เปิดอยู่ — ตั้งได้ที่ ${SITE}/party`;

  return {
    content: `${header}\n-# อัปเดตล่าสุด <t:${Math.floor(now / 1000)}:R>`,
    embeds: shown.map((p) => embedFor(p, defs, names, faces)),
    components: joinRow(shown, defs),
    // Nothing this message says is worth pinging anybody for. The board is
    // read when somebody is looking for a party, not pushed at them.
    allowed_mentions: { parse: [] as string[] },
  };
}
