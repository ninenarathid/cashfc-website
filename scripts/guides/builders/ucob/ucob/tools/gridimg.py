"""Grid overlay (every 25 px, labels every 50) on each source diagram, for reading positions.
usage: venv/bin/python gridimg.py (in .work/ucob) -> sheets/grid/<name>.png"""
import cv2, os
os.makedirs("sheets/grid", exist_ok=True)
for f in sorted(os.listdir("dl/img")):
    if not f.endswith(".jpg") or f == "markers.jpg":
        continue
    im = cv2.imread("dl/img/" + f)
    im = cv2.resize(im, (600, 600), interpolation=cv2.INTER_CUBIC)
    ov = im.copy()
    for v in range(0, 501, 25):
        p = int(v * 1.2)
        c = (0, 255, 255) if v % 50 == 0 else (180, 180, 180)
        cv2.line(ov, (p, 0), (p, 599), c, 1)
        cv2.line(ov, (0, p), (599, p), c, 1)
    im = cv2.addWeighted(ov, 0.35, im, 0.65, 0)
    for v in range(50, 500, 50):
        p = int(v * 1.2)
        cv2.putText(im, str(v), (p + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)
        cv2.putText(im, str(v), (2, p - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)
    cv2.imwrite("sheets/grid/" + f.replace(".jpg", ".png"), im)
