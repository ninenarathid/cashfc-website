# Passive equipment

The bag's **Equip / ติดตัว** button moves one reusable passive item into the existing `wears` equipment list. The item owns no inventory slot there, retains its existing benefit, and can be returned to the bag with **Remove / ถอด**. Removal requires room; a failed removal changes nothing. Duplicate equipment of the same item is refused. Carrying baskets keep their existing capacity rules.

There are 54 eligible items in `lib/town/passive-equipment.ts`, with Thai and English descriptions of their implemented effects. The bag, equipped list, shop and item cards show those descriptions. Same-kind tackle and alternative yield bonuses retain their existing strongest-value rules. Fitted hooks must still be selected in the rod's hook slot; equipping one does not select it automatically.

Active hand tools (including the clay oven), cookware, crafting station tools, ingredients and consumable supplies remain physical inventory items. Stacks with extra metadata cannot enter the passive list, so no forging or other item data is discarded. `carriedBag` / `town.carried_bag` are read-only effect views; transfers, costs and capacity use the physical bag.

Deploy the matching frontend and apply **`supabase/v203_passive_equipment_outside_the_bag.sql` after v198**. v199–v202 may already be installed. The migration is transactional, accepts the original or already patched definitions, and refuses drift. Its helpers stay private; existing member-only wear and take-off RPCs perform the inventory changes. No player inventory is automatically moved by installation.

Validation: 236 focused game tests and TypeScript checking; 193 SQL/TypeScript parity cases on local PGlite both with and without v199–v202. Database checks cover every eligible item, ownership, duplicate use, full inventory, metadata, cooking/camp/preparation/water costs, table reach, RPC persistence, member isolation, privileges, rerun and drift rejection. Browser checks cover actual equip/remove actions, effects, 390px layout, no horizontal overflow and no browser errors. Local screenshots are under `.codex/passive-equipment/`.

Rebuild the SQL from the local harness using `.claude/skills/fc-cash-town/scripts/db/build-v203.mjs`; run `.claude/skills/fc-cash-town/scripts/db/v203.test.mjs` beside the harness with `FC_REPO` set. Set `WITH_RECENT=1` to include v199–v202 in the database baseline. These scripts never access a live database.
