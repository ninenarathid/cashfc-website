// The breaks that matter for the woodcutters' part, each with the check that has to notice it:
//   FC_REPO=<the worktree's root> node mutate.mjs <root>/.claude/skills/fc-cash-town/scripts/db/v164.felling.sql v164.felling.test.mjs v164.felling.mutations.mjs
// (FROM=<n> TO=<m> takes a slice of the list, for running it in parts side by side: a run is some thirty seconds.
// `node check-anchors.mjs <the part> v164.felling.mutations.mjs <a log of the try>` first: every anchor once, every check named.)
//
// And the part's lines (v164.felling.lines.mjs, which no break of the part's own file reaches), broken the same way:
//   FC_REPO=<the worktree's root> node v164.felling.mutations.mjs lines
// (it lays a copy of the part and of what it stands on in a folder beside itself, with the lines broken, and tries that)
//
// NOT BROKEN ON PURPOSE, since one connection cannot show it (PGlite is one): the grove taken without being held
// (`town.thing('grove', false)` in the four functions that write it), and the two purses of a braced go taken in the
// other order. Both are reasoned from the order the rows are taken in (the part's head), not seen.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const head = (fn, args) => `create or replace function public.${fn}(${args})\nreturns jsonb language plpgsql security definer set search_path = public\nas $$\ndeclare\n  me uuid := town.far_member();`;
const FNS = [["town_trees", ""], ["town_fell_begin", "p_tree integer, p_x integer, p_y integer"], ["town_fell", "p_went jsonb, p_x integer, p_y integer"], ["town_fell_brace", "p_feller uuid, p_x integer, p_y integer"], ["town_fell_root", "p_tree integer"]];
const CLOSED = "refused, in all five functions: a proved member, while the far side is closed";

