// Tell everybody who already earned an entry today that they did.
//
//   node scripts/evercold-backfill.mjs --dry-run   # who would be told, and what
//   node scripts/evercold-backfill.mjs             # tell them
//
// The event opened and the notification did not: the browser's write was being
// refused by a policy that did not exist yet (v40), silently, so a day of
// giving earned entries nobody was told about. This says so after the fact.
//
// Written with the service role, which is what every other notification on this
// site is written with — the triggers run as the database. That is also why it
// works whether or not v40 has been applied yet.
//
// The counting rule is the one in lib/evercold.ts and the one the draw uses,
// restated here because this file has no way to import it:
//
//   one day of giving is one entry, whatever the count that day
//   giving to yourself does not count
//   pictures count as well as profiles
//   the Free Company only
//
// Safe to run twice. Anybody who already has today's notice is skipped, so a
// second run tells nobody anything.
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
  const body = await r.text();
  if (!r.ok) throw new Error(`${path}: ${r.status} ${body}`);
  return body ? JSON.parse(body) : null;
};

const DRY = process.argv.includes("--dry-run");

/* ── the window, in the FC's own time ─────────────────────────────────────── */
const FROM = "2026-09-09T00:00:00+07:00";
const TO = "2026-10-09T23:59:59.999+07:00";
const bkk = (iso) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(iso));
const today = bkk(new Date().toISOString());

const FC = new Set(JSON.parse(readFileSync("data/fc-ids.json", "utf8")).ids);

/* ── who gave what ────────────────────────────────────────────────────────── */
const enc = encodeURIComponent;
const profiles = await rest(
  "profiles?select=id,character_id,character_name&character_id=not.is.null");
const charOf = new Map(profiles.map((p) => [p.id, p.character_id]));
const nameOf = new Map(profiles.map((p) => [p.id, p.character_name]));

const kudos = await rest(
  `kudos?select=sender_id,receiver_character_id,created_at`
  + `&created_at=gte.${enc(FROM)}&created_at=lte.${enc(TO)}`);
const likes = await rest(
  `gallery_likes?select=profile_id,created_at,gallery_posts(character_id)`
  + `&created_at=gte.${enc(FROM)}&created_at=lte.${enc(TO)}`);

/** account id -> the set of Bangkok days they earned. */
const days = new Map();
const add = (who, iso) => {
  const at = days.get(who) ?? new Set();
  at.add(bkk(iso));
  days.set(who, at);
};
for (const k of kudos) {
  // Giving to yourself is free and does not count.
  if (k.receiver_character_id === charOf.get(k.sender_id)) continue;
  add(k.sender_id, k.created_at);
}
for (const l of likes) {
  const owner = l.gallery_posts?.character_id ?? null;
  // A picture credited to nobody belongs to nobody, so a potato on it cannot
  // be a potato on your own.
  if (owner != null && owner === charOf.get(l.profile_id)) continue;
  add(l.profile_id, l.created_at);
}

/* ── who has already been told today ──────────────────────────────────────── */
const told = new Set((await rest(
  `notifications?select=recipient&kind=eq.evercold`
  + `&created_at=gte.${enc(`${today}T00:00:00+07:00`)}`)).map((n) => n.recipient));

/* ── the ones to tell ─────────────────────────────────────────────────────── */
const rows = [];
const skipped = { guest: 0, none: 0, already: 0, notToday: 0 };

for (const [who, at] of days) {
  const character = charOf.get(who);
  if (!FC.has(character)) { skipped.guest += 1; continue; }
  // The line says "today's entry is yours", so it is only true for somebody who
  // actually gave one today. Somebody whose last give was Tuesday is not told
  // anything today; they will be the next time they give.
  if (!at.has(today)) { skipped.notToday += 1; continue; }
  if (told.has(who)) { skipped.already += 1; continue; }
  if (!at.size) { skipped.none += 1; continue; }
  rows.push({ recipient: who, kind: "evercold", body: String(at.size),
              name: nameOf.get(who) ?? who, entries: at.size });
}

rows.sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name));

console.log(`event window ${FROM.slice(0, 10)} → ${TO.slice(0, 10)}, today is ${today}\n`);
console.log(`${rows.length} to tell:`);
for (const r of rows) console.log(`  ${String(r.entries).padStart(2)} entr${r.entries === 1 ? "y " : "ies"}  ${r.name}`);
console.log(`\nskipped — outside the FC: ${skipped.guest}`
  + `, nothing today: ${skipped.notToday}`
  + `, already told today: ${skipped.already}`);

if (DRY) {
  console.log("\n--dry-run: nothing was written.");
} else if (rows.length) {
  await rest("notifications", {
    method: "POST",
    body: JSON.stringify(rows.map(({ recipient, kind, body }) => ({ recipient, kind, body }))),
  });
  console.log(`\nsent ${rows.length} notification(s).`);
} else {
  console.log("\nnobody to tell.");
}
