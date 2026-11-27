"""Builds scripts/guides/data/fru.json: Futures Rewritten (Ultimate), Tuufless's Mana PF notes, Nukemaru's footage.
usage (from the repo root): python3 scripts/guides/builders/fru/fru/tools/gen.py [allowmissing] [only=p1,p2]"""
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core
only = next((a[5:].split(",") for a in sys.argv if a.startswith("only=")), None)
import t1
for mod in ("t2", "t3", "t4", "t5"):
    if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), mod + ".py")) and (not only or mod.replace("t", "p") in only):
        __import__(mod)
from guide import guide, rewards, defaults
import refs
refs.attach(core.steps, core.DATA)

data = {"guide": guide, "defaults": defaults, "steps": core.steps, "rewards": rewards}
OUT = core.DATA + "/fru.json"
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
st = core.steps
print("steps", len(st), "scenes", sum(1 for s in st if s["scene"]), "refs", sum(len(s.get("refs", [])) for s in st), "rewards", len(rewards))
