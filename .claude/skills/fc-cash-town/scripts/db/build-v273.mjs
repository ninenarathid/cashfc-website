// Writes v273's guards: for each function it writes over, the md5 of its definition as the chain through v271 has it
// (before) and as v273 leaves it (after), so the file runs on a database as the bench knows it, and runs again. (v272
// is left out of the chain: it needs Supabase's realtime.send, which the bench has not, and touches nothing of the farm.)
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/fill-catalog.mjs v273 supabase/v273_the_hoe_moves_a_plant_the_mandrake_tops_its_fruit.sql
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v273.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN as BEFORE_V271 } from "./build-v271.mjs";
export const FILE = "supabase/v273_the_hoe_moves_a_plant_the_mandrake_tops_its_fruit.sql";
export const CHAIN = [...BEFORE_V271, "v271_the_insects_look_asks_less"];
export const SIGS = [
  "town.yield_of(text,jsonb,text)", "town.pest_at(text,jsonb,bigint)", "town.quality_harvest(text,jsonb,integer,bigint,text,integer)",
  "town.pick(text,jsonb,jsonb,boolean,text,bigint)", "town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)",
  "town.tend_v205(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean)", "town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)",
];
const md5s = async (db) => Object.fromEntries(await Promise.all(SIGS.map(async (sig) => [sig, (await db.query(`select md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) m`)).rows[0].m])));
/** The file without its guards (as written before they are filled). */
export const bare = (text) => { const open = text.indexOf("-- <guards:v273>"), close = text.indexOf("-- </guards:v273>"); return text.slice(0, open) + "-- <guards:v273>\n" + text.slice(close); };
if (process.argv[1]?.endsWith("build-v273.mjs")) {
  const db = await rewardDB(252);
  try {
    for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
    const before = await md5s(db), text = readFileSync(FILE, "utf8").split("\r\n").join("\n");
    await db.exec(bare(text));
    const after = await md5s(db);
    const open = text.indexOf("-- <guards:v273>"), close = text.indexOf("-- </guards:v273>");
    const guards = SIGS.map((sig) => ` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${before[sig]}','${after[sig]}') then raise exception 'Definition changed: ${sig}; rebuild v273'; end if;`).join("\n");
    writeFileSync(FILE, text.slice(0, open) + "-- <guards:v273>\n" + guards + "\n" + text.slice(close));
    console.log(`v273 guards written for ${SIGS.length} functions`);
  } finally { await db.close(); }
}
