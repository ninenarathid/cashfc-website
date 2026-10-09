// v164's miners' part tried the way mutate.mjs tries a file: `node mutate.mjs <root>/…/db/v164.mining.sql
// v164.mining.test.mjs v164.mining.mutations.mjs`, in the scratch folder of the dry runs. It is try-v164.mjs with the
// part named (which runs the base first: the part says in its head that it stands on it); the broken copy comes in by
// MIGRATION_FILE, which try-v164.mjs reads in the part's place. The worktree is FC_REPO.
//   FC_REPO=<the worktree's root> node v164.mining.test.mjs
const root = process.env.FC_REPO;
if (!root) { console.log("FC_REPO=<the worktree's root> node v164.mining.test.mjs"); process.exit(2); }
process.argv.splice(2, process.argv.length, root, "v164", "mining");
await import("./try-v164.mjs");
