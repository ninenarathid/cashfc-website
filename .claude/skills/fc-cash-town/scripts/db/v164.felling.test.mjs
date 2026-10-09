// v164's felling part tried the way mutate.mjs tries a file: `node mutate.mjs <root>/…/db/v164.felling.sql
// v164.felling.test.mjs v164.felling.mutations.mjs`, in the scratch folder of the dry runs. It is try-v164.mjs with the
// part named (which runs the base first: the part says in its head that it stands on it); the broken copy comes in by
// MIGRATION_FILE, which try-v164.mjs reads in the part's place. The worktree is FC_REPO.
//   FC_REPO=<the worktree's root> node v164.felling.test.mjs
const root = process.env.FC_REPO;
if (!root) { console.log("FC_REPO=<the worktree's root> node v164.felling.test.mjs"); process.exit(2); }
process.argv.splice(2, process.argv.length, root, "v164", "felling");
await import("./try-v164.mjs");
