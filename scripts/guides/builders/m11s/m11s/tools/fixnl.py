p = r'scripts/guides/.work/m11s/tools/gen11.py'
s = open(p, encoding='utf-8').read()
BS = chr(92)
s = s.replace('ใกล้บอส' + chr(10) + '(ภาพ: W', 'ใกล้บอส' + BS + 'n(ภาพ: W')
s = s.replace('near the boss' + chr(10) + '(Picture: W', 'near the boss' + BS + 'n(Picture: W')
open(p, 'w', encoding='utf-8').write(s)
