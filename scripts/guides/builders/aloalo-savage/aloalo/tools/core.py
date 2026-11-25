"""Step builder shared by the step modules."""
import json, sys

HERE = r"scripts/guides/.work/aloalo"
IMGS = json.load(open(HERE + "/imgs.json", encoding="utf-8"))
G8 = lambda tag: IMGS[tag]

VIDS = {"v1": "vOqdSNOYH8k", "v2": "QqLg3DXxCVA", "v3": "K5GpreTJxBM"}


def FR(name, vid, t, say, say_en):
    """A footage frame: frames/aloalo-savage/<name>.webp, Hamukatsu's video at t seconds."""
    return (f"frames/aloalo-savage/{name}.webp", say, say_en, "Hamukatsu", f"https://youtu.be/{VIDS[vid]}?t={t}")


steps = []
NOREFS = "norefs" in sys.argv


def step(phase, mech, name, name_en, note, note_en, strict=False, pic=None, scene=None, says=None, says_en=None,
         refs=None, mech_en=None, ring=5.5):
    s = {"phase": phase[0], "mech": mech, "name": name, "note": note, "strict": strict}
    if says:
        s["says"] = says
    if pic:
        s["game8"] = [G8(pic)]
    if refs and NOREFS:
        refs = None
    if refs:
        s["refs"] = []
        for r in refs:
            d = {"src": r[0], "say": r[1]}
            if len(r) > 3:
                d["by"], d["url"] = r[3], r[4]
            s["refs"].append(d)
    if scene is not None:
        s["ring"] = ring
        s["scene"] = scene
    else:
        s["scene"] = None
    en = {"phase": phase[1], "mech": mech_en or mech, "name": name_en, "note": note_en}
    if says_en:
        en["says"] = says_en
    if refs:
        en["refs"] = [r[2] for r in refs]
    s["en"] = en
    steps.append(s)
