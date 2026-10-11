import type {SupabaseClient} from '@supabase/supabase-js';

/** TEST needs public character labels, with no table mutation capability. */
export function casinoTestFrom(real:SupabaseClient,table:string) {
  if(table!=='profiles')throw Error('Persistent game tables are unavailable in TEST');
  return {select:()=>real.from('profiles').select('character_name,display_name,discord_username')};
}
