// The breaks that matter for the smith's part, each with the check that has to notice it:
//   FC_REPO=<the worktree's root> node mutate.mjs <root>/.claude/skills/fc-cash-town/scripts/db/v174.smith.sql v174.smith.test.mjs v174.smith.mutations.mjs
// (FROM=<n> TO=<m> takes a slice of the list, for running it in parts side by side: a run is a minute and a half.)
//
// And the part's lines (v174.smith.lines.mjs, which no break of the part's own file reaches), broken the same way:
//   FC_REPO=<the worktree's root> node v174.smith.mutations.mjs lines        (FROM / TO as above)
// (it lays a copy of the part in a folder beside itself, with the lines broken, and tries that)
//
// NOT BROKEN ON PURPOSE, since one connection cannot show it (PGlite is one): two members waiting on each other. The
// order the rows are taken in is read off every function's text by the try script, and a break of that order is
// among these; that no two calls can wait on each other follows from the one order, and is reasoned, not seen.
// Not shown by a scene either: that the day's crystal rock is no flint (the line is the trial's own condition; the
// crystal stands on the cave's deepest floors, and no scene here goes down to it).
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const head = (fn, args) => `create or replace function public.${fn}(${args})\nreturns jsonb language plpgsql security definer set search_path = public\nas $$\ndeclare\n  me uuid := town.smith_member();`;
const GATES = "a proved member is refused by all fourteen, and told no, while the game, the far side or the smith is shut";
const CLOSED = (who) => `${who}, the smith closed: all fourteen refused (42501)`;

