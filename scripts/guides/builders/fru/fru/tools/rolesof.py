"""Prints the role finder's confident badge positions for diagrams whose name contains any of the args."""
import sys, json
d = json.load(open("scripts/guides/.work/fru/roles.json"))
for k, v in d.items():
    if any(a in k for a in sys.argv[1:]):
        good = {s: [(x, y, sc) for x, y, sc in pts if sc >= 0.75] for s, pts in v.items()}
        print(k, {s: p for s, p in sorted(good.items()) if p})
