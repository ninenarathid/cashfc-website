import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { caveDay } from "@/lib/town/cave-state";
import { MINING } from "@/lib/town/mining";
import { caveLayout } from "@/lib/town/mining-row";

/*
 * The cave's floors for the day, laid into the database by the site's server (`town_cave_days`).
 *
 * The cave is another cave each day (lib/town/cave makes a floor from its number and the day's), and the database's
 * rules of mining need the floor's rocks and its walkable tiles in a table, since SQL cannot make a floor. So the
 * game's own generator (lib/town/mining-row's caveLayout, the same one a page lays a floor out with) is run here,
 * once for each of the day's thirty floors, and the rows are written: `{ day, floor, layout }`. The database asks for
 * them when a member looks at the cave and finds the day's not laid (it answers `unlaid`); the page then comes here
 * and asks again. Written as the weather is (app/api/town/weather).
 *
 * Nothing a caller says is believed or even read: no query and no body. The day is this server's clock's (Bangkok's,
 * turning at 05:00, as the cave's rules count it), the floors are the generator's. A row that is there already is
 * left as it is (insert only: nothing here updates or deletes), so asking over and over only counts rows. Where the
 * database has no such table yet, or the site has no key to write with, it answers that no floor is laid, and says
 * nothing else.
 */
export const dynamic = "force-dynamic";

/** Asked for by a town full of people, answered once a minute. */
const HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=240" };

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  const day = caveDay(Date.now());
  try {
    const supabase = admin();
    if (!supabase) return Response.json({ day, laid: 0 }, { headers: HEADERS });
    const count = () => supabase.from("town_cave_days").select("floor", { count: "exact", head: true }).eq("day", day);
    const before = await count();
    // (no such table yet: nothing is laid, and nothing is said of why)
    if (before.error) return Response.json({ day, laid: 0 }, { headers: HEADERS });
    if ((before.count ?? 0) < MINING.floors) {
      const rows = Array.from({ length: MINING.floors }, (_, i) => ({ day, floor: i + 1, layout: caveLayout(i + 1, day) }));
      // (a floor that is kept already stays as it is: two askers at once write the same thing, or one of them nothing)
      await supabase.from("town_cave_days").upsert(rows, { onConflict: "day,floor", ignoreDuplicates: true });
    }
    const after = await count();
    return Response.json({ day, laid: after.error ? 0 : after.count ?? 0 }, { headers: HEADERS });
  } catch {
    return Response.json({ day, laid: 0 });
  }
}
