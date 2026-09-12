import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { loadParties } from "@/lib/party-db";
import { clashFor, endsAt, placeOf, resolveParty } from "@/lib/party";
import type { Party } from "@/lib/party";
import { PUBLIC_KEY, followUp, thinking } from "@/lib/discord/api";
import { verifyDiscord } from "@/lib/discord/verify";

/**
 * What happens when somebody presses something on the board.
 *
 * Discord posts here, signed. The signature is the whole of the security: this
 * URL is public, so without it anybody could claim to be anybody pressing
 * Join. It is checked against the raw bytes before a single field is read.
 *
 * Three seconds is all Discord allows for an answer, and a cold start plus two
 * database round trips can spend that. So the press is acknowledged at once
 * and the work happens after — which is also why the answer arrives as a
 * follow-up rather than as the first reply.
 *
 * Joining from Discord is a request, exactly as it is on the website: the lead
 * accepts it. A board that could seat somebody outright would be a second set
 * of rules for the same party, and the one the lead is watching would be
 * wrong.
 */

export const dynamic = "force-dynamic";

const PING = 1;
const COMPONENT = 3;

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const say = (content: string) => ({ content, flags: 64 });

/** Whether this party still has somewhere for one more person to go. */
const hasRoom = (p: Party) =>
  p.shape === "open" || resolveParty(p).wanted > 0;

/**
 * Put the presser into the party, or say why not.
 *
 * Every rule the website enforces, enforced again here rather than trusted:
 * this runs with the service role, which sees past every policy, so the checks
 * the policies would have made are made in the open.
 */
async function join(
  discordId: string, partyId: string,
): Promise<string> {
  const supabase = admin();
  if (!supabase) return "ระบบยังไม่พร้อม ลองใหม่อีกครั้งนะครับ";

  const { data: profile } = await supabase.from("profiles")
    .select("id, character_id, character_name, character_verified_at, avatar_url")
    .eq("discord_id", discordId).maybeSingle();

  if (!profile) {
    return "ยังไม่พบบัญชีของคุณในเว็บครับ — เข้า https://cashfc-website.vercel.app"
      + " แล้วล็อกอินด้วย Discord ก่อน แล้วกดใหม่ได้เลย";
  }
  if (!profile.character_verified_at || !profile.character_id) {
    return "ต้องยืนยันตัวละครก่อนถึงจะเข้าปาร์ตี้ได้ครับ —"
      + " ทำได้ที่ https://cashfc-website.vercel.app/profile";
  }

  const parties = await loadParties(supabase);
  const party = parties.find((p) => p.id === partyId);
  if (!party) return "ไม่พบปาร์ตี้นี้แล้วครับ อาจถูกลบไป";
  if (party.endedAt) return "ปาร์ตี้นี้จบไปแล้วครับ";
  if (new Date(endsAt(party)).getTime() <= Date.now()) {
    return "ปาร์ตี้นี้ผ่านไปแล้วครับ";
  }
  if (placeOf(party, profile.character_id)) {
    return "คุณอยู่ในปาร์ตี้นี้อยู่แล้วครับ";
  }
  if (!hasRoom(party)) return "ปาร์ตี้นี้เต็มแล้วครับ";

  const clash = clashFor(parties, profile.character_id, party, party.id);
  if (clash) {
    return "คุณมีนัดเล่นปาร์ตี้อื่นในเวลานั้นอยู่แล้วครับ —"
      + ` ${new Date(clash.startsAt).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit",
      })}`;
  }

  const { error } = await supabase.from("party_members").insert({
    party_id: Number(party.id),
    seat: null,
    character_id: profile.character_id,
    name: profile.character_name,
    avatar: profile.avatar_url ?? null,
    job: null,
    jobs: null,
    // Coming, position to be worked out — which is what the seat grid already
    // draws a floater as, and what somebody pressing one button has said.
    flex: { all: true },
    asked_by: "self",
    confirmed_at: null,
    invited_by: profile.id,
  });
  if (error) {
    return /duplicate key/i.test(error.message)
      ? "คุณอยู่ในปาร์ตี้นี้อยู่แล้วครับ"
      : "ส่งคำขอไม่สำเร็จครับ ลองใหม่อีกครั้ง";
  }

  return "ส่งคำขอเข้าปาร์ตี้แล้วครับ รอหัวห้องกดรับ —"
    + ` ดูรายละเอียดได้ที่ https://cashfc-website.vercel.app/party/${party.id}`;
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
  if (i.type === PING) {
    return Response.json({ type: 1 });
  }

  if (i.type === COMPONENT && i.data?.custom_id === "party:pick") {
    const partyId = i.data.values?.[0];
    const discordId = i.member?.user?.id ?? i.user?.id;
    const token = i.token;
    if (partyId && discordId && token) {
      // Answered after the acknowledgement, because the work below can outlast
      // the three seconds Discord waits.
      after(async () => {
        await followUp(token, say(await join(discordId, partyId)));
      });
      return Response.json(thinking());
    }
  }

  // Anything this does not handle is acknowledged rather than left hanging:
  // an unanswered interaction shows the presser a red failure.
  return Response.json({ type: 4, data: say("ยังไม่รองรับปุ่มนี้ครับ") });
}
