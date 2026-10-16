// Writes v275's guards: for the function it writes over, the md5 of its definition as the chain through v274 has it
// (before) and as v275 leaves it (after), so the file runs on a database as the bench knows it, and runs again.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v275.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN as BEFORE_V274 } from "./build-v274.mjs";
const FILE = "supabase/v275_the_old_wide_hybrids_on_one_plot.sql";
export const CHAIN = [...BEFORE_V274, "v274_the_farms_own_pouch_and_bigger_crop_stacks"];
export const SIGS = ["town.yield_of(text,jsonb,text)"];
const md5s = async (db) => Object.fromEntries(await Promise.all(SIGS.map(async (sig) => [sig, (await db.query(`select md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) m`)).rows[0].m])));
/** The file without its guards (as written before they are filled). */
export const bare = (text) => { const open = text.indexOf("-- <guards:v275>"), close = text.indexOf("-- </guards:v275>"); return text.slice(0, open) + "-- <guards:v275>\n" + text.slice(close); };
if (process.argv[1]?.endsWith("build-v275.mjs")) {
  const db = await rewardDB(252);
  try {
    for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
    const before = await md5s(db), text = readFileSync(FILE, "utf8").split("\r\n").join("\n");
    await db.exec(bare(text));
    const after = await md5s(db);
    const open = text.indexOf("-- <guards:v275>"), close = text.indexOf("-- </guards:v275>");
    const guards = SIGS.map((sig) => ` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${before[sig]}','${after[sig]}') then raise exception 'Definition changed: ${sig}; rebuild v275'; end if;`).join("\n");
    writeFileSync(FILE, text.slice(0, open) + "-- <guards:v275>\n" + guards + "\n" + text.slice(close));
    console.log(`v275 guards written for ${SIGS.length} function`);
  } finally { await db.close(); }
}
