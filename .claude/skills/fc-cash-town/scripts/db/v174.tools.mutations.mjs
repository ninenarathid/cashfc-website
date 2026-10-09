// The breaks that matter for the older tools' part, each with the check that has to notice it:
//   FC_REPO=<the worktree's root> node mutate.mjs <root>/.claude/skills/fc-cash-town/scripts/db/v174.tools.sql v174.tools.test.mjs v174.tools.mutations.mjs
// (FROM=<n> TO=<m> takes a slice of the list, for running it in parts side by side: a run is about a minute.)
//
// And the part's lines (v174.tools.lines.mjs, which no break of the part's own file reaches), broken the same way:
//   FC_REPO=<the worktree's root> node v174.tools.mutations.mjs lines        (FROM / TO as above)
// (it lays a copy of the part, and of the smith's it stands on, in a folder beside itself, with the lines broken, and
// tries that)
//
// What each kind of break is here for: a plain tool's answer moved; a number of chance drawn where a plain tool drew
// none; a bound loosened for a plain tool; the cap passed; something counted twice; a counted option used past its
// count; another member's tool read; a tool that is in the bag and not in the hand read; a mark that outlives its
// plot's sowing; v171's condition lost; a write with no WHERE; a rule left for a browser to call.
//
// NOT BROKEN, since one connection cannot show it (PGlite is one): two members waiting on each other. The part holds
// no row that was not held before (the try script reads that off the texts, and a break of it is not among these).
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const DAY = "the day's calls, every answer the same on both";

