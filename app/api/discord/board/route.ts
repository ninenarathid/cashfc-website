import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { loadParties } from "@/lib/party-db";
import { pingWants } from "@/lib/wants-ping";
import { boardMessage, boardParties } from "@/lib/discord/board";
import {
  APP_ID, CHANNEL_ID, deleteMessage, editMessage, listMessages, postMessage,
} from "@/lib/discord/api";

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
 * The exception is a party nobody has seen yet, which is posted fresh and the
 * old board taken down behind it. An edit is silent in Discord; only a message
 * arriving turns a channel name white. See below.
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

/** Older boards from this bot, removed. Returns how many went. */
async function sweep(channel: string, keep: string): Promise<number> {
  const app = APP_ID();
  if (!app) return 0;
  const seen = await listMessages(channel, 30);
  if ("error" in seen) return 0;
  let gone = 0;
  for (const m of seen.ok) {
    if (m.id === keep || m.author?.id !== app) continue;
    const out = await deleteMessage(channel, m.id);
    if ("ok" in out) gone += 1;
  }
  return gone;
}

export async function POST(req: Request) {
  const want = process.env.DISCORD_SYNC_SECRET ?? "";
  if (!want) return NextResponse.json({ skipped: "no sync secret" });
  if (!sameSecret(req.headers.get("x-sync-secret") ?? "", want)) {
    return NextResponse.json({ error: "no" }, { status: 401 });
  }

  const supabase = admin();
  if (!supabase) return NextResponse.json({ skipped: "not configured" });

  const parties = await loadParties(supabase);

  /*
   * Before the Discord half, and not inside it.
   *
   * This sweep is the only thing on the site that runs on a clock, so the one
   * other job that wants one lives here too: telling anybody whose "I am
   * looking for a savage on Tuesday" has just come true. It needs the party
   * model and nothing about Discord, so it runs whether or not a channel has
   * been configured — putting it after the channel check would have made
   * somebody's notification depend on a bot token.
   *
   * Its own failure is its own: a sweep that cannot reach the wants table
   * should still post the board.
   */
  let pinged = 0;
  try {
    pinged = await pingWants(supabase, parties);
  } catch {
    pinged = -1;
  }

  const channel = CHANNEL_ID();
  if (!channel) {
    return NextResponse.json({ skipped: "no channel", pinged });
  }

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

  const now = Date.now();
  const at = new Date(now).toISOString();
  const payload = boardMessage(parties, now, faces);

  const { data: row, error: rowErr } = await supabase
    .from("discord_board")
    .select("channel_id, message_id, party_ids, updated_at").eq("id", 1).single();

  /*
   * A row we could not read is not a board that is not there.
   *
   * Everything below reads a missing row as "no board has been posted yet"
   * and posts one — which is right when the row says so, and catastrophic
   * when the row simply did not answer. A column added to this table but not
   * yet to the database makes every read fail, and the cron tick would then
   * post a new board every five minutes and sweep the last one away. Whatever
   * board is up there now is better than that.
   */
  if (rowErr) {
    return NextResponse.json({ error: rowErr.message, pinged }, { status: 502 });
  }

  // A board posted into a different channel is not this board. Changing the
  // channel in the environment should move it rather than edit a message
  // nobody can see any more.
  const known = row?.message_id && row?.channel_id === channel
    ? row.message_id : null;

  /*
   * Which parties are on the board, and which of them are new since the last
   * time it was drawn.
   *
   * An edit makes no sound. Discord turns a channel name white when a message
   * arrives, not when one changes, so a board that only ever edits itself sits
   * in grey forever — somebody opens a party at eight and the only people who
   * find out are the ones who thought to go and look. The channel behaves like
   * every other channel except the one where something is being arranged.
   *
   * So the board keeps both habits, split on the only thing worth interrupting
   * anybody for. A seat filling, a note changed, a countdown running down: an
   * edit, silently, the way it has always worked. A party that did not exist
   * before: a new message, which is the whole of what makes the name go white.
   * Announcing every seat is how a channel gets muted, and a muted channel is
   * worse than no channel — this announces the one thing a member would have
   * wanted a tap on the shoulder for.
   *
   * Ids rather than a count, because a count is wrong exactly when it matters:
   * one party ending as another opens leaves the number where it was, and the
   * new one would arrive as quietly as if it were the old one.
   *
   * A null memory is a board whose ids were never written down — the first
   * tick after this ships, and any tick after the row is reset. That is not
   * the same as a board that was empty, and reading it as one would announce
   * every party the FC has already seen. So it records and says nothing.
   */
  const ids = boardParties(parties, now).map((p) => p.id).sort();
  const seen = (row?.party_ids as string[] | null) ?? null;
  const fresh = seen ? ids.filter((id) => !seen.includes(id)) : [];

  /*
   * And only one tick gets to be the one that announces them.
   *
   * Opening a party is two statements — the party, then the lead's own seat —
   * and each carries its own trigger, so two ticks arrive at once both holding
   * the same new id. Left alone that is two boards in the channel, which is
   * the one thing a board is not allowed to be.
   *
   * So the memory is written before the message is posted, and only by
   * whoever still finds the row as they last read it. Losing is not failing:
   * the winner is posting the same board, off the same parties, a moment
   * later.
   */
  if (fresh.length) {
    const claim = supabase.from("discord_board")
      .update({ party_ids: ids, updated_at: at }).eq("id", 1);
    const { data: won } = await (row?.updated_at
      ? claim.eq("updated_at", row.updated_at)
      : claim.is("updated_at", null)).select("id");
    if (!won?.length) {
      return NextResponse.json({ skipped: "another tick has it", pinged });
    }
  }

  if (known && !fresh.length) {
    const edited = await editMessage(channel, known, payload);
    if ("ok" in edited) {
      await supabase.from("discord_board")
        .update({ party_ids: ids, updated_at: at }).eq("id", 1);
      return NextResponse.json({
        edited: known, parties: payload.embeds.length, pinged,
      });
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
    /*
     * Give the new parties back if the board never went up.
     *
     * The claim above said "these have been announced" before they had been.
     * Left standing after a post that failed they would never be announced at
     * all: the next tick would read them as old news and go back to editing a
     * message that nobody is told has changed.
     */
    if (fresh.length) {
      await supabase.from("discord_board").update({ party_ids: seen }).eq("id", 1);
    }
    return NextResponse.json({ error: posted.error }, { status: 502 });
  }
  await supabase.from("discord_board").update({
    channel_id: channel, message_id: posted.ok.id, party_ids: ids,
    posted_at: at, updated_at: at,
  }).eq("id", 1);

  /*
   * And the board this one replaces, taken down by name.
   *
   * The sweep below would find it too, but only where the application id is
   * configured and only within the last thirty messages of the channel. The
   * one message this is certain about is the one it was about to edit, so
   * that one goes explicitly, and the sweep stays what it has always been: a
   * net for whatever else got left behind.
   *
   * After the new board is up rather than before, so there is never a moment
   * when the channel has no board in it.
   */
  if (known) await deleteMessage(channel, known);

  /*
   * And take down any board this bot left behind.
   *
   * Posting a second one is meant to be rare — only when the first is really
   * gone — but "rare" has already happened twice: somebody tidying the channel
   * by hand while a tick was in flight leaves the old id pointing at nothing,
   * and the recovery does its job twice before anybody notices. The board is
   * one message by design, so the design should be what puts it back.
   *
   * Only this bot's own messages, and only ones that are not the board we just
   * posted. A bot may always delete what it wrote itself, which is why the
   * invite never asked for Manage Messages and why this cannot reach anything
   * a member said.
   */
  const swept = await sweep(channel, posted.ok.id);
  return NextResponse.json({
    posted: posted.ok.id, parties: payload.embeds.length,
    fresh: fresh.length, swept, pinged,
  });
}
