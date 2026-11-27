"""Shared state for the DSR generator: the step list and the step() helper."""
import sys, os

WT = os.environ.get("WT", ".")
SRC = "https://ffxiv.tuufless.com/images/ultimates/dsr/"
IMG = lambda p: SRC + p  # the source diagram a scene redraws (for the compare sheet)

steps = []
NOFRAME = []

# Footage: (file, Thai caption, English caption, creator, url)
VIDS = {}  # id -> creator


def FR(name, vid, t, say, say_en):
    by = VIDS[vid]
    return (f"frames/dsr/{name}.webp", say, say_en, by, f"https://youtu.be/{vid}?t={t}")


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None,
         refs=None, mech_en=None, plan=None, plan_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [IMG(pic)]
    if refs and "norefs" in sys.argv:
        refs = None
    if refs:
        missing = [r[0] for r in refs if not os.path.exists(os.path.join(WT, "scripts/guides/data", r[0]))]
        if missing:
            NOFRAME.extend(missing)  # a moment no usable frame was found for (too cluttered / creator's overlay): left out
        refs = [r for r in refs if os.path.exists(os.path.join(WT, "scripts/guides/data", r[0]))]
        s["refs"] = []
        for r in refs:
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
    if plan:
        s["plan"] = plan
    if scene is not None:
        s["ring"] = 4.6
        s["scene"] = scene
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    if plan:
        en["plan"] = plan_en
    s["en"] = en
    steps.append(s)


def both(d):
    """{seat: (th, en)} -> (says, says_en)"""
    return {k: v[0] for k, v in d.items()}, {k: v[1] for k, v in d.items()}
