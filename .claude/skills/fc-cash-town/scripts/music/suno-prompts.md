# Cash Town's music from Suno: the prompts

The owner's call (2026-10-04): lofi to sit and work or study to, each piece fitting its hour. One piece an hour (24), with the colour of a cozy game (nylon guitar, marimba, glockenspiel) over the lofi band, a soft beat even at night, and no rain, birds or café in the music itself (a little vinyl crackle only), since the town has weather of its own.

Suno has no public API, so the owner makes the pieces on suno.com and the files are fitted here afterwards (cut to loop, levelled, encoded, played by the hour).

It takes a paid plan (suno.com/pricing, 2026-10-04): Free has no downloads, Suno keeps its songs, and it gets only v6-mini. Pro downloads 20 songs a month, Premier 60, and the rights to a downloaded song stay after the plan ends. Free still serves to try a prompt by ear before paying.

## Settings, the same for every piece

- **Advanced** at the top of the Create page (the web's name for it; the phone app still says **Custom**), the plain **v6** model, and the **Lyrics** box left empty: on the web that is what makes a piece instrumental, there is no switch.
- **Exclude styles**, the first line under **More Options**:

```
vocals, singing, humming, choir, vocal chops, spoken word, rain, nature sounds, crowd noise, distortion, heavy 808, build-up, drop, solo
```

- **Duration** Custom, about 3:00 (Auto gave 2:08 and 2:28, and a short piece comes round more often in its hour).
- **Weirdness** about 20%, **Style Influence** about 75% (50% is each one's middle), **Variety** Off, **Personalize** off, and the same numbers for every piece: the 24 should sound like one town. At Variety Normal Suno rewrites the prompt, differently for each take.
- **Max Mode** off: it costs twice the credits to hold a piece together better, so only for a piece that drifts.
- **Title** `Cash Town HH` (the hour, 00 to 23).

Every prompt keeps the same band (Rhodes, soft bass, soft drums, crackle) and changes only the drums' feel, the instrument that carries the tune, the mood, the tempo and the key. Tempo and key follow the pieces in `lib/town/music.ts`, except the small hours, lifted to 60 bpm and over so their beat does not drag. Each is under 200 characters, and ends on `instrumental`.

## What to keep

Each prompt gives two pieces. Keep the one that:

- has no voice at all, not even a hum or a chopped syllable;
- stays level from start to end: no quiet opening that goes on, no swell, no big ending;
- has no sound that makes one look up (a sharp snare, a lead that takes over);
- sits beside its neighbours: the hour before and after should feel like the same day.

Download as WAV if offered (MP3 otherwise), named by the hour: `00.wav` to `23.wav`. Keep them out of `public/`.

## The prompts

### 00

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, soft brushed beat, sparse celesta melody, starry midnight calm, vinyl crackle, 62 bpm, A major, seamless loop, instrumental
```

### 01

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, soft brushed beat, sparse kalimba melody, quiet small hours, vinyl crackle, 60 bpm, F major, seamless loop, instrumental
```

### 02

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, soft brushed beat, sparse music box melody, deep night stillness, vinyl crackle, 60 bpm, D major, seamless loop, instrumental
```

### 03

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, soft brushed beat, sparse vibraphone melody, dreamy sleepy night, vinyl crackle, 60 bpm, Bb major, seamless loop, instrumental
```

### 04

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, soft brushed beat, felt piano and celesta, hush before dawn, vinyl crackle, 62 bpm, E major, seamless loop, instrumental
```

### 05

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, brushed drums, nylon guitar and soft flute, gentle first light, vinyl crackle, 66 bpm, Eb major, seamless loop, instrumental
```

### 06

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, brushed drums, nylon guitar and glockenspiel, sunrise, town waking up, vinyl crackle, 70 bpm, G major, seamless loop, instrumental
```

### 07

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, brushed drums, ukulele and soft melodica, easy cheerful breakfast, vinyl crackle, 76 bpm, C major, seamless loop, instrumental
```

### 08

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, dusty laid-back drums, marimba and nylon guitar, fresh bright morning, vinyl crackle, 80 bpm, D major, seamless loop, instrumental
```

### 09

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, dusty laid-back drums, glockenspiel and pizzicato strings, sunny little market, vinyl crackle, 84 bpm, A major, seamless loop, instrumental
```

### 10

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, dusty laid-back drums, marimba and soft melodica, sunny light bounce, vinyl crackle, 86 bpm, F major, seamless loop, instrumental
```

### 11

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, dusty laid-back drums, ukulele and soft clarinet, gently playful late morning, vinyl crackle, 88 bpm, Bb major, seamless loop, instrumental
```

### 12

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, dusty laid-back drums, nylon guitar and vibraphone, easy bossa lunch break, vinyl crackle, 84 bpm, C major, seamless loop, instrumental
```

### 13

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, dusty laid-back drums, soft clarinet, lazy drowsy after lunch, vinyl crackle, 78 bpm, G major, seamless loop, instrumental
```

### 14

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, dusty laid-back drums, kalimba and nylon guitar, slow breezy afternoon, vinyl crackle, 78 bpm, Eb major, seamless loop, instrumental
```

### 15

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, dusty laid-back drums, marimba and soft flute, light easy afternoon, vinyl crackle, 80 bpm, Ab major, seamless loop, instrumental
```

### 16

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, dusty laid-back drums, glockenspiel and acoustic guitar, warm late afternoon, vinyl crackle, 82 bpm, E major, seamless loop, instrumental
```

### 17

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, brushed drums, soft melodica and nylon guitar, golden sunset, warm nostalgia, vinyl crackle, 76 bpm, D major, seamless loop, instrumental
```

### 18

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, swung dusty drums, vibraphone, jazzy dusk, lanterns lighting, vinyl crackle, 74 bpm, B major, seamless loop, instrumental
```

### 19

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, swung dusty drums, jazzy nylon guitar, cozy dinner time, vinyl crackle, 72 bpm, Db major, seamless loop, instrumental
```

### 20

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, swung brushed drums, soft clarinet, calm evening stroll, vinyl crackle, 70 bpm, F major, seamless loop, instrumental
```

### 21

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, swung brushed drums, celesta and nylon guitar, night settling in, vinyl crackle, 68 bpm, C major, seamless loop, instrumental
```

### 22

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, soft brushed beat, vibraphone and nylon guitar, winding down, vinyl crackle, 66 bpm, G major, seamless loop, instrumental
```

### 23

```
lofi hip hop, cozy game soundtrack, warm Rhodes, soft bass, soft brushed beat, sparse music box melody, late night, soft and still, vinyl crackle, 64 bpm, Eb major, seamless loop, instrumental
```
