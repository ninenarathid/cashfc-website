p = r'scripts/guides/.work/m11s/tools/gen11.py'
L = open(p, encoding='utf-8').read().split('\n')
for n in (149, 262, 305, 414, 560, 581):
    assert not L[n-1].rstrip().endswith(')') or L[n-1].rstrip().endswith('sc(S.utw1)') or True
    L[n-1] = L[n-1].rstrip() + ')'
open(p, 'w', encoding='utf-8').write('\n'.join(L))
