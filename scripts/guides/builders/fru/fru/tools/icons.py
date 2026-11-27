"""Find the role badges' boxes in a clean Tuufless diagram by colour (blue tank, green healer, red DPS)."""
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
masks = {
    "tank": (b > 150) & (r < 90) & (g < 120),
    "heal": (g > 110) & (r < 90) & (b < 80),
    "dps": (r > 110) & (g < 60) & (b < 60),
}
from collections import deque
for k, m in masks.items():
    seen = np.zeros_like(m)
    H, W = m.shape
    for y in range(H):
        for x in range(W):
            if m[y, x] and not seen[y, x]:
                q = deque([(y, x)]); seen[y, x] = 1; pts = []
                while q:
                    cy, cx = q.popleft(); pts.append((cy, cx))
                    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny, nx = cy+dy, cx+dx
                        if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = 1; q.append((ny, nx))
                if len(pts) > 60:
                    ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
                    print(k, len(pts), "box", min(xs), min(ys), max(xs), max(ys), "c", (min(xs)+max(xs))/2, (min(ys)+max(ys))/2)
