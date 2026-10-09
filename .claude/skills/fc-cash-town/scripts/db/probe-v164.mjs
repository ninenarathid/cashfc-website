// A read-only look at the live database for v164 (the far side: the mountain's trees, its rocks and the cave under
// it). Touches nothing: every call it makes either reads, or is made as somebody signed out and is refused before
// anything of it runs. Prints no key, no name, no id, and never the word the rocks' rolls hang on.
//   node probe-v164.mjs before     before the owner runs the file: its seventeen functions are no functions yet, its
//                                  two tables no tables, its knobs and its four new catalog rows are not there (a
//                                  seeded row that WAS there would be left as it is by the file: this says so), and
//                                  how much of each of the nine rows it writes over differs from the file's
//   node probe-v164.mjs            after: the three knobs are the file's (and whether the far side is open); the two
//                                  tables are there, nobody's to read from outside, the site's key's to read; the
//                                  seventeen functions are there and refuse whoever is signed out; the rules are
//                                  nobody's to ask for; the thirteen catalog rows are the file's to the entry, the nine
//                                  written in one go; the village has its trees and the rocks have their word; and
//                                  what has been done on the far side so far, counted
// What cannot be seen from outside, and is the SQL editor's to look at (the queries at the file's foot): that the ten
// functions of earlier files have their blocks, and who may write the cave's days.
import fs from "node:fs";
const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
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

