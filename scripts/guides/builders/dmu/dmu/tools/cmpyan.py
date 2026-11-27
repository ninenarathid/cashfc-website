"""cmpyan.py [names...]: dump scenes_yan's boards (y014 -> .work/dmu/yan/img/014.webp) for cmp.mjs."""
import sys, json, os, re
sys.path.insert(0, os.path.dirname(__file__))
import scenes_yan as Y
W = "scripts/guides/.work/dmu"
names = sys.argv[1:] or [n for n in dir(Y) if re.match(r"y\d\d\d$", n)]
items = [{"name": n, "src": f"{W}/yan/img/{n[1:]}.webp", "scene": getattr(Y, n)()} for n in names]
json.dump(items, open(f"{W}/cmp-yan.json", "w"))
print(len(items), "scenes")
