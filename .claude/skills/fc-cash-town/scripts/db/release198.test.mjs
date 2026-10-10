// Copy beside the PGlite harness; verify the owner's already-applied v195 path.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { standIn } from './stand-in.mjs';
import { migration } from './pglite-harness.mjs';
const root=process.env.FC_REPO,t=await standIn({upTo:178});
await t.run(migration(179),'applied v179');
await t.run(migration(183),'applied v183');
await t.run(readFileSync(join(root,'.codex/ram-audit/applied-v195.sql'),'utf8'),'applied v195');
const probe=readFileSync(join(root,'.codex/adventure-qa/deploy-readiness.sql'),'utf8');
const baseline=(await t.sql(probe)).rows;
for(const r of baseline)t.check(`starting marker v${r.version}`,r.feature_present===[176,177,178,179,183,195].includes(r.version));
for(const name of ['v180_a_workshop_for_the_tools.sql','v181_more_lines_on_the_water.sql','v182_fishing_the_streams_and_pools.sql','v184_reading_the_grain_before_the_axe.sql','v185_listening_to_the_layers_of_rock.sql','v186_a_garden_that_spreads_and_crosses.sql','v187_visitors_that_tend_the_garden.sql','v188_the_parts_a_forest_can_spare.sql','v194_secret_equipment_bonds.sql','v196_the_channels_and_properties_of_water.sql','v197_preparing_food_and_a_camp_for_friends.sql','v198_twenty_fish_for_each_water.sql'])await t.run(readFileSync(join(root,'supabase',name),'utf8'),name);
for(const r of (await t.sql(probe)).rows)t.check(`final marker v${r.version}`,r.feature_present);
t.done();await t.db.close();
