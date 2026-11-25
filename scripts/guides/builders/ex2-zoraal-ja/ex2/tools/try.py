"""Writes pairs.json for cmp.mjs from a list of scene names."""
import sys, json
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ex2"
sys.path.insert(0, HERE + "/tools")
import importlib, scenes
importlib.reload(scenes)
DEFAULTS = {"frame": [1, 1], "bg": "#5f6166", "waymarks": {}, "iconSize": 5.2, "markSize": 6, "bossSize": 8.6, "ring": 5}
pairs = []
for arg in sys.argv[1:]:
    name, img = arg.split("=")
    pairs.append({"label": f"{name} ({img})", "img": f"{HERE}/img/{img}", "scene": getattr(scenes, name)()})
json.dump({"defaults": DEFAULTS, "pairs": pairs}, open(HERE + "/pairs.json", "w", encoding="utf-8"))