export default ({ cut, swap }) => {
  const all = [
    // ── a stranger calling ──
    ["town_smith_try goes by the game's gate, not the smith's: a proved member forges while the smith is closed",
      swap(head("town_smith_try", "p_slot integer"), head("town_smith_try", "p_slot integer").replace("town.smith_member()", "town.member()")), [GATES]],
    ["town_smith_smelt asks nobody who they are: the gate is left out",
      swap(head("town_smith_smelt", "p_piece text, p_n integer"), head("town_smith_smelt", "p_piece text, p_n integer").replace("town.smith_member()", "auth.uid()")),
      [CLOSED("an unproved character"), CLOSED("no character"), GATES]],
    ["the smith's gate forgets the far side's: open with the far side shut",
      swap("  me uuid := town.far_member();\nbegin\n  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'smith_open'), 0) <= 0 then",
        "  me uuid := town.member();\nbegin\n  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'smith_open'), 0) <= 0 then"), [GATES]],
    ["town_smith_try is for somebody signed out too",
      swap("revoke execute on function public.town_smith_try(integer) from public, anon;", "grant execute on function public.town_smith_try(integer) to anon;"),
      ["public.town_smith_try: for the signed in, not for the signed out"]],
    ["a rule is left for a browser to call",
      swap("revoke execute on all functions in schema town from public, anon, authenticated;", "revoke execute on all functions in schema town from anon;"),
      // (the schema itself is a second wall: a member is still stopped at it, so the scene that goes straight at a rule does not see this; the grants' own check does)
      ["no rule of schema town is for anybody to call"]],
    ["the fire's table is left open to whoever is signed in: its row can be read, moment and all",
      swap("alter table public.town_great_fire enable row level security;\nrevoke all on table public.town_great_fire from anon, authenticated;\n", ""),
      ["public.town_great_fire: row level security on", "a member, straight at the tables and the rules"]],
    ["a half is found by anybody while the smith is closed",
      swap("      or (coalesce((select k.value from public.town_knobs k where k.key = 'smith_open'), 0) > 0 and town.is_member(p_who))", "      or town.is_member(p_who)"),
      ["a member fells a tree and another breaks a rock with the smith closed"]],
    // ── another member's smithy ──
    ["one's own bellows may be pressed",
      // (the function a member calls refuses one's own bellows before the rule is asked: the scene does not see this; the rule's cases do)
      swap("  if p_by = p_owner then return town.no('self'); end if;\n", ""), ["bellows: "]],
    ["a piece takes presses without end",
      swap("  if coalesce((piece->>'blown')::numeric, 0) >= each_ then return town.no('tired'); end if;\n", ""), ["bellows: ", "each press takes its share"]],
    // ── the same call twice making two things ──
    ["a draw chosen still waits: it is chosen again and again",
      swap("    'smithy', p_smithy || '{\"pending\": null}'::jsonb);", "    'smithy', p_smithy);"), ["forge_choose", "chosen again: `none`"]],
    ["what is taken stays in the queue: it is taken again",
      swap("    'smithy', p_smithy || jsonb_build_object('queue', left_\n", "    'smithy', p_smithy || jsonb_build_object('queue', p_smithy->'queue'\n"), ["smith_collect", "asked again at once: `none`"]],
    ["a half that is found is found again by the next",
      swap(" or coalesce(p_fire->p_half, 'null'::jsonb) <> 'null'::jsonb then\n    return jsonb_build_object('fire', p_fire, 'found', false, 'lit', false);", " then\n    return jsonb_build_object('fire', p_fire, 'found', false, 'lit', false);"),
      ["fire_half_found"]],
    ["a name is put in the row twice",
      swap("  if exists (select 1 from jsonb_array_elements(p_fire->'row') w(v) where w.v->>'id' = p_id) then return town.no('twice'); end if;\n", ""), ["fire_join", "the same name twice: `twice`"]],
    // ── a try with no fee or no ore ──
    ["a try is made without the ore it takes",
      swap("  if town.held_in(p_purse, cost_->>'ore') < (cost_->>'n')::numeric then return town.no('ore'); end if;\n", ""), ["forge_try"]],
    ["a try takes no fee",
      swap("    'purse', spent || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (cost_->>'fee')::numeric, 'bag', jsonb_set(spent->'bag', array[p_slot::text], raised)));",
        "    'purse', spent || jsonb_build_object('bag', jsonb_set(spent->'bag', array[p_slot::text], raised)));"), ["forge_try", "three tries to +3"]],
    ["a failed try takes the tool back to nothing",
      swap("when 'down' then greatest(least(from_, (f->>'floor')::integer), from_ - 1) else from_ end;", "when 'down' then 0 else from_ end;"), ["forge_try", "every try went as the table says of the number drawn"]],
    // ── the page steering chance ──
    ["a try goes by a number that is not drawn: it always takes",
      swap("  r double precision := random();\n  did jsonb := town.forge_try_fired(", "  r double precision := 0.01;\n  did jsonb := town.forge_try_fired("),
      // (the stories go wrong from the first try on and stop long before the odds are counted: the first scene that reads the number is the one named)
      ["three tries to +3"]],
    ["a draw is laid out by no chance: always the first two",
      swap("  did jsonb := town.forge_draw(purse, town.smithy_held(me), p_slot, random(), random());", "  did jsonb := town.forge_draw(purse, town.smithy_held(me), p_slot, 0, 0);"),
      ["the draw: two options of the first pool"]],
    // ── a try for the top without the fire ──
    ["a try for the top asks for no fire",
      swap("  if needs then\n    why_ := town.fire_why(p_fire, p_id, p_now);\n    if why_ is not null then return town.no(why_); end if;\n  end if;\n", ""), ["forge_try_fired", "no fire lit: `fire`"]],
    ["a try for the top leaves the fire lit: it is used again and again",
      swap("  if (did->>'spent')::boolean then perform town.keep_fire(did->'fire'); end if;\n", ""), ["a try that fails: the level stays"]],
    ["whose turn it is not may use the fire",
      swap("  return case when at_ < town.fire_open_to(p_fire, p_now) then null else 'turn' end;", "  return null;"), ["fire_why", "second in the row while the first has the fire to themself"]],
    ["who has taken the top stands in the row again",
      swap("  if p_fire->'topped' ? p_id then return town.no('topped'); end if;\n", ""), ["fire_join", "who has taken the top may not stand in the row again"]],
    // ── the fire's next moment leaking ──
    ["what a page is told of the fire has the moment the next can be found",
      swap("    'topped', p_fire->'topped' ? p_me)\n$$;", "    'topped', p_fire->'topped' ? p_me, 'due', p_fire->'due')\n$$;"),
      ["fire_told", "no answer has it", "what is told of the fire is always the same seven things"]],
    ["a member is told the fire as it is kept, not as a page may know it",
      swap("    'fire', town.fire_told(town.fire_kept(false), p_member::text, town.now_ms()))", "    'fire', town.fire_kept(false))"),
      ["no answer has it", "what is told of the fire is always the same seven things"]],
    ["the try's answer passes on whatever the rule gave back, the fire's own document with it",
      swap("  return town.smith_answer(me, jsonb_build_object('ok', true, 'out', did->'out', 'from', did->'from', 'level', did->'level', 'item', did->'item', 'owed', did->'owed', 'spent', did->'spent'));",
        "  return town.answer(me, did) || jsonb_build_object('smith', town.smith_told(me));"), ["no answer has it"]],
    ["the try's deed says by what number the next fire's while was drawn",
      swap("    || case when (did->>'spent')::boolean then '{\"fire\": true}'::jsonb else '{}'::jsonb end);", "    || case when (did->>'spent')::boolean then jsonb_build_object('fire', true, 'due', did->'fire'->'due') else '{}'::jsonb end);"),
      ["no deed's document has it either", "the try's deed says the fire was spent"]],
    // ── a bare write ──
    ["the fire is kept by a write with no WHERE",
      swap("as $$ update public.town_great_fire set doc = p_doc, updated_at = now() where one $$;", "as $$ update public.town_great_fire set doc = p_doc, updated_at = now() $$;"),
      ["no function writes to a table with no WHERE"]],
    // ── a hold out of order, where it can be seen ──
    ["a try takes the member's purse before the village's rows",
      swap("  fire_ jsonb := town.fire_kept(true);\n  board jsonb := town.board_sound(town.thing('smith', true));\n  purse jsonb := town.purse_of(me, true);\n  r double precision",
        "  purse jsonb := town.purse_of(me, true);\n  fire_ jsonb := town.fire_kept(true);\n  board jsonb := town.board_sound(town.thing('smith', true));\n  r double precision"),
      ["every function a member calls takes its rows in the one order"]],
    ["a try reads the fire without holding it, and writes it all the same",
      swap("  fire_ jsonb := town.fire_kept(true);\n  board jsonb := town.board_sound(town.thing('smith', true));\n  purse jsonb := town.purse_of(me, true);\n  r double precision",
        "  fire_ jsonb := town.fire_kept(false);\n  board jsonb := town.board_sound(town.thing('smith', true));\n  purse jsonb := town.purse_of(me, true);\n  r double precision"),
      ["…each holding exactly what the part's head says it holds", "whatever a function a member calls writes, it holds first"]],
    ["a rule takes a hold of its own: the board's row, inside the telling",
      swap("  select jsonb_build_object('smithy', town.smithy_read(p_member), 'board', town.board_sound(town.thing('smith', false)),", "  select jsonb_build_object('smithy', town.smithy_read(p_member), 'board', town.board_sound(town.thing('smith', true)),"),
      ["no rule of the part takes a hold but the two readers made for it"]],
    // ── a move ──
    ["what the smith put into a tool is moved from anywhere",
      swap("coalesce(town.by_smith(p_x, p_y), false), coalesce(p_playing, false), now_);", "true, coalesce(p_playing, false), now_);"), ["refused, each for its reason and before a coin is taken"]],
    ["a can keeps all its water whatever it holds after a move",
      swap("    if holds > 0 then next_ := next_ || jsonb_build_object('water', greatest(0, least((next_->>'water')::numeric, holds::numeric))); end if;\n", ""),
      ["tool_with_forging", "a full can whose forging is traded for a lesser one"]],
    // ── the part without its lines ──
    // (the place for a built function is gone from the part: the build says so, loudly, and nothing of the lines is run)
    ["the part goes out without its lines on the woodcutters' function: no tree is anybody's tinder",
      swap("-- <public.town_fell>\n-- </public.town_fell>", "-- <public.town_felled>\n-- </public.town_felled>"),
      ["the functions of earlier files are built from the database's own text with the part's lines in place", "the next tree felled is the village's tinder"]],
  ];
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? all.length);
  // (an anchor of more than one line is written with plain line ends: the part is read so, however git checked it out)
  return all.slice(from, to).map(([name, mutate, mustFail]) => [name, (sql) => mutate(sql.split("\r\n").join("\n")), mustFail]);
};

