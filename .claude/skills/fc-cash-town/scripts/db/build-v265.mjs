// Writes v265's guards: for each function it writes over, the md5 of its definition as the chain through v263 has it
// (before) and as v265 leaves it (after) (v264, the new species, joins the chain when it is merged), so the file runs on a database as the bench knows it, and runs again.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v265.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
const FILE = "supabase/v265_the_insect_house.sql";
const SIGS = ["town.quality_bed_gift(text,jsonb)", "town.quality_accrue(jsonb,bigint,jsonb)", "town.quality_keep()", "public.town_farm(bigint)"];
const md5s = async (db) => Object.fromEntries(await Promise.all(SIGS.map(async (sig) => [sig, (await db.query(`select md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) m`)).rows[0].m])));
const db = await rewardDB(252);
try {
  for (const f of ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v259_a_crop_counts_its_good_care", "v260_produce_keeps_its_grade", "v261_a_dish_as_good_as_what_went_in", "v262_compost_and_the_pollen_brush", "v263_helper_plants_and_their_crossings"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const before = await md5s(db), text = readFileSync(FILE, "utf8").split("\r\n").join("\n");
  const open = text.indexOf("-- <guards:v265>"), close = text.indexOf("-- </guards:v265>");
  const bare = text.slice(0, open) + "-- <guards:v265>\n" + text.slice(close);
  await db.exec(bare);
  const after = await md5s(db);
  const guards = SIGS.map((sig) => ` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${before[sig]}','${after[sig]}') then raise exception 'Definition changed: ${sig}; rebuild v265'; end if;`).join("\n");
  writeFileSync(FILE, text.slice(0, open) + "-- <guards:v265>\n" + guards + "\n" + text.slice(close));
  console.log(`v265 guards written for ${SIGS.length} functions`);
} finally { await db.close(); }
