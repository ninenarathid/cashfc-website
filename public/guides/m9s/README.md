# M9S artwork

`arena.jpg` — the floor, seen from above, cropped square to the playable area.

Crop to the floor and nothing else: the diagram draws it edge to edge, so any
wall or darkness left around the outside shrinks the arena inside the frame and
every coordinate lands slightly wrong. Around 1000×1000 is plenty; it is drawn
at half opacity under the diagram, so detail past that is spent on nothing.

Missing is fine. The arena falls back to a plain square with its grid, and the
mechanics are coordinates that never needed the picture.

Clips go here too, one per mechanic, named after its id:

    hardcore.mp4    ether-letting.mp4    bat-deathmatch.mp4

Six seconds, one mechanic, no sound, MP4 or WebM — never GIF, which is ten to
thirty times the size for the same few seconds. Then add `clip:
"/guides/m9s/hardcore.mp4"` to that mechanic in `lib/guides/m9s.ts`.
