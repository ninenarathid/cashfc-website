"""try.py name=imgid ... : writes pairs.json for cmp.mjs (game8 | ours | blend) from scene functions."""
import sys, json, glob, os
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ex3"
sys.path.insert(0, HERE + "/tools")
import scenes
DEFAULTS = {"frame": [1, 1], "bg": "#5f6166", "waymarks": {}, "iconSize": 7.4, "markSize": 6, "bossSize": 9.2, "ring": 5.6}
pairs = []
for arg in sys.argv[1:]:
    name, img = arg.split("=")
    f = glob.glob(f"{HERE}/img/{img}.*")[0]
    pairs.append({"label": f"{name} ({img})", "img": f, "scene": getattr(scenes, name)()})
json.dump({"defaults": DEFAULTS, "pairs": pairs}, open(HERE + "/pairs.json", "w", encoding="utf-8"))
