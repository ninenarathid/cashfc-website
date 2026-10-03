# Cash Town's music from Suno: the prompts

The owner's call (2026-10-04). Music to sit and work or study to, that need not be listened to: open and sparse, "like lying at ease in an open meadow, in a gentle breeze". One piece an hour (24), each different from the others and yet fitting its time of day, with the colour of a cozy game (nylon guitar, ukulele, marimba, glockenspiel, ocarina), and no rain, birds or café in the music itself, since the town has weather of its own.

It began as lofi with a soft beat, which he found too full in the middle of the sound. What was tried on 08 before the one he kept:

1. the lofi band (`lofi hip hop`, Rhodes, marimba and guitar, dusty drums): heavy, he said;
2. the same with lighter drums and bass: a wrong guess at what heavy meant;
3. `ambient lofi`, a pad for the Rhodes chords, sparse guitar and glockenspiel, neither `warm` nor `vinyl crackle` (both ask for a muffled sound that sits in the middle), and by his own hand `electric piano` excluded: still not open enough;
4. the one he kept: no `lofi` at all, since the word brings a beat, chords and that muffled middle with it; no pad, which never stops; no drums and no bass; one guitar and a few high notes with pauses between them; slower. (A second prompt went with it, `ambient lofi` with a quiet beat, in case this one was too bare. "Use this one," he said, which is taken to be the one without a beat.)

Suno has no public API, so the owner makes the pieces on suno.com and the files are fitted here afterwards (`build-music.mjs`: levelled, a pause left at the end, encoded; played by the hour).

It takes a paid plan (suno.com/pricing, 2026-10-04): Free has no downloads, Suno keeps its songs, and it gets only v6-mini. Pro downloads 20 songs a month, Premier 60, and the rights to a downloaded song stay after the plan ends. Free still serves to try a prompt by ear before paying.

## Settings, the same for every piece

