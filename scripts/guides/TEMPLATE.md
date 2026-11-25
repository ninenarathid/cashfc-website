# One Extreme guide, the EX7 way

Every Dawntrail Extreme is built to the template EX7 Enuo ended on, after the
owner's feedback of 2026-11-25 ("ใช้รูปแบบเดียวกับ ex7 feedback อะไรที่เคยใช้ใน
ex7 ต้องมีใน ex อื่นด้วย ให้เป็น template เดียวกัน"). The reference is
`data/ex7-enuo.json`; read it whole before starting. The data format is in
`README.md`; the tools are `render.mjs`, `build.mjs`, `map.mjs`,
`cheatsheet.mjs`, `import.mjs`.

## Sources

- **The plan: game8's page for the fight** (Japanese). Everything from the
  waymarks section to the end of the last phase, in game8's order. Also its
  rewards section and its unlock/requirements section.
- **Macro and cheatsheet: xivjpraids.com**,
  `https://xivjpraids.com/7.0_dawntrail/extreme_trials/<name>/`: the English
  and Japanese macro blocks as they are, and the cheatsheet picture.
- **Names, item levels, icons: the game's data via XIVAPI v2**
  (`https://v2.xivapi.com/api/...`). English names only from here or another
  English source; never guess one.

## What a guide must have

1. **guide**: slug `exN-<boss>` (Arkveld: `arkveld`), short (`EX1`…, Arkveld
   `Arkveld`), name `<Boss> · <Duty> (Extreme)`, category `extreme`,
   expansion `Dawntrail`, patch as game8 and the game have it, source game8 +
   URL, `content_key` exactly the party finder's (`ex:<Boss>` as in
   `lib/duties.ts`).
2. **note** (Thai) and **en.note**: the overview, one thing per line, blank
   lines between groups, like EX7's: which strat game8 follows, "Marker 8
   ทิศมาตรฐาน (ดูขั้นแรก)" or the fight's own layout, the groups (4:4 etc.),
   the pairs, any fixed order. Seats written as MT/ST/H1/H2/D1–D4 (the page
   turns them into tags and lights the reader's part; keep pairs as `MT·D3`
   and lists split by ` / ` or ` > ` so a pair or a place in an order can be
   lit on its own).
3. **req**: level, ilvl (the game's `ContentFinderCondition`), party, minutes,
   `unlock` / `unlock_en` (how to unlock, from game8, one step per line), and
   `unlock_pics` with a **map** (`map.mjs`: map id and size factor from
   XIVAPI's `Map` sheet) wherever the unlock names a place and coordinates.
4. **steps**, in game8's order:
   - every positioning picture redrawn as a scene matching game8 exactly
     (arena, waymarks, boss, every role, every AoE/arrow/marker); check sheets
     until every pair matches;
   - `phase` in Thai ("ช่วงแรก", …), `mech` = English skill name only (no
     Japanese in brackets), `name` (Thai);
   - `strict` on every step: rings only where a role truly has a fixed spot
     (true / false / list);
   - `note` (Thai, ≤ 1000) one thing per line, `says` per role where a role
     does something of its own (≤ 200);
   - `refs` for what to watch (game screenshots), never a picture with
     Japanese text in it;
   - `en` on every step: phase, mech, name, note, says, refs captions.
5. **cheatsheet**, only when the fight's xivjpraids page has one (the owner,
   2026-11-25: "อันไหนมี cheatsheet ทำให้ด้วย ไม่มีไม่ต้องทำ"; of the Dawntrail
   Extremes, Zelenia and Arkveld have one). Where the picture is hosted by its
   author elsewhere (Zelenia's is akanabanana's), credit them as well.
   xivjpraids' cheatsheet redrawn panel by panel (square
   scenes), Thai titles + `title_en`, `lines` / `lines_en` where a panel needs
   words, `strict` per panel, footer/credit like EX7's ("อ้างอิง cheatsheet
   จาก xivjpraids.com · แปลและวาดใหม่โดย Cafe And SHabu"). Where a panel's
   meaning rests on a direction or a starting point, make it unmissable
   (EX7's Gaze of the Void: a gold ring at the start, 1→4 order numbers,
   white arrowheads along the arrow, the rule in words).
6. **macro_en / macro_ja** exactly as xivjpraids has them, **xref_name**
   `xivjpraids.com`, **xref_url** the fight's xivjpraids page.
7. **rewards** (from game8's rewards section, names/icons/ilvl from XIVAPI):
   the token (how many a clear gives, what it buys and for how many, where to
   exchange — with a **map** of the exchange NPC), the weapons or accessories
   as a set (`pieces`, every job, the game's icons, the item level), the rare
   mount with its **Mount Guide picture** (`ui/icon/0680xx` = the mount's icon
   id + 64000) and how many totems it costs, anything else game8 lists.

## How it is written

- **Thai first, game terms in English**: stack, spread, tower, tether,
  raid-wide, knockback, AoE, debuff, cone, donut. Roles in words: **Tank,
  Melee, Range, Healer** (never แทงค์/เมเล/เรนจ์/ฮีล).
- **No Japanese anywhere** a reader sees: not in names, notes, captions,
  pictures, map labels. A Japanese shape-word (ハ etc.) is described in Thai.
- **One thing per line**: lists one item a line, blank line between groups.
- Every instruction, condition, order and exception game8 gives is in the
  words — in our own words, not translated sentence by sentence.
- "Rule 1 / Rule 2" (not หลักที่) where game8 states numbered rules.

## Checks before handing it over

- `node scripts/guides/build.mjs scripts/guides/data/<slug>.json --compare <dir>`
  and every check sheet read; every pair matches game8.
- The cheatsheet rendered in TH and EN beside the source.
- No Japanese character anywhere in the file's reader-facing text (scan it).
- Lengths: note ≤ 1000, says ≤ 200, names ≤ 80, ref captions ≤ 160, panel
  titles ≤ 60, panel lines ≤ 40.
- `node scripts/guides/import.mjs scripts/guides/data/<slug>.json --dry`.