/** The lines' own breaks: [what it is, the text of v174.smith.lines.mjs that is changed, what stands in its place, the checks that have to fail]. */
export const LINES = [
  ["a tree felled is nobody's tinder: the block that finds it is empty",
    "    did := did || town.fire_find(fire_, 'tinder', me, now_);\\n", "    null;\\n", ["the next tree felled is the village's tinder"]],
  ["a go that is lost finds the tinder all the same: no tree need fall",
    "  if fire_ is not null and jsonb_array_length(did->'felled') > 0 then\\n", "  if fire_ is not null then\\n", ["a felling call that is refused, and a go that is lost"]],
  ["the woodcutters' call reads the fire's row without holding it, and a half is written all the same",
    "if town.fire_wants('tinder', me, now_) then fire_ := town.fire_kept(true); end if;", "if town.fire_wants('tinder', me, now_) then fire_ := town.fire_kept(false); end if;", ["…each holding exactly what the part's head says it holds"]],
  ["the flint is the breaker's, not whoever is paid for the rock",
    "    lit_ := town.fire_find(fire_, 'flint', first_, now_);\\n", "    lit_ := town.fire_find(fire_, 'flint', me, now_);\\n", ["a rock the admin struck first, broken by another member"]],
  ["a helper is told of the flint the one who is paid found",
    "    || case when first_ = me then lit_ else '{}'::jsonb end\\n", "    || lit_\\n", ["a rock the admin struck first, broken by another member"]],
  ["the miners' call takes the fire's row after the purses",
    "    + \"  if first_ is not null and first_ < me then theirs := town.purse_of(first_, true); end if;\\n\",\n  ],\n  [\n    \"  perform town.keep_cave(place_, next_);\\n\",\n    \"  perform town.keep_cave(place_, next_);\\n\"",
    "    + \"  if first_ is not null and first_ < me then theirs := town.purse_of(first_, true); end if;\\n\",\n  ],\n  [\n    \"  perform town.keep_cave(place_, next_);\\n\",\n    \"  perform town.keep_cave(place_, next_);\\n  if fire_ is null then fire_ := town.fire_kept(true); end if;\\n\"",
    ["every function a member calls takes its rows in the one order"]],
  ["the bellows count for nothing on the helpers' line",
    "'line', 'helpers', 'raw', l->'helpers'->'bellows'));", "'line', 'helpers', 'raw', 0));", ["counts_of", "written down in the helper's name, each press"]],
  ["whoever presses their own bellows has points for it",
    "    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then\\n", "    if jsonb_typeof(doc->'whose') = 'string' then\\n", ["counts_of"]],
  ["a half found has no word of its own",
    "when 'fire_found' then 'พบส่วนหนึ่งของไฟใหญ่ของเตา' ", "", ["fifteen kinds of deed"]],
];

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]) && process.argv[2] === "lines") {
  const root = process.env.FC_REPO;
  if (!root) { console.log("FC_REPO=<the worktree's root> node v174.smith.mutations.mjs lines"); process.exit(2); }
  const here = dirname(fileURLToPath(import.meta.url)), rel = ".claude/skills/fc-cash-town/scripts/db", src = join(root, rel), lines = readFileSync(join(src, "v174.smith.lines.mjs"), "utf8").split("\r\n").join("\n");
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? LINES.length);
  let caught = 0;
  for (const [i, [name, was, put, must]] of [...LINES.entries()].slice(from, to)) {
    // (a root of its own, with the part's files in it and the lines broken: try-v164.mjs reads a part from the root it
    // is given, and the code from FC_REPO; the scenes load the code by repo-ts-town.mjs, beside them)
    const fake = join(here, `lines-break-${i}`), db = join(fake, rel);
    rmSync(fake, { recursive: true, force: true });
    mkdirSync(db, { recursive: true });
    for (const f of readdirSync(src).filter((n) => /^v174\.smith\./.test(n) || n === "repo-ts-town.mjs")) cpSync(join(src, f), join(db, f));
    if (lines.split(was).length !== 2) { console.log(`MISSED  ${name}  (the text meant is not in the lines once)`); continue; }
    writeFileSync(join(db, "v174.smith.lines.mjs"), lines.replace(was, () => put));
    const run = spawnSync(process.execPath, [join(here, "try-v164.mjs"), fake, "v174", "smith"], { cwd: here, encoding: "utf8", env: { ...process.env, FC_REPO: root } });
    const failed = run.stdout.split("\n").filter((l) => l.startsWith("  FAIL")).map((l) => l.slice(7)), missing = must.filter((m) => !failed.some((f) => f.startsWith(m)));
    const ok = missing.length === 0 && failed.length > 0;
    if (ok) caught++;
    console.log(`${ok ? "CAUGHT" : "MISSED"}  ${name}  (${failed.length} FAIL line(s)${missing.length ? `; still passing: ${missing.join(" | ")}` : ""})`);
    rmSync(fake, { recursive: true, force: true });
  }
  console.log(`\n${caught}/${to - from} breaks of the lines caught`);
  process.exit(caught === to - from ? 0 : 1);
}
