// Writes v268's guards: for each function it writes over, the md5 of its definition as the chain through v267 has it
// (before) and as v268 leaves it (after); for each old signature it drops, its md5 before (gone afterwards); for each
// signature it makes, its md5 after (none before). So the file runs on a database as the bench knows it, and again.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v268.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN as BEFORE_V267 } from "./build-v267.mjs";
const FILE = "supabase/v268_graded_things_on_stalls_and_the_board.sql";
export const CHAIN = [...BEFORE_V267, "v267_good_gardens_draw_wild_insects"];
/** Written over, the same signature. */
export const OVER = ["town.jar_add(jsonb,text,integer)", "town.jar_drop(jsonb,jsonb,jsonb)", "town.jar_settle(jsonb,jsonb,jsonb,integer)", "town.jar_collect(jsonb,jsonb)",
  "public.town_jar_drop(integer,integer,integer)", "town.shop_open(jsonb,text,jsonb,integer,integer,bigint,jsonb,jsonb)", "town.shop_can(jsonb,jsonb)",
  "town.shop_told_of(jsonb,jsonb,bigint,jsonb)", "town.notice_told(public.town_notices,uuid)", "town.notices_told(uuid)", "public.town_notice_buy(bigint,integer)",
  "public.town_notice_fill(bigint,integer)", "public.town_notice_fetch(bigint)", "public.town_notice_down(bigint)"];
/** Dropped: a line and a notice are named by their grade now. */
export const GONE = ["town.shop_line(jsonb,text,text,text,integer,integer,integer,bigint,jsonb)", "town.shop_buy(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb)",
  "town.shop_sell(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb)", "town.shop_deal(uuid,uuid,text,text,integer,integer,integer)",
  "public.town_shop_buy(uuid,text,integer,integer,integer)", "public.town_shop_sell(uuid,text,integer,integer,integer)", "public.town_notice_post(text,text,integer,integer)"];
/** Made by it. */
export const NEW = ["town.grade_arg(jsonb)", "town.may_grade(text)", "town.plain_g(jsonb,text,integer)", "town.take_plain_g(jsonb,text,integer,integer)",
  "town.jar_add_g(jsonb,text,integer,integer)", "town.shop_line(jsonb,text,text,text,integer,integer,integer,bigint,jsonb,integer)",
  "town.shop_buy(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb,integer)", "town.shop_sell(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb,integer)",
  "town.shop_deal(uuid,uuid,text,text,integer,integer,integer,integer)", "public.town_shop_buy(uuid,text,integer,integer,integer,integer)",
  "public.town_shop_sell(uuid,text,integer,integer,integer,integer)", "public.town_notice_post(text,text,integer,integer,integer)"];
const md5Of = async (db, sig) => (await db.query(`select md5(replace(pg_get_functiondef(to_regprocedure('${sig}')),chr(13),'')) m`)).rows[0].m;
const md5s = async (db, sigs) => Object.fromEntries(await Promise.all(sigs.map(async (sig) => [sig, await md5Of(db, sig)])));
/** The file without its guards (as written before they are filled). */
export const bare = (text) => { const open = text.indexOf("-- <guards:v268>"), close = text.indexOf("-- </guards:v268>"); return text.slice(0, open) + "-- <guards:v268>\n" + text.slice(close); };
if (process.argv[1]?.endsWith("build-v268.mjs")) {
  const db = await rewardDB(252);
  try {
    for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
    const text = readFileSync(FILE, "utf8").split("\r\n").join("\n");
    const before = await md5s(db, [...OVER, ...GONE]);
    for (const sig of [...OVER, ...GONE]) if (!before[sig]) throw new Error(`${sig} is not on the bench before v268`);
    for (const sig of NEW) if (await md5Of(db, sig)) throw new Error(`${sig} is on the bench before v268`);
    await db.exec(bare(text));
    const after = await md5s(db, [...OVER, ...GONE, ...NEW]);
    for (const sig of GONE) if (after[sig]) throw new Error(`${sig} is still there after v268`);
    const raise = (sig) => `then raise exception 'Definition changed: ${sig}; rebuild v268'; end if;`;
    const guards = [
      ...OVER.map((sig) => ` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${before[sig]}','${after[sig]}') ${raise(sig)}`),
      // (a signature v268 drops is the chain's or gone; one it makes is v268's or not yet there)
      ...GONE.map((sig) => ` if md5(replace(pg_get_functiondef(to_regprocedure('${sig}')),chr(13),'')) <> '${before[sig]}' ${raise(sig)}`),
      ...NEW.map((sig) => ` if md5(replace(pg_get_functiondef(to_regprocedure('${sig}')),chr(13),'')) <> '${after[sig]}' ${raise(sig)}`),
    ].join("\n");
    const open = text.indexOf("-- <guards:v268>"), close = text.indexOf("-- </guards:v268>");
    writeFileSync(FILE, text.slice(0, open) + "-- <guards:v268>\n" + guards + "\n" + text.slice(close));
    console.log(`v268 guards written for ${OVER.length} functions written over, ${GONE.length} signatures dropped, ${NEW.length} made`);
  } finally { await db.close(); }
}
