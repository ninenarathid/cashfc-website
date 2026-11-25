"""One-off edits to shapes.py and scenes.py (devices point outwards, chevrons point south, bigger flare marks)."""
import os
here = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(here, "shapes.py")
s = open(p, encoding="utf-8").read()
old = s[s.index("def device"):s.index("def chev_disc")]
new = '''def device(x, y, a, s=7.0):
    """Coronation's device: a yellow triangle on the edge, its point outwards (compass a)."""
    ux, uy = unit(a)
    return [{"t": "cone", "at": [R(x + ux * s * 0.55), R(y + uy * s * 0.55)], "dir": R((a + 180) % 360), "spread": 66, "len": s, "c": "#f2d23a", "o": 1, "wd": 0.2}]


'''
s = s.replace(old, new)
s = s.replace("out += chevron(x, y + dy, 180, 0, w=r * 1.25, h=r * 0.32", "out += chevron(x, y + dy, 0, 0, w=r * 1.25, h=r * 0.32")
s = s.replace("out += chevron(x, y + dy, 180, 0, w=s, h=s * 0.34", "out += chevron(x, y + dy, 0, 0, w=s, h=s * 0.34")
old = s[s.index("def flare_marker"):s.index("def red_tri")]
new = '''def flare_marker(x, y, s=6.0):
    """The flare marker: three pale triangles around the player, pointing outwards."""
    out = []
    for a in (0, 125, 235):
        ux, uy = unit(a)
        cx, cy = x + ux * s * 1.2, y + uy * s * 1.2
        out.append({"t": "cone", "at": [R(cx + ux * s * 0.5), R(cy + uy * s * 0.5)], "dir": R((a + 180) % 360), "spread": 62, "len": R(s), "c": "#dce8f6", "o": 0.95, "wd": 0.25})
        out.append({"t": "cone", "at": [R(cx + ux * s * 0.2), R(cy + uy * s * 0.2)], "dir": R((a + 180) % 360), "spread": 62, "len": R(s * 0.45), "c": "#6a7cc0", "o": 0.95, "wd": 0.01})
    return out


'''
s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
p = os.path.join(here, "scenes.py")
s = open(p, encoding="utf-8").read()
s = s.replace("s += device(70.0, 5.0, 180) + device(3.6, 32.0, 90) + device(96.6, 72.0, 270) + device(30.0, 96.0, 0)",
              "s += device(70.0, 6.0, 0) + device(3.4, 32.0, 270) + device(96.6, 72.0, 90) + device(30.0, 95.0, 180)")
s += open(os.path.join(here, "scenes_more.py"), encoding="utf-8").read()
open(p, "w", encoding="utf-8").write(s)
print("patched")
