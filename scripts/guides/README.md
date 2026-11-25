# Guides from data

The site's guides (v344: `guides`, `guide_steps`) are made in the page by an
admin, or from a data file here when a whole fight is written at once — the
Dawntrail Extremes following game8's plans, 2026-11-25.

```
node scripts/guides/build.mjs scripts/guides/data/<slug>.json --compare <dir>   # pictures + preview + check sheets
node scripts/guides/import.mjs scripts/guides/data/<slug>.json                  # into the database (after v344)
```

## Why our own pictures

game8's diagrams are their own drawings and their site forbids copying them.
The plan in them — where every role stands, what goes off where, where the
waymarks are — is a fact about the fight. So each picture is described here as
a scene and drawn by `render.mjs` in our style, with the game's own role and
waymark icons, matching game8's picture in composition: same arena, same
waymarks, same place for every role, same shapes. The words are written in
Thai in our own words, saying exactly what game8 says.

Reference pictures (`refs`, what to watch for: the boss's pose, an object at
the edge) are in-game screenshots; game8's screenshots of the game may be used
for these, small, until the FC has its own.

Frames from the creators' videos may be used too (the owner, 2026-11-25: "ใช้
รูปของวิดิโอได้ทั้งสองคน เขียน credit แนบลิงค์ให้ด้วย"): Hamukatsu's, whose
strat game8 mostly follows, and Nukemaru's (ぬけまるG). Each carries `by` (the
creator, in English: "Nukemaru", "Hamukatsu") and `url` (the video at that
moment, `https://youtu.be/<id>?t=<seconds>`); the page puts "ภาพ: Nukemaru ↗"
under it and lists the videos under the source line (v350). Cut a frame with
yt-dlp + ffmpeg, then crop it tight to what is watched: never the creator's
mascot, their subtitle box, the Japanese game UI (cast bar, nameplates, buffs,
combat text) or the party list's player names. A diagram the creator drew over
the game is theirs: redraw it as a scene, as game8's. game8 stays the plan;
a video is for the tells, the tricks and the timing.

## The data file

```jsonc
{
  "guide": {
    "slug": "ex7-enuo",                       // a-z 0-9 -, the page's address
    "short": "EX7",                           // big title
    "name": "Enuo · The Unmaking (Extreme)",  // beside it
    "category": "extreme", "expansion": "Dawntrail", "patch": "7.4",
    "source_name": "game8", "source_url": "https://game8.jp/ff14/782325",
    "content_key": "ex:Enuo",                 // the party finder's key (lib/party-seeds)
    "note": "Thai: waymarks used, anything true for the whole fight",
    "macro_en": "…", "macro_ja": "…",          // the strat's macro to paste into the game (v349)
    "xref_name": "xivjpraids.com", "xref_url": "https://…",   // where the macro/cheatsheet come from
    "req": { "level": 100, "ilvl": 770, "party": 8, "minutes": 60,      // before you go in (v347)
             "unlock": "Thai: how to unlock it", "unlock_en": "English",
             "unlock_pics": [{ "map": { "map": "y6t1/00", "size": 180, "x": 11.1, "y": 14.6, "label": "Wandering Minstrel" },
                               "say": "Thai caption", "say_en": "…" }] }   // a map with a pin (v348; map.mjs)
  },
  "defaults": {                               // every scene starts from these
    "frame": [4, 3],                          // game8's pictures are 440×330
    "bg": "#5c5e63",                          // outside the arena
    "arena": { "shape": "circle", "at": [50, 50], "r": 45, "fill": "#8a8c91" },
    "waymarks": { "A": [50, 8], "B": [92, 50], "C": [50, 92], "D": [8, 50],
                  "1": [20, 20], "2": [80, 20], "3": [80, 80], "4": [20, 80] },
    "iconSize": 6.5, "markSize": 5.5, "bossSize": 9, "ring": 6
  },
  "cheatsheet": { … },                         // the whole fight on one page (v349; see cheatsheet.mjs):
                                              // panels with scenes and "strict" like steps, plus one sheet picture
  "rewards": [                                // what the fight gives (v347), shown after the steps
    { "kind": "token" | "weapon" | "mount" | "minion" | "orchestrion" | "accessory" | "other",
      "name": "Totem of Naught",              // as the English client names it
      "ilvl": 785,                            // where it has one
      "icon_src": "https://v2.xivapi.com/api/asset?path=ui/icon/…_hr1.tex&format=png",   // the game's own icon
      "say": "Thai", "say_en": "English",
      "pics": [{ "src": "…", "say": "Thai caption", "say_en": "…" }],                    // up to 4
      "pieces": [{ "name": "Falchion of Naught", "job": "PLD", "icon_src": "…" }] }        // a set, up to 40
  ],
  "steps": [
    {
      "phase": "ช่วงแรก",                     // heading; repeats are fine, a change starts a new one
      "mech": "Void Expansion (無の肥大)",     // the big mechanic; consecutive steps share a box
      "name": "แบบที่ 1: วงกลม",               // this part
      "note": "Thai, for everybody",
      "says": { "MT": "Thai line for MT", "H1": "…" },   // per role, where it differs
      "ring": 6,                              // spotlight radius, % of width (≈ icon size)
      "strict": true | false | ["MT", "ST"],  // which roles get a ring (below)
      "game8": ["https://img.game8.jp/…/show"],          // the picture this redraws (for the check sheet)
      "refs": [{ "src": "https://img.game8.jp/…/show", "say": "Thai caption" },
               { "src": "frames/ex3-0424.webp",             // or a file, relative to this data file
                 "say": "Thai caption", "by": "Nukemaru", "url": "https://youtu.be/<id>?t=264" }],   // v350
      "plan": "แผน game8",                    // v350: which way of playing the mechanic (below)
      "scene": { … } | null,                   // null: words only
      "en": {                                  // the English beside the Thai (v346)
        "phase": "…", "mech": "…", "name": "…", "note": "…", "plan": "game8's plan",
        "says": { "MT": "…" }, "refs": ["caption for refs[0]", "…"]
      }
    }
  ]
}
```

