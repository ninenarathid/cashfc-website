import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { loadParties } from "@/lib/party-db";
import {
  catalogue, clashFor, endsAt, headcount, lootText, openSeats, placeOf,
  partyStatus, progressText, resolveParty, spotText, worldText,
} from "@/lib/party";
import type { Party } from "@/lib/party";
import { partySeeds } from "@/lib/party-seeds";
import { whenShort } from "@/lib/discord/board";
import { PUBLIC_KEY, followUp, thinking } from "@/lib/discord/api";
import { verifyDiscord } from "@/lib/discord/verify";

/**
 * What happens when somebody presses something on the board.
 *
 * Discord posts here, signed. The signature is the whole of the security: this
 * URL is public, so without it anybody could claim to be anybody pressing
 * Join. It is checked against the raw bytes before a single field is read.
 *
 * Picking from the list does not join anything. It answers with a card only
 * that person can see, carrying everything the board had no room for, and a
 * button. The list sits under a long message people scroll past every day, and
 * a stray press used to send a request to the lead with no way back — now the
 * press that commits is a press that says so.
 *
 * Three seconds is all Discord allows for an answer, and a cold start plus two
 * database round trips can spend that. So every press is acknowledged at once
 * and answered as a follow-up.
 */

export const dynamic = "force-dynamic";

const PING = 1;
const COMPONENT = 3;
const SITE = "https://cashfc-website.vercel.app";
const EPHEMERAL = 64;

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const say = (content: string) => ({ content, flags: EPHEMERAL });

interface Me {
  id: string;
  characterId: number;
  name: string;
  avatar: string | null;
}

/**
 * Who pressed it, as somebody this site knows.
 *
 * A string rather than a member is the reason they cannot be seated, and it is
 * written to be read by the person who pressed: nobody wants to be told
 * "profile not found", they want to be told what to do about it.
 */
async function whoPressed(
  supabase: SupabaseClient, discordId: string,
): Promise<Me | string> {
  const { data } = await supabase.from("profiles")
    .select("id, character_id, character_name, character_verified_at, avatar_url")
    .eq("discord_id", discordId).maybeSingle();
  if (!data) {
    return `ยังไม่พบบัญชีของคุณในเว็บครับ — เข้า ${SITE} แล้วล็อกอินด้วย Discord`
      + " ก่อน แล้วกดใหม่ได้เลย";
  }
  if (!data.character_verified_at || !data.character_id) {
    return `ต้องยืนยันตัวละครก่อนถึงจะเข้าปาร์ตี้ได้ครับ — ทำได้ที่ ${SITE}/profile`;
  }
  /*
   * A verified character always has a name, and "always" is the word that
   * earns a check. The name is what the seat grid draws and what the lead
   * reads when deciding; a blank one is a row in the party that nobody can
   * tell from any other.
   */
  if (!data.character_name) {
    return `ชื่อตัวละครของคุณยังว่างอยู่ครับ — เปิด ${SITE}/profile`
      + " แล้วยืนยันตัวละครอีกครั้ง";
  }
  return {
    id: data.id, characterId: data.character_id,
    name: data.character_name, avatar: data.avatar_url ?? null,
  };
}

const nameOf = (p: Party) => {
  for (const c of catalogue(partySeeds())) {
    if (c.key === p.contentKey) return c.duty ?? c.name;
  }
  return p.contentKey;
};

/** Whether this party still has somewhere for one more person to go. */
const hasRoom = (p: Party) =>
  p.shape === "open" || resolveParty(p).wanted > 0;

/**
 * The card somebody sees after picking, before anything has happened.
 *
 * Says what the list could not fit and, more to the point, says whether they
 * can come before they press rather than after. Being told "you are already in
 * a party at that time" by a button you have already pressed is being told too
 * late.
 */
