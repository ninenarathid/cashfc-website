// Writes supabase/v315_fishing_where_the_rocks_moved.sql: the editor's town's parts of the catalog (town.map_parts, v295)
// made again from the code, after the map's author's later export (oato-v3, 2026-10-31): its rocks along the south shore
// and a few elsewhere stand on other tiles, which changes where one fishes and which tiles a member's things move off.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v315.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const REPO = process.env.FC_REPO ?? process.cwd();
const town2 = execFileSync(process.execPath, [".claude/skills/fc-cash-town/scripts/db/town2-parts.mjs"],
  { cwd: REPO, env: { ...process.env, FC_REPO: REPO, TOWN_MAP: "town2" }, encoding: "utf8", maxBuffer: 1 << 26 });
if (town2.includes("$parts$")) throw new Error("a part holds the quoting tag");
process.env.FC_REPO = REPO;
await import("./repo-ts-town.mjs");
const { BOARD_SPOTS } = await import("@/lib/town/board-insects");

const sql = `-- v315 — fishing where the rocks moved: the editor's town's parts of the catalog, made again from the code
--
-- Run once in the Supabase SQL editor, AFTER the site's deploy that has the map of 2026-10-31. Running it again is safe and
-- changes nothing more. Needs v295 and v296.
--
-- The owner asked for the town to be mended from its author's later export ("ลองใช้ folder oato-v3 ใน Download แก้ไข เมือง
-- แรกตาม feedback นี้"). Most of that is pictures and the order they are drawn in, which the database knows nothing of. But
-- that export sets a few rocks, a lantern and a bin on other tiles, so what the database keeps of the town has to follow:
--   * where one fishes: seven tiles of the south and west shores can now be fished from (57,73 58,73 59,73 61,73 63,73
--     68,74 6,75), because the rock that closed the water before them has moved, and five no longer can, because a rock
--     now stands on them (13,79 20,11 45,72 52,70 67,74). Without this, a member fishing from one of the seven is refused.
--   * \`moves\`, where a member's things on a closed tile go, for the fourteen tiles newly closed.
--   * the leaf roll's third spot (spots[2], lib/town/board-insects): its hydrangea stands a tile further down now, 44,31.
--     The number stays, and only that entry differs from the row as it stands.
-- Nothing else of it changes: the insects' haunts stay to the last perch (lib/town/haunts-town2.json keeps them), and the
-- kitchen, the box, the forge, the casino's door and the banker are where they were.
--
-- What it does: the editor's town's row of town.map_parts is written again as the code makes it. If the editor's town is
-- the town (as it is), its parts are laid over the catalog again, and members' pots and water relays on a tile it now
-- closes are moved to the nearest open one (there were none on them on 2026-10-31).

begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';
do $$ begin
  if to_regprocedure('town.apply_map(text,uuid)') is null then raise exception 'Run v295 before v315'; end if;
end $$;

insert into town.map_parts (map, parts, taken) values ('town2', $parts$${town2}$parts$::jsonb, 'code')
  on conflict (map) do update set parts = excluded.parts, taken = 'code', taken_at = now();

do $$ begin
  if (select catalog from public.town_map_switch where one) = 'town2' then
    perform town.lay_parts((select parts from town.map_parts where map = 'town2'));
    perform town.move_things((select parts from town.map_parts where map = 'town2'));
  end if;
end $$;

update public.town_catalog set data = jsonb_set(data, '{spots}', $spots$${JSON.stringify(BOARD_SPOTS)}$spots$::jsonb), updated_at = now() where key = 'boards';

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select data->'places' ? '57,73' as a_new_place, data->'places' ? '52,70' as a_gone_place from public.town_catalog where key = 'fishing';
--   → true, false
--   select taken from town.map_parts where map = 'town2';
--   → code
--   select jsonb_array_length(data->'haunts') as haunts from public.town_catalog where key = 'insects';
--   → the same as before this file
--   select data->'spots'->2 from public.town_catalog where key = 'boards';
--   → {"x": 44, "y": 31, "id": 2, "board": "roll", "place": "town"}
`;
writeFileSync(`${REPO}/supabase/v315_fishing_where_the_rocks_moved.sql`, sql);
console.log(`v315: ${sql.length} characters`);
