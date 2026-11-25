"""mask.py img row|col pct...: the stretches that are not white (transparent = white), in percent."""
import sys
from PIL import Image
f, mode = sys.argv[1], sys.argv[2]
im = Image.open(f).convert("RGBA")
bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
im = Image.alpha_composite(bg, im).convert("RGB")
W, H = im.size
px = im.load()
white = lambda c: min(c) > 215
for p in sys.argv[3:]:
    pct = float(p)
    if mode == "row":
        y = min(H - 1, round(pct / 100 * H)); seq = [px[x, y] for x in range(W)]; N = W
    else:
        x = min(W - 1, round(pct / 100 * W)); seq = [px[x, y] for y in range(H)]; N = H
    out, s = [], None
    for i in range(N + 1):
        nw = i < N and not white(seq[i])
        if nw and s is None: s = i
        if not nw and s is not None:
            if i - s > 1: out.append(f"{s / N * 100:.1f}-{i / N * 100:.1f}")
            s = None
    print(f"{mode} {pct}: " + "  ".join(out))