export default ({ swap }) => {
  const all = [
    // ── the cap, and chance ──
    ["the cap is passed: a tool's own part is taken whole whatever the rest came to",
      swap("    else greatest(p_rest, least((select (town.cat('forge')->'forge'->>'cap')::double precision), p_rest * p_mine)) end", "    else p_rest * p_mine end"),
      ["eased_by", "part_of", "strike_window", "with a meal's buff and better gear already past the cap"]],
    ["what is easier the smaller it is goes under the cap's part",
      swap("    else least(p_rest, greatest(1::double precision / (select (town.cat('forge')->'forge'->>'cap')::double precision), p_rest * p_mine)) end", "    else p_rest * p_mine end"), ["slowed_by", "slow_part_of"]],
    ["the number of chance is another than the code's", swap("  return h::double precision / 4294967296;\nend;\n$$;\n\n-- ─── 3.", "  return h::double precision / 4294967295;\nend;\n$$;\n\n-- ─── 3."), ["luck_of"]],
    // ── the readers ──
    ["a plain rod's reader says something of it", swap('"band": 1, "pace": 1, "strike": 1, "line": 1,', '"band": 1, "pace": 1, "strike": 1.1, "line": 1,'), ["rod_fx"]],
    ["a reader forgets an option that has no number of its own", swap("town.fx_gem(m, 'water', o->'water'->'spared') + case when m->'opts' ? 'rdBait' then 1 else 0 end,", "town.fx_gem(m, 'water', o->'water'->'spared'),"), ["rod_fx"]],
    ["an option of the cookware is read with a number of another's", swap("'big', town.fx_n(k, m, 'ckBig', 'more'),", "'big', town.fx_n(k, m, 'ckBig', 'hours'),"), ["cook_fx", "cook"]],
    // ── what a tool pays ──
    ["a hearty meal is forgotten where the share is taken: the two together pass the cap's part",
      swap("    town.slow_part_of(1::double precision - town.buff_by(p_before, p_now, 'hearty'), 1::double precision - share), town.tool_owed(p_after));", "    town.slow_part_of(1::double precision, 1::double precision - share), town.tool_owed(p_after));"), ["tool_paid"]],
    ["what is left of a point is not owed forward", swap("  return (did->'purse') || jsonb_build_object('toolOwed', did->'owed');", "  return did->'purse';"), ["tool_paid"]],
    ["a deed that cost nothing is counted against the free ones", swap("  if not coalesce(cost > 0, false) or (not (p_fx->>'fresh')::boolean and not share > 0) then return p_after; end if;", "  if (not (p_fx->>'fresh')::boolean and not share > 0) then return p_after; end if;"), ["tool_paid"]],
    // ── fishing ──
    ["a strike after the moment is taken past the day's count", swap("  return case when (used->>'ok')::boolean then used->'purse' end;\nend;\n$$;\n\n-- fightPaid", "  return coalesce(used->'purse', p_purse);\nend;\n$$;\n\n-- fightPaid"), ["gold_strike"]],
    ["a common fish lulls the water", swap("not in ('uncommon', 'rare', 'legend') then return paid; end if;", "not in ('common', 'uncommon', 'rare', 'legend') then return paid; end if;"), ["rod_fought"]],
    ["a line bitten at once is not counted", swap("    return jsonb_build_object('purse', used->'purse', 'line', p_line || '{\"wait\": 1, \"nibbles\": []}'::jsonb);", "    return jsonb_build_object('purse', p_purse, 'line', p_line || '{\"wait\": 1, \"nibbles\": []}'::jsonb);"),
      ["rod_cast", "a counted option of the rod's, in the deed's own function"]],
    ["the rod fished with is any forged rod in the bag, whatever is in the hand",
      swap("  s := town.rod_of(p_purse);\n  return case when town.fx_of(s, 'rod') then s end;", "  s := (select b.v from jsonb_array_elements(p_purse->'bag') b(v) where b.v->>'item' = 'rod' and town.forged(b.v) limit 1);\n  return s;"), ["rod_held"]],
    // ── the farm ──
    ["a watering's growth is counted twice", swap("      'boost', (p->>'boost')::double precision + town.watering_of(p_purse, p_hand, p_now, fx)) || case when again", "      'boost', (p->>'boost')::double precision + 2 * town.watering_of(p_purse, p_hand, p_now, fx)) || case when again"), ["water", "tend"]],
    ["a forged can in the hand is passed over for the first of its kind", swap("  if mine is not null and mine->>'item' = p_hand and town.forged(mine)\n", "  if false and mine is not null and mine->>'item' = p_hand and town.forged(mine)\n"), ["water"]],
    ["a forged can filled at the well is a can as it was bought again",
      swap("jsonb_set(bag, array[slot::text], can || jsonb_build_object('item', p_hand, 'n', 1, 'water',", "jsonb_set(bag, array[slot::text], jsonb_build_object('item', p_hand, 'n', 1, 'water',"), ["chore", "a forged can filled at the well"]],
    ["what the hoe pays is taken off twice", swap("  paid := town.tool_paid(p_before, p_after, p_now, p_tool, fx, 'hoFresh');", "  paid := town.tool_paid(p_before, town.tool_paid(p_before, p_after, p_now, p_tool, fx, 'hoFresh'), p_now, p_tool, fx, 'hoFresh');"), ["tend"]],
    ["a counted option of the hoe's works past its count", swap("    if (used->>'ok')::boolean then paid := used->'purse'; both_ := true; end if;", "    both_ := true;\n    if (used->>'ok')::boolean then paid := used->'purse'; end if;"), ["tend"]],
    ["a can waters the row in a bed that is somebody else's", swap("  rains := not hoes and (fx->>'rain')::boolean and coalesce(p_owner = p_me, false);", "  rains := not hoes and (fx->>'rain')::boolean;"), ["beside", "in a bed that is somebody else's it waters its own plot only"]],
    ["the lines of work are told of the can for a plant of one's own", swap("  if p_deed is distinct from 'water' or coalesce(p_plot->'plant'->>'by', p_me) = p_me or p_purse->>'hand' is distinct from 'can' or not town.bag_forged(p_purse->'bag', 'can') then return '{}'::jsonb; end if;",
      "  if p_deed is distinct from 'water' or p_purse->>'hand' is distinct from 'can' then return '{}'::jsonb; end if;"), ["kind_doc"]],
    // ── the insects, the kitchen ──
    ["a catch brings one more with no room for it", swap(" and town.room(p_purse->'bag', p_id) > p_n then 1 else 0 end;", " then 1 else 0 end;"), ["net"]],
    ["forged cookware that is in the bag is read, whatever is in the hand",
      swap("  s := town.hand_stack(p_purse);\n  return case when s->>'item' = p_crew->>0 and town.forged(s) then s end;", "  s := (select b.v from jsonb_array_elements(p_purse->'bag') b(v) where b.v->>'item' = p_crew->>0 and town.forged(b.v) limit 1);\n  return s;"),
      ["cook", "forged cookware that is in the bag and not in the hand"]],
    ["a pot is made bigger past the day's count", swap("    if (used->>'ok')::boolean then spent := used->'purse'; more := more + (p_fx->>'big')::integer; end if;", "    more := more + (p_fx->>'big')::integer;\n    if (used->>'ok')::boolean then spent := used->'purse'; end if;"),
      ["cook", "…the pots a counted option makes bigger"]],
    ["a pot carries a mark of nothing", swap("and (p_from->>'warm')::numeric > 0 then", "and (p_from->>'warm')::numeric >= 0 then"), ["pot_marks", "set_down"]],
    ["a buff runs on past a new one's hours and the pot's", swap("jsonb_build_object('until', least(most, (b.v->>'until')::double precision + p_hours * 3600000::double precision))", "jsonb_build_object('until', (b.v->>'until')::double precision + p_hours * 3600000::double precision)"), ["chew"]],
    // ── what is kept, and who may ──
    ["every plot there is counts as damp", swap("add column if not exists damp boolean not null default false;", "add column if not exists damp boolean not null default true;"), ["after the day no plot is damp and no pot carries anything"]],
    ["a rule is left for a browser to call", swap("revoke execute on all functions in schema town from public, anon, authenticated;", "revoke execute on all functions in schema town from anon;"), ["no rule of schema town is for anybody to call"]],
  ];
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? all.length);
  // (an anchor of more than one line is written with plain line ends: the part is read so, however git checked it out)
  return all.slice(from, to).map(([name, mutate, mustFail]) => [name, (sql) => mutate(sql.split("\r\n").join("\n")), mustFail]);
};

