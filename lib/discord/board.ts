import {
  KIND_COLOR, catalogue, endsAt, headcount, lootText, needsByRole,
  partyStatus, progressText, resolveParty, spotText, worldText,
} from "@/lib/party";
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

/** "ขาด 2 Healer · ขาด 3 DPS", or what a full party says instead. */
function shortfall(p: Party): string {
  if (p.shape === "open") return "เปิดรับทุกคน";
  const res = resolveParty(p);
  if (!res.wanted) return "เต็มแล้ว";
  const need = { tank: 0, healer: 0, dps: 0 } as Record<string, number>;
  let free = 0;
  for (const s of res.uncovered) {
    if (s.free) free += 1;
    else need[s.role] += 1;
  }
  const parts: string[] = [];
  if (need.tank) parts.push(`ขาด ${need.tank} Tank`);
  if (need.healer) parts.push(`ขาด ${need.healer} Healer`);
  if (need.dps) parts.push(`ขาด ${need.dps} DPS`);
  if (free) parts.push(`ขาดอีก ${free} คน`);
  return parts.join(" · ") || `ขาดอีก ${res.wanted} คน`;
}

/** One party, as an embed. */
function embedFor(p: Party, defs: Record<string, ContentDef>) {
  const def = defs[p.contentKey];
  const { here, seats } = headcount(p);
  const status = partyStatus(p);
  const lines: string[] = [];

  // Discord's own clock, so everybody reads it in their own timezone — the one
  // thing the website cannot do, and the reason a Thai FC with members abroad
  // keeps getting the hour wrong.
  lines.push(`<t:${stamp(p.startsAt)}:F> · <t:${stamp(p.startsAt)}:R>`);
  lines.push(`**${seats ? `${here}/${seats} คน` : `${here} คน`}** · ${shortfall(p)}`);

  const extras = [
    progressText(p.progress),
    lootText(p.loot),
    spotText(p.spot),
    worldText(p.spot),
  ].filter(Boolean);
  if (extras.length) lines.push(extras.join(" · "));
  if (p.note) lines.push(p.note);

  return {
    title: `${nameOf(p, defs)}${status === "live" ? " · กำลังเล่น" : ""}`,
    url: `${SITE}/party/${p.id}`,
    description: lines.join("\n").slice(0, 4000),
    color: def ? Number.parseInt(KIND_COLOR[def.kind].slice(1), 16) : 0x8b93a1,
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
        })} · ${shortfall(p)}`.slice(0, 100),
        value: p.id,
      })),
    }],
  }];
}

/** The whole message: what to post the first time, and what to edit into it. */
export function boardMessage(all: readonly Party[], now = Date.now()) {
  const defs = byKey();
  const open = boardParties(all, now);
  const shown = open.slice(0, MAX_EMBEDS);
  const rest = open.length - shown.length;

  const header = open.length
    ? `## หาปาร์ตี้\n${open.length} ปาร์ตี้ที่ยังเปิดอยู่`
      + (rest > 0 ? ` · อีก ${rest} ปาร์ตี้ดูได้ที่ ${SITE}/party` : "")
    : `## หาปาร์ตี้\nตอนนี้ยังไม่มีปาร์ตี้ที่เปิดอยู่ — ตั้งได้ที่ ${SITE}/party`;

  return {
    content: `${header}\n-# อัปเดตล่าสุด <t:${Math.floor(now / 1000)}:R>`,
    embeds: shown.map((p) => embedFor(p, defs)),
    components: joinRow(shown, defs),
    // Nothing this message says is worth pinging anybody for. The board is
    // read when somebody is looking for a party, not pushed at them.
    allowed_mentions: { parse: [] as string[] },
  };
}