export default ({ cut, swap }) => {
  const all = [
    // ── the gate ──
    ...FNS.map(([fn, args]) => [`${fn} goes by the game's gate, not the far side's: a proved member is answered while the far side is closed`,
      swap(head(fn, args), head(fn, args).replace("town.far_member()", "town.member()")), [CLOSED]]),
    ["town_fell asks nobody who they are: the gate is left out",
      swap(head("town_fell", "p_went jsonb, p_x integer, p_y integer"), head("town_fell", "p_went jsonb, p_x integer, p_y integer").replace("town.far_member()", "auth.uid()")),
      ["refused, in all five functions: a member with no character", "refused, in all five functions: a member whose character was never proved", CLOSED]],
    ["town_fell is for somebody signed out too",
      swap("revoke execute on function public.town_fell(jsonb, integer, integer) from public, anon;", "grant execute on function public.town_fell(jsonb, integer, integer) to anon;"),
      ["public.town_fell: for the signed in, not for the signed out", "the five functions a member calls"]],
    ["a rule is left for a browser to call",
      swap("revoke execute on all functions in schema town from public, anon, authenticated;", "revoke execute on all functions in schema town from anon;"),
      ["no rule of schema town is for anybody to call"]],
    // ── where one stands ──
    ["a board goes up from anywhere: the tile stood on is not held to the tree's",
      swap("  if coalesce(town.tree_far(t, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;\n", ""),
      ["fell_begin", "a board from two tiles off"]],
    ["a tree is felled from anywhere",
      swap("  if coalesce(town.tree_far(first_, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;\n", ""),
      ["fell: ", "refused, each for its reason, and the tree stands"]],
    ["a board goes up from no tile at all (a tile that is not there is near enough)",
      swap("  if coalesce(town.tree_far(t, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;", "  if coalesce(town.tree_far(t, p_x, p_y) > (k->>'reach')::integer, false) then return town.no('far'); end if;"),
      ["a board from two tiles off"]],
    ["a trunk is braced from five tiles further off",
      swap("(town.cat('trees')->'brace'->>'reach')::integer, true) then return town.no('far'); end if;", "(town.cat('trees')->'brace'->>'reach')::integer + 5, true) then return town.no('far'); end if;"),
      ["brace_go", "Member Two braces Member One's trunk"]],
    ["how far a tile is from a tree is measured across only",
      swap("greatest(greatest(t.x - p_x, 0, p_x - (t.x + t.n - 1)), greatest(t.y - p_y, 0, p_y - (t.y + t.n - 1))) end", "greatest(t.x - p_x, 0, p_x - (t.x + t.n - 1)) end"),
      ["tree_far"]],
    // ── the hold of a tree ──
    ["a board put up is not written down: its trees are held for nobody",
      swap("    grove := town.fell_opened(grove, me::text, did->'trees', now_);\n    perform town.keep_thing('grove', grove);\n", ""),
      ["…and its board is written down", "a tree whose board somebody has up is held"]],
    ["a board goes up at a tree somebody else's go holds",
      swap("  if town.tree_held(p_grove, p_tree, p_now, p_me) then return town.no('held'); end if;\n", ""),
      ["fell_begin", "a tree whose board somebody has up is held"]],
    ["a tree somebody else's go holds is felled all the same",
      swap("  if town.tree_held(p_grove, (first_->>0)::integer, p_now, p_me) then return town.no('held'); end if;\n", ""),
      ["fell: ", "a tree whose board somebody has up is held"]],
    ["a hold never lapses",
      swap("p_now - (p_go->>'at')::numeric <= (town.cat('trees')->'go'->>'secs')::numeric * 1000 and ", ""),
      ["tree_held", "a moment past the hold, the tree is free"]],
    ["a hold lapses at its last moment, not after it",
      swap("p_now - (p_go->>'at')::numeric <= (town.cat('trees')->'go'->>'secs')::numeric * 1000 and ", "p_now - (p_go->>'at')::numeric < (town.cat('trees')->'go'->>'secs')::numeric * 1000 and "),
      ["at the last moment of the hold"]],
    ["one's own go holds a tree against oneself",
      swap("where g.key is distinct from p_me and town.go_holds(g.value, p_now)", "where town.go_holds(g.value, p_now)"),
      ["tree_held", "its own member is never refused it"]],
    ["an echoing axe takes a tree somebody else's go holds",
      swap(" and town.tree_grown(p_grove, w.v, p_now) and not town.tree_held(p_grove, (w.v->>0)::integer, p_now, p_me)\n", " and town.tree_grown(p_grove, w.v, p_now)\n"),
      ["fell_group"]],
    // ── a yield ──
    ["a tree gives twice its logs",
      swap("      logs := (k->>'logs')::double precision;\n", "      logs := (k->>'logs')::double precision * 2;\n"),
      ["fell: ", "cut through with no miss"]],
    ["the plain way gives the fine timber too",
      swap("timber := case when one_ then town.tree_most(t) when plain_ or not through_ then 0 else", "timber := case when one_ then town.tree_most(t) when not through_ then 0 else"),
      ["fell: ", "a stout pine felled at once, with no board"]],
    ["a go that was lost gives the fine timber too",
      swap("timber := case when one_ then town.tree_most(t) when plain_ or not through_ then 0 else", "timber := case when one_ then town.tree_most(t) when plain_ then 0 else"),
      ["fell: ", "a go that was lost (the bar ran out)"]],
    ["the fine timber is given whatever the misses",
      swap("where p_misses <= b.v::numeric $$;", "where true $$;"),
      ["timber_of", "a stout pine cut through with 1 miss"]],
    ["a tree felled is no stump: it pays again at once",
      swap("    down_ := down_ || jsonb_build_object(id_::text, jsonb_build_object('at', p_now, 'by', p_me));\n", ""),
      ["fell: ", "pressed again, it is a stump"]],
    ["a tree costs no stamina",
      swap("      mine := paid->'purse';\n      owed := (paid->>'owed')::double precision;\n", "      owed := (paid->>'owed')::double precision;\n"),
      ["fell: ", "…the stamina a tree costs is paid"]],
    ["a board goes up with no room for what the tree may give",
      swap("  if town.stow_all(p_purse, town.fell_most(axe, grp)) is null then return town.no('full'); end if;\n", ""),
      ["fell_begin", "a cord and a bag with room for one log"]],
    ["what a go brought home is not kept: the tree is a stump and the purse has no wood",
      swap("  perform town.keep_purse(me, did->'purse');\n  perform town.keep_thing('grove', did->'grove');\n  -- the friend at the trunk", "  perform town.keep_thing('grove', did->'grove');\n  -- the friend at the trunk"),
      ["cut through with no miss"]],
    ["a tree felled is not kept as a stump: it is paid and stands",
      swap("  perform town.keep_purse(me, did->'purse');\n  perform town.keep_thing('grove', did->'grove');\n  -- the friend at the trunk", "  perform town.keep_purse(me, did->'purse');\n  -- the friend at the trunk"),
      ["…the stamina a tree costs is paid, the tree is a stump of mine", "pressed again, it is a stump"]],
    ["every pine lets a keepsake fall",
      swap("not coalesce(p_whether < 1::double precision / (k->'keepsake'->>'in')::double precision, false) then return null; end if;", "not coalesce(p_whether < 2::double precision, false) then return null; end if;"),
      ["keepsake_for", "fell: "]],
    ["the book's line goes to whoever found a keepsake last",
      swap("      if not (book_ ? ks) then book_ := book_ ||", "      if true then book_ := book_ ||"),
      ["another member finds the same"]],
    ["the ancient tree falls to the plain press",
      swap("    if town.tree_elder(first_) then return town.no('none'); end if;\n", ""),
      ["fell: ", "the ancient tree is not felled the plain way"]],
    ["the ancient tree takes any axe",
      swap("when town.tree_elder(p_tree) and town.tool_level(p_axe) < (c.k->'elder'->>'plus')::integer then 'plus' end", "when town.tree_elder(p_tree) and town.tool_level(p_axe) < 0 then 'plus' end"),
      ["axe_bites", "with no axe in the hand, nothing"]],
    ["a tree of an upper terrace takes this axe",
      swap("select case when (p_tree->>3)::integer > (c.k->>'axeTier')::integer then 'bite'", "select case when (p_tree->>3)::integer > 9 then 'bite'"),
      ["axe_bites", "with no axe in the hand, nothing"]],
    ["the ancient tree comes down of a go that was lost",
      swap("  if town.tree_elder(first_) and not through_ then\n", "  if false and not through_ then\n"),
      ["fell: ", "a go at it that is lost: it stands"]],
    ["everybody is told when the ancient tree is grown again",
      swap("|| case when town.tree_elder(d.t) and not c.knows then '{}'::jsonb else jsonb_build_object('until', d.until) end", "|| jsonb_build_object('until', d.until)"),
      ["trees_told", "it is down until the next dawn"]],
    // ── the brace's pay ──
    ["the friend at the trunk is not paid",
      swap("    perform town.keep_purse(bracer, paid->'purse');\n", ""),
      ["…the go over, the friend has a log in their own purse"]],
    ["the friend at the trunk has twice the logs",
      swap("jsonb_build_array(jsonb_build_array('log', (town.cat('trees')->'brace'->>'logs')::integer)) as things", "jsonb_build_array(jsonb_build_array('log', (town.cat('trees')->'brace'->>'logs')::integer * 2)) as things"),
      ["brace_pay", "…the go over, the friend has a log in their own purse"]],
    ["whoever is written on a go is paid, whatever the go was: a trunk braced pays at the plain press too",
      swap("  if did->>'braced' is not null and theirs is not null and (did->>'braced') = bracer::text then\n", "  if theirs is not null then\n"),
      ["a trunk braced and then felled the plain way pays no friend"]],
    ["one braces one's own trunk",
      swap("  if p_me is not distinct from p_feller or not town.go_holds(go_, p_now) then return town.no('none'); end if;", "  if not town.go_holds(go_, p_now) then return town.no('none'); end if;"),
      ["brace_go", "Member Two braces Member One's trunk"]],
    ["a second friend takes a trunk over from the first",
      swap("  if jsonb_typeof(go_->'braced') = 'string' and go_->>'braced' <> '' then return town.no('none'); end if;\n", ""),
      ["brace_go", "Member Two braces Member One's trunk"]],
    ["a brace is answered and not written on the go",
      swap("    grove := did->'grove';\n    perform town.keep_thing('grove', grove);\n  end if;\n  return town.answer(me, (did - 'grove') || jsonb_build_object('trees', town.trees_told(grove, town.purse_of(me, false), now_)));",
        "    grove := did->'grove';\n  end if;\n  return town.answer(me, (did - 'grove') || jsonb_build_object('trees', town.trees_told(grove, town.purse_of(me, false), now_)));"),
      ["Member Two braces Member One's trunk"]],
    // ── what the browser says of a go ──
    ["the misses said are kept whatever they are",
      swap("then least(greatest(floor((said->>'misses')::numeric), 0), most) else 0 end)", "then greatest(floor((said->>'misses')::numeric), 0) else 0 end)"),
      ["misses past any a trunk has are kept as the most chops a trunk takes"]],
    ["the seconds said are kept whatever they are",
      swap("jsonb_build_object('secs', least(greatest((said->>'secs')::double precision, 0), 3600))", "jsonb_build_object('secs', greatest((said->>'secs')::double precision, 0))"),
      ["misses past any a trunk has are kept as the most chops a trunk takes"]],
    ["a trunk cut through faster than a hand can chop is a go",
      cut("  if board_ and through_ and not coalesce(secs_ + 0.05::double precision\n", "  if board_ then goes_ := goes_ - coalesce(p_me, ''); end if;"),
      ["fell: ", "a stout trunk cut through in a fifth of a second was not played"]],
    ["a tree past every tree is a fault, not a refusal",
      swap(" or abs((said->>'tree')::numeric) > 100000 then return town.answer(me, town.no('none')); end if;", " then return town.answer(me, town.no('none')); end if;"),
      ["refused, each for its reason, and the tree stands"]],
    ["a go from no tile at all is judged",
      swap("  if jsonb_typeof(said->'tree') is distinct from 'number' or p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;", "  if jsonb_typeof(said->'tree') is distinct from 'number' then return town.answer(me, town.no('none')); end if;"),
      ["refused, each for its reason, and the tree stands"]],
    // ── a deed's doc ──
    ["a tree felled is not written down",
      cut("    perform town.note(me, 'fell', f->>'kind', 1, 0,\n", "  end loop;\n  -- (the keepsakes found are told as `keeps`"),
      ["…one deed, with the tree, the misses, the girth and the fine timber", "…and it counts on the woodcutters' line"]],
    ["a tree felled is written down under no kind of its own",
      swap("    perform town.note(me, 'fell', f->>'kind', 1, 0,\n", "    perform town.note(me, 'fell', 'tree', 1, 0,\n"),
      ["…one deed, with the tree, the misses, the girth and the fine timber", "…and it counts on the woodcutters' line"]],
    ["the deed leaves the misses out",
      swap("jsonb_build_object('tree', f->'id', 'misses', f->'misses', 'girth', f->'girth', 'timber', f->'timber')", "jsonb_build_object('tree', f->'id', 'girth', f->'girth', 'timber', f->'timber')"),
      ["…one deed, with the tree, the misses, the girth and the fine timber"]],
    ["the deed leaves out the tile stood on",
      swap("      || jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'got', f->'got',", "      || jsonb_build_object('got', f->'got',"),
      ["…one deed, with the tree, the misses, the girth and the fine timber"]],
    ["the deed does not say the plain way",
      swap("case when (did->>'plain')::boolean then '{\"how\": \"plain\"}'::jsonb when", "case when false then '{\"how\": \"plain\"}'::jsonb when"),
      ["a stout pine felled at once, with no board"]],
    ["the deed does not say who braced: the friend has no point for it",
      swap("      || case when i = 0 and did->>'braced' is not null then jsonb_build_object('braced', did->>'braced') else '{}'::jsonb end\n", ""),
      ["…the go over, the friend has a log in their own purse"]],
    ["the friend's own deed is not written down",
      cut("    perform town.note(bracer, 'brace', did->'felled'->0->>'kind'", "  end if;\n  for f, i in select e.v"),
      ["…the go over, the friend has a log in their own purse"]],
    ["a stump woken is not written down",
      swap("    perform town.note(me, 'root', town.tree_kind(town.tree_of(p_tree)), 1, 0, jsonb_build_object('tree', p_tree, 'left', (did->>'left')::integer));\n", ""),
      ["a stump just made is woken by whoever made it"]],
    // ── the root ──
    ["the ancient tree's stump is woken",
      swap("  if t is null or town.tree_elder(t) then return town.no('none'); end if;\n  if axe is null then return town.no('tool'); end if;\n  if f is null", "  if t is null then return town.no('none'); end if;\n  if axe is null then return town.no('tool'); end if;\n  if f is null"),
      ["fell_root", "its stump is not to be woken"]],
    ["a stump made long ago is woken",
      swap("p_now - (f->>'at')::numeric::bigint > (k->'root'->>'within')::bigint * 1000\n", "p_now - (f->>'at')::numeric::bigint > (k->'root'->>'within')::bigint * 1000000\n"),
      ["fell_root", "…and one made too long ago is not"]],
    ["somebody else's stump is woken",
      swap("  if f is null or f->>'by' is distinct from p_me or p_now", "  if f is null or p_now"),
      ["fell_root"]],
    // ── the lines the part writes into earlier functions ──
    ["the part goes out without its lines: a tree felled counts on no line and has no word",
      swap("-- <town.work_counts_of>\n-- </town.work_counts_of>", "-- <town.work_counts>\n-- </town.work_counts>"),
      ["counts_of", "…and it counts on the woodcutters' line"]],
  ];
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? all.length);
  // (an anchor of more than one line is written with plain line ends: the part is read so, however git checked it out)
  return all.slice(from, to).map(([name, mutate, mustFail]) => [name, (sql) => mutate(sql.split("\r\n").join("\n")), mustFail]);
};

