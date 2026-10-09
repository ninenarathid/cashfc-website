// A read-only look at the live database after v166: the table of goes is there and closed, the function refuses
// whoever is signed out, and what the members' pages have told of so far, board by board. Touches nothing (a call it
// makes as somebody signed out is refused before anything is written); prints no key, name or id.
//   node probe-v166.mjs
// Run it once when the file has run, and again a day on: the second time its table is the thing to read.
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400))}`); };
const call = async (key, path, init = {}) => {
  const r = await fetch(`${URL_}${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  return { status: r.status, body: await r.json().catch(() => null), range: r.headers.get("content-range") };
};

const there = await call(SERVICE, `/rest/v1/town_tries?select=id&limit=1`);
ok("the table of goes is there (v166 has run)", there.status === 200, there);
if (there.status !== 200) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(1); }

const peek = await call(ANON, `/rest/v1/town_tries?select=id&limit=1`);
ok("somebody signed out reads nothing of it: refused", peek.status === 401 || peek.status === 403 || peek.body?.code === "42501", { status: peek.status, code: peek.body?.code });
const words = { p_game: "farming", p_board: "pouring", p_what: "water", p_how: "done", p_spent: true, p_need: 2, p_hits: 2, p_misses: 0, p_secs: 1 };
const before = await call(SERVICE, `/rest/v1/town_tries?select=id`, { headers: { Prefer: "count=exact", Range: "0-0" } });
const out = await call(ANON, `/rest/v1/rpc/town_try`, { method: "POST", body: JSON.stringify(words) });
ok("the function is there, and refuses whoever is signed out", (out.status === 401 || out.status === 403) && out.body?.code === "42501", { status: out.status, code: out.body?.code, message: out.body?.message });
const after = await call(SERVICE, `/rest/v1/town_tries?select=id`, { headers: { Prefer: "count=exact", Range: "0-0" } });
const total = (r) => Number(String(r.range ?? "").split("/")[1]);
// (members may be playing meanwhile: the count may have grown by their goes, and is never less)
ok("…and the refused call wrote no line of the look's own", Number.isFinite(total(before)) && total(after) >= total(before), { before: before.range, after: after.range });
const rule = await call(ANON, `/rest/v1/rpc/tries_tally`, { method: "POST", body: "{}" });
ok("the count is not to be asked from outside", rule.status === 404 || rule.status === 401 || rule.status === 403, { status: rule.status, code: rule.body?.code });

// What has been told of so far: counts only.
const rows = [];
for (let from = 0; ; from += 1000) {
  const r = await call(SERVICE, `/rest/v1/town_tries?select=who:member_id,game,board,how,spent,misses,at&order=id.asc`, { headers: { Range: `${from}-${from + 999}` } });
  if (!Array.isArray(r.body)) break;
  rows.push(...r.body);
  if (r.body.length < 1000) break;
}
console.log(`\n  ${rows.length} line(s) so far${rows.length ? `, by ${new Set(rows.map((r) => r.who)).size} member(s), from ${rows[0].at.slice(0, 16)} to ${rows.at(-1).at.slice(0, 16)}` : ": none yet (a member's page tells of a go once it has the new code; a tab open since before the deploy needs one reload)"}`);
if (rows.length) {
  const by = new Map();
  for (const r of rows) { const k = `${r.game}/${r.board ?? "-"} ${r.spent ? "tired" : "fed"}`; if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  console.log("  board                          goes members  done dropped  left   done in 100   misses a go");
  for (const [k, l] of [...by].sort()) {
    const n = (how) => l.filter((r) => r.how === how).length, played = l.filter((r) => r.how !== "left");
    console.log(`  ${k.padEnd(30)} ${String(l.length).padStart(4)} ${String(new Set(l.map((r) => r.who)).size).padStart(7)} ${String(n("done")).padStart(5)} ${String(n("dropped")).padStart(7)} ${String(n("left")).padStart(5)} ${String(Math.round((100 * n("done")) / l.length)).padStart(13)} ${(played.length ? played.reduce((a, r) => a + r.misses, 0) / played.length : 0).toFixed(2).padStart(13)}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
