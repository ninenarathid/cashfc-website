// Writes v286's guards: for each function it writes over, the md5 of its definition as the chain through v285 has it
// (before) and as v286 leaves it (after), so the file runs on a database as the bench knows it, and runs again.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v286.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN as BEFORE_V277 } from "./build-v277.mjs";
export const FILE = "supabase/v286_the_insect_house_keeps_pests_off.sql";
export const CHAIN = [...BEFORE_V277, "v277_forty_six_things_to_wear", "v283_the_farm_picks_for_one_and_tells_its_prices", "v285_crops_keep_a_deeper_market"];
export const SIGS = ["town.pest_at(text,jsonb,bigint)", "town.quality_keep()"];
const md5s = async (db) => Object.fromEntries(await Promise.all(SIGS.map(async (sig) => [sig, (await db.query(`select md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) m`)).rows[0].m])));
/** The file without its guards (as written before they are filled). */
export const bare = (text) => { const open = text.indexOf("-- <guards:v286>"), close = text.indexOf("-- </guards:v286>"); return text.slice(0, open) + "-- <guards:v286>\n" + text.slice(close); };
if (process.argv[1]?.endsWith("build-v286.mjs")) {
  const db = await rewardDB(252);
  try {
    for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
    const before = await md5s(db), text = readFileSync(FILE, "utf8").split("\r\n").join("\n");
    await db.exec(bare(text));
    const after = await md5s(db);
    const open = text.indexOf("-- <guards:v286>"), close = text.indexOf("-- </guards:v286>");
    const guards = SIGS.map((sig) => ` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${before[sig]}','${after[sig]}') then raise exception 'Definition changed: ${sig}; rebuild v286'; end if;`).join("\n");
    writeFileSync(FILE, text.slice(0, open) + "-- <guards:v286>\n" + guards + "\n" + text.slice(close));
    console.log(`v286 guards written for ${SIGS.length} functions`);
  } finally { await db.close(); }
}
