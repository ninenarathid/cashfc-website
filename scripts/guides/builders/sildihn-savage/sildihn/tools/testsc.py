"""testsc.py <prefix> -> a throwaway data file with every scene whose tag starts with prefix, for cmp.mjs."""
import sys, json
sys.path.insert(0, r"scripts/guides/.work/sildihn/tools")
import sc
H = r"scripts/guides/.work/sildihn"
imgs = json.load(open(H + "/imgs.json", encoding="utf-8"))
pre = sys.argv[1]
steps = [{"name": k, "scene": f(), "game8": [imgs[k]]} for k, f in sorted(sc.SCENES.items()) if k.startswith(pre)]
d = {"guide": {"slug": "t"}, "defaults": {"frame": [1, 1], "bg": sc.BG, "arena": sc.A8, "waymarks": {}, "iconSize": 6.4, "markSize": 6, "bossSize": 10, "ring": 5}, "steps": steps}
json.dump(d, open(H + "/test.json", "w", encoding="utf-8"))
print(len(steps))
