// The breaks that matter for a base, each with the check that has to notice it:
//   FC_REPO=<the worktree's root> node mutate.mjs <root>/.claude/skills/fc-cash-town/scripts/db/v164.base.sql v164.base.test.mjs v164.base.mutations.mjs
// (FROM=<n> TO=<m> takes a slice of the list, for running it in parts side by side: a run is some fifteen seconds.)
//
// And the lines the part writes into `town.by_box` (v164.base.lines.mjs, which no break of the part's own file
// reaches), broken the same way as the woodcutters' part breaks its own:
//   FC_REPO=<the worktree's root> node v164.base.mutations.mjs lines
// (it lays a copy of the part in a folder beside itself, with the lines broken, and tries that)
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export default ({ cut, swap }) => {
  const all = [
    // ── the gate ──
    ["the gate turned round: it refuses while the far side is open, and lets by while it is closed",
      swap("), 0) <= 0 then\n    raise exception 'the far side is not open yet'", "), 0) > 0 then\n    raise exception 'the far side is not open yet'"),
      ["the gate refuses a proved member, while it is closed", "the gate lets a proved member by once it is open"]],
    ["the gate asks nothing of the knob: every proved member is let by",
      cut("  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'far_open'), 0) <= 0 then\n    raise exception 'the far side is not open yet'", "  return me;\nend;\n$$;\n\n-- Whether the far side is open"),
      ["the gate refuses a proved member, while it is closed", "closed again by its knob"]],
    ["the gate refuses an admin too while it is closed",
      swap("  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'far_open'), 0) <= 0 then", "  if coalesce((select k.value from public.town_knobs k where k.key = 'far_open'), 0) <= 0 then"),
      ["the gate lets an admin by while it is closed"]],
    ["the gate does not ask who is there at all: it stands on nothing of the game's own check",
      swap("  me uuid := town.member();\nbegin\n  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'far_open')", "  me uuid := auth.uid();\nbegin\n  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'far_open')"),
      ["the gate still refuses a member whose character was never proved once it is open", "with the game itself shut"]],
    ["town_far says yes while the knob says closed",
      swap("where k.key = 'far_open'), 0) > 0));", "where k.key = 'far_open'), 0) >= 0));"),
      ["town_far: no to a proved member while the far side is closed"]],
    ["town_far does not ask whether the game itself is open",
      swap("              and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) > 0\n", ""),
      ["with the game itself shut"]],
    ["town_far says yes to whoever is signed in",
      swap("          or (public.verified_character()\n", "          or (true\n"),
      ["town_far: yes to a proved member and to an admin; still no to the unproved"]],
    ["town_far is for somebody signed out too",
      swap("revoke execute on function public.town_far() from public, anon;", "grant execute on function public.town_far() to anon;"),
      ["public.town_far: for the signed in, not for the signed out", "town_far: somebody signed out is not answered at all"]],
    ["the far side is built open",
      swap("('far_open', 0),", "('far_open', 1),"),
      ["the knob is there and says closed"]],
    ["the reader of the cave's days does not go by the gate",
      swap("  perform town.far_member();\n", ""),
      ["the gate refuses a proved member, while it is closed", "the gate refuses a member with no character"]],
    ["a pouch is emptied by the game's gate, not the far side's",
      swap("  me uuid := town.far_member();\n  did jsonb := town.pouch_to_bag(", "  me uuid := town.member();\n  did jsonb := town.pouch_to_bag("),
      ["the gate refuses a proved member, while it is closed"]],
    // ── a table left open ──
    ["the cave's places are left as Supabase makes a table: open to every browser",
      swap("revoke all on table public.town_cave from anon, authenticated;", ""),
      ["public.town_cave: row level security on, nothing granted to a browser", "a proved member reads none of the tables"]],
    ["the cave's days have no row level security",
      swap("alter table public.town_cave_days enable row level security;", ""),
      ["public.town_cave_days: row level security on"]],
    ["the cave's days are taken from the site's key only: a browser keeps every grant it was born with",
      swap("revoke all on table public.town_cave_days from anon, authenticated, service_role;", "revoke all on table public.town_cave_days from service_role;"),
      ["public.town_cave_days: row level security on, nothing granted to a browser", "somebody signed out reads none of the tables"]],
    ["a rule is left for a browser to call",
      swap("revoke execute on all functions in schema town from public, anon, authenticated;", "revoke execute on all functions in schema town from anon;"),
      ["no rule of schema town is for anybody to call"]],
    // ── what is laid stays laid ──
    ["the site's key is taken for the editor: it may lay any day",
      swap("  if current_user in ('postgres', 'supabase_admin') then\n    if tg_op = 'DELETE'", "  if current_user in ('postgres', 'supabase_admin', 'service_role') then\n    if tg_op = 'DELETE'"),
      ["a far-off day's floor is refused", "yesterday's floor is refused"]],
    ["the site's key may change and take away what is laid (the guard lets everything but an insert by, and the key is granted it)",
      (s) => swap("  if tg_op <> 'INSERT' then\n    raise exception 'a floor that was laid", "  if false then\n    raise exception 'a floor that was laid")(swap("grant select, insert on table public.town_cave_days to service_role;", "grant select, insert, update, delete on table public.town_cave_days to service_role;")(s)),
      ["what is laid is not changed and not taken away"]],
    ["a day a hundred days off may be laid",
      swap("new.day > today + 1 then", "new.day > today + 100 then"),
      ["a far-off day's floor is refused"]],
    ["a day gone by may be laid",
      swap("  if new.day < today or", "  if new.day < today - 100 or"),
      ["yesterday's floor is refused"]],
    ["a floor past the cave's last may be laid",
      swap("new.floor > floors then", "new.floor > floors + 50 then"),
      ["a floor the cave has not is refused"]],
    ["a floor with too few tiles may be laid",
      swap("     or length(new.layout->>'open') <> side * side or", "     or"),
      ["what is no floor is refused"]],
    ["a day is listed as laid with one floor of it",
      swap("having count(*) >= floors) d)", "having count(*) >= 1) d)"),
      ["a day with some of its floors is `unlaid` to a page"]],
    ["a day with one floor of it is laid, to a page and to the rules: nobody is told `unlaid`",
      swap("c.day = p_day) >= (town.cat('mining')->>'floors')::integer $$;", "c.day = p_day) >= 1 $$;"),
      ["a day with some of its floors is `unlaid` to a page", "…and to the rules: a day with some of its floors is not laid"]],
    ["a day that is not laid is answered as if it were: the page is never sent to have it laid",
      swap("return (case when town.cave_is_laid(today) then jsonb_build_object('ok', true) else town.no('unlaid') end)", "return (case when true then jsonb_build_object('ok', true) else town.no('unlaid') end)"),
      ["a day with some of its floors is `unlaid` to a page"]],
    // ── the caps ──
    ["a gem's most is a tenth of what it is to be",
      swap("('notice_gem', 100000),", "('notice_gem', 10000),"),
      ["dear_of", "shop_cap", "notice_cap", "the knob is there and says closed", "the board: a gem at 100,000"]],
    ["a fragment's most is a gem's",
      swap("('notice_chip', 10000) ", "('notice_chip', 100000)"),
      ["dear_of", "shop_cap", "notice_cap", "the board: a gem at 100,000"]],
    ["a fragment is read by the gem's knob",
      swap("when town.chip_element(p_item) is not null then coalesce((select k.value from public.town_knobs k where k.key = 'notice_chip')", "when town.chip_element(p_item) is not null then coalesce((select k.value from public.town_knobs k where k.key = 'notice_gem')"),
      ["dear_of", "shop_cap", "notice_cap"]],
    ["a fragment is taken for a gem",
      swap("   where f.k->'gems'->e.id->>'gem' = p_item order by e.ord limit 1", "   where p_item in (f.k->'gems'->e.id->>'gem', f.k->'gems'->e.id->>'chip') order by e.ord limit 1"),
      ["gem_element", "dear_of"]],
    // ── a rule of each kind, so that the cases are seen to bite ──
    ["a tool one level short of the top is read as at it",
      swap("least((town.cat('forge')->'forge'->>'top')::numeric, floor((p_stack->>'plus')::numeric)))::integer end", "least((town.cat('forge')->'forge'->>'top')::numeric, ceil((p_stack->>'plus')::numeric)))::integer end"),
      ["tool_level", "tool_mods"]],
    ["an option kept twice counts at both its milestones",
      swap("       and not exists (select 1 from jsonb_array_elements(p_kept) with ordinality b(v, ord) where b.ord - 1 < i and b.v = e) then", "       then"),
      ["tool_drawn", "tool_mods"]],
    ["a forging away from home is read as at home",
      swap("  away_ := not town.same_pool(carried->>'origin', kind_);", "  away_ := false;"),
      ["tool_mods", "tool_has"]],
    ["the slot remembered with the hand is not looked at",
      swap("  if p_taken is not null and p_taken >= 0 and p_taken < jsonb_array_length(bag) and bag->p_taken->>'item' = hand_ then return p_taken; end if;\n", ""),
      ["hand_slot", "hand_stack"]],
    ["a count of another stretch still counts",
      swap("     or (u->>'k')::numeric <> town.stretch_at(rule, p_now) then return 0; end if;", "     then return 0; end if;"),
      ["power_used", "use_power"]],
    ["everybody has every pouch",
      swap("    continue when not (had ? (p->>'gift'));\n", ""),
      ["pouches_of", "held_in", "somebody with no pouch has nowhere to put it"]],
    ["the bag is filled before a pouch",
      swap("    continue when left_ <= 0 or not (p->'holds' ? p_id);\n    add_ := least(left_, town.room(p->'slots', p_id));", "    continue when true;\n    add_ := least(left_, town.room(p->'slots', p_id));"),
      ["stow_away", "stow_all"]],
    ["a forged tool goes into a pouch",
      swap("or s ? 'water' or town.forged(s) then return town.no('none'); end if;\n  left_ :=", "or s ? 'water' then return town.no('none'); end if;\n  left_ :="),
      ["bag_to_pouch"]],
    ["a plus of nothing is a forging",
      swap("then (p_stack->>'plus')::numeric > 0 else false end", "then (p_stack->>'plus')::numeric >= 0 else false end"),
      ["forged", "plain", "leave"]],
    // ── the chest at the mountain's foot ──
    ["the catalog is not told of the chest at the mountain's foot",
      swap('"more": [[67,242]]', '"more": []'),
      ["the catalog is the code's after the part's own block", "by_box:", "stow:", "the chests: one beyond the plaza's", "standing beside the mountain's chest"]],
    ["the part goes out without the chest's lines (and so without any of its lines)",
      swap("-- <town.by_box>\n-- </town.by_box>", "-- <town.by_box_>\n-- </town.by_box_>"),
      ["by_box:", "standing beside the mountain's chest"]],
  ];
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? all.length);
  // (an anchor of more than one line is written with plain line ends: the part is read so, however git checked it out)
  return all.slice(from, to).map(([name, mutate, mustFail]) => [name, (sql) => mutate(sql.split("\r\n").join("\n")), mustFail]);
};

