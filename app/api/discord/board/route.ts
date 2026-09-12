import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { loadParties } from "@/lib/party-db";
import { boardMessage } from "@/lib/discord/board";
import { CHANNEL_ID, editMessage, postMessage } from "@/lib/discord/api";

/**
 * Redraw the board in Discord.
 *
 * POST, with the shared secret in a header. Called by the database whenever a
 * party or its roster changes, and by a cron tick every five minutes so the
 * countdowns stay true even when nothing has happened.
 *
 * The message id is remembered, so this edits one message rather than posting
 * a new one. If the remembered message has been deleted — somebody tidying the
 * channel, a channel recreated — it posts a fresh one and remembers that
 * instead, which is the only way this recovers without a person involved.
 *
 * Answers 200 for everything it has already handled, including "there is no
 * bot token yet". The caller is a database trigger: an error here would end up
 * in a Postgres log nobody reads, and there is nothing pg_net could do about
 * it anyway.
 */

export const dynamic = "force-dynamic";

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Constant time, because this compares a secret.
 *
 * A plain === leaks how much of the string was right through how long it took
 * to answer, which is enough to find the rest of it a byte at a time.
 */
function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const want = process.env.DISCORD_SYNC_SECRET ?? "";
  if (!want) return NextResponse.json({ skipped: "no sync secret" });
  if (!sameSecret(req.headers.get("x-sync-secret") ?? "", want)) {
    return NextResponse.json({ error: "no" }, { status: 401 });
  }

  const channel = CHANNEL_ID();
  const supabase = admin();
  if (!channel || !supabase) {
    return NextResponse.json({ skipped: "not configured" });
  }

  const parties = await loadParties(supabase);

  /*
   * The pictures members chose for themselves.
   *
   * Fetched here rather than threaded through the model, because this is the
   * only caller that needs them and the browser already has its own copy
   * through the avatar context. Missing rows are simply people who never set
   * one, and the Lodestone portrait stands in.
   */
  const { data: chosen } = await supabase.from("profiles")
    .select("character_id, avatar_url")
    .not("avatar_url", "is", null)
    .not("character_id", "is", null);
  const faces = new Map<number, string>();
  for (const r of (chosen ?? []) as { character_id: number; avatar_url: string }[]) {
    faces.set(r.character_id, r.avatar_url);
  }

  const payload = boardMessage(parties, Date.now(), faces);

  const { data: row } = await supabase
    .from("discord_board").select("channel_id, message_id").eq("id", 1).single();

  // A board posted into a different channel is not this board. Changing the
  // channel in the environment should move it rather than edit a message
  // nobody can see any more.
  const known = row?.message_id && row?.channel_id === channel
    ? row.message_id : null;

  if (known) {
    const edited = await editMessage(channel, known, payload);
    if ("ok" in edited) {
      await supabase.from("discord_board")
        .update({ updated_at: new Date().toISOString() }).eq("id", 1);
      return NextResponse.json({ edited: known, parties: payload.embeds.length });
    }
    /*
     * Only ever post a second board when Discord says the first one is gone.
     *
     * This used to ask "does the message still exist" and post a new one
     * whenever that question could not be answered — which is exactly what
     * happens under a rate limit, where both calls come back 429 together. A
     * burst of triggers therefore produced a burst of boards: four of them in
     * the channel, each the same list, none of them the one the database
     * remembered.
     *
     * 10008 is Unknown Message, and it is the only answer that means the board
     * is really gone. Everything else — rate limited, network, a permission
     * somebody took away — is a reason to stop and say so, because the board
     * we already have is still there and will be edited on the next tick.
     */
    if (!/"code"\s*:\s*10008/.test(edited.error)) {
      return NextResponse.json({ error: edited.error }, { status: 502 });
    }
  }

  const posted = await postMessage(channel, payload);
  if ("error" in posted) {
    return NextResponse.json({ error: posted.error }, { status: 502 });
  }
  const now = new Date().toISOString();
  await supabase.from("discord_board").update({
    channel_id: channel, message_id: posted.ok.id, posted_at: now, updated_at: now,
  }).eq("id", 1);
  return NextResponse.json({ posted: posted.ok.id, parties: payload.embeds.length });
}
