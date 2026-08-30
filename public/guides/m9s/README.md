# M9S artwork

`arena.jpg` — the floor of Vamp Fatale's arena, seen from above, cropped square
to the playable area.

It comes from RaidPlan, fetched by `pipeline/fetch_raidplan.py` into
`public/guides/raidplan/raid/ff.aac3/map/01.m9-main.jpg` (2000×1126) and cut to
the arena with:

    sharp(src).extract({ left: 502, top: 64, width: 998, height: 998 })
              .resize(1024, 1024)

Those numbers are not eyeballed. The arena draws its own purple grid, and
scanning that image for purple finds five vertical lines at x = 502, 750, 1000,
1250, 1499 and five horizontal at y = 64, 313, 563, 813, 1062 — the outline and
the three cuts of a 4×4 floor. The outermost of each is the edge, to the pixel.

Crop to the floor and nothing else: the diagram draws it edge to edge, so any
wall or darkness left around the outside shrinks the arena inside the frame and
every coordinate lands slightly wrong. It is drawn at half opacity under the
diagram, so detail past about 1000×1000 is spent on nothing.

That crop is also what confirms `radius: 20` in `lib/guides/m9s.ts`: the floor's
own grid lines land exactly on 0 and ±5 in arena units, so the four tiles are
ten yards each and half the floor is twenty. Which is the number that puts a
pasted waymark preset in the right place.

Missing is fine. The arena falls back to a plain square with its grid, and the
mechanics are coordinates that never needed the picture.

Clips go here too, one per mechanic, named after its id:

    hardcore.mp4    aetherletting.mp4    undead-deathmatch.mp4

Six seconds, one mechanic, no sound, MP4 or WebM — never GIF, which is ten to
thirty times the size for the same few seconds. Then add
`clip: "/guides/m9s/hardcore.mp4"` to that mechanic in `lib/guides/m9s.ts`.