/** The lines' own breaks: [what it is, the text of v164.felling.lines.mjs that is changed, what stands in its place, the checks that have to fail]. */
export const LINES = [
  ["a tree felled counts for nothing on the woodcutters' line",
    "'line', 'felling', 'raw', l->'felling'->thing,", "'line', 'felling', 'raw', 0,", ["counts_of", "…and it counts on the woodcutters' line"]],
  ["the helpers' point of a trunk braced goes to nobody",
    "then jsonb_build_array(jsonb_build_object('to', doc->>'braced', 'line', 'helpers', 'raw', l->'braced')) else '[]'::jsonb end;", "then '[]'::jsonb else '[]'::jsonb end;", ["counts_of", "…the go over, the friend has a log in their own purse"]],
  ["whoever braces their own trunk has a point for it",
    " and doc->>'braced' <> p_doer\\n", "\\n", ["counts_of"]],
  ["a tree felled has no word of its own",
    "when 'fell' then 'ตัดต้นไม้' ", "", ["a pine, the ancient tree, no tree; twelve keepsakes; a word for a tree felled"]],
  ["a trunk braced has no word of its own",
    "when 'brace' then 'ช่วยค้ำต้นไม้ให้เพื่อน' ", "", ["every deed of the woodcutters' has its word"]],
];

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]) && process.argv[2] === "lines") {
  const root = process.env.FC_REPO;
  if (!root) { console.log("FC_REPO=<the worktree's root> node v164.felling.mutations.mjs lines"); process.exit(2); }
  const here = dirname(fileURLToPath(import.meta.url)), rel = ".claude/skills/fc-cash-town/scripts/db", src = join(root, rel), lines = readFileSync(join(src, "v164.felling.lines.mjs"), "utf8");
  let caught = 0;
  for (const [i, [name, was, to, must]] of LINES.entries()) {
    // (a root of its own, with the part's files and the base's in it and the lines broken: try-v164.mjs reads a part from
    // the root it is given, and the code from FC_REPO; the scenes load the code by repo-ts-town.mjs, beside them)
    const fake = join(here, `lines-break-${i}`), db = join(fake, rel);
    rmSync(fake, { recursive: true, force: true });
    mkdirSync(db, { recursive: true });
    for (const f of readdirSync(src).filter((n) => /^v164\.(base|felling)\./.test(n) || n === "repo-ts-town.mjs")) cpSync(join(src, f), join(db, f));
    if (lines.split(was).length !== 2) { console.log(`MISSED  ${name}  (the text meant is not in the lines once)`); continue; }
    writeFileSync(join(db, "v164.felling.lines.mjs"), lines.replace(was, () => to));
    const run = spawnSync(process.execPath, [join(here, "try-v164.mjs"), fake, "v164", "felling"], { cwd: here, encoding: "utf8", env: { ...process.env, FC_REPO: root } });
    const failed = run.stdout.split("\n").filter((l) => l.startsWith("  FAIL")).map((l) => l.slice(7)), missing = must.filter((m) => !failed.some((f) => f.startsWith(m)));
    const ok = missing.length === 0 && failed.length > 0;
    if (ok) caught++;
    console.log(`${ok ? "CAUGHT" : "MISSED"}  ${name}  (${failed.length} FAIL line(s)${missing.length ? `; still passing: ${missing.join(" | ")}` : ""})`);
    rmSync(fake, { recursive: true, force: true });
  }
  console.log(`\n${caught}/${LINES.length} breaks of the lines caught`);
  process.exit(caught === LINES.length ? 0 : 1);
}
