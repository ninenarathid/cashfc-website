// A live probe of v114 (what was changed no longer counts): the popoto board is what it was.
//
//   node probe-v114.mjs before   read only, before the file has run: keeps today's board beside this script
//   node probe-v114.mjs          after it has run: the board again, held to the rows and to what was kept
//
// It never writes to `kudos` (a popoto given here would be a real one: rare rolls, the bell, the admin's log), so the
// change itself, popoto into coins, is the dry run's to prove. After the file has run it makes one throwaway member,
// whose two refused changes leave only the purse row their first call makes, and deletes the account in `finally`.
// Prints no key, no token and nobody's name: character ids and counts are what the leaderboard already shows.
import fs from "node:fs";

const MODE = process.argv[2] === "before" ? "before" : "after";
const KEPT = new URL("./v114-before.json", import.meta.url);
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) { console.log("missing keys in .env.local"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 500))}`); };
async function call(path, { method = "GET", token = ANON, key = ANON, body, prefer, range } = {}) {
  const r = await fetch(`${URL_}${path}`, { method, headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}), ...(range ? { Range: range, "Range-Unit": "items" } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await r.json(); } catch { /* no body */ }
  return { status: r.status, json, code: json?.code ?? null, range: r.headers.get("content-range") };
}
const rpc = (fn, args, token = ANON) => call(`/rest/v1/rpc/${fn}`, { method: "POST", token, body: args });
const denied = (r) => r.code === "42501" || r.status === 401 || r.status === 403;
const svc = (path, opts = {}) => call(path, { ...opts, token: SERVICE, key: SERVICE });
const total = (r) => Number((r.range ?? "").split("/")[1]);

/** Every line of an answer, a thousand at a time, as the site pages it. */
async function all(path, opts = {}) {
  const out = [];
  for (let a = 0; ; a += 1000) {
    const r = await call(path, { ...opts, range: `${a}-${a + 999}` });
    if (r.status >= 300 || !Array.isArray(r.json)) throw new Error(`${path.split("?")[0]} answered ${r.status} ${r.code ?? ""}`);
    out.push(...r.json);
    if (r.json.length < 1000) return out;
  }
}
/** The board as a visitor's browser asks for it (lib/popoto-board.ts): GET, in the order each was first given one. */
const board = (since, token = ANON) => all(`/rest/v1/rpc/popoto_totals?${since ? `p_since=${encodeURIComponent(since)}&` : ""}order=first_id`, { token });
/** v104's counting, done here from the rows themselves. */
function counted(rows, since) {
  const from = since ? Date.parse(since) : -Infinity;
  const by = new Map();
  for (const k of rows) {
    if (Date.parse(k.created_at) < from) continue;
    const l = by.get(k.receiver_character_id) ?? { receiver_character_id: k.receiver_character_id, score: 0, who: new Set(), first_id: k.id };
    l.score++; l.who.add(k.sender_id); l.first_id = Math.min(l.first_id, k.id);
    by.set(k.receiver_character_id, l);
  }
  return [...by.values()].map((l) => ({ receiver_character_id: l.receiver_character_id, score: l.score, n: l.who.size, first_id: l.first_id })).sort((a, b) => a.first_id - b.first_id);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const PERIODS = [null, "2026-10-01T00:00:00+07:00", "2026-09-01T00:00:00+07:00", "2026-09-28T00:00:00+07:00"];
const called = (since) => since ?? "ever";

/** The board against the rows, for every period; a popoto given between the two reads is read again, not failed. */
async function heldToTheRows(token = ANON) {
  for (let again = 0; again < 3; again++) {
    const rows = await all(`/rest/v1/kudos?select=id,sender_id,receiver_character_id,created_at&order=id`, { token: SERVICE, key: SERVICE });
    const boards = [];
    for (const since of PERIODS) boards.push(await board(since, token));
    const after = await svc(`/rest/v1/kudos?select=id&limit=1`, { prefer: "count=exact" });
    if (total(after) !== rows.length) continue;
    return { rows, boards, wrong: PERIODS.filter((since, i) => !same(boards[i], counted(rows, since))).map(called) };
  }
  throw new Error("the ledger would not hold still for three readings");
}

let user = null;
try {
  if (MODE === "before") {
    const asAnon = await call(`/rest/v1/kudos?select=id&limit=1`, { prefer: "count=exact" });
    const asService = await svc(`/rest/v1/kudos?select=id&limit=1`, { prefer: "count=exact" });
    ok("a visitor is shown every popoto there is, so a board that reads past row security counts the same rows", total(asAnon) > 0 && total(asAnon) === total(asService), { anon: asAnon.range, service: asService.range });
    const { rows, boards, wrong } = await heldToTheRows();
    ok(`today's board (v104) is the rows counted, line for line: ${PERIODS.map(called).join(", ")}`, wrong.length === 0, wrong);
    ok("its scores add up to every popoto there is", boards[0].reduce((n, l) => n + l.score, 0) === rows.length, { board: boards[0].reduce((n, l) => n + l.score, 0), rows: rows.length });
    let r = await rpc("popoto_count", { p_character: boards[0][0]?.receiver_character_id ?? 0 });
    ok("the member page's count is not there yet (the page counts the rows meanwhile)", r.status === 404, r);
    r = await svc(`/rest/v1/town_changed?select=character_id&limit=1`);
    ok("…and neither are the marks", r.status === 404, r);
    r = await svc(`/rest/v1/town_exchanges?select=id&limit=1`, { prefer: "count=exact" });
    ok("nobody has changed a popoto: the ledger is empty", total(r) === 0, r.range);
    fs.writeFileSync(KEPT, JSON.stringify({ at: new Date().toISOString(), popoto: rows.length, periods: PERIODS, boards }));
    console.log(`   kept: ${rows.length} popoto to ${boards[0].length} characters; ${boards.slice(1).map((b, i) => `${b.length} since ${PERIODS[i + 1].slice(0, 10)}`).join(", ")}`);
  } else {
    let r = await svc(`/rest/v1/town_knobs?select=key,value&key=like.bank_*&order=key`);
    ok("the knobs: the picture side shut, the rate and the week as they were", same(r.json, [{ key: "bank_gallery", value: 0 }, { key: "bank_rate", value: 5 }, { key: "bank_weekly", value: 20 }]), r.json);
    r = await svc(`/rest/v1/town_changed?select=character_id&limit=1`, { prefer: "count=exact" });
    ok("the marks' table is there, and empty", r.status < 300 && total(r) === 0, r);
    r = await call(`/rest/v1/town_changed?select=character_id&limit=1`);
    ok("a visitor may not read the marks", denied(r), r);
    r = await call(`/rest/v1/town_changed`, { method: "POST", body: { character_id: 1, popoto: 1, cut_id: 1 } });
    ok("…nor write one", denied(r), r);

    const { rows, boards, wrong } = await heldToTheRows();
    ok(`the board is still the rows counted, line for line: ${PERIODS.map(called).join(", ")}`, wrong.length === 0, wrong);
    ok("its scores add up to every popoto there is", boards[0].reduce((n, l) => n + l.score, 0) === rows.length, { board: boards[0].reduce((n, l) => n + l.score, 0), rows: rows.length });
    if (fs.existsSync(KEPT)) {
      const was = JSON.parse(fs.readFileSync(KEPT, "utf8"));
      const since = rows.filter((k) => Date.parse(k.created_at) > Date.parse(was.at));
      if (rows.length === was.popoto) {
        ok("…and is what it was before the file ran, to the line, in every period", same(boards, was.boards), "the boards differ");
      } else {
        // popoto given since: each line may only have grown, and by exactly those
        const grew = new Map();
        for (const k of rows.slice(was.popoto)) grew.set(k.receiver_character_id, (grew.get(k.receiver_character_id) ?? 0) + 1);
        const then = new Map(was.boards[0].map((l) => [l.receiver_character_id, l.score]));
        const off = boards[0].filter((l) => l.score !== (then.get(l.receiver_character_id) ?? 0) + (grew.get(l.receiver_character_id) ?? 0));
        ok(`…and is what it was before the file ran, plus the ${rows.length - was.popoto} popoto given since (${since.length} by the clock)`, rows.length > was.popoto && off.length === 0 && boards[0].length >= was.boards[0].length, off.slice(0, 5));
      }
    } else console.log("   (no board was kept before the file ran: nothing to hold it to but the rows)");

    const top = [...boards[0]].sort((a, b) => b.score - a.score).slice(0, 5);
    const counts = [];
    for (const l of top) counts.push((await rpc("popoto_count", { p_character: l.receiver_character_id })).json);
    ok("a visitor asking for the member page's count is told the board's own number, for the five with the most", top.length === 5 && same(counts, top.map((l) => l.score)), { counts, board: top.map((l) => l.score) });
    r = await call(`/rest/v1/rpc/popoto_count?p_character=${top[0].receiver_character_id}`);
    ok("…asked with GET too, as the share card asks", r.status === 200 && r.json === top[0].score, r);
    r = await rpc("popoto_count", { p_character: 1 });
    ok("a character nobody has given to has none", r.status === 200 && r.json === 0, r);
    r = await rpc("town_exchange", { p_kind: "profile", p_popoto: 1 });
    ok("a visitor may not change popoto", denied(r), r);
    r = await rpc("town_popoto_left", { p_member: "00000000-0000-0000-0000-000000000000" });
    ok("…nor ask what anybody has left", denied(r) || r.status === 404, r);
    r = await rpc("mark_changed", { p_character: 1, p_popoto: 1 });
    ok("the function that moves a mark is not reachable", r.status === 404 || denied(r), r);

    const email = `probe-${crypto.randomUUID().slice(0, 8)}@example.com`;
    r = await svc(`/auth/v1/admin/users`, { method: "POST", body: { email, email_confirm: true } });
    if (r.status >= 300 || !r.json?.id) throw new Error(`could not make the throwaway account (${r.status})`);
    user = r.json.id;
    r = await svc(`/auth/v1/admin/generate_link`, { method: "POST", body: { type: "magiclink", email } });
    const hashed = r.json?.properties?.hashed_token ?? r.json?.hashed_token;
    if (!hashed) throw new Error(`no magic link (${r.status})`);
    r = await call(`/auth/v1/verify`, { method: "POST", body: { type: "magiclink", token_hash: hashed } });
    const token = r.json?.access_token;
    if (!token) throw new Error(`no session (${r.status})`);
    for (let i = 0; i < 10; i++) { r = await svc(`/rest/v1/profiles?id=eq.${user}&select=id`); if (r.json?.length) break; await new Promise((res) => setTimeout(res, 300)); }
    const fake = 900000100 + Math.floor(Math.random() * 800000);
    r = await svc(`/rest/v1/profiles?id=eq.${user}`, { method: "PATCH", body: { character_id: fake, character_name: "Probe Popoto", character_verified_at: new Date().toISOString() }, prefer: "return=minimal" });
    if (r.status >= 300) throw new Error(`could not prove the throwaway's character (${r.status} ${r.code})`);

    const theirs = await board(null, token);
    ok("a member is shown the same board as a visitor", same(theirs, boards[0]) || theirs.length >= boards[0].length, { member: theirs.length, visitor: boards[0].length });
    r = await rpc("popoto_count", { p_character: top[0].receiver_character_id }, token);
    ok("…and the same count", r.status === 200 && r.json >= top[0].score, r);
    r = await call(`/rest/v1/town_changed?select=character_id&limit=1`, { token });
    ok("a member may not read the marks either", denied(r), r);
    r = await rpc("town_popoto_left", { p_member: user }, token);
    ok("…nor ask the database what is left, except through their own purse", denied(r) || r.status === 404, r);
    r = await rpc("town_exchange", { p_kind: "profile", p_popoto: 1 }, token);
    const row = Array.isArray(r.json) ? r.json[0] : r.json;
    ok("a member with no popoto is refused a change, kindly: nothing left, no coins", r.status === 200 && row?.ok === false && row.why === "popoto" && row.coins === 0 && row.profile_left === 0 && row.gallery_left === 0, r);
    r = await rpc("town_exchange", { p_kind: "gallery", p_popoto: 1 }, token);
    const pic = Array.isArray(r.json) ? r.json[0] : r.json;
    ok("…and the same from pictures", r.status === 200 && pic?.ok === false && pic.why === "popoto" && pic.gallery_left === 0, r);
    r = await svc(`/rest/v1/town_changed?select=character_id&limit=1`, { prefer: "count=exact" });
    const marks = total(r);
    r = await svc(`/rest/v1/town_exchanges?select=id&member_id=eq.${user}`);
    ok("a refused change writes nothing: no mark, no line in the ledger", marks === 0 && r.json?.length === 0, { marks, lines: r.json });
  }
} catch (e) {
  ok("the probe ran", false, e.message);
} finally {
  if (user) {
    const d = await svc(`/auth/v1/admin/users/${user}`, { method: "DELETE" });
    const left = await svc(`/rest/v1/town_purses?member_id=eq.${user}&select=member_id`);
    ok("the throwaway account is deleted, and its purse went with it", d.status < 300 && left.json?.length === 0, { deleted: d.status, purse: left.json });
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
