// Writes v274's guards: for each function it writes over, the md5 of its definition as the chain through v273 has it
// (before) and as v274 leaves it (after), so the file runs on a database as the bench knows it, and runs again. (v272
// is left out of the chain, as for v273: it needs Supabase's realtime.send, and touches nothing of the farm.)
//   cd <the tree> && TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts     (the catalog's block)
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v274.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN as BEFORE_V273 } from "./build-v273.mjs";
export const FILE = "supabase/v274_the_farms_own_pouch_and_bigger_crop_stacks.sql";
export const CHAIN = [...BEFORE_V273, "v273_the_hoe_moves_a_plant_the_mandrake_tops_its_fruit"];
export const SIGS = [
  "town.pouches_of(jsonb)", "town.room_in(jsonb,text)", "town.stow_away(jsonb,text,integer)", "town.stow_all_v207(jsonb,jsonb)",
  "town.pouch_to_bag(jsonb,text,integer)", "town.bag_to_pouch(jsonb,integer)", "town.sow(jsonb,jsonb,text,text,bigint)",
  "town.row_for(text,jsonb,jsonb,jsonb,text,bigint,text)", "town.pick(text,jsonb,jsonb,boolean,text,bigint,text)",
  "town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint,boolean)", "town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)",
  "town.deed_th(text)", "public.town_pouch_out(text,integer)", "public.town_pouch_in(integer)",
];
const md5s = async (db) => Object.fromEntries(await Promise.all(SIGS.map(async (sig) => [sig, (await db.query(`select md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) m`)).rows[0].m])));
/** The file without its guards (as written before they are filled). */
export const bare = (text) => { const open = text.indexOf("-- <guards:v274>"), close = text.indexOf("-- </guards:v274>"); return text.slice(0, open) + "-- <guards:v274>\n" + text.slice(close); };
if (process.argv[1]?.endsWith("build-v274.mjs")) {
  const db = await rewardDB(252);
  try {
    for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
    const before = await md5s(db), text = readFileSync(FILE, "utf8").split("\r\n").join("\n");
    await db.exec(bare(text));
    const after = await md5s(db);
    const open = text.indexOf("-- <guards:v274>"), close = text.indexOf("-- </guards:v274>");
    const guards = SIGS.map((sig) => ` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${before[sig]}','${after[sig]}') then raise exception 'Definition changed: ${sig}; rebuild v274'; end if;`).join("\n");
    writeFileSync(FILE, text.slice(0, open) + "-- <guards:v274>\n" + guards + "\n" + text.slice(close));
    console.log(`v274 guards written for ${SIGS.length} functions`);
  } finally { await db.close(); }
}
