// Windows clipboard line endings are harmless; actual definition changes must still stop v175.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
const root = process.env.FC_REPO;
const v174 = readFileSync(join(root,"supabase/v174_the_blacksmith_his_great_fire_and_the_older_tools.sql"),"utf8").replace(/\r\n/g,"\n");
const v175 = readFileSync(join(root,"supabase/v175_a_great_fire_for_each_new_day.sql"),"utf8").replace(/\r\n/g,"\n");
for (const ending of ["LF","CRLF"]) {
  const t = await standIn();
  await t.db.exec(ending === "LF" ? v174 : v174.replace(/\n/g,"\r\n"));
  await t.runTwice(v175, `v175 after ${ending} v174`);
  await t.runTwice(v175.replace(/\n/g,"\r\n"), `v175 copied as CRLF after ${ending} v174`);
  const def = (await t.sql("select pg_get_functiondef('town.fire_sound(jsonb)'::regprocedure) d")).rows[0].d;
  const changed = def.replace("return town.fire_new()", "perform town.fire_new(); return town.fire_new()");
  if (def === changed) throw new Error("mutation anchor missing");
  await t.db.exec(changed);
  try { await t.db.exec(v175); t.check("real definition change rejected", false); }
  catch(e) { t.check("real definition change rejected", /Definition changed: town.fire_sound/.test(e.message),e.message); await t.db.exec("rollback"); }
  t.done();
  await t.db.close();
  if (process.exitCode) process.exit(process.exitCode);
}
