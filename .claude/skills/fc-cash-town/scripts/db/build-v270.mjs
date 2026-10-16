// Writes v270's guards: for each function it writes over, the md5 of its definition as the chain through v269 has it
// (before) and as v270 leaves it (after), so the file runs on a database as the bench knows it, and runs again.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v270.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN as BEFORE_V269 } from "./build-v269.mjs";
const FILE = "supabase/v270_quality_asks_less_at_a_tend.sql";
export const CHAIN = [...BEFORE_V269, "v269_the_garden_on_one_plot_a_plant"];
export const SIGS = ["town.quality_bed_gift(text,jsonb)", "town.quality_keep()"];
const md5s = async (db) => Object.fromEntries(await Promise.all(SIGS.map(async (sig) => [sig, (await db.query(`select md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) m`)).rows[0].m])));
/** The file without its guards (as written before they are filled). */
export const bare = (text) => { const open = text.indexOf("-- <guards:v270>"), close = text.indexOf("-- </guards:v270>"); return text.slice(0, open) + "-- <guards:v270>\n" + text.slice(close); };
if (process.argv[1]?.endsWith("build-v270.mjs")) {
  const db = await rewardDB(252);
  try {
    for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
    const before = await md5s(db), text = readFileSync(FILE, "utf8").split("\r\n").join("\n");
    await db.exec(bare(text));
    const after = await md5s(db);
    const open = text.indexOf("-- <guards:v270>"), close = text.indexOf("-- </guards:v270>");
    const guards = SIGS.map((sig) => ` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${before[sig]}','${after[sig]}') then raise exception 'Definition changed: ${sig}; rebuild v270'; end if;`).join("\n");
    writeFileSync(FILE, text.slice(0, open) + "-- <guards:v270>\n" + guards + "\n" + text.slice(close));
    console.log(`v270 guards written for ${SIGS.length} functions`);
  } finally { await db.close(); }
}
