import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { claimToken, lodestoneProfileUrl } from "@/lib/verify";

/**
 * Proving a character belongs to the account asking for it.
 *
 * GET  ?characterId=…  → the code to paste into the Lodestone profile
 * POST { characterId } → read that profile and, if the code is there, link it
 * DELETE               → unlink whatever this account currently holds
 *
 * The write goes through the service role rather than the caller's session,
 * because character_id, character_name and character_verified_at were removed
 * from what an account may write to its own row in migration_v4. That is the
 * whole point: the only path to a verified claim runs through this check.
 */

const UA = { "User-Agent": "cashfc-board/1.0 (+https://cashfc-website.vercel.app)" };

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createServerClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function me() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

function parseId(raw: string | null): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(request: Request) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const characterId = parseId(new URL(request.url).searchParams.get("characterId"));
  if (!characterId)
    return NextResponse.json({ error: "Missing characterId" }, { status: 400 });

  try {
    return NextResponse.json({
      token: claimToken(user.id, characterId),
      profileUrl: lodestoneProfileUrl(characterId),
    });
  } catch {
    return NextResponse.json(
      { error: "Verification is not configured — VERIFY_SECRET is missing" },
      { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const db = admin();
  if (!db)
    return NextResponse.json(
      { error: "Verification is not configured — SUPABASE_SERVICE_ROLE_KEY is missing" },
      { status: 500 });

  const body = await request.json().catch(() => ({}));
  const characterId = parseId(String(body?.characterId ?? ""));
  if (!characterId)
    return NextResponse.json({ error: "Missing characterId" }, { status: 400 });

  let token: string;
  try {
    token = claimToken(user.id, characterId);
  } catch {
    return NextResponse.json(
      { error: "Verification is not configured — VERIFY_SECRET is missing" },
      { status: 500 });
  }

  // Checked before the fetch so a taken character fails fast with an explanation
  // rather than after somebody has already edited their Lodestone profile.
  const { data: held } = await db
    .from("profiles").select("id").eq("character_id", characterId).maybeSingle();
  if (held && held.id !== user.id)
    return NextResponse.json(
      { error: "That character is already linked to another account. If it is really yours, ask an admin to release it." },
      { status: 409 });

  let html: string;
  try {
    const res = await fetch(lodestoneProfileUrl(characterId), {
      headers: UA, cache: "no-store",
    });
    if (res.status === 404)
      return NextResponse.json({ error: "No such character on The Lodestone" }, { status: 404 });
    if (!res.ok)
      return NextResponse.json(
        { error: `The Lodestone answered ${res.status}. If the profile is private, make it public and try again.` },
        { status: 502 });
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: "Could not reach The Lodestone just now — try again in a moment" },
      { status: 502 });
  }

  // Only the self-introduction block counts. Searching the whole page would match
  // the code anywhere it happened to appear, including in somebody's linkshell name.
  const intro = html.match(
    /class="character__selfintroduction"[^>]*>([\s\S]*?)<\/div>/,
  )?.[1] ?? "";
  const text = intro.replace(/<[^>]*>/g, " ").toLowerCase();
  if (!text.includes(token))
    return NextResponse.json({
      error: "The code is not on that character's profile yet. The Lodestone can take a few minutes to publish an edit — paste it, save, then try again.",
      token,
    }, { status: 400 });

  // The Lodestone escapes apostrophes, and plenty of FFXIV names have one.
  const rawName = html.match(
    /class="frame__chara__name"[^>]*>([^<]+)</,
  )?.[1]?.trim() ?? null;
  const name = rawName
    ? rawName.replace(/&#0?39;/g, "'").replace(/&quot;/g, '"')
         .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    : null;

  const { error } = await db.from("profiles").update({
    character_id: characterId,
    character_name: name,
    character_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  if (error)
    return NextResponse.json(
      { error: `Verified, but saving failed: ${error.message}` }, { status: 500 });

  return NextResponse.json({ ok: true, characterId, characterName: name });
}

export async function DELETE() {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const db = admin();
  if (!db)
    return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { error } = await db.from("profiles").update({
    character_id: null, character_name: null, character_verified_at: null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ ok: true });
}
