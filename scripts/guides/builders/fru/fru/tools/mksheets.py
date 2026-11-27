"""mksheets.py <prefix> <sheetname> <name...>: grid sheets of fru_mana_<prefix>_<name>.jpg, four per sheet."""
import sys, subprocess
pre, base, names = sys.argv[1], sys.argv[2], sys.argv[3:]
I = "scripts/guides/.work/fru/dl/img"
for k in range(0, len(names), 4):
    files = [f"{I}/fru_mana_{pre}_{n}.jpg" if not n.startswith("/") else n[1:] for n in names[k:k + 4]]
    out = f"scripts/guides/.work/fru/sheets/{base}-{k // 4 + 1}.png"
    subprocess.run(["../venv/bin/python", "scripts/guides/builders/fru/fru/tools/gridsheet.py", out] + files, check=True)
