// Writes supabase/v296_the_editors_town_as_it_stands.sql: the editor's town's parts of the catalog (town.map_parts, v295)
// made again from the code, after the owner's round of 2026-10-22 (its stage walked on, its kitchen hall's back doorway
// without the stove that stood in it, the ground behind the water pavilion's tank closed).
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v296.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const REPO = process.env.FC_REPO ?? process.cwd();
const town2 = execFileSync(process.execPath, [".claude/skills/fc-cash-town/scripts/db/town2-parts.mjs"],
  { cwd: REPO, env: { ...process.env, FC_REPO: REPO, TOWN_MAP: "town2" }, encoding: "utf8", maxBuffer: 1 << 26 });
if (town2.includes("$parts$")) throw new Error("a part holds the quoting tag");

const sql = `-- v296 — the editor's town's parts of the catalog, made again from the code
--
-- Run once in the Supabase SQL editor, AFTER the site's deploy that has them. Running it again is safe and changes
-- nothing more. Needs v295.
--
-- The owner's round of 2026-10-22 on the editor's town changed what the database keeps of it (town.map_parts, v295):
-- the stove that stood in the kitchen hall's back doorway is taken out ("เอาอันนี้ออกให้ด้วย มันขวางทางประตู": its tile
-- is the hall's floor, the two places to cook beside it go), the hall is walked into by its front gap and that doorway
-- only, the stage is walked on, and the ground behind the water pavilion's tank is closed (where a member's pot is moved
-- from, on the day the town is opened). Nothing else of it changes: where one fishes, the insects' haunts, the box, the
-- forge and the rest are as v295 had them.
--
-- What it does: the editor's town's row of town.map_parts is written again as the code makes it. While the old town is
-- the town (as now: the switch says 'town2-admins', the catalog the old town's), nothing a member meets changes. If the
-- editor's town is the town already, its parts are laid over the catalog again, and members' pots and water relays on a
-- tile it now closes are moved to the nearest open one.

begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';
do $$ begin
  if to_regprocedure('town.apply_map(text,uuid)') is null then raise exception 'Run v295 before v296'; end if;
end $$;

insert into town.map_parts (map, parts, taken) values ('town2', $parts$${town2}$parts$::jsonb, 'code')
  on conflict (map) do update set parts = excluded.parts, taken = 'code', taken_at = now();

do $$ begin
  if (select catalog from public.town_map_switch where one) = 'town2' then
    perform town.lay_parts((select parts from town.map_parts where map = 'town2'));
    perform town.move_things((select parts from town.map_parts where map = 'town2'));
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
`;
writeFileSync(`${REPO}/supabase/v296_the_editors_town_as_it_stands.sql`, sql);
console.log(`v296: ${(sql.length / 1024).toFixed(0)} KB`);
