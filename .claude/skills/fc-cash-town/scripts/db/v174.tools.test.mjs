// v174's older tools' part tried the way mutate.mjs tries a file: `node mutate.mjs <root>/…/db/v174.tools.sql
// v174.tools.test.mjs v174.tools.mutations.mjs`, in the scratch folder of the dry runs. It is try-v164.mjs with the
// part named; the broken copy comes in by MIGRATION_FILE, which try-v164.mjs reads in the part's place. The worktree
// is FC_REPO.
//   FC_REPO=<the worktree's root> node v174.tools.test.mjs
const root = process.env.FC_REPO;
if (!root) { console.log("FC_REPO=<the worktree's root> node v174.tools.test.mjs"); process.exit(2); }
process.argv.splice(2, process.argv.length, root, "v174", "tools");
await import("./try-v164.mjs");
