"""cmpgen.py <module> [names...]: dump the module's scene functions (p1_05 -> dl/img/p1-05.*) for cmp.mjs."""
import sys, json, glob, os, importlib
sys.path.insert(0, os.path.dirname(__file__))
W = "scripts/guides/.work/dmu"
mod = importlib.import_module(sys.argv[1])
import re
names = sys.argv[2:] or [n for n in dir(mod) if re.match(r"p\d_\d\d", n) and callable(getattr(mod, n))]
items = []
for n in names:
    key = n.split("__")[0]
    src = glob.glob(f"{W}/dl/img/{key.replace('_', '-')}.*")
    items.append({"name": n, "src": src[0], "scene": getattr(mod, n)()})
json.dump(items, open(f"{W}/cmp-{sys.argv[1]}.json", "w"))
print(len(items), "scenes")
