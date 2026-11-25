p = r'scripts/guides/.work/m11s/tools/gen11.py'
L = open(p, encoding='utf-8').read().split('\n')
assert L[421].lstrip().startswith('says_en={"MT": "Tethers')
L[421] = L[421].rstrip() + ')'
open(p, 'w', encoding='utf-8').write('\n'.join(L))