function partyCard(p: Party, me: Me, parties: readonly Party[], now: number) {
  const { here, seats } = headcount(p);
  const mine = placeOf(p, me.characterId);
  const clash = mine ? null : clashFor(parties, me.characterId, p, p.id);
  const over = !!p.endedAt || new Date(endsAt(p)).getTime() <= now;
  const full = !mine && !hasRoom(p);
  const started = partyStatus(p, now) !== "upcoming";

  const lines: string[] = [];
  lines.push(`**${nameOf(p)}**`);
  lines.push(whenShort(p.startsAt, now));
  lines.push(`ในปาร์ตี้ **${seats ? `${here}/${seats}` : here}**`
    + (p.shape === "open" ? "" : ` · ยังขาด ${shortfallWords(p)}`));

  const extras = [
    progressText(p.progress), lootText(p.loot),
    spotText(p.spot), worldText(p.spot),
  ].filter(Boolean);
  if (extras.length) lines.push(extras.join(" · "));

  // Which chairs are actually empty, which is the question somebody deciding
  // whether to come is really asking and the board has never had room for.
  const free = openSeats(p).map((sl) => sl.label);
  if (free.length) lines.push(`ที่นั่งว่าง: ${free.join(", ")}`);
  if (p.note) lines.push(`> ${p.note.slice(0, 300)}`);

  const buttons: unknown[] = [
    { type: 2, style: 5, label: "ดูบนเว็บ", url: `${SITE}/party/${p.id}` },
  ];
  let why: string | null = null;

  if (over) why = "ปาร์ตี้นี้จบไปแล้ว";
  /*
   * Asked, and nobody has answered yet.
   *
   * Said apart from being in it, because they are two different evenings: one
   * of them is a seat somebody can plan around and the other is a question
   * still sitting with the lead. A request can be taken back whenever, right
   * up to the start — it was never a promise anybody was counting on, which is
   * the same rule the website gives it.
   */
  else if (mine?.pending) {
    lines.push("ส่งคำขอแล้ว รอผู้สร้าง Party กดรับ");
    buttons.unshift({
      type: 2, style: 4, label: "ยกเลิกคำขอ",
      custom_id: `party:leave:${p.id}`,
    });
  } else if (mine) {
    lines.push(mine.seat ? `คุณอยู่ในปาร์ตี้นี้แล้ว (${mine.seat})` : "คุณอยู่ในปาร์ตี้นี้แล้ว");
    if (started) why = "ใกล้เริ่มแล้ว ออกจากปาร์ตี้ไม่ได้";
    else {
      buttons.unshift({
        type: 2, style: 4, label: "ออกจากปาร์ตี้",
        custom_id: `party:leave:${p.id}`,
      });
    }
  } else if (clash) {
    why = `คุณมีนัดเล่นปาร์ตี้อื่นในเวลานั้นอยู่แล้ว — ${whenShort(clash.startsAt, now)}`;
  } else if (full) why = "ปาร์ตี้นี้เต็มแล้ว";
  else {
    buttons.unshift({
      type: 2, style: 3, label: "เข้าร่วม",
      custom_id: `party:join:${p.id}`,
    });
  }
  if (why) lines.push(`⚠️ ${why}`);

  return {
    content: lines.join("\n").slice(0, 1900),
    flags: EPHEMERAL,
    components: [{ type: 1, components: buttons }],
  };
}

/** Words rather than marks: this card is text, not an embed field. */
function shortfallWords(p: Party): string {
  const res = resolveParty(p);
  if (!res.wanted) return "เต็มแล้ว";
  const need: Record<string, number> = { tank: 0, healer: 0, dps: 0 };
  let free = 0;
  for (const s of res.uncovered) {
    if (s.free) free += 1;
    else need[s.role] += 1;
  }
  const label: Record<string, string> = { tank: "Tank", healer: "Healer", dps: "DPS" };
  const parts = ["tank", "healer", "dps"]
    .filter((r) => need[r]).map((r) => `${need[r]} ${label[r]}`);
  if (free) parts.push(`${free} คน`);
  return parts.join(" · ") || `${res.wanted} คน`;
}

/**
 * Put them in, or say why not.
 *
 * Every rule the website enforces, enforced again rather than trusted: this
 * runs with the service role, which sees past every policy, so the checks the
 * policies would have made are made in the open. Checked again here and not
 * only on the card, because the card was drawn a moment ago and a seat can go
 * in that moment.
 */
async function doJoin(
  supabase: SupabaseClient, me: Me, partyId: string,
): Promise<string> {
  const parties = await loadParties(supabase);
  const p = parties.find((x) => x.id === partyId);
  if (!p) return "ไม่พบปาร์ตี้นี้แล้วครับ อาจถูกลบไป";
  if (p.endedAt) return "ปาร์ตี้นี้จบไปแล้วครับ";
  if (new Date(endsAt(p)).getTime() <= Date.now()) return "ปาร์ตี้นี้ผ่านไปแล้วครับ";
  const already = placeOf(p, me.characterId);
  // Two answers, because "you already asked" and "you are already in" send
  // somebody to two different places. The row behind them is the same row,
  // which is how one message came to be given for both.
  if (already?.pending) return "คุณส่งคำขอไปแล้วครับ รอผู้สร้าง Party กดรับ";
  if (already) return "คุณอยู่ในปาร์ตี้นี้อยู่แล้วครับ";
  if (!hasRoom(p)) return "ปาร์ตี้นี้เต็มแล้วครับ";
  const clash = clashFor(parties, me.characterId, p, p.id);
  if (clash) {
    return "คุณมีนัดเล่นปาร์ตี้อื่นในเวลานั้นอยู่แล้วครับ — "
      + whenShort(clash.startsAt);
  }

  /*
   * The lead joining their own party is not asking anybody.
   *
   * Left as a request it would put them in their own waiting list, to approve
   * themselves — which the website already worked out and this had not. There
   * is nobody on the other side of the question, so the row arrives answered.
   */
  const own = p.ownerCharacterId === me.characterId;

  const { error } = await supabase.from("party_members").insert({
    party_id: Number(p.id),
    seat: null,
    character_id: me.characterId,
    name: me.name,
    avatar: me.avatar,
    job: null,
    jobs: null,
    // Coming, position to be worked out — which is what the seat grid already
    // draws a floater as, and what somebody pressing one button has said.
    flex: { all: true },
    asked_by: own ? "owner" : "self",
    confirmed_at: own ? new Date().toISOString() : null,
    invited_by: me.id,
  });
  if (error) {
    return /duplicate key/i.test(error.message)
      ? "คุณอยู่ในปาร์ตี้นี้อยู่แล้วครับ"
      : "ส่งคำขอไม่สำเร็จครับ ลองใหม่อีกครั้ง";
  }
  return own
    ? `เข้าร่วม **${nameOf(p)}** แล้วครับ — ${SITE}/party/${p.id}`
    : `ส่งคำขอเข้า **${nameOf(p)}** แล้วครับ รอผู้สร้าง Party กดรับ`
      + ` — ${SITE}/party/${p.id}`;
}

