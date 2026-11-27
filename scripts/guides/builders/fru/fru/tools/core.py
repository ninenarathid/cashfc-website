"""Shared state for the FRU generator: the step list and how a step is written."""
import os, sys, json

WT = "."
DATA = WT + "/scripts/guides/data"
TU = lambda p: f"https://ffxiv.tuufless.com/images/ultimates/fru_mana/{p}"
TU0 = lambda p: f"https://ffxiv.tuufless.com/images/ultimates/fru/{p}"
VIDS = {"mt": "3-5oIvVo6p4", "p31": "oKSHteslL2w", "p32": "4gWtS7GWiFQ", "p4": "nX2kfaMnCiU", "p5": "nzpOdfOyUNo"}


def FR(name, vid, t, say, say_en):
    """A footage picture: frames/fru/<name>.webp from Nukemaru's video <vid> at t seconds."""
    return (f"frames/fru/{name}.webp", say, say_en, "Nukemaru", f"https://youtu.be/{VIDS.get(vid, vid)}?t={t}")


steps = []


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None,
         refs=None, plan=None, mech_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [pic] if isinstance(pic, str) else list(pic)
    if refs:
        refs = [r for r in refs if "allowmissing" not in sys.argv or os.path.exists(os.path.join(DATA, r[0]))]
        missing = [r[0] for r in refs if not os.path.exists(os.path.join(DATA, r[0]))]
        if missing:
            raise SystemExit(f"missing frames: {missing}")
        s["refs"] = []
        for r in refs:
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
    if plan:
        s["plan"] = plan[0]
    if scene is not None:
        s["ring"] = 5.2
        s["scene"] = scene
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    if plan:
        en["plan"] = plan[1]
    s["en"] = en
    steps.append(s)
