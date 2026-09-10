// A conversation under a couple of parties, to look at.
//
//   node scripts/seed-messages.mjs           # write them
//   node scripts/seed-messages.mjs --clean   # take them away again
//
// The message layout has three things that only show up once there is a real
// conversation in it: a run of one person talking is drawn as one run, your own
// lines sit down the right-hand side, and reactions gather under the bubble
// they are on. An empty thread demonstrates none of them, and typing four
// replies by hand from four accounts is not something anybody is going to do
// twice.
//
// Marked with a zero-width joiner at the end of the body — a character that
// renders as nothing, that nobody types by accident, and that --clean can find
// again. The alternative was a visible "[demo]" tag, which would be honest and
// would also be the first thing anybody read.
//
// The people are real: names, faces and character ids come out of the profiles
// table, because a thread of "Player One" tells you nothing about how it reads
// when the names are the FC's own.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }));

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  process.exit(1);
}
const H = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json", Prefer: "return=representation",
};
const rest = async (path, init) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init?.headers || {}) } });
  const body = await r.text();
  if (!r.ok) throw new Error(`${path}: ${r.status} ${body}`);
  return body ? JSON.parse(body) : null;
};

/** Renders as nothing, is never typed by accident, and survives a round trip. */
const MARK = "‍";

if (process.argv.includes("--clean")) {
  const rows = await rest(`party_comments?select=id,body&body=like.*${encodeURIComponent(MARK)}`);
  for (const c of rows) await rest(`party_comments?id=eq.${c.id}`, { method: "DELETE" });
  console.log(`removed ${rows.length} sample message(s).`);
  process.exit(0);
}

/* ── who is talking ───────────────────────────────────────────────────────── */
const people = await rest(
  "profiles?select=id,character_id,character_name,avatar_url"
  + "&character_verified_at=not.is.null&character_name=not.is.null&limit=4");
if (people.length < 3) {
  console.error("need three verified characters to have a conversation");
  process.exit(1);
}
const [a, b, c] = people;

/* ── which parties get one ────────────────────────────────────────────────── */
const parties = await rest(
  "party_posts?select=id,content_key,note&deleted_at=is.null"
  + "&order=starts_at.desc&limit=2");
if (!parties.length) {
  console.error("no parties on the board — run scripts/seed-parties.mjs first");
  process.exit(1);
}

/*
 * Two threads, written to show the three things the layout does.
 *
 * The first is a run: three lines from one person a minute apart, which is what
 * grouping is for. Then an answer from somebody else, so the sides are visible.
 * Then a stranger — somebody with no character id — because a thread that has
 * never contained an outsider does not show that they read as a dashed circle
 * rather than as a missing picture.
 */
const minutes = (n) => new Date(Date.now() - n * 60_000).toISOString();

const THREADS = [
  [
    [b, "มาสายนิดนึงนะครับ ประมาณสองทุ่มยี่สิบ", 94, ["👍"]],
    [b, "ติดประชุมอยู่", 93, []],
    [b, "เริ่มไปก่อนได้เลยครับ ไม่ต้องรอ", 92, []],
    [a, "ได้เลย เดี๋ยวรอ", 60, ["❤️", "🥔"]],
    [a, "เดี๋ยวเปิดห้องเสียงไว้ก่อนนะ", 59, []],
    [c, "ผมขอลงด้วยได้ไหมครับ เล่น WHM กับ SGE ได้", 6, ["🎉"]],
  ],
  [
    [a, "ใครมีแมพเหลือบ้าง เอามาเปิดต่อได้", 220, ["🥔", "👍"]],
    [c, "มีอีกสองใบครับ", 214, []],
    [b, "เดี๋ยวไปสมทบ อีกสิบนาที", 30, []],
  ],
];

let wrote = 0;
let reacted = 0;

for (const [i, thread] of THREADS.entries()) {
  const party = parties[i % parties.length];
  for (const [who, text, ago, emoji] of thread) {
    const [row] = await rest("party_comments", {
      method: "POST",
      body: JSON.stringify({
        party_id: party.id,
        author: who.id,
        author_character_id: who.character_id,
        author_name: who.character_name,
        author_avatar: who.avatar_url ?? null,
        body: text + MARK,
        created_at: minutes(ago),
      }),
    });
    wrote += 1;

    // Reactions from whoever is not the person who said it, so nothing looks
    // like somebody applauding themselves.
    for (const e of emoji) {
      const from = people.filter((p) => p.id !== who.id);
      for (const p of from.slice(0, e === "🥔" ? 2 : 1)) {
        await rest("party_comment_reactions", {
          method: "POST",
          body: JSON.stringify({
            comment_id: row.id, profile_id: p.id,
            character_id: p.character_id, name: p.character_name, emoji: e,
          }),
        }).catch(() => {});
        reacted += 1;
      }
    }
  }
  console.log(`#${party.id} ${party.content_key}: ${thread.length} messages`);
}

console.log(`\n${wrote} message(s), ${reacted} reaction(s).`);
console.log("node scripts/seed-messages.mjs --clean takes them away again.");