/** The lines' own breaks: [what it is, the text of v164.base.lines.mjs that is changed, what stands in its place, the checks that have to fail]. */
export const LINES = [
  ["the chest at the mountain's foot opens no box: the line that reads `box.more` is never true",
    "    or exists (select 1 from jsonb_array_elements(", "    or false and exists (select 1 from jsonb_array_elements(", ["by_box:", "stow:", "the chests: one beyond the plaza's", "standing beside the mountain's chest"]],
  ["the mountain's chest opens the box from its own tile",
    "abs(p_y - (c.v->>1)::int)) between 1 and (b.k->>'reach')::int)", "abs(p_y - (c.v->>1)::int)) between 0 and (b.k->>'reach')::int)", ["by_box:", "the chests: one beyond the plaza's", "from the mountain's chest's own tile"]],
  ["the mountain's chest opens the box from a tile further off than the plaza's does",
    "abs(p_y - (c.v->>1)::int)) between 1 and (b.k->>'reach')::int)", "abs(p_y - (c.v->>1)::int)) between 1 and (b.k->>'reach')::int + 1)", ["by_box:", "the chests: one beyond the plaza's", "from the mountain's chest's own tile"]],
  ["the mountain's chest is read by one of its two numbers alone: a whole row of tiles opens the box",
    "where greatest(abs(p_x - (c.v->>0)::int), abs(p_y - (c.v->>1)::int)) between 1", "where greatest(abs(p_y - (c.v->>1)::int), abs(p_y - (c.v->>1)::int)) between 1", ["by_box:"]],
];

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]) && process.argv[2] === "lines") {
  const root = process.env.FC_REPO;
  if (!root) { console.log("FC_REPO=<the worktree's root> node v164.base.mutations.mjs lines"); process.exit(2); }
  const here = dirname(fileURLToPath(import.meta.url)), rel = ".claude/skills/fc-cash-town/scripts/db", src = join(root, rel), lines = readFileSync(join(src, "v164.base.lines.mjs"), "utf8");
  let caught = 0;
  for (const [i, [name, was, to, must]] of LINES.entries()) {
    // (a root of its own, with the part's files in it and the lines broken: try-v164.mjs reads a part from the root it is
    // given, and the code from FC_REPO; the scenes load the code by repo-ts-town.mjs, beside them)
    const fake = join(here, `base-lines-break-${i}`), db = join(fake, rel);
    rmSync(fake, { recursive: true, force: true });
    mkdirSync(db, { recursive: true });
    for (const f of readdirSync(src).filter((n) => /^v164\.base\./.test(n) || n === "repo-ts-town.mjs")) cpSync(join(src, f), join(db, f));
    if (lines.split(was).length !== 2) { console.log(`MISSED  ${name}  (the text meant is not in the lines once)`); continue; }
    writeFileSync(join(db, "v164.base.lines.mjs"), lines.replace(was, () => to));
    const run = spawnSync(process.execPath, [join(here, "try-v164.mjs"), fake, "v164", "base"], { cwd: here, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FC_REPO: root } });
    const failed = run.stdout.split("\n").filter((l) => l.startsWith("  FAIL")).map((l) => l.slice(7)), missing = must.filter((m) => !failed.some((f) => f.startsWith(m)));
    const ok = missing.length === 0 && failed.length > 0;
    if (ok) caught++;
    console.log(`${ok ? "CAUGHT" : "MISSED"}  ${name}  (${failed.length} FAIL line(s)${missing.length ? `; still passing: ${missing.join(" | ")}` : ""})`);
    rmSync(fake, { recursive: true, force: true });
  }
  console.log(`\n${caught}/${LINES.length} breaks of the lines caught`);
  process.exit(caught === LINES.length ? 0 : 1);
}
