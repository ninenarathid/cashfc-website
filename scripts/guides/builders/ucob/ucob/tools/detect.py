"""Finds the role labels (MT ST H1 H2 D1-D4) in Tuufless's 500x500 diagrams by template matching,
so the scenes put each role where the source does. Writes dl/roles.json: {image: [[role, x%, y%, score], ...]}.
usage: venv/bin/python detect.py (run in .work/ucob)"""
import cv2, json, os, numpy as np
SRC = "dl/img/03_tenstrike_01.jpg"
CX = {"D3": 117, "H1": 154.5, "D1": 192, "MT": 229.5, "ST": 267, "D2": 304.5, "H2": 342, "D4": 379.5}
base = cv2.imread(SRC)
tpl = {}
for r, x in CX.items():
    x0, y0 = int(round(x - 12)), 249 - 10
    tpl[r] = base[y0:y0 + 21, x0:x0 + 25].copy()
out = {}
for f in sorted(os.listdir("dl/img")):
    if not f.endswith(".jpg") or f == "markers.jpg":
        continue
    im = cv2.imread("dl/img/" + f)
    cands = []
    for r, t in tpl.items():
        res = cv2.matchTemplate(im, t, cv2.TM_CCOEFF_NORMED)
        ys, xs = np.where(res > 0.55)
        for y, x in zip(ys, xs):
            cands.append((float(res[y, x]), r, x + 12.5, y + 10.5))
    cands.sort(reverse=True)
    keep = []
    for s, r, x, y in cands:
        if any(abs(x - k[2]) < 14 and abs(y - k[3]) < 12 for k in keep):
            continue
        keep.append((s, r, x, y))
    out[f] = [[r, round(x / 5, 1), round(y / 5, 1), round(s, 2)] for s, r, x, y in keep]
json.dump(out, open("dl/roles.json", "w"), indent=0)
for f, v in out.items():
    print(f, " ".join(f"{r}({x},{y}){'' if s > .75 else '?' + str(s)}" for r, x, y, s in v))
