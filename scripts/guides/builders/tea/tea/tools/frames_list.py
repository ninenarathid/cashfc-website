"""Footage pictures: name -> (video key, seconds, Thai caption, English caption). Made by frames_tea.py from specs in ../specs."""
import json, os
VIDS = {"ll": "AMdtMyvbPNs", "bj": "yuLjtpm2ti8", "ap": "3wtfeXognIY", "pa": "9YgDXyUWbiQ"}
FRAMES = json.load(open(os.path.join(os.path.dirname(__file__), "frames.json"), encoding="utf-8")) if os.path.exists(os.path.join(os.path.dirname(__file__), "frames.json")) else {}


def FR(name):
    if name not in FRAMES:
        return None
    f = FRAMES[name]
    return (f"frames/tea/{name}.webp", f["say"], f["say_en"], "Nukemaru", f"https://youtu.be/{VIDS[f['v']]}?t={f['t']}")
