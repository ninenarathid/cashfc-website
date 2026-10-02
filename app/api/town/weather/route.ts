import { readWeather } from "@/lib/town/weather";

/*
 * Bangkok's weather for Cash Town (lib/town/weather): one question to
 * Open-Meteo (free, no key) every fifteen minutes at most, for everybody.
 * The answer is a static response revalidated in the background, so a town
 * full of people asking costs the same as one, and nobody's browser ever
 * talks to the weather service itself.
 */
export const dynamic = "force-static";
export const revalidate = 900;

const BANGKOK = "https://api.open-meteo.com/v1/forecast?latitude=13.75&longitude=100.5"
  + "&current=weather_code,precipitation,wind_speed_10m,wind_gusts_10m&timezone=Asia%2FBangkok";

export async function GET() {
  try {
    const r = await fetch(BANGKOK, { next: { revalidate: 900 }, signal: AbortSignal.timeout(5000) });
    // no weather is fine weather: the town just has its breeze
    return Response.json(r.ok ? readWeather(await r.json()) : null);
  } catch {
    return Response.json(null);
  }
}
