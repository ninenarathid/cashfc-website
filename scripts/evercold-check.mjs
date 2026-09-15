// Hold every Evercold notice to the count the draw is made from.
//
//   node scripts/evercold-check.mjs         # name every wrong notice not yet put right
//   node scripts/evercold-check.mjs --fix   # tell each of those members the right total
//
// The draw does not read notices — it counts the potatoes — so a notice with the
// wrong number is not a lost ticket. It is the site telling a member something
// untrue about a prize, and the first anybody hears of it is a member counting
// their own days and asking why. That is how the potato-to-yourself bug was found:
// twenty-six notices, a week in. This asks the same question of every notice at
// once. Run it after changing the notice or the draw, and before the draw is made.
//
// What a notice should have said is the number of days, up to and including its
// own, on which that member gave a potato that counts. The rule is the one in
// lib/evercold.ts and the admin report, restated because this file cannot import
// either:
//
//   one day of giving is one entry, whatever the count that day
//   giving to yourself does not count, on a profile or on a picture
//   the days are Bangkok days
//
// A sent notice is left as it was sent. What puts it right is an evercold_fix sent
// after it, carrying the total the member holds now — not another entry notice,
// which says "today" and, sent today, would silence their real one when they next
// gave. The same correction is what stops a second run sending another, so this is
// safe to run twice.
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
// Every row. A plain read stops at a thousand without saying so (lib/rows.ts), and
// the event's kudos passed a thousand in its first week.
const all = async (path) => {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const page = await rest(`${path}&offset=${from}&limit=1000`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
};

const FIX = process.argv.includes("--fix");

/* ── the window, in the FC's own time ─────────────────────────────────────── */
const FROM = "2026-09-09T00:00:00+07:00";
const TO = "2026-10-09T23:59:59.999+07:00";
const bkk = (iso) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(iso));
const enc = encodeURIComponent;
const inWindow = `created_at=gte.${enc(FROM)}&created_at=lte.${enc(TO)}`;

const FC = new Set(JSON.parse(readFileSync("data/fc-ids.json", "utf8")).ids);

/* ── who gave what ────────────────────────────────────────────────────────── */
const profiles = await all("profiles?select=id,character_id,character_name&order=id");
const charOf = new Map(profiles.map((p) => [p.id, p.character_id]));
const nameOf = new Map(profiles.map((p) => [p.id, p.character_name]));

const kudos = await all(
  `kudos?select=sender_id,receiver_character_id,created_at&${inWindow}&order=id`);
const likes = await all(
  `gallery_likes?select=profile_id,created_at,gallery_posts(character_id)&${inWindow}`
  + "&order=created_at,profile_id,post_id");

/** account id -> the Bangkok days they hold an entry for. */
const days = new Map();
const add = (who, iso) => {
  const at = days.get(who) ?? new Set();
  at.add(bkk(iso));
  days.set(who, at);
};
for (const k of kudos) {
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
const heldBy = (who, day) => [...(days.get(who) ?? [])].filter((d) => d <= day).length;

/* ── what they were told ──────────────────────────────────────────────────── */
// From the opening on. The rows before it were written to try the bell out.
const notices = await all(
  `notifications?select=id,recipient,created_at,body&kind=eq.evercold&${inWindow}&order=id`);
const corrections = await all(
  "notifications?select=recipient,created_at&kind=eq.evercold_fix&order=id");
/** account id -> when they were last sent a correction. */
const correctedAt = new Map();
for (const c of corrections) {
  const at = Date.parse(c.created_at);
  if (at > (correctedAt.get(c.recipient) ?? 0)) correctedAt.set(c.recipient, at);
}

const wrong = notices
  .map((n) => ({ ...n, should: String(heldBy(n.recipient, bkk(n.created_at))) }))
  .filter((n) => n.body !== n.should);
const open = wrong.filter((n) => Date.parse(n.created_at) > (correctedAt.get(n.recipient) ?? 0));

console.log(`event window ${FROM.slice(0, 10)} → ${TO.slice(0, 10)}: `
  + `${notices.length} notice(s), ${wrong.length} wrong, `
  + `${wrong.length - open.length} of those already put right by a correction`);
for (const n of open) {
  console.log(`  #${n.id}  ${bkk(n.created_at)}  ${nameOf.get(n.recipient) ?? n.recipient}`
    + ` — said ${n.body}, the draw holds ${n.should}`);
}

/* ── who would be told what ───────────────────────────────────────────────── */
// Worked out, and printed, whether or not --fix is given: the number a member is
// about to be sent is the thing worth reading before it is sent.
const tell = [];
let guests = 0;
for (const who of new Set(open.map((n) => n.recipient))) {
  // The prize is the FC's; telling somebody who has left that they hold
  // entries in it would be the same untruth in a new shape.
  if (!FC.has(charOf.get(who))) { guests += 1; continue; }
  const total = days.get(who)?.size ?? 0;
  if (total) tell.push({ recipient: who, kind: "evercold_fix", body: String(total) });
}

if (!open.length) {
  console.log("\nnothing to put right.");
} else {
  console.log(`\n${FIX ? "telling" : "would tell"} ${tell.length} member(s) the total they hold now:`);
  for (const t of tell) {
    const held = [...days.get(t.recipient)].sort().map((d) => d.slice(5)).join(" ");
    console.log(`  ${t.body.padStart(2)}  ${nameOf.get(t.recipient) ?? t.recipient}  (${held})`);
  }
  if (guests) console.log(`not told, being outside the FC now: ${guests}`);

  if (!FIX) {
    console.log("\nnothing was written. run with --fix to tell them.");
    process.exitCode = 1;
  } else if (tell.length) {
    await rest("notifications", { method: "POST", body: JSON.stringify(tell) });
    console.log(`\ntold ${tell.length} member(s).`);
  }
}
