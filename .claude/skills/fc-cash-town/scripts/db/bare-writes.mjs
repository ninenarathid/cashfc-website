/*
 * Every function of the site's, read for an UPDATE or a DELETE that has no WHERE of its own.
 *
 * The live database refuses those to whoever comes by the API ("UPDATE requires a WHERE clause", 21000: Supabase
 * loads `safeupdate` for the role PostgREST connects as), inside a function as anywhere, `security definer` or not.
 * The SQL editor lets them by and so does PGlite, so a dry run passes a function that fails for every member the
 * first time it reaches the statement. v129's jar had two (v141 names the row), and one of them lay on a path taken
 * only when a round of the uncle's had turned: the well's book stopped answering at seven that evening.
 *
 *   import { bareWrites } from "./bare-writes.mjs";
 *   t.check("no function writes to a table with no WHERE", (await bareWrites((q) => t.sql(q).then((r) => r.rows))).length === 0);
 *
 * A table of one row is written by its key all the same (`where j.one`); a whole table emptied on purpose says
 * `where true`.
 */

/** The words of a body, comments and what is quoted taken out, with how deep in brackets each stands. */
function words(src) {
  const bare = src.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/'(?:[^']|'')*'/g, " '' ").replace(/"[^"]*"/g, " q ");
  const out = [];
  let depth = 0;
  for (const m of bare.matchAll(/[A-Za-z_][A-Za-z_0-9.]*|[();]/g)) {
    const w = m[0];
    if (w === "(") depth++; else if (w === ")") depth--; else out.push({ w: w.toLowerCase(), depth });
  }
  return out;
}

/**
 * The writes of a body that have no WHERE: an UPDATE of a table (not `on conflict … do update`, not `for update`), a
 * DELETE FROM; each up to its `;` (or to where the brackets it stands in close), wanting a `where` as deep as itself.
 */
export function bareIn(src) {
  const w = words(src), found = [];
  for (let i = 0; i < w.length; i++) {
    const is = (w[i].w === "update" && w[i - 1]?.w !== "do" && w[i - 1]?.w !== "for" && w[i + 1] && !["set", "of", "nowait", "skip", ";"].includes(w[i + 1].w))
      || (w[i].w === "delete" && w[i + 1]?.w === "from");
    if (!is) continue;
    let has = false, j = i + 1;
    for (; j < w.length && w[j].w !== ";" && w[j].depth >= w[i].depth; j++) if (w[j].w === "where" && w[j].depth === w[i].depth) has = true;
    if (!has) found.push(w.slice(i, Math.min(j, i + 8)).map((x) => x.w).join(" "));
  }
  return found;
}

/** …of every function in the schemas given, as the database has them now. `run` answers a query with its rows. */
export async function bareWrites(run, schemas = ["town", "public"]) {
  const fns = await run(`select n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args, p.prosrc as src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
   where n.nspname in (${schemas.map((s) => `'${s}'`).join(", ")}) and l.lanname in ('plpgsql', 'sql') order by 1, 2, 3`);
  return fns.flatMap((f) => bareIn(f.src ?? "").map((what) => ({ fn: `${f.schema}.${f.name}(${f.args})`, what })));
}
