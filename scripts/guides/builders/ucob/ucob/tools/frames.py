"""Footage pictures for UCoB from Nukemaru's stream (V7lYb6-1sys, the clear at 27:22-45:35):
a wide crop of the game (no stream overlay, no mascot, no hotbars), every Japanese text and player name blurred,
our gold ring / arrow and a Thai label.
usage (repo root): python3 frames.py grab [name ...]   # cut the 1080p frames from the stream (vid/url299.txt)
                   python3 frames.py grid [name ...]   # crop + 50 px grid sheets for placing blur boxes
                   python3 frames.py [name ...]        # write specs/<name>.json and data/frames/ucob/<name>.webp"""
import sys, json, subprocess, os
sys.stdout.reconfigure(encoding="utf-8")
W = "scripts/guides/.work/ucob"
SPECS = "scripts/guides/builders/ucob/ucob/specs"
OUT = "scripts/guides/data/frames/ucob"
os.makedirs(OUT, exist_ok=True)
os.makedirs(SPECS, exist_ok=True)
os.makedirs(W + "/cand", exist_ok=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from picks import P   # name: (t, crop [x,y,w,h] in the 1920x1080 frame, blur boxes in frame coords, marks in frame coords)

# Always blurred (frame coords, screen-fixed UI): party list + limit gauge, the target bar (left), the enemy cast bar and
# its Japanese name (right), the "action not ready" line (top centre), the chat log and the HP/MP numbers (bottom left)
FIXED = [(1140, 640, 360, 181), (455, 585, 215, 45), (1125, 545, 355, 85), (850, 258, 250, 36), (250, 755, 400, 66), (690, 765, 160, 56)]

L = lambda x, y, lines, size=30: {"t": "label", "at": [x, y], "lines": lines, "size": size}


def ffmpeg():
    return subprocess.run(["node", "-e", 'console.log(require("./scripts/guides/tools/paths.cjs").ffmpeg())'],
                          capture_output=True, text=True).stdout.strip()


def grab(names):
    url = open(W + "/vid/url299.txt").read().strip()
    ff = ffmpeg()
    for n in names:
        t = P[n][0]
        out = f"{W}/cand/v-{t}.png"
        if not os.path.exists(out):
            subprocess.run([ff, "-loglevel", "error", "-y", "-ss", str(t), "-i", url, "-frames:v", "1", out])
        print(n, t, os.path.exists(out))


def to_crop(box, crop):
    x, y, w, h = box
    cx, cy, cw, ch = crop
    x0, y0, x1, y1 = max(x, cx), max(y, cy), min(x + w, cx + cw), min(y + h, cy + ch)
    if x1 <= x0 or y1 <= y0:
        return None
    return [x0 - cx, y0 - cy, x1 - x0, y1 - y0]


def mark_to_crop(m, crop):
    cx, cy = crop[0], crop[1]
    m = dict(m)
    if "at" in m:
        m["at"] = [m["at"][0] - cx, m["at"][1] - cy]
    if "from" in m:
        m["from"] = [m["from"][0] - cx, m["from"][1] - cy]
        m["to"] = [m["to"][0] - cx, m["to"][1] - cy]
    return m


def grid(names):
    for n in names:
        t, crop, blur, marks = P[n][:4]
        x, y, w, h = crop
        js = f"""const sharp=require('sharp');(async()=>{{const W={w},H={h};let s='';
for(let gx=0;gx<=W;gx+=50)s+=`<line x1="${{gx}}" y1="0" x2="${{gx}}" y2="${{H}}" stroke="${{gx%100?'#888':'#ff0'}}" stroke-width="1" opacity="0.6"/>`+(gx%100?'':`<text x="${{gx+2}}" y="14" fill="#ff0" font-size="14">${{gx+{x}}}</text>`);
for(let gy=0;gy<=H;gy+=50)s+=`<line x1="0" y1="${{gy}}" x2="${{W}}" y2="${{gy}}" stroke="${{gy%100?'#888':'#ff0'}}" stroke-width="1" opacity="0.6"/>`+(gy%100?'':`<text x="2" y="${{gy-2}}" fill="#ff0" font-size="14">${{gy+{y}}}</text>`);
await sharp('{W}/cand/v-{t}.png').extract({{left:{x},top:{y},width:W,height:H}}).composite([{{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${{W}}" height="${{H}}">${{s}}</svg>`)}}]).resize(1000).png().toFile('{W}/cand/g-{n}.png')}})()"""
        subprocess.run(["node", "-e", js])
        print("grid", n)


def build(names):
    for n in names:
        t, crop, blur, marks = P[n][:4]
        boxes = [b for b in (to_crop(b, crop) for b in FIXED + list(blur)) if b]
        spec = {"src": f"{W}/cand/v-{t}.png", "out": f"{OUT}/{n}.webp", "crop": list(crop), "blur": boxes,
                "marks": [mark_to_crop(m, crop) for m in marks], "width": 1000}
        p = f"{SPECS}/{n}.json"
        json.dump(spec, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        r = subprocess.run(["node", "scripts/guides/annotate-frame.cjs", p], capture_output=True, text=True)
        print(n, (r.stdout.strip() or r.stderr.strip()[:300])[-70:])


if __name__ == "__main__":
    args = sys.argv[1:]
    mode = args.pop(0) if args and args[0] in ("grab", "grid") else "build"
    names = args or list(P)
    {"grab": grab, "grid": grid, "build": build}[mode](names)
