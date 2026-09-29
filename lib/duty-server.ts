import index from "@/lib/duty-art.json";
import { NO_ART, type DutyArt } from "@/lib/duty";

/**
 * Every duty picture in public/duty, as kind → slug → public path.
 *
 * The folders are still the index — adding a picture is dropping a file in —
 * but they are read by scripts/prebuild.mjs before every build, which writes
 * what it finds to lib/duty-art.json, rather than here at request time. The
 * member page and the party pages render on request, and on Cloudflare there
 * is no disk under them to read. The rules for what counts as a picture, and
 * which one wins, live with the walk in that script.
 */
export function dutyArtMap(): DutyArt {
  return { ...NO_ART, ...(index as Partial<DutyArt>) };
}
