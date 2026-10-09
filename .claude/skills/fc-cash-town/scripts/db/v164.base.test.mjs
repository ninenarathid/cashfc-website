// v164's base part tried the way mutate.mjs tries a file: `node mutate.mjs <root>/…/db/v164.base.sql v164.base.test.mjs
// v164.base.mutations.mjs`, in the scratch folder of the dry runs. It is try-v164.mjs with the part named; the broken
// copy comes in by MIGRATION_FILE, which try-v164.mjs reads in the part's place. The worktree is FC_REPO.
//   FC_REPO=<the worktree's root> node v164.base.test.mjs
const root = process.env.FC_REPO;
if (!root) { console.log("FC_REPO=<the worktree's root> node v164.base.test.mjs"); process.exit(2); }
process.argv.splice(2, process.argv.length, root, "v164", "base");
await import("./try-v164.mjs");
