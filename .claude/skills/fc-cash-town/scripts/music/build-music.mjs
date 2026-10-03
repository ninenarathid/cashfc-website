// The town's music, from the pieces the owner makes with Suno (suno-prompts.md) to the files the town plays.
//
//   node build-music.mjs <ffmpeg> [HH ...]
//
// Reads work/HH.wav (the hour a piece was made for; `work` is not kept by git: the WAVs are 34 MB each) and writes
// public/town/music-HH-<hash>.mp3, named by its content, and lib/town/music.json, the hours that have a piece and
// its file. With no hours it builds every WAV in work/; an hour already in music.json and not built again is kept.
//
// What is done to a piece:
//   · levelled: every piece to the same loudness (TARGET, EBU R128), so that an hour's change is not a jump;
//   · its end found (the last sound, Suno's pieces die away by themselves) and a PAUSE of silence left after it,
//     since the player loops the file and the pause is the breath before it begins again;
//   · the first 20 ms eased in, in case it begins in the middle of a wave;
//   · every tag taken off, and encoded as MP3 (LAME, VBR quality 5: about 105 kbit/s for these, 2.3 MB for three
//     minutes; it lost the least of the settings of its size tried against the WAV, CBR and AAC at 96 among them).
//
// ffmpeg is not in the project: `npm i ffmpeg-static` in a scratch folder gives one (node_modules/ffmpeg-static/ffmpeg.exe).
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../../..");
const WORK = path.join(HERE, "work");
const PUB = path.join(ROOT, "public/town");
const LIST = path.join(ROOT, "lib/town/music.json");

/** Integrated loudness every piece is brought to (LUFS), and the highest true peak allowed after it (dBFS). */
const TARGET = -17, CEILING = -1.5;
/** Silence left after a piece's last sound, before it begins again (seconds). */
const PAUSE = 3;

const [ffmpeg, ...asked] = process.argv.slice(2);
if (!ffmpeg || !fs.existsSync(ffmpeg)) { console.error("usage: node build-music.mjs <ffmpeg> [HH ...]"); process.exit(1); }
if (!fs.existsSync(WORK)) { console.error(`no ${WORK}: put the pieces there as HH.wav`); process.exit(1); }
const hours = (asked.length ? asked : fs.readdirSync(WORK).filter((f) => /^\d\d\.wav$/.test(f)).map((f) => f.slice(0, 2))).sort();
for (const h of hours) if (!/^([01]\d|2[0-3])$/.test(h) || !fs.existsSync(path.join(WORK, `${h}.wav`))) { console.error(`no work/${h}.wav`); process.exit(1); }

/** ffmpeg's own words about a file (it writes them to stderr). */
function listen(file, filter) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-nostats", "-i", file, "-af", filter, "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg could not read ${file}\n${r.stderr.slice(-400)}`);
  return r.stderr;
}

const list = fs.existsSync(LIST) ? JSON.parse(fs.readFileSync(LIST, "utf8")) : {};
for (const h of hours) {
  const src = path.join(WORK, `${h}.wav`);
  const said = listen(src, "ebur128=peak=true,silencedetect=noise=-60dB:d=0.3");
  const summary = said.slice(said.lastIndexOf("Summary:"));
  const loud = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]), peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]);
  const secs = (() => { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(said); return m ? m[1] * 3600 + m[2] * 60 + Number(m[3]) : NaN; })();
  if (![loud, peak, secs].every(Number.isFinite)) throw new Error(`could not measure ${src}`);
  // the last sound: where the silence that runs to the end begins
  const quiet = [...said.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1])), ended = [...said.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const end = quiet.length > ended.length || (ended.length && secs - ended.at(-1) < 0.05) ? quiet.at(-1) : secs;
  const gain = Math.min(TARGET - loud, CEILING - peak);

  const tmp = path.join(WORK, `${h}.mp3`);
  const r = spawnSync(ffmpeg, ["-v", "error", "-y", "-i", src,
    "-af", `atrim=end=${end.toFixed(3)},afade=t=in:d=0.02,volume=${gain.toFixed(2)}dB,apad=pad_dur=${PAUSE}`,
    "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-id3v2_version", "0",
    "-c:a", "libmp3lame", "-q:a", "5", tmp], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg could not write ${tmp}\n${r.stderr.slice(-400)}`);

  const bytes = fs.readFileSync(tmp);
  const name = `music-${h}-${crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 10)}.mp3`;
  for (const f of fs.readdirSync(PUB)) if (new RegExp(`^music-${h}-[0-9a-f]{10}\\.mp3$`).test(f) && f !== name) fs.unlinkSync(path.join(PUB, f));
  fs.writeFileSync(path.join(PUB, name), bytes);
  fs.unlinkSync(tmp);
  list[h] = name;
  console.log(`${h}  ${loud.toFixed(1)} LUFS, peak ${peak.toFixed(1)}  ->  ${gain >= 0 ? "+" : ""}${gain.toFixed(2)} dB  |  ${end.toFixed(1)} s and a pause of ${PAUSE}  |  ${(bytes.length / 1e6).toFixed(2)} MB  ${name}`);
}

// only the hours whose file is there, in order (written by hand: an object puts "16" before "08")
const kept = Object.entries(list).filter(([, f]) => fs.existsSync(path.join(PUB, f))).sort(([a], [b]) => a.localeCompare(b));
fs.writeFileSync(LIST, `{\n${kept.map(([h, f]) => `  "${h}": "${f}"`).join(",\n")}\n}\n`);
console.log(`${kept.length} pieces: ${kept.map(([h]) => h).join(" ")}`);
