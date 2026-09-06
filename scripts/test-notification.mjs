// Send yourself a notification, to see the toast without waiting for one.
//
//   node scripts/test-notification.mjs                 # a popoto, to whoever --to says
//   node scripts/test-notification.mjs --to Ninenine
//   node scripts/test-notification.mjs --to 5644067 --kind tag
//   node scripts/test-notification.mjs --list          # who can be sent one
//   node scripts/test-notification.mjs --clean         # remove the ones this made
//
// --kind is one of: popoto, popoto_post, tag, comment, feedback, announcement.
// A kind that wants a picture is given the newest gallery post, so the toast
// and the bell have something to draw.
//
// Writes with the service role, which is the same thing the site's own triggers
// do and the reason this is a script rather than a page. Every row it makes is
// marked, so --clean can find them again.
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
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = async (path, init) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init?.headers || {}) } });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1] : fallback;
};
const has = (name) => process.argv.includes(`--${name}`);

async function main() {
  /** What the row says, so the test looks like the real thing rather than a stub. */
  const MARK = "[test]";

  const people = await rest(
    "profiles?select=id,character_id,character_name,display_name,discord_username" +
    "&order=character_name.asc");
  const label = (p) => p.character_name || p.display_name || p.discord_username || p.id;

  if (has("list")) {
    for (const p of people) {
      console.log(String(p.character_id ?? "—").padStart(9), label(p));
    }
    return;
  }

  if (has("clean")) {
    const gone = await rest(`notifications?body=eq.${encodeURIComponent(MARK)}`,
                            { method: "DELETE", headers: { Prefer: "return=representation" } });
    console.log(`removed ${gone?.length ?? 0} test notification(s)`);
    return;
  }

  const want = arg("to");
  const match = want
    ? people.filter((p) => String(p.character_id) === want
        || label(p).toLowerCase().includes(want.toLowerCase()))
    : people.filter((p) => p.character_id != null);

  if (!match.length) {
    console.error(`Nobody matches "${want}". Try --list.`);
    process.exitCode = 1;
    return;
  }
  if (want && match.length > 1) {
    console.error(`"${want}" matches ${match.length} people:`);
    for (const p of match.slice(0, 10)) console.error("   ", label(p), p.character_id ?? "");
    process.exitCode = 1;
    return;
  }
  const to = match[0];
  if (!want) {
    console.error("Say who: --to <name or character id>. --list shows them all.");
    process.exitCode = 1;
    return;
  }

  const kind = arg("kind", "popoto");
  const KINDS = ["popoto", "popoto_post", "tag", "comment", "feedback", "announcement"];
  if (!KINDS.includes(kind)) {
    console.error(`--kind must be one of: ${KINDS.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  // Somebody other than the recipient, so the line reads the way it will in
  // life — a notification about yourself is not one the site ever sends.
  const from = people.find((p) => p.id !== to.id && p.character_id != null) ?? to;

  // The kinds that draw a picture want one to draw.
  let postId = null;
  if (kind === "tag" || kind === "comment" || kind === "popoto_post") {
    const posts = await rest("gallery_posts?select=id&order=id.desc&limit=1");
    postId = posts?.[0]?.id ?? null;
    if (!postId) console.log("  (no gallery post to attach — it will show the icon instead)");
  }

  const row = {
    recipient: to.id,
    kind,
    actor: from.id,
    actor_name: label(from),
    post_id: postId,
    body: MARK,
  };
  const [made] = await rest("notifications",
    { method: "POST", body: JSON.stringify(row), headers: { Prefer: "return=representation" } });

  console.log(`sent ${kind} #${made.id} to ${label(to)} from ${label(from)}`);
  console.log("Open the site as that member — the toast should arrive within a second");
  console.log("with realtime on, and within ninety seconds without it.");
  console.log("Undo with: node scripts/test-notification.mjs --clean");

}

await main();
