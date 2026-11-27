"""Finds the eight role badges in Tuufless's diagrams by template matching (templates cut from a clean diagram).
usage: venv/bin/python findroles.py <out.json> <img...>
Writes {file: {seat: [[x%, y%, score], ...]}} — every peak above the threshold, best first."""
import sys, json, os
import numpy as np
from PIL import Image

REF = "scripts/guides/.work/fru/dl/img/fru_mana_01_cyclonic_break_01.jpg"
CENTRES = {"MT": (262.5, 182), "ST": (262.5, 342), "H1": (177, 262.5), "H2": (352, 262), "D3": (200.5, 199),
           "D4": (325, 199), "D1": (200.5, 324), "D2": (325, 324)}
GROUP = {"MT": "T", "ST": "T", "H1": "H", "H2": "H", "D1": "D", "D2": "D", "D3": "D", "D4": "D"}
HALF = 11  # template = 23x23 inside the badge


def load(p):
    a = np.asarray(Image.open(p).convert("RGB").resize((525, 525))).astype(np.float64)
    # channels: R, G, B and the luminance's edges (overlays tint colours but keep the letters' edges)
    lum = a.mean(axis=2)
    gx = np.zeros_like(lum); gy = np.zeros_like(lum)
    gx[:, 1:-1] = lum[:, 2:] - lum[:, :-2]
    gy[1:-1, :] = lum[2:, :] - lum[:-2, :]
    g = np.hypot(gx, gy)
    return np.dstack([a, g, g])


ref = load(REF)
TPL = {}
for s, (cx, cy) in CENTRES.items():
    x, y = int(round(cx)), int(round(cy))
    TPL[s] = ref[y - HALF:y + HALF + 1, x - HALF:x + HALF + 1]


def ncc_map(img, tpl):
    """Zero-mean normalised cross-correlation per channel, averaged; valid region, top-left anchored."""
    th, tw = tpl.shape[:2]
    H, W = img.shape[:2]
    out = np.zeros((H - th + 1, W - tw + 1))
    n = th * tw
    for c in range(img.shape[2]):
        f = img[..., c]
        t = tpl[..., c] - tpl[..., c].mean()
        tn = np.sqrt((t * t).sum()) + 1e-9
        # correlation via FFT
        F = np.fft.rfft2(f, s=(H + th, W + tw))
        T = np.fft.rfft2(t[::-1, ::-1], s=(H + th, W + tw))
        corr = np.fft.irfft2(F * T, s=(H + th, W + tw))[th - 1:H, tw - 1:W]
        # local sums for the window's std
        ii = np.pad(f, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
        ii2 = np.pad(f * f, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
        s1 = ii[th:, tw:] - ii[:-th, tw:] - ii[th:, :-tw] + ii[:-th, :-tw]
        s2 = ii2[th:, tw:] - ii2[:-th, tw:] - ii2[th:, :-tw] + ii2[:-th, :-tw]
        var = np.maximum(s2 - s1 * s1 / n, 0)
        out += corr / (np.sqrt(var) * tn + 1e-9)
    return out / img.shape[2]


def peaks(m, thr, rad=10, maxn=6):
    m = m.copy()
    res = []
    for _ in range(maxn):
        i = np.argmax(m)
        y, x = divmod(i, m.shape[1])
        v = m[y, x]
        if v < thr:
            break
        res.append((x + HALF, y + HALF, float(v)))
        m[max(0, y - rad):y + rad + 1, max(0, x - rad):x + rad + 1] = -1
    return res


def find(path, thr=0.55):
    img = load(path)
    maps = {s: ncc_map(img, TPL[s]) for s in TPL}
    out = {}
    for g in "THD":
        seats = [s for s in TPL if GROUP[s] == g]
        best = np.max([maps[s] for s in seats], axis=0)
        for (x, y, v) in peaks(best, thr, maxn=12):
            yy, xx = y - HALF, x - HALF
            if (x - 262.5) ** 2 + (y - 262.5) ** 2 > 250 ** 2:
                continue
            scores = {s: maps[s][yy, xx] for s in seats}
            s = max(scores, key=scores.get)
            out.setdefault(s, []).append([round(x / 5.25, 1), round(y / 5.25, 1), round(float(scores[s]), 2)])
    return out


if __name__ == "__main__":
    res = {}
    for p in sys.argv[2:]:
        res[os.path.basename(p)] = find(p)
        print(os.path.basename(p), {k: [(a, b, c) for a, b, c in v] for k, v in sorted(res[os.path.basename(p)].items())})
    json.dump(res, open(sys.argv[1], "w"), indent=0)
