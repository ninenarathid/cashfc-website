"""The step list every phase file adds to (TOP guide)."""
import sys, os

WT = "."
IMG = "https://ffxiv.tuufless.com/images/ultimates/top/"
SRC = lambda p: IMG + p           # the source diagram a scene redraws (for the compare sheet)
steps = []
VIDS = {"nin": "EHw_l-6Bp0E"}     # Nukemaru's first clear (NIN PoV)


def FR(name, vid, t, say, say_en, by="Nukemaru"):
    """A footage picture: (file, Thai caption, English caption, creator, link)."""
    return (f"frames/top/{name}.webp", say, say_en, by, f"https://youtu.be/{VIDS.get(vid, vid)}?t={t}")


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None,
         refs=None, mech_en=None, plan=None, plan_en=None):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [SRC(pic)]
    if refs and "norefs" in sys.argv:
        refs = None
    if refs:
        missing = [r[0] for r in refs if not os.path.exists(os.path.join(WT, "scripts/guides/data", r[0]))]
        if missing and "allowmissing" not in sys.argv:
            raise SystemExit(f"missing frames: {missing}")
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
        s["ring"] = 5.5
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
    return s


P0 = ("เตรียมตัว", "Setup")
P1 = ("P1 Beetle Omega", "P1 Beetle Omega")
P2 = ("P2 Omega-M and Omega-F", "P2 Omega-M and Omega-F")
P3 = ("P3 Omega Reconfigured", "P3 Omega Reconfigured")
P4 = ("P4 Blue Screen", "P4 Blue Screen")
P5 = ("P5 Run: Dynamis", "P5 Run: Dynamis")
P6 = ("P6 Alpha Omega", "P6 Alpha Omega")
