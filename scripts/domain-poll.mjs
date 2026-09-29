// The domain vote on the front page: what it says now, and starting its clock.
//
//   node scripts/domain-poll.mjs                          # the open round, its names and the count
//   node scripts/domain-poll.mjs open 2 a.com b.app c.party
//                                                         # a fresh two-day round with those names
//   node scripts/domain-poll.mjs close                    # take the round off the front page
//
// The names are set here and nowhere else: members vote, they do not add to the
// ballot (v97). `open` closes whatever round is open — its names and votes stay
// in the database, off the page — and starts a new one from this moment, so an
// old round cannot leak its names or its head start into the new one.
//
// Totals only, never who voted for what: the same line the page draws.
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

const bangkok = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" });

async function show() {
  const [round] = await rest("domain_polls?closed=eq.false&order=opens_at.desc&limit=1");
  if (!round) { console.log("No round open."); return; }
  const over = new Date(round.closes_at) <= new Date();
  console.log(`Round ${round.id}: ${bangkok(round.opens_at)} → ${bangkok(round.closes_at)} (Bangkok)${over ? " — time is up" : ""}`);
  const choices = await rest(`domain_choices?poll_id=eq.${round.id}&select=id,domain&order=created_at`);
  const tally = await rest("rpc/domain_poll_tally", { method: "POST", body: JSON.stringify({ p_poll: round.id }) });
  const votes = Object.fromEntries(tally.map((r) => [r.choice_id, Number(r.votes)]));
  const total = Object.values(votes).reduce((n, v) => n + v, 0);
  if (!choices.length) console.log("  no names — the card is hidden");
  for (const c of [...choices].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0))) {
    console.log(`  ${String(votes[c.id] ?? 0).padStart(3)}  ${c.domain}`);
  }
  console.log(`  ${total} vote(s)`);
}

const [cmd, arg, ...names] = process.argv.slice(2);

// The same pattern as the check on domain_choices.domain.
const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]([a-z0-9-]*[a-z0-9])?$/;

if (cmd === "open") {
  const days = Number(arg);
  if (!(days > 0 && days <= 30)) { console.error("days should be between 0 and 30"); process.exit(1); }
  const ballot = [...new Set(names.map((n) => n.trim().toLowerCase()))];
  if (ballot.length < 2) { console.error("name at least two domains to vote between"); process.exit(1); }
  const bad = ballot.filter((n) => !DOMAIN_RE.test(n));
  if (bad.length) { console.error(`not a domain: ${bad.join(", ")}`); process.exit(1); }
  // domain_choices.added_by has to be somebody; an admin, since the ballot is theirs.
  const [admin] = await rest("profiles?is_admin=eq.true&select=id&limit=1");
  if (!admin) { console.error("no admin profile to put the names on"); process.exit(1); }

  await rest("domain_polls?closed=eq.false", { method: "PATCH", body: JSON.stringify({ closed: true }) });
  const now = new Date();
  const [round] = await rest("domain_polls", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      opens_at: now.toISOString(),
      closes_at: new Date(now.getTime() + days * 86_400_000).toISOString(),
    }),
  });
  // One at a time so they keep this order on the card, which reads created_at.
  for (const domain of ballot) {
    await rest("domain_choices", {
      method: "POST",
      body: JSON.stringify({ poll_id: round.id, domain, added_by: admin.id }),
    });
  }
  await show();
} else if (cmd === "close") {
  await show();
  await rest("domain_polls?closed=eq.false", { method: "PATCH", body: JSON.stringify({ closed: true }) });
  console.log("Closed — off the front page.");
} else if (!cmd) {
  await show();
} else {
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}
