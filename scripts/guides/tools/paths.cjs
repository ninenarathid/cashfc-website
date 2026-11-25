// Where the guide tools keep their downloads and programs.
//
// Everything a guide is built from but does not ship with it (videos, frames,
// game8's pages, the yt-dlp and ffmpeg installs) lives in scripts/guides/.work,
// which git ignores. `node scripts/guides/tools/setup.mjs` fills it once per
// computer.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const WORK = process.env.GUIDE_WORK || path.join(ROOT, "scripts/guides/.work");
const YTDLP = path.join(WORK, "ytdlp");
const FFM_BIN = path.join(WORK, "ffm/imageio_ffmpeg/binaries");

/** The ffmpeg to run: $FFMPEG, else the one setup.mjs installed, else whatever is on PATH. */
function ffmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const exe = fs.readdirSync(FFM_BIN).find((f) => /^ffmpeg/i.test(f) && !f.endsWith(".py"));
    if (exe) return path.join(FFM_BIN, exe);
  } catch { /* not installed here */ }
  return "ffmpeg";
}

module.exports = { ROOT, WORK, YTDLP, FFM_BIN, ffmpeg };
