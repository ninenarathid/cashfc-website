"""Extract the planned footage frames (full 1920x1080 PNGs) and a contact sheet of the standard crop."""
import re, subprocess, os, sys, glob
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work"
FF = HERE + "/ffm/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe"
VIDS = {"v1": "vOqdSNOYH8k", "v2": "QqLg3DXxCVA", "v3": "K5GpreTJxBM"}
out = HERE + "/aloalo/fr/pick"
os.makedirs(out, exist_ok=True)
plan = []
for f in ("st1.py", "st2.py", "st3.py"):
    for m in re.finditer(r'FR\("([^"]+)", "(v\d)", (\d+)', open(f, encoding="utf-8").read()):
        plan.append((m.group(1), m.group(2), int(m.group(3))))
extra = sys.argv[1:]  # name=v1:123 overrides
for e in extra:
    n, rest = e.split("="); v, t = rest.split(":")
    plan = [(a, b, c) if a != n else (n, v, int(t)) for a, b, c in plan]
for name, v, t in plan:
    p = f"{out}/{name}.png"
    if extra and name not in [e.split("=")[0] for e in extra] and os.path.exists(p):
        continue
    subprocess.run([FF, "-loglevel", "error", "-y", "-ss", str(t), "-i", f"{HERE}/aloalo/vid/{VIDS[v]}.mp4", "-frames:v", "1", p], check=True)
print(len(plan), "frames")
for name, v, t in plan:
    print(name, v, t)
