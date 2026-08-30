# Marker art

Drop a PNG at any of these names and every guide picks it up. Nothing needs to
be edited to turn one on, and nothing breaks while it is missing — each marker
is drawn as a shape first and the picture goes over it, so a file that is
absent, slow or misspelt leaves a diagram that still reads.

    A.png  B.png  C.png  D.png  1.png  2.png  3.png  4.png   waymarks
    boss.png                                                 the boss
    MT.png ST.png H1.png H2.png D1.png D2.png D3.png D4.png  party slots

Square, transparent background, around 128px. They are drawn small — a waymark
is about a twentieth of the arena — so detail past that is spent on nothing.

A guide can override any of them through `arena.icons` if one fight needs its
own set.

## What is here now

Fetched from RaidPlan by `pipeline/fetch_raidplan.py` and resized to 128px:

    A B C D 1 2 3 4   game/ffxiv/mark/way_{a,b,c,d,1,2,3,4}.png
    boss              game/ffxiv/enemy/large.png
    MT ST             game/ffxiv/job/role_tank.png
    H1 H2             game/ffxiv/job/role_healer.png
    D1 D2             game/ffxiv/job/role_melee.png
    D3                game/ffxiv/job/role_ranged.png
    D4                game/ffxiv/job/rmage.png

The waymarks are the game's own glyphs, so a diagram shows the same shape
somebody is looking at on the floor. The seats take their role badge rather
than a job icon, which means MT and ST are the same picture — as they are in
the game. What tells them apart is the seat's name, drawn beside the marker on
the far side from the middle of the arena.

The art is Square Enix's, from FFXIV. See `public/guides/raidplan/SOURCE.json`.
