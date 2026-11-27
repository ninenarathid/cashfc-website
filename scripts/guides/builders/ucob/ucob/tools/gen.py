"""Builds scripts/guides/data/ucob.json: The Unending Coil of Bahamut (Ultimate), the Elemental DC PF plan
as Tuufless's Notes write it (ffxiv.tuufless.com/elemental/ucob/), footage from Nukemaru's video.
usage (from the repo root): python3 scripts/guides/builders/ucob/ucob/tools/gen.py [norefs]"""
import sys, json, os
sys.stdout.reconfigure(encoding="utf-8")
TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
import sc_base as B
import sc_tw, sc_na, sc_ba, sc_ad, sc_gb
from texts_p0p1 import STEPS as S01
from texts_p2 import STEPS as S2
from texts_p3 import STEPS as S3
from texts_p4p5 import STEPS as S45
from guide_meta import GUIDE, REWARDS

WT = "."
OUT = WT + "/scripts/guides/data/ucob.json"
SRC = "https://ffxiv.tuufless.com/images/ultimates/ucob/"
MODS = [sc_tw, sc_na, sc_ba, sc_ad, sc_gb]


def scene_of(fn):
    for m in MODS:
        if hasattr(m, fn):
            return getattr(m, fn)()
    raise SystemExit(f"no scene {fn}")


steps = []
for st in S01 + S2 + S3 + S45:
    s = {"phase": st["phase"][0], "mech": st["mech"], "name": st["name"][0], "note": st["note"][0], "strict": st.get("strict", False)}
    if st.get("says"):
        s["says"] = {k: v[0] for k, v in st["says"].items()}
    if st.get("img"):
        s["game8"] = [SRC + st["img"].replace("_", "/", 1) + ".jpg"]
    refs = st.get("refs") if "norefs" not in sys.argv else None
    if refs:
        s["refs"] = []
        for r in refs:
            f = f"frames/ucob/{r['f']}.webp"
            if not os.path.exists(os.path.join(WT, "scripts/guides/data", f)) and "allowmissing" not in sys.argv:
                raise SystemExit(f"missing frame {f}")
            s["refs"].append({"src": f, "say": r["say"][0], "by": "Nukemaru", "url": f"https://youtu.be/{r['vid']}?t={r['t']}"})
    if st.get("plan"):
        s["plan"] = st["plan"][0]
    if st.get("scene"):
        s["ring"] = 5.4
        s["scene"] = scene_of(st["scene"])
    else:
        s["scene"] = None
    en = {"phase": st["phase"][1], "mech": st["mech"], "name": st["name"][1], "note": st["note"][1]}
    if st.get("says"):
        en["says"] = {k: v[1] for k, v in st["says"].items()}
    if refs:
        en["refs"] = [r["say"][1] for r in refs]
    if st.get("plan"):
        en["plan"] = st["plan"][1]
    s["en"] = en
    steps.append(s)

defaults = {"frame": [1, 1], "bg": "#f2f2f2", "arena": {"shape": "circle", "at": [50, 50], "r": 49.6, "fill": B.FLOOR["TW"], "lines": False},
            "waymarks": {}, "iconSize": 6.4, "markSize": 6, "bossSize": 11, "ring": 5.4}
data = {"guide": GUIDE, "defaults": defaults, "steps": steps, "rewards": REWARDS}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("steps", len(steps), "scenes", sum(1 for s in steps if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in steps),
      "rewards", len(REWARDS))
