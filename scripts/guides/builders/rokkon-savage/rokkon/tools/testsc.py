"""testsc.py name:pic ... -> a scenes-only data file for build.mjs --compare (scratch only)."""
import sys, json
sys.path.insert(0, r"scripts/guides/.work/rokkon/tools")
import sc, sc2, sc3
imgs = json.load(open(r"scripts/guides/.work/rokkon/imgs.json", encoding="utf-8"))
steps = []
for a in sys.argv[1:]:
    fn, pic = a.split(":")
    steps.append({"phase": "t", "mech": fn, "name": pic, "note": "", "strict": False, "game8": [imgs[pic]], "scene": next(getattr(m, fn) for m in (sc, sc2, sc3) if hasattr(m, fn))()})
d = {"guide": {"slug": "rokkon-test", "name": "test", "category": "savage"}, "defaults": {"frame": [1, 1], "bg": sc.BG, "iconSize": 6, "markSize": 6, "bossSize": 12, "ring": 5.5}, "steps": steps}
json.dump(d, open(r"scripts/guides/.work/rokkon/specs/test.json", "w", encoding="utf-8"), ensure_ascii=False)
print(len(steps))
