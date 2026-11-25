// Once per computer: yt-dlp and ffmpeg into scripts/guides/.work (git-ignored).
// Needs Python 3 and Node on PATH. Running it again updates both.
// usage: node scripts/guides/tools/setup.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { WORK, YTDLP, ffmpeg } = require("./paths.cjs");
const python = process.platform === "win32" ? "python" : "python3";

mkdirSync(WORK, { recursive: true });
const pip = (target, pkg) =>
  execFileSync(python, ["-m", "pip", "install", "--upgrade", "--target", target, pkg], { stdio: "inherit" });
pip(YTDLP, "yt-dlp");
pip(`${WORK}/ffm`, "imageio-ffmpeg");
// imageio-ffmpeg downloads its binary on first use on some platforms.
execFileSync(python, ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
  { stdio: "inherit", env: { ...process.env, PYTHONPATH: `${WORK}/ffm` } });

console.log("\nwork folder:", WORK);
console.log("yt-dlp:     ", YTDLP, "(run through tools/yt.mjs)");
console.log("ffmpeg:     ", ffmpeg());
