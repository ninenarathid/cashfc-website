// yt-dlp with what the guide footage needs: Node for YouTube's player script,
// and the ffmpeg setup.mjs installed. Every argument passes straight through.
//
//   node scripts/guides/tools/yt.mjs "ytsearch8:Nukemaru EX7" --flat-playlist --print "%(id)s | %(channel)s | %(title)s"
//   node scripts/guides/tools/yt.mjs --print description <url>                       # chapters
//   node scripts/guides/tools/yt.mjs -f "bv*[height<=1080][vcodec^=avc1]/bv*[height<=1080]" -o <file> <url>
//
// Prefer avc1 (H.264): AV1 decodes far slower when frames are cut.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { YTDLP, ffmpeg } = require("./paths.cjs");
const python = process.platform === "win32" ? "python" : "python3";

const r = spawnSync(python, ["-m", "yt_dlp", "--js-runtimes", "node", "--ffmpeg-location", ffmpeg(), ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, PYTHONPATH: YTDLP } });
process.exit(r.status ?? 1);
