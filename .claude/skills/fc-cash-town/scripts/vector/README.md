# Vector paper doll (prototype, 2026-10-01)

Cash Town's avatar as real vector art on a skeleton, made from two ChatGPT
pictures: a turnaround (style reference) and a parts sheet (every piece drawn
apart on white). Nothing here is used by the site yet.

    pip install --target <dir> vtracer pillow     # into a scratch folder, not the project
    PYTHONPATH=<dir> python cut_parts.py          # parts-sheet.png -> pieces/<name>.png + .svg
    python pack_parts.py                          # pieces -> doll-vector.json (paths tagged by colour group)
    PYTHONPATH=<dir> python make_page.py          # -> vector-doll/vector-doll.html (the prototype page)
    node shot-vec.mjs <vector-doll dir> <out> more

- `cut_parts.py`: the piece boxes on the sheet (from a component scan), the
  white background removed from the edge inwards, the pale anti-aliased rim
  stripped, a neighbour's scraps dropped, then traced with vtracer (MIT).
- `pack_parts.py`: every path tagged hair / skin / outfit / iris / brow / hat
  by its colour and piece, with each group's base colour, so a recolour is a
  hue swap that keeps the shading steps.
- `make_page.py`: the rig (where each piece sits, in the reference picture's
  pixels; joints for hips, shoulders, neck) and the animation (walk, blink,
  talk), plus the controls.

Known limits: front view only; arms and legs are one piece each (sitting needs
thigh and shin apart, see the actions note in the skill).
