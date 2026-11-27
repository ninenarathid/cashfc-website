"""Source diagrams with a 5 % grid (labels every 10 %), four to a sheet, for measuring scenes.
usage: venv/bin/python gridsheet.py <out.png> <img...>"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
out, files = sys.argv[1], sys.argv[2:]
W = 600
tiles = []
for f in files:
    im = Image.open(f).convert("RGB").resize((W, W))
    d = ImageDraw.Draw(im, "RGBA")
    for k in range(0, 101, 5):
        p = k * W / 100
        col = (0, 255, 255, 150) if k % 10 == 0 else (0, 255, 255, 60)
        d.line([(p, 0), (p, W)], fill=col, width=1)
        d.line([(0, p), (W, p)], fill=col, width=1)
        if k % 10 == 0 and 0 < k < 100:
            d.text((p + 2, 2), str(k), fill=(255, 255, 0, 255))
            d.text((2, p + 2), str(k), fill=(255, 255, 0, 255))
    tiles.append((im, os.path.basename(f)))
cols = 2
rows = (len(tiles) + 1) // 2
sheet = Image.new("RGB", (cols * (W + 8), rows * (W + 22)), (17, 17, 17))
d = ImageDraw.Draw(sheet)
for i, (im, name) in enumerate(tiles):
    x, y = (i % cols) * (W + 8), (i // cols) * (W + 22)
    sheet.paste(im, (x, y + 22))
    d.text((x + 4, y + 4), name, fill=(255, 255, 0))
sheet.save(out)
print(out)