/* what the file writes of the catalog: its block (the file while it is in supabase/, the draft beside this script before that, the base part's own afterwards) */
const beside = (name) => new URL(`./${name}`, import.meta.url);
const inRepo = fs.existsSync(`${repo}/supabase`) ? fs.readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v164_") && f.endsWith(".sql")) : null;
const file = fs.readFileSync(inRepo ? `${repo}/supabase/${inRepo}` : fs.existsSync(beside("v164_draft.sql")) ? beside("v164_draft.sql") : beside("v164.base.sql"), "utf8").split("\r\n").join("\n");
const block = file.slice(file.indexOf("-- <catalog:v164>"), file.indexOf("-- </catalog:v164>"));
const seeded = block.slice(0, block.indexOf("on conflict (key) do nothing;")), want = {};
for (const m of block.matchAll(/\('([a-z_]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const NEW = Object.keys(want).filter((k) => seeded.includes(`('${k}', $town$`)), OVER = Object.keys(want).filter((k) => !NEW.includes(k));
ok(`the file's block names thirteen rows of the catalog: four it seeds (${NEW.join(", ")}) and nine it writes over (${OVER.join(", ")})`,
  same(NEW, ["forge", "trees", "mining", "pouches"]) && same(OVER, ["items", "goods", "shelf", "hints", "makes", "cooking", "work", "gifts", "box"]) && want.trees.wood.length > 0 && want.mining.rocks.length > 0 && want.box.more.length > 0, { NEW, OVER });

/* the seventeen functions a member calls, each with something to ask it */
const CALLS = [
  ["town_far", {}], ["town_cave_days", {}], ["town_pouch_out", { p_gift: "thingSack", p_slot: 0 }], ["town_pouch_in", { p_slot: 0 }],
  ["town_trees", {}], ["town_fell_begin", { p_tree: 0, p_x: 0, p_y: 0 }], ["town_fell", { p_went: { tree: 0, plain: true, secs: 0 }, p_x: 0, p_y: 0 }], ["town_fell_brace", { p_feller: NOBODY, p_x: 0, p_y: 0 }], ["town_fell_root", { p_tree: 0 }],
  ["town_cave", { p_floor: 0, p_x: null, p_y: null }], ["town_mine", { p_floor: 0, p_rock: 0, p_x: 0, p_y: 0, p_swings: 1, p_how: null }], ["town_mine_peek", { p_floor: 0, p_rock: 0 }], ["town_cave_reach", { p_floor: 10 }],
  ["town_lift", { p_to: 0 }], ["town_torch", { p_x: 0, p_y: 0 }], ["town_drill", { p_x: 0, p_y: 0 }], ["town_vein", { p_go: {} }],
];
const answers = [];
for (const [fn, body] of CALLS) answers.push([fn, await ask(ANON, fn, body)]);
if (BEFORE) ok("before the file none of its seventeen functions is a function: a page that asks whether the far side is open is told nothing, and shows nothing of it", answers.every(([, r]) => unknown(r)), answers.filter(([, r]) => !unknown(r)).map(([fn, r]) => [fn, r.status]));
else {
  ok("all seventeen functions are there: the file has run", answers.every(([, r]) => !unknown(r)), answers.filter(([, r]) => unknown(r)).map(([fn]) => fn));
  ok("…and somebody signed out is refused every one of them, the question of whether the far side is open among them", answers.every(([, r]) => refused(r)), answers.filter(([, r]) => !refused(r)).map(([fn, r]) => [fn, r.status, r.body.slice(0, 80)]));
  // (a page from before the file's code asked a vein with other words: that is no function, and never was one here)
  const old = await ask(ANON, "town_vein", { p_strikes: [] });
  ok("a vein asked as a page from before this file's code asks it is no function (that page has to be loaded again)", unknown(old), old);
  // (the rules are the town's own schema's, which is nobody's to ask through the site's door)
  for (const [fn, body] of [["far_member", {}], ["mine_word", {}], ["cave_laid", { p_day: 0, p_floor: 1 }], ["forged", { p_stack: {} }], ["mine", { p_purse: {}, p_go: {}, p_word: "" }], ["tree_of", { p_tree: 0 }], ["work_counts_of", { p_done: {}, p_doer: "" }]]) {
    const r = await ask(ANON, fn, body);
    ok(`the rule ${fn} is no function anybody can ask for`, unknown(r), r);
  }
  const site = await ask(SERVICE, "town_far");
  ok("asked with the site's key, nobody being signed in, whether the far side is open is answered no", site.status === 200 && site.body.trim() === "false", site);
}

/* the two tables */
for (const table of ["town_cave_days", "town_cave"]) {
  const out = await read(ANON, `${table}?select=*&limit=1`), site = await read(SERVICE, `${table}?select=${table === "town_cave" ? "place" : "day"}&limit=1`);
  if (BEFORE) ok(`before the file ${table} is no table`, out.status === 404 && site.status === 404, { out: out.status, site: site.status });
  else {
    ok(`${table} is nobody's to read from outside`, out.status === 401 || out.status === 403 || (out.status === 200 && Array.isArray(out.rows) && out.rows.length === 0), { status: out.status, text: out.text });
    ok(`…and is there for the site's key to read`, site.status === 200 && Array.isArray(site.rows), { status: site.status, text: site.text });
  }
}

/* the knobs */
const knobs = await read(SERVICE, `town_knobs?select=key,value,updated_at&key=in.(far_open,notice_gem,notice_chip,game_open)`);
const knob = Object.fromEntries((Array.isArray(knobs.rows) ? knobs.rows : []).map((r) => [r.key, r]));
if (BEFORE) ok("before the file none of its three knobs is there", Array.isArray(knobs.rows) && !knob.far_open && !knob.notice_gem && !knob.notice_chip, knobs.text);
else {
  ok("the far side's knob is there, at 0 or at 1", !!knob.far_open && [0, 1].includes(Number(knob.far_open.value)), knobs.text);
  ok("the most a gem may be asked for is 100,000 and a gem's fragment 10,000, as the file seeds them (a number changed since in the panel would show here)", Number(knob.notice_gem?.value) === 100000 && Number(knob.notice_chip?.value) === 10000, [knob.notice_gem?.value, knob.notice_chip?.value]);
}
console.log(`    (the game itself: ${Number(knob.game_open?.value) > 0 ? "open" : "shut"}${knob.far_open ? `; the far side: ${Number(knob.far_open.value) > 0 ? "OPEN to every proved character" : "closed, admins only"}, its knob last written ${knob.far_open.updated_at}` : ""})`);

/* the catalog */
const got = await read(SERVICE, `town_catalog?select=key,data,updated_at&order=key`);
const live = Object.fromEntries((Array.isArray(got.rows) ? got.rows : []).map((r) => [r.key, r]));
ok("the catalog can be read with the site's key", Array.isArray(got.rows) && got.rows.length > 20, got.text);
if (BEFORE) {
  ok("none of the four rows the file seeds is there yet (one that was would be left as it is, whatever it said)", NEW.every((k) => !live[k]), NEW.filter((k) => live[k]));
  console.log("    the nine rows it writes over, and how many entries of each differ from the file's now:");
  for (const k of OVER) { const d = live[k] ? differ(live[k].data, want[k]) : null; console.log(`      ${k.padEnd(8)} ${d ? `${String(d.length).padStart(4)} differ${d.length ? `   (${d.slice(0, 4).join(", ")}${d.length > 4 ? ", …" : ""})` : ""}` : "is not there"}   last written ${live[k]?.updated_at ?? "never"}`); }
} else {
  for (const k of [...NEW, ...OVER]) ok(`the live \`${k}\` row is what the file writes, to the entry`, same(live[k]?.data, want[k]), live[k] ? differ(live[k].data, want[k]).slice(0, 8) : "not there");
  const at = OVER.map((k) => Date.parse(live[k]?.updated_at)), first = Math.min(...at), later = (got.rows ?? []).filter((r) => Date.parse(r.updated_at) > Math.max(...at) + 5000).map((r) => r.key);
  ok("the nine were written in one go", at.every(Number.isFinite) && Math.max(...at) - first < 5000, OVER.map((k) => live[k]?.updated_at));
  ok("the chest at the mountain's foot is in the storage box's row, beside the plaza's: a member's box opens from either", same(live.box?.data?.more, want.box.more) && same(live.box?.data?.at, want.box.at), live.box?.data);
  ok("…and no row of the catalog has been written since", later.length === 0, later);
  console.log(`    (written ${live.items?.updated_at}; the mountain has ${live.trees?.data?.wood?.length} trees and its foot ${live.mining?.data?.rocks?.length} rocks; the catalog has ${got.rows?.length} rows)`);
}

/* the village's trees, and the rocks' word (its key only: the word is never read here) */
const grove = await read(SERVICE, `town_things?select=key,doc&key=eq.grove`), word = await read(SERVICE, `town_secrets?select=key&key=eq.mine`);
if (BEFORE) ok("before the file the village has no trees of its own and the rocks no word", Array.isArray(grove.rows) && grove.rows.length === 0 && Array.isArray(word.rows) && word.rows.length === 0, [grove.text, word.text]);
else {
  ok("the village has its trees (a row of its things), and the rocks their word", grove.rows?.length === 1 && typeof grove.rows[0].doc?.down === "object" && word.rows?.length === 1, [grove.text, word.status]);
  const days = await read(SERVICE, `town_cave_days?select=day,floor&order=day.desc&limit=120`), places = await read(SERVICE, `town_cave?select=place&order=place`);
  const laid = new Map(); for (const r of days.rows ?? []) laid.set(r.day, (laid.get(r.day) ?? 0) + 1);
  console.log(`\n  trees down now: ${Object.keys(grove.rows?.[0]?.doc?.down ?? {}).length}; days of the cave laid: ${[...laid].map(([d, n]) => `${d} (${n} floors)`).join(", ") || "none yet (the site lays a day when a page first asks for it)"}; places of the cave with a row: ${(places.rows ?? []).map((r) => r.place).join(", ") || "none yet"}`);
  // what has been done on the far side so far: counts only
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const deeds = await read(SERVICE, `town_deeds?select=what,who:member_id&what=in.(fell,brace,root,mine,crystal,delve,hew,vein,vein_odd,lift,torch)&at=gte.${encodeURIComponent(since)}&order=id.desc&limit=5000`);
  if (!Array.isArray(deeds.rows)) console.log(`  (the deeds could not be read: ${deeds.text})`);
  else if (!deeds.rows.length) console.log("  no deed of the far side written down yet (it is built closed: an admin's are the first)");
  else {
    const by = new Map(); for (const d of deeds.rows) { const row = by.get(d.what) ?? { n: 0, who: new Set() }; row.n++; row.who.add(d.who); by.set(d.what, row); }
    console.log(`  the far side's deeds of the last seven days (${deeds.rows.length}, by ${new Set(deeds.rows.map((d) => d.who)).size} member(s)):`);
    for (const [what, row] of [...by].sort((a, b) => b[1].n - a[1].n)) console.log(`    ${what.padEnd(10)} ${String(row.n).padStart(5)}   by ${row.who.size}`);
    if (by.has("vein_odd")) console.log("    (a `vein_odd` is a vein's go that the rules could not hold: each is worth a look, in the SQL editor)");
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
// (not process.exit: on Windows it trips over fetch's handles as it goes, and the exit code is lost)
process.exitCode = fail ? 1 : 0;
