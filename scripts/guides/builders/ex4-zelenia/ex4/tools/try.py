"""try.py name=imgid ... : writes pairs.json for cmp2.mjs (game8 | ours | blend) from scene functions."""
import sys, json, glob, importlib
sys.stdout.reconfigure(encoding="utf-8")
HERE = r"scripts/guides/.work/ex4"
sys.path.insert(0, HERE + "/tools")
import scenes
DEFAULTS = {"frame": [1, 1], "bg": "#5f6166", "waymarks": {}, "iconSize": 6.4, "markSize": 11, "bossSize": 8.0, "ring": 6}
pairs = []
for arg in sys.argv[1:]:
    name, img = arg.split("=")
    f = glob.glob(f"{HERE}/img/{img}.*")[0]
    pairs.append({"label": f"{name} ({img})", "img": f, "scene": getattr(scenes, name)()})
json.dump({"defaults": DEFAULTS, "pairs": pairs}, open(HERE + "/pairs.json", "w", encoding="utf-8"))
