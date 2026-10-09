// A read-only look at the live database for v174 (the blacksmith, the forge's great fire, and the seven older tools
// in the games that are live). Touches nothing: every call it makes either reads, or is made as somebody signed out
// and is refused before anything of it runs. Prints no key, no name and no id, and never the great fire's own row
// (the moment its halves can next be found is told to no page, and to no log either).
//   node probe-v174.mjs before     before the owner runs the file: its sixteen functions are no functions yet, its two
//                                  tables no tables, its knob is not there, its board is no row, and how much of each
//                                  of the three catalog rows it writes over differs from the file's
//   node probe-v174.mjs            after: the knob is there (0, built closed, until its owner opens it); the two tables
//                                  are there, nobody's to read from outside, the site's key's to read; the sixteen
//                                  functions are there and refuse whoever is signed out; the rules are nobody's to ask
//                                  for; the three catalog rows are the file's to the entry, written in one go, the
//                                  forging table's new numbers among them; the board is a row, the great fire has its
//                                  one; and what has been done at the smith so far, counted (nothing, at first)
// What cannot be seen from outside, and is the SQL editor's to look at (the queries at the file's foot): that the
// thirty functions of earlier files have their lines, and that the two new columns are there.
// WRITTEN FOR AFTER THE OWNER'S RUN; never run before it but with `before`.
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BEFORE = process.argv[2] === "before";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const head = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
const ask = async (key, fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: head(key), body: JSON.stringify(body) }); return { status: r.status, body: (await r.text()).slice(0, 300) }; };
const read = async (key, path) => { const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: head(key) }); const text = await r.text(); let rows = null; try { rows = JSON.parse(text); } catch { /* no JSON */ } return { status: r.status, rows, text: text.slice(0, 200) }; };
const refused = (r) => (r.status === 401 || r.status === 403) && /42501|permission denied/.test(r.body);
const unknown = (r) => r.status === 404 && /PGRST202/.test(r.body);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const flat = (x, at = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
const differ = (a, b) => { const x = flat(a), y = flat(b); return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => x[k] !== y[k]); };
const NOBODY = "00000000-0000-0000-0000-000000000000";