- **Advanced** at the top of the Create page (the web's name for it; the phone app still says **Custom**), the plain **v6** model, and the **Lyrics** box left empty: on the web that is what makes a piece instrumental, there is no switch.
- **Exclude styles**, the first line under **More Options**:

```
vocals, singing, humming, choir, vocal chops, spoken word, rain, nature sounds, crowd noise, distortion, electric piano, synth pad, string section, heavy 808, boom bap, heavy kick, punchy drums, sub bass, dense arrangement, busy melody, thick chords, build-up, drop, drums, drum beat
```

  08 was made with `orchestral strings` and `percussion` where this has `string section` and `drum beat`. They were changed for the other hours, lest they keep out a harp, or the marimba, vibraphone, kalimba and handpan that some hours are led by.

- **Duration** Custom, about 3:00 (Auto gave 2:08 and 2:28, and a short piece comes round more often in its hour).
- **Weirdness** about 20%, **Style Influence** about 75% (50% is each one's middle), **Variety** Off, **Personalize** off, and the same numbers for every piece. At Variety Normal Suno rewrites the prompt, differently for each take.
- **Max Mode** off: it costs twice the credits to hold a piece together better, so only for a piece that drifts.
- **Title** `Cash Town HH` (the hour, 00 to 23).

## One town, and a piece of its own for each hour

What every prompt shares, and makes them one town: it opens `pastoral ambient, cozy game soundtrack`, asks for room (`lots of space, long pauses, airy reverb`), is `slow`, has no drums, and ends on `instrumental`.

What is an hour's own:

- **its instruments**, one or two, and never the same one leading two hours running. By the day: bells and soft keys at night, winds at dawn and at dusk, plucked strings and wooden bars by day;
- **its scene**, from the town's own day: the farm at sunrise, the market, the shade at noon, the river at sunset, the lanterns, the fire;
- **its tempo**, slowest in the small hours (54) and quickest late in the morning (78), and its key, which is that of the old piece for the hour in `lib/town/music.ts`.

Each prompt is under 200 characters.

## What to keep

Each prompt gives two pieces. Keep the one that:

- has no voice at all, not even a hum or a chopped syllable;
- has room in it: gaps between the notes, and nothing that plays on without stopping;
- stays level from start to end: no swell, no big ending;
- has no sound that makes one look up (a shrill pipe, a tune that takes over);
- is led by the instrument its prompt names, so that it is not its neighbour over again.

Download as WAV. The town's files are made from it: put it in `work/` beside this file as `HH.wav` (git does not keep that folder), and `node build-music.mjs <ffmpeg> HH` writes `public/town/music-HH-<hash>.mp3` and `lib/town/music.json`. An hour with no piece yet plays the nearest piece of its part of the day (`pieceAt` in `lib/town/music.ts`).

In the town so far (2026-10-04): 08 (the second take he made of it), 16, 19 and 23.

## The prompts

08 is the one he heard and kept; the others are written from it.

### 00

```
pastoral ambient, cozy game soundtrack, sparse celesta, soft harp, lots of space, long pauses, airy reverb, starry midnight sky, slow, 56 bpm, A major, instrumental
```

### 01

```
pastoral ambient, cozy game soundtrack, sparse kalimba, lots of space, long pauses, airy reverb, moonlit field, quiet small hours, slow, 54 bpm, F major, instrumental
```

### 02

```
pastoral ambient, cozy game soundtrack, sparse felt piano, single notes, lots of space, long pauses, airy reverb, deep night stillness, slow, 54 bpm, D major, instrumental
```

### 03

```
pastoral ambient, cozy game soundtrack, sparse harp, few celesta notes, lots of space, long pauses, airy reverb, sleeping town, dreaming, slow, 54 bpm, Bb major, instrumental
```

### 04

```
pastoral ambient, cozy game soundtrack, soft vibraphone long tones, lots of space, long pauses, airy reverb, hush before dawn, slow, 56 bpm, E major, instrumental
```

### 05

```
pastoral ambient, cozy game soundtrack, soft flute long tones, sparse felt piano, lots of space, long pauses, airy reverb, first light, morning mist, slow, 60 bpm, Eb major, instrumental
```

### 06

```
pastoral ambient, cozy game soundtrack, sparse glockenspiel, soft ocarina long tones, lots of space, long pauses, airy reverb, sunrise over the farm, slow, 64 bpm, G major, instrumental
```

### 07

```
pastoral ambient, cozy game soundtrack, sparse ukulele, few soft marimba notes, lots of space, long pauses, airy reverb, breakfast, town waking up, slow, 68 bpm, C major, instrumental
```

### 08

```
pastoral ambient, cozy game soundtrack, sparse fingerpicked nylon guitar, sparse glockenspiel, lots of space, long pauses, airy reverb, peaceful morning meadow, slow, 72 bpm, D major, instrumental
```

### 09

```
pastoral ambient, cozy game soundtrack, sparse soft marimba, few harp notes, lots of space, long pauses, airy reverb, sunny little market, slow, 76 bpm, A major, instrumental
```

### 10

```
pastoral ambient, cozy game soundtrack, sparse kalimba, soft flute long tones, lots of space, long pauses, airy reverb, sunny hillside, drifting clouds, slow, 78 bpm, F major, instrumental
```

### 11

```
pastoral ambient, cozy game soundtrack, sparse upright piano, soft recorder, lots of space, long pauses, airy reverb, playful late morning, slow, 78 bpm, Bb major, instrumental
```

### 12

```
pastoral ambient, cozy game soundtrack, sparse lazy nylon guitar, few soft vibraphone notes, lots of space, long pauses, airy reverb, noon in the shade, slow, 76 bpm, C major, instrumental
```

### 13

```
pastoral ambient, cozy game soundtrack, soft clarinet long tones, sparse felt piano, lots of space, long pauses, airy reverb, drowsy afternoon nap, slow, 70 bpm, G major, instrumental
```

### 14

```
pastoral ambient, cozy game soundtrack, sparse soft handpan, lots of space, long pauses, airy reverb, breezy afternoon, tall grass swaying, slow, 70 bpm, Eb major, instrumental
```

### 15

```
pastoral ambient, cozy game soundtrack, sparse harp arpeggios, few glockenspiel notes, lots of space, long pauses, airy reverb, light afternoon sky, slow, 72 bpm, Ab major, instrumental
```

### 16

```
pastoral ambient, cozy game soundtrack, soft flute long tones, sparse ukulele, lots of space, long pauses, airy reverb, late afternoon breeze on the hill, slow, 74 bpm, E major, instrumental
```

### 17

```
pastoral ambient, cozy game soundtrack, sparse fingerpicked acoustic guitar, soft ocarina, lots of space, long pauses, airy reverb, golden sunset by the river, slow, 68 bpm, D major, instrumental
```

### 18

```
pastoral ambient, cozy game soundtrack, sparse soft vibraphone, few felt piano notes, lots of space, long pauses, airy reverb, dusk, lanterns lighting, slow, 66 bpm, B major, instrumental
```

### 19

```
pastoral ambient, cozy game soundtrack, soft clarinet long tones, sparse nylon guitar, lots of space, long pauses, airy reverb, quiet dinner by the fire, slow, 64 bpm, Db major, instrumental
```

### 20

```
pastoral ambient, cozy game soundtrack, sparse harp, few music box notes, lots of space, long pauses, airy reverb, calm evening stroll, slow, 62 bpm, F major, instrumental
```

### 21

```
pastoral ambient, cozy game soundtrack, sparse ukulele, few celesta notes, lots of space, long pauses, airy reverb, night settling in, slow, 60 bpm, C major, instrumental
```

### 22

```
pastoral ambient, cozy game soundtrack, sparse felt piano, few soft vibraphone notes, lots of space, long pauses, airy reverb, town winding down, slow, 58 bpm, G major, instrumental
```

### 23

```
pastoral ambient, cozy game soundtrack, sparse music box lullaby, lots of space, long pauses, airy reverb, late night, soft and still, slow, 56 bpm, Eb major, instrumental
```
