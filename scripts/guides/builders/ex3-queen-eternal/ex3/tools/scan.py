"""scan.py img row|col pct [step]: colour runs along a row (y=pct) or column (x=pct), in percent.
Transparent pixels are flattened onto white, as game8 shows them."""
import sys
from PIL import Image
f, mode, pct = sys.argv[1], sys.argv[2], float(sys.argv[3])
tol = float(sys.argv[4]) if len(sys.argv) > 4 else 40
im = Image.open(f).convert("RGBA")
bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
im = Image.alpha_composite(bg, im).convert("RGB")
W, H = im.size
px = im.load()
def name(c):
    r, g, b = c
    return "#%02x%02x%02x" % c
if mode == "row":
    y = min(H - 1, round(pct / 100 * H))
    seq = [px[x, y] for x in range(W)]
    N = W
else:
    x = min(W - 1, round(pct / 100 * W))
    seq = [px[x, y] for y in range(H)]
    N = H
runs = []
start = 0
for i in range(1, N + 1):
    if i == N or sum(abs(a - b) for a, b in zip(seq[i], seq[start])) > tol:
        runs.append((start, i - 1, seq[(start + i - 1) // 2]))
        start = i
for a, b, c in runs:
    if b - a >= 1:
        print(f"{a / N * 100:6.1f}-{(b + 1) / N * 100:6.1f}  {name(c)}")