/** And out again, on the same terms the site gives: not once it is starting. */
async function doLeave(
  supabase: SupabaseClient, me: Me, partyId: string,
): Promise<string> {
  const parties = await loadParties(supabase);
  const p = parties.find((x) => x.id === partyId);
  if (!p) return "ไม่พบปาร์ตี้นี้แล้วครับ";
  const mine = placeOf(p, me.characterId);
  if (!mine) return "คุณไม่ได้อยู่ในปาร์ตี้นี้ครับ";
  // An hour before the start the rest of the party starts counting on you, so
  // a seat stops being something you can give up. A request nobody answered is
  // not a seat and takes nothing away from anybody, so it can go at any hour.
  if (!mine.pending && partyStatus(p) !== "upcoming") {
    return "ปาร์ตี้ใกล้เริ่มแล้ว ออกไม่ได้ครับ — ทักในห้องแทนได้";
  }
  if (mine.rowId == null) return "ออกไม่สำเร็จครับ ลองที่เว็บแทน";
  const { error } = await supabase.from("party_members").delete().eq("id", mine.rowId);
  if (error) return mine.pending ? "ยกเลิกไม่สำเร็จครับ ลองใหม่อีกครั้ง"
                                 : "ออกไม่สำเร็จครับ ลองใหม่อีกครั้ง";
  return mine.pending
    ? `ยกเลิกคำขอเข้า **${nameOf(p)}** แล้วครับ`
    : `ออกจาก **${nameOf(p)}** แล้วครับ`;
}

export async function POST(req: Request) {
  // The bytes as sent. Parsing first and re-stringifying would change them,
  // and one changed byte is a failed signature.
  const body = await req.text();
  const ok = await verifyDiscord(
    body,
    req.headers.get("x-signature-ed25519"),
    req.headers.get("x-signature-timestamp"),
    PUBLIC_KEY(),
  );
  if (!ok) return new Response("bad signature", { status: 401 });

  const i = JSON.parse(body) as {
    type: number;
    token?: string;
    data?: { custom_id?: string; values?: string[] };
    member?: { user?: { id?: string } };
    user?: { id?: string };
  };

  // Discord checks the endpoint by sending this, both when the URL is saved
  // and from time to time afterwards.
  if (i.type === PING) return Response.json({ type: 1 });

  if (i.type === COMPONENT) {
    const id = i.data?.custom_id ?? "";
    const discordId = i.member?.user?.id ?? i.user?.id;
    const token = i.token;
    const picked = id === "party:pick" ? i.data?.values?.[0] : null;
    const joining = id.startsWith("party:join:") ? id.slice(11) : null;
    const leaving = id.startsWith("party:leave:") ? id.slice(12) : null;
    const partyId = picked ?? joining ?? leaving;

    if (partyId && discordId && token) {
      after(async () => {
        const supabase = admin();
        if (!supabase) {
          await followUp(token, say("ระบบยังไม่พร้อม ลองใหม่อีกครั้งนะครับ"));
          return;
        }
        const me = await whoPressed(supabase, discordId);
        if (typeof me === "string") {
          await followUp(token, say(me));
          return;
        }
        if (joining) {
          await followUp(token, say(await doJoin(supabase, me, joining)));
          return;
        }
        if (leaving) {
          await followUp(token, say(await doLeave(supabase, me, leaving)));
          return;
        }
        const parties = await loadParties(supabase);
        const p = parties.find((x) => x.id === partyId);
        await followUp(token, p
          ? partyCard(p, me, parties, Date.now())
          : say("ไม่พบปาร์ตี้นี้แล้วครับ อาจถูกลบไป"));
      });
      return Response.json(thinking());
    }
  }

  // Anything this does not handle is acknowledged rather than left hanging:
  // an unanswered interaction shows the presser a red failure.
  return Response.json({ type: 4, data: say("ยังไม่รองรับปุ่มนี้ครับ") });
}
