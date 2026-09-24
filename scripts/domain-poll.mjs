// The domain vote on the front page: what it says now, and starting its clock.
//
//   node scripts/domain-poll.mjs            # the open round, its names and the count
//   node scripts/domain-poll.mjs open       # a fresh three-day round from this moment
//   node scripts/domain-poll.mjs open 5     # the same, for five days
//   node scripts/domain-poll.mjs close      # take the round off the front page
//
// v94 opens the first round when it is run, which may be days before the card
// is live for everybody. `open` is how the three days start when the vote goes
// out for real: it closes whatever round is open — its names and votes stay in
// the database, off the page — and starts an empty one, so a test round cannot
// leak its names or its head start into the real one.
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
  const choices = await rest(`domain_choices?poll_id=eq.${round.id}&select=id,domain,price_usd,profiles(character_name)&order=created_at`);
  const tally = await rest("rpc/domain_poll_tally", { method: "POST", body: JSON.stringify({ p_poll: round.id }) });
  const votes = Object.fromEntries(tally.map((r) => [r.choice_id, Number(r.votes)]));
  const total = Object.values(votes).reduce((n, v) => n + v, 0);
  if (!choices.length) console.log("  no names yet");
  for (const c of [...choices].sort((a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0))) {
    const price = c.price_usd == null ? "no price" : `$${Number(c.price_usd)}/yr`;
    console.log(`  ${String(votes[c.id] ?? 0).padStart(3)}  ${c.domain.padEnd(28)} ${price.padEnd(12)} ${c.profiles?.character_name ?? ""}`);
  }
  console.log(`  ${total} vote(s)`);
}

const [cmd, arg] = process.argv.slice(2);

if (cmd === "open") {
  const days = Number(arg ?? 3);
  if (!(days > 0 && days <= 30)) { console.error("days should be between 0 and 30"); process.exit(1); }
  await rest("domain_polls?closed=eq.false", { method: "PATCH", body: JSON.stringify({ closed: true }) });
  const now = new Date();
  await rest("domain_polls", {
    method: "POST",
    body: JSON.stringify({
      opens_at: now.toISOString(),
      closes_at: new Date(now.getTime() + days * 86_400_000).toISOString(),
    }),
  });
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