/** The lines' own breaks: [what it is, the text of v174.tools.lines.mjs that is changed, what stands in its place, the checks that have to fail]. */
export const LINES = [
  ["a plain rod's moment to strike is a hair longer",
    "  + \"    * town.rod_strike(p_purse, p_now, c.f))\\n\",", "  + \"    * 1.01::double precision * town.rod_strike(p_purse, p_now, c.f))\\n\",", ["strike_window", "the strike's moment is the code's"]],
  ["a number of chance is drawn before a line is, whatever the rod",
    "    + \"  rod_ := town.rod_held(purse);\\n\"\n    + \"  if rod_ is not null then\\n\"\n    + \"    fx_ := town.rod_fx(rod_);\\n\"\n    + \"    odds :=",
    "    + \"  perform random();\\n  rod_ := town.rod_held(purse);\\n\"\n    + \"  if rod_ is not null then\\n\"\n    + \"    fx_ := town.rod_fx(rod_);\\n\"\n    + \"    odds :=", [DAY]],
  ["another member's forged rod is read for mine",
    "    + \"  rod_ := town.rod_held(purse);\\n\"\n    + \"  if rod_ is not null then\\n\"\n    + \"    fx_ := town.rod_fx(rod_);\\n\"\n    + \"    odds :=",
    "    + \"  rod_ := coalesce(town.rod_held(purse), (select town.rod_held(o.doc) from public.town_purses o where o.member_id <> me and town.rod_held(o.doc) is not null limit 1));\\n\"\n    + \"  if rod_ is not null then\\n\"\n    + \"    fx_ := town.rod_fx(rod_);\\n\"\n    + \"    odds :=",
    ["a member beside them with a rod as it was bought"]],
  ["a plain rod's landing is held to half the least it was held to",
    "    + \"          * coalesce((line->>'rod')::double precision, 1::double precision)\\n\",", "    + \"          * coalesce((line->>'rod')::double precision, 0.5::double precision)\\n\",", ["the least a landing can take"]],
  ["a bite let go by is taken as a strike after the moment",
    "    + \"    if how = 'missed' and p_reaction is not null then\\n\"", "    + \"    if how = 'missed' then\\n\"", ["a bite let go by is no strike"]],
  ["a fight's stamina is paid twice with a forged rod",
    "town.rod_fought(purse, town.spend(purse, (fish->>'effort')::double precision, now_), rod_, fx_, line->>'what', now_)); end if;\\n\",",
    "town.rod_fought(purse, town.spend(town.spend(purse, (fish->>'effort')::double precision, now_), (fish->>'effort')::double precision, now_), rod_, fx_, line->>'what', now_)); end if;\\n\",", ["8 fights with a forged rod"]],
  ["the forged hoe or can read is one in the bag, whatever is in the hand",
    "    + \"    tool_ := town.hand_stack(p_purse);\\n\"\n    + \"    if not town.forged(tool_) then tool_ := null; end if;\\n\"",
    "    + \"    tool_ := (select b.v from jsonb_array_elements(p_purse->'bag') b(v) where b.v->>'item' = hand and town.forged(b.v) limit 1);\\n\"", ["tend"]],
  ["a can is offered a wet plant without the day's count",
    "town.may_power(p_purse, tool_, 'cnTwice', p_now) and town.twice_wanted(p_key, p_plot, p_now)", "town.twice_wanted(p_key, p_plot, p_now)", ["tend"]],
  ["a plot's mark outlives its sowing",
    "    + \"  if did->'plot'->'damp' = 'true'::jsonb or plot->'damp' = 'true'::jsonb then\\n\"", "    + \"  if did->'plot'->'damp' = 'true'::jsonb then\\n\"", ["a seed sown there is as the code sows it"]],
  ["the plot's mark is written on every plot there is",
    "    + \"    update public.town_plots set damp = coalesce(did->'plot'->'damp' = 'true'::jsonb, false) where x = p_x and y = p_y;\\n\"", "    + \"    update public.town_plots set damp = coalesce(did->'plot'->'damp' = 'true'::jsonb, false);\\n\"",
    ["no function writes to a table with no WHERE"]],
  ["the plots beside a deed's are not told", "jsonb_build_object('also', (select jsonb_agg(o.key order by split_part(o.key, ',', 1)::integer) from jsonb_each(also_) o), 'plots', also_)", "jsonb_build_object('plots', also_)",
    ["weeds cleared with a hoe that may do the next plot too", "a watering in a bed of one's own with a can that waters the row"]],
  ["the can's points on the helpers' line are whatever the deed says",
    "least(town.opt_n('cnKind', 'points')::numeric, floor((doc->>'kind')::numeric))", "floor((doc->>'kind')::numeric)", ["counts_of"]],
  ["every kind that comes back is weighed as a rare one", "coalesce(ins->'rare' ? %, false)", "true", ["comeback_rarer"]],
  ["what a pot carries is not kept on its row",
    "  + \"  if town.pot_marks(did->'pot') <> '{}'::jsonb then update public.town_pots set marks = town.pot_marks(did->'pot') where id = new_id; end if;\\n\",", "  + \"  null;\\n\",", ["set down in the yard it stands on the table with what it carries"]],
  ["a helping's mark is counted for a dish that leaves no buff too, and a plain helping's stamina is a hair more",
    "then (e->>'scent')::double precision else 0::double precision end)\\n\",", "then (e->>'scent')::double precision else 0.001::double precision end)\\n\",", ["chew", DAY]],
  ["a row's plots keep no mark",
    "    + \"      update public.town_plots set damp = coalesce(did->'plots'->(e->>'key')->'damp' = 'true'::jsonb, false) where x = v_x and y = v_y;\\n\"", "    + \"      null;\\n\"", ["a row hoed with the enchanted hoe"]],
  ["a row's plots are read without their mark",
    "    + `  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, ${PLOT_AS} ${DAMP}), '{}'::jsonb) into plots\\n`,", "    + `  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, ${PLOT_AS}), '{}'::jsonb) into plots\\n`,", ["a row hoed with the enchanted hoe"]],
  ["v171's question is not asked of what goes into a pot",
    "export const COOK = [\n", "export const COOK = [\n  [\"       or coalesce(ck->'putIn'->'never', '[]'::jsonb) ? (x->>0)\\n\", \"\"],\n", ["town.cook still asks v171's question"]],
];

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]) && process.argv[2] === "lines") {
  const root = process.env.FC_REPO;
  if (!root) { console.log("FC_REPO=<the worktree's root> node v174.tools.mutations.mjs lines"); process.exit(2); }
  const here = dirname(fileURLToPath(import.meta.url)), rel = ".claude/skills/fc-cash-town/scripts/db", src = join(root, rel), lines = readFileSync(join(src, "v174.tools.lines.mjs"), "utf8").split("\r\n").join("\n");
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? LINES.length);
  let caught = 0;
  for (const [i, [name, was, put, must]] of [...LINES.entries()].slice(from, to)) {
    // (a root of its own, with the part's files and the smith's in it and the lines broken: try-v164.mjs reads a part
    // from the root it is given, and the code from FC_REPO; the scenes load the code by repo-ts-town.mjs, beside them)
    const fake = join(here, `tools-lines-break-${i}`), db = join(fake, rel);
    rmSync(fake, { recursive: true, force: true });
    mkdirSync(db, { recursive: true });
    for (const f of readdirSync(src).filter((n) => /^v174\.(tools|smith)\./.test(n) || n === "repo-ts-town.mjs")) cpSync(join(src, f), join(db, f));
    if (lines.split(was).length !== 2) { console.log(`MISSED  ${name}  (the text meant is not in the lines once)`); continue; }
    writeFileSync(join(db, "v174.tools.lines.mjs"), lines.replace(was, () => put));
    const run = spawnSync(process.execPath, [join(here, "try-v164.mjs"), fake, "v174", "tools"], { cwd: here, encoding: "utf8", maxBuffer: 1 << 28, env: { ...process.env, FC_REPO: root } });
    const failed = run.stdout.split("\n").filter((l) => l.startsWith("  FAIL")).map((l) => l.slice(7)), missing = must.filter((m) => !failed.some((f) => f.startsWith(m)));
    const ok = missing.length === 0 && failed.length > 0;
    if (ok) caught++;
    console.log(`${ok ? "CAUGHT" : "MISSED"}  ${name}  (${failed.length} FAIL line(s)${missing.length ? `; still passing: ${missing.join(" | ")}` : ""})`);
    rmSync(fake, { recursive: true, force: true });
  }
  console.log(`\n${caught}/${to - from} breaks of the lines caught`);
  process.exit(caught === to - from ? 0 : 1);
}
