"""gcrop.py name ...: the crops of frames10 without blur, with a 50 px grid in crop pixels, two to a sheet."""
import sys, json, subprocess
sys.path.insert(0, r"scripts/guides/.work/m10s/tools")
import frames10 as F
M = F.M
names = sys.argv[1:]
jobs = [{"src": f"{M}/fr/f-{F.F[n][0]}.png", "x0": F.F[n][1], "y0": F.F[n][2], "name": n} for n in names]
json.dump(jobs, open(f"{M}/specs/gcrop.json", "w"))
subprocess.run(["node", f"{M}/tools/gcrop.cjs", f"{M}/specs/gcrop.json", f"{M}/chk"])