### Two ways to play a mechanic (v350)

Where a mechanic is played two ways (game8's plan and a shortcut parties use
instead), its steps carry `plan` (the tab's Thai name, ≤ 40) and `en.plan`.
The page draws one tab a way inside the mechanic's box, game8's first (so put
game8's steps first); a step of that mechanic with no `plan` is shown under
every tab (what both ways share). The reader's pick is kept per guide in their
browser. A guide with no `plan` anywhere imports whether or not v350 has run.

### A scene

Everything in **percent of the frame**: x 0–100 left to right, y 0–100 top to
bottom. Sizes (`r`, `w`, `h`, `len`, `wd`, `size`) are in percent of the
frame's **width**. Angles in degrees, 0 = up (north on a north-up picture),
clockwise.

```jsonc
{
  "frame": [4, 3],                 // optional, else defaults
  "arena": { "shape": "circle" | "square", "at": [x, y], "r": 45 | "w": 80, "h": 80,
             "fill": "#8a8c91", "lines": true } | null,
  "waymarks": { "A": [x, y], … } | null,      // merged over the defaults; null hides them
  "boss": [x, y] | [[x, y], …],
  "roles": { "MT": [x, y] | [[x, y], [x, y]], "ST": …, "H1": …, "H2": …,
             "D1": …, "D2": …, "D3": …, "D4": … },
  "shapes": [
    { "t": "circle", "at": [x, y], "r": 10, "c": "orange", "o": 0.45 },
    { "t": "donut",  "at": [x, y], "r": 40, "r2": 15 },
    { "t": "cone",   "at": [x, y], "dir": 0, "spread": 90, "len": 60 },
    { "t": "rect",   "at": [x, y], "w": 10, "h": 60, "rot": 0 },   // centre, rotated about it
    { "t": "ring",   "at": [x, y], "r": 5, "c": "red", "wd": 0.8 }, // outline: a marker, a tower
    { "t": "line",   "from": [x, y], "to": [x, y], "c": "white", "wd": 0.7, "dash": true },
    { "t": "arrow",  "from": [x, y], "to": [x, y], "c": "white", "wd": 0.8 },
    { "t": "dot",    "at": [x, y], "r": 1.6, "c": "purple" },       // an orb, an add, a puddle
    { "t": "text",   "at": [x, y], "s": "1", "size": 3.2, "c": "white" }
  ]
}
```

Colours: `orange` (AoE, the default), `red`, `blue`, `purple`, `yellow`,
`green`, `white`, `grey`, `black`, `cyan`, `pink`, or `#hex`. `o` is the fill's
opacity. Shapes are drawn in order, under the waymarks, the boss and the roles.

Every role's position is also the spot the page lights up for that role, so a
role that is in the picture gets its spotlight for free — but only where the
position is truly fixed (the owner, 2026-11-25). `strict`: left out or
`true`, every role in the picture is ringed; `false`, nobody is (everybody
together in one stack, a picture that shows a shape or a telegraph, a rough
"somewhere over here"); a list, only those roles (the tanks have a set place,
the rest are free). A role without a ring sees the whole picture and keeps
its line. Give a role two
positions when the plan says "here or there"; leave a role out when the
picture does not place it.

## Tools and builders

Everything a guide is built from but does not ship with it (videos, frames,
game8's pages, the yt-dlp and ffmpeg installs) goes in `scripts/guides/.work/`,
which git ignores. Run from the repo root:

```
node scripts/guides/tools/setup.mjs            # once per computer: yt-dlp + ffmpeg into .work (needs Python 3)
node scripts/guides/tools/yt.mjs <yt-dlp args>  # search, chapters, downloads (avc1 at 1080p cuts fastest)
node scripts/guides/tools/frames-sheet.cjs <clip> <outdir> <every-s> <offset-s> [cols]   # pick the moment
node scripts/guides/annotate-frame.cjs <spec.json>   # the footage picture: crop, blur, ring, Thai label
node scripts/guides/tools/contact.cjs <dir> <out.png> [cols] [width]                   # look over a set
python scripts/guides/tools/xa.py rows|search …  # XIVAPI v2: English names by Name@ja
python scripts/guides/tools/isearch.py <query>   # items: name, JA, ilvl, icon
python scripts/guides/tools/shop.py <id>         # a SpecialShop: what each token buys
python scripts/guides/tools/vtt2txt.py <in.vtt> <out.txt>   # a video's subtitles, timestamped
node scripts/guides/tools/rename-guide.mjs <slug> "<name>"  # rename live (the share card cut it short)
```

`builders/<slug>/<work>/` keeps what made each guide as it was run: `tools/`
(the generator that writes `data/<slug>.json`, its scenes, the footage
picture list, the checks) and `specs/` (each footage picture's crop, blur
boxes and label). They read and write under `scripts/guides/.work/<work>/`
(`dl/` for game8's pages and pictures, `frames/`, `compare/`), which is empty on
a new computer: fetch the pages and videos again before re-running one. To
change a live guide, edit `data/<slug>.json` and import it; the builder is the
record of how it was made, and the starting point for the next guide.
