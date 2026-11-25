"""testsc.py <module> [names...]: every scene of a module beside game8's picture, through cmp.mjs (check sheets in compare/t-<module>)."""
import sys, json, subprocess, importlib
sys.stdout.reconfigure(encoding="utf-8")
H = r"scripts/guides/.work/merchant"
sys.path.insert(0, H + "/tools")
mod = importlib.import_module(sys.argv[1])
only = sys.argv[2:]
IMGS = json.load(open(H + "/imgs.json", encoding="utf-8"))
steps = []
for name, fn in mod.SCENES.items():
    tag = name[:2] + "-" + name[2:]
    if only and name not in only:
        continue
    steps.append({"scene": fn(), "game8": [IMGS[tag]]})
data = {"guide": {"slug": "t"}, "defaults": {"bg": "#5c5e63", "iconSize": 6.2, "markSize": 5.2, "bossSize": 10}, "steps": steps}
out = H + f"/compare/t-{sys.argv[1]}"
json.dump(data, open(H + f"/test-{sys.argv[1]}.json", "w", encoding="utf-8"))
subprocess.run(["node", H + "/tools/cmp.mjs", H + f"/test-{sys.argv[1]}.json", out], check=True)
