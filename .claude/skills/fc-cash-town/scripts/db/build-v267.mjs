// Writes v267's guards: for each function it writes over, the md5 of its definition as the chain through v266 has it
// (before) and as v267 leaves it (after), so the file runs on a database as the bench knows it, and runs again.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v267.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
const FILE = "supabase/v267_good_gardens_draw_wild_insects.sql";
export const CHAIN = ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v255_important_town_announcements", "v258_finite_profession_rewards", "v259_a_crop_counts_its_good_care", "v260_produce_keeps_its_grade",
  "v261_a_dish_as_good_as_what_went_in", "v262_compost_and_the_pollen_brush", "v263_helper_plants_and_their_crossings", "v264_species_of_the_time_bands", "v265_the_insect_house", "v266_fertilisers_of_quality"];
const SIGS = ["town.bug_at(integer,bigint,jsonb,text)", "town.farm_bugs(bigint)"];
const md5s = async (db) => Object.fromEntries(await Promise.all(SIGS.map(async (sig) => [sig, (await db.query(`select md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) m`)).rows[0].m])));
if (process.argv[1]?.endsWith("build-v267.mjs")) {
  const db = await rewardDB(252);
  try {
    for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
    const before = await md5s(db), text = readFileSync(FILE, "utf8").split("\r\n").join("\n");
    const open = text.indexOf("-- <guards:v267>"), close = text.indexOf("-- </guards:v267>");
    const bare = text.slice(0, open) + "-- <guards:v267>\n" + text.slice(close);
    await db.exec(bare);
    const after = await md5s(db);
    const guards = SIGS.map((sig) => ` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${before[sig]}','${after[sig]}') then raise exception 'Definition changed: ${sig}; rebuild v267'; end if;`).join("\n");
    writeFileSync(FILE, text.slice(0, open) + "-- <guards:v267>\n" + guards + "\n" + text.slice(close));
    console.log(`v267 guards written for ${SIGS.length} functions`);
  } finally { await db.close(); }
}
