// Writes v260's guards: for each function it writes over, the md5 of its definition as the chain through v259 has it
// (before) and as v260 leaves it (after), so the file runs on a database as the bench knows it, and runs again.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v260.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
const FILE = "supabase/v260_produce_keeps_its_grade.sql";
const SIGS = ["town.room(jsonb,text)", "town.put(jsonb,text,integer)", "town.take(jsonb,text,integer)", "town.plain(jsonb,text)", "town.take_plain(jsonb,text,integer)",
  "town.push(jsonb,jsonb)", "town.leave(jsonb,integer,integer,bigint,integer)", "town.take_back(jsonb,integer,bigint)", "town.collect(jsonb,bigint)",
  "town.has_all(jsonb,jsonb)", "town.pull(jsonb,jsonb)", "town.pick(text,jsonb,jsonb,boolean,text,bigint)"];
const md5s = async (db) => Object.fromEntries(await Promise.all(SIGS.map(async (sig) => [sig, (await db.query(`select md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) m`)).rows[0].m])));
const db = await rewardDB(252);
try {
  for (const f of ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v259_a_crop_counts_its_good_care"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const before = await md5s(db), text = readFileSync(FILE, "utf8").split("\r\n").join("\n");
  const open = text.indexOf("-- <guards:v260>"), close = text.indexOf("-- </guards:v260>");
  const bare = text.slice(0, open) + "-- <guards:v260>\n" + text.slice(close);
  await db.exec(bare);
  const after = await md5s(db);
  const guards = SIGS.map((sig) => ` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${before[sig]}','${after[sig]}') then raise exception 'Definition changed: ${sig}; rebuild v260'; end if;`).join("\n");
  writeFileSync(FILE, text.slice(0, open) + "-- <guards:v260>\n" + guards + "\n" + text.slice(close));
  console.log(`v260 guards written for ${SIGS.length} functions`);
} finally { await db.close(); }
