import sys, re, html
sys.stdout.reconfigure(encoding='utf-8')
src = open(sys.argv[1], encoding='utf-8').read()
# main article body
m = re.search(r'<div class="archive-style-wrapper">(.*)', src, re.S)
body = m.group(1) if m else src
# cut at comments / footer
for stop in ['<div class="p-archiveComment', 'id="hl_comment', '<footer']:
    i = body.find(stop)
    if i > 0: body = body[:i]
out = []
pos = 0
tok = re.compile(r'<(h[2-4])[^>]*>(.*?)</\1>|<img[^>]*?data-src="([^"]+)"[^>]*>|<(p|li|td|th|div class="a-paragraph"|pre)[^>]*>(.*?)</(?:p|li|td|th|pre)>|<br\s*/?>', re.S)
def clean(s):
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    return html.unescape(s).strip()
for m in tok.finditer(body):
    if m.group(1):
        out.append(f'\n##{m.group(1)} ' + clean(m.group(2)))
    elif m.group(3):
        u = m.group(3)
        am=re.search(r'alt="([^"]*)"', m.group(0)); wm=re.search(r'width="(\d+)"', m.group(0)); hm=re.search(r'aspect-ratio: (\d+) / (\d+)|height="(\d+)"', m.group(0))
        if 'img.game8.jp' in u: out.append('IMG ' + u + '  [' + (am.group(1) if am else '') + '] ' + (wm.group(1) if wm else '?') + 'x' + ((hm.group(2) or hm.group(3)) if hm else '?'))
    elif m.group(4):
        t = clean(m.group(5))
        if t: out.append(t)
print('\n'.join(out))