/* what the file writes of the catalog: its block, which is the smith's part's (the file is built from the parts, and the block is not changed in it) */
const beside = (name) => new URL(`./${name}`, import.meta.url);
const part = fs.readFileSync(beside("v174.smith.sql"), "utf8").split("\r\n").join("\n");
const block = part.slice(part.indexOf("-- <catalog:v174>"), part.indexOf("-- </catalog:v174>")), want = {};
for (const m of block.matchAll(/\('([a-z_]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const OVER = Object.keys(want);
const TABLE = (row) => (row?.tries ?? []).filter((x) => x.to >= 5 && x.to <= 9).map((x) => `${x.n}/${x.timber}`).join(" ");
ok(`the file's block names three rows of the catalog, each written over (${OVER.join(", ")}), and its forging table asks 3/12 5/12 6/15 9/15 12/18 pieces and timber of +5 to +9`,
  same([...OVER].sort(), ["fishing", "forge", "insects"]) && !block.includes("on conflict (key) do nothing;") && TABLE(want.forge) === "3/12 5/12 6/15 9/15 12/18" && !!want.fishing.nets && typeof want.fishing.nets === "object" && Array.isArray(want.insects.rare), { OVER, table: TABLE(want.forge) });

/* the sixteen functions a member calls, each with something to ask it */
const CALLS = [
  ["town_smith_open", {}], ["town_smith", {}], ["town_smith_smelt", { p_piece: "oreCopper", p_n: 1 }], ["town_smith_take", {}], ["town_smith_widen", {}], ["town_smith_near", { p_ids: [NOBODY] }],
  ["town_smith_bellows", { p_whose: NOBODY }], ["town_smith_try", { p_slot: 0 }], ["town_smith_draw", { p_slot: 0 }], ["town_smith_choose", { p_slot: 0, p_pick: "pkPeek" }],
  ["town_smith_redraw", { p_slot: 0, p_at: 0, p_gem: "gemRuby" }], ["town_smith_gem", { p_slot: 0, p_gem: "gemRuby" }], ["town_smith_move", { p_from: 0, p_to: 1, p_x: 0, p_y: 0, p_playing: false }],
  ["town_fire_join", {}], ["town_fire_leave", {}], ["town_tool_power", { p_id: "ntWide" }],
];
const answers = [];
for (const [fn, body] of CALLS) answers.push([fn, await ask(ANON, fn, body)]);
if (BEFORE) ok("before the file none of its sixteen functions is a function: a page that asks whether the smith is open is told nothing, and shows nothing of him", answers.every(([, r]) => unknown(r)), answers.filter(([, r]) => !unknown(r)).map(([fn, r]) => [fn, r.status]));
else {
  ok("all sixteen functions are there: the file has run", answers.every(([, r]) => !unknown(r)), answers.filter(([, r]) => unknown(r)).map(([fn]) => fn));
  ok("…and somebody signed out is refused every one of them, the question of whether the smith is open among them", answers.every(([, r]) => refused(r)), answers.filter(([, r]) => !refused(r)).map(([fn, r]) => [fn, r.status, r.body.slice(0, 80)]));
  // (a try that is sent a number of chance is no function: the database draws its own)
  const steered = await ask(ANON, "town_smith_try", { p_slot: 0, p_r: 0.01 });
  ok("a try sent a number of chance of the page's own is no function at all", unknown(steered), steered);
  // (the rules are the town's own schema's, which is nobody's to ask through the site's door)
  for (const [fn, body] of [["smith_member", {}], ["fire_kept", { p_hold: false }], ["fire_told", { p_fire: {}, p_me: "", p_now: 0 }], ["forge_try", {}], ["net_fx", { p_stack: {} }], ["rod_fx", { p_stack: {} }], ["net_more_far", { p_purse: {} }], ["tool_paid", {}]]) {
    const r = await ask(ANON, fn, body);
    ok(`the rule ${fn} is no function anybody can ask for`, unknown(r), r);
  }
  const site = await ask(SERVICE, "town_smith_open");
  ok("asked with the site's key, nobody being signed in, whether the smith is open is answered no", site.status === 200 && site.body.trim() === "false", site);
}

/* the two tables */
for (const table of ["town_smiths", "town_great_fire"]) {
  // (of the great fire only that its one row is there: its document is never read here)
  const out = await read(ANON, `${table}?select=*&limit=1`), site = await read(SERVICE, `${table}?select=${table === "town_smiths" ? "updated_at" : "one"}&limit=5`);
  if (BEFORE) ok(`before the file ${table} is no table`, out.status === 404 && site.status === 404, { out: out.status, site: site.status });
  else {
    ok(`${table} is nobody's to read from outside`, out.status === 401 || out.status === 403 || (out.status === 200 && Array.isArray(out.rows) && out.rows.length === 0), { status: out.status, text: out.text });
    ok(`…and is there for the site's key to read`, site.status === 200 && Array.isArray(site.rows), { status: site.status, text: site.text });
    if (table === "town_great_fire") ok("…with its one row", site.rows?.length === 1 && site.rows[0].one === true, site.text);
    else console.log(`    (members with something at the smith: ${site.rows?.length === 5 ? "five or more" : site.rows?.length ?? "?"})`);
  }
}

/* the knob */
const knobs = await read(SERVICE, `town_knobs?select=key,value,updated_at&key=in.(smith_open,far_open,game_open)`);
const knob = Object.fromEntries((Array.isArray(knobs.rows) ? knobs.rows : []).map((r) => [r.key, r]));
if (BEFORE) ok("before the file its knob is not there", Array.isArray(knobs.rows) && !knob.smith_open, knobs.text);
else ok("the smith's knob is there, at 0 (built closed) or at 1 (its owner has opened him)", !!knob.smith_open && [0, 1].includes(Number(knob.smith_open.value)), knobs.text);
console.log(`    (the game itself: ${Number(knob.game_open?.value) > 0 ? "open" : "shut"}; the far side: ${Number(knob.far_open?.value) > 0 ? "open" : "closed"}${knob.smith_open ? `; THE SMITH: ${Number(knob.smith_open.value) > 0 ? "OPEN to every proved character (while the two others are)" : "closed, admins only"}, his knob last written ${knob.smith_open.updated_at}` : ""})`);

/* the catalog */
const got = await read(SERVICE, `town_catalog?select=key,data,updated_at&order=key`);
const live = Object.fromEntries((Array.isArray(got.rows) ? got.rows : []).map((r) => [r.key, r]));
ok("the catalog can be read with the site's key", Array.isArray(got.rows) && got.rows.length > 20, got.text);
if (BEFORE) {
  console.log("    the three rows it writes over, and how many entries of each differ from the file's now:");
  for (const k of OVER) { const d = live[k] ? differ(live[k].data, want[k]) : null; console.log(`      ${k.padEnd(8)} ${d ? `${String(d.length).padStart(4)} differ${d.length ? `   (${d.slice(0, 4).join(", ")}${d.length > 4 ? ", …" : ""})` : ""}` : "is not there"}   last written ${live[k]?.updated_at ?? "never"}`); }
  console.log(`    (the live forging table asks ${TABLE(live.forge?.data)} of +5 to +9; the file's ${TABLE(want.forge)})`);
} else {
  for (const k of OVER) ok(`the live \`${k}\` row is what the file writes, to the entry`, same(live[k]?.data, want[k]), live[k] ? differ(live[k].data, want[k]).slice(0, 8) : "not there");
  const at = OVER.map((k) => Date.parse(live[k]?.updated_at)), later = (got.rows ?? []).filter((r) => Date.parse(r.updated_at) > Math.max(...at) + 5000).map((r) => r.key);
  ok("the three were written in one go", at.every(Number.isFinite) && Math.max(...at) - Math.min(...at) < 5000, OVER.map((k) => live[k]?.updated_at));
  ok("the live forging table asks the owner's pieces of +5 to +9, and the timber tripled with them: 3/12 5/12 6/15 9/15 12/18", TABLE(live.forge?.data) === "3/12 5/12 6/15 9/15 12/18", TABLE(live.forge?.data));
  ok("…and no row of the catalog has been written since", later.length === 0, later);
  console.log(`    (written ${live.forge?.updated_at}; the catalog has ${got.rows?.length} rows)`);
}

/* the village's board at the smith; and what has been done there so far */
const board = await read(SERVICE, `town_things?select=key,doc&key=eq.smith`);
if (BEFORE) ok("before the file the village has no board at the smith", Array.isArray(board.rows) && board.rows.length === 0, board.text);
else {
  const doc = board.rows?.[0]?.doc;
  ok("the village has its board at the smith (a row of its things)", board.rows?.length === 1 && typeof doc?.tops === "object" && typeof doc?.found === "object", board.status);
  console.log(`\n  the board: ${Object.keys(doc?.tops ?? {}).length} kind(s) of tool forged to the top, ${Object.keys(doc?.found ?? {}).length} option(s) found (none, until somebody has tried him)`);
  // (counts only; and never a deed's document)
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const deeds = await read(SERVICE, `town_deeds?select=what,who:member_id&what=in.(smelt,smelted,smith_wider,bellows,forge,forge_draw,forge_choose,forge_redraw,forge_first,gem_set,forge_move,fire_found,fire_join,fire_leave,power)&at=gte.${encodeURIComponent(since)}&order=id.desc&limit=5000`);
  if (!Array.isArray(deeds.rows)) console.log(`  (the deeds could not be read: ${deeds.text})`);
  else if (!deeds.rows.length) console.log("  no deed of the smith's written down yet (he is built closed: an admin's are the first)");
  else {
    const by = new Map(); for (const d of deeds.rows) { const row = by.get(d.what) ?? { n: 0, who: new Set() }; row.n++; row.who.add(d.who); by.set(d.what, row); }
    console.log(`  the smith's deeds of the last seven days (${deeds.rows.length}, by ${new Set(deeds.rows.map((d) => d.who)).size} member(s)):`);
    for (const [what, row] of [...by].sort((a, b) => b[1].n - a[1].n)) console.log(`    ${what.padEnd(13)} ${String(row.n).padStart(5)}   by ${row.who.size}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
// (not process.exit: on Windows it trips over fetch's handles as it goes, and the exit code is lost)
process.exitCode = fail ? 1 : 0;
