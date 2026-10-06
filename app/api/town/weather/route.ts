import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { readSlots, readWeather, slotOf, type Weather } from "@/lib/town/weather";

/*
 * Bangkok's weather for Cash Town (lib/town/weather), written into the
 * database a quarter of an hour at a time.
 *
 * Until 2026-10-04 this was one cached answer that every page asked for in
 * its own time, and two members side by side could be twenty minutes apart,
 * one in the rain and one in the sun. Now the database keeps the weather
 * (`town_weather`, v118): each quarter hour written once and never changed,
 * the next ones before their time, so that every page draws the same weather
 * at the same moment (lib/town/skies) and the database knows when it rained
 * (rain waters the plots). The pages read the database themselves; what is
 * asked of this route is to write the quarter hours that are due.
 *
 * So, when somebody asks: if the newest quarter hour kept is not at least
 * four ahead of now, Open-Meteo (free, no key) is asked for those since the
 * newest (a week back at the most, so that rain nobody was in town to see is
 * still kept) and for the five to come, and they are written; one that is
 * there already is left as it is. (Two and three until the rain frog,
 * lib/town/well-gifts: its member is shown the sky forty-five minutes ahead,
 * and a page with a frog on it asks while the fourth to come is not kept, so
 * that the third always is. The pages without one ask as they did, when the
 * last kept is under twenty minutes off.) With none kept at all it begins at the
 * quarter hour before this one: what rained before the town kept its weather
 * waters nothing. The answer is this quarter hour's weather, in the shape
 * the one cached answer had, for a page built before the change.
 *
 * Nothing a caller says is believed or written: only Open-Meteo's answer
 * is. So it needs no secret, and asking it over and over only reads one row.
 * Where the database has no such table yet, or the site has no key to write
 * with, it answers the old way: Open-Meteo's weather now, and nothing kept.
 */
export const dynamic = "force-dynamic";

const BANGKOK = "https://api.open-meteo.com/v1/forecast?latitude=13.75&longitude=100.5";
const FIELDS = "weather_code,precipitation,wind_speed_10m,wind_gusts_10m";
/** How many quarter hours ahead of now are written, how few ahead make the next ones due, and how far back a gap is filled (a week). */
const AHEAD = 5, DUE = 4, BACK = 672;
/** Asked for by a town full of people, answered once a minute. */
const HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=240" };

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** The old way: the weather now, kept nowhere. */
async function once(): Promise<Weather | null> {
  const r = await fetch(`${BANGKOK}&current=${FIELDS}&timezone=Asia%2FBangkok`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  // no weather is fine weather: the town just has its breeze
  return r.ok ? readWeather(await r.json()) : null;
}

export async function GET() {
  try {
    const supabase = admin();
    if (supabase) {
      const cur = slotOf(Date.now());
      const last = await supabase.from("town_weather").select("slot").order("slot", { ascending: false }).limit(1);
      if (!last.error) {
        const newest = typeof last.data?.[0]?.slot === "number" ? (last.data[0].slot as number) : null;
        if (newest === null || newest < cur + DUE) {
          const from = newest === null ? cur - 1 : Math.max(newest + 1, cur - BACK);
          const r = await fetch(`${BANGKOK}&minutely_15=${FIELDS}&past_minutely_15=${Math.max(1, cur - from)}&forecast_minutely_15=${AHEAD + 1}&timeformat=unixtime`,
            { cache: "no-store", signal: AbortSignal.timeout(6000) });
          if (r.ok) {
            const rows = readSlots(await r.json()).filter((s) => s.slot >= from && s.slot <= cur + AHEAD);
            // (a quarter hour that is kept already stays as it is: two askers at once write the same thing, or one of them nothing)
            if (rows.length) await supabase.from("town_weather").upsert(rows, { onConflict: "slot", ignoreDuplicates: true });
          }
        }
        const here = await supabase.from("town_weather").select("sky,wind,gust,rain").eq("slot", cur).maybeSingle();
        return Response.json(here.data ? readWeather(here.data) : null, { headers: HEADERS });
      }
    }
    return Response.json(await once(), { headers: HEADERS });
  } catch {
    return Response.json(null);
  }
}
