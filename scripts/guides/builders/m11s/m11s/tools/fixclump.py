p = r'scripts/guides/.work/m11s/tools/scenes11.py'
s = open(p, encoding='utf-8').read()
a = '''    dx, dy = dx * 0.7, dy * 0.7
    out = {}
    n = len(seats)'''
b = '''    dx, dy = dx * 0.7, dy * 0.7
    out = {}
    n = len(seats)
    if n >= 7 and cols == 4:
        cols = 3'''
assert a in s
s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
