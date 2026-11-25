# vtt2txt.py <in.vtt> <out.txt>: a video's subtitles as one timestamped line each, repeats dropped.
import sys, re
src, dst = sys.argv[1], sys.argv[2]
out, last, stamp = [], None, None
for line in open(src, encoding="utf-8"):
    line = line.rstrip("\n")
    m = re.match(r"(\d\d):(\d\d):(\d\d)\.\d+ -->", line)
    if m: stamp = f"{int(m[1])*60+int(m[2])}:{m[3]}"; continue
    t = re.sub(r"<[^>]+>", "", line).strip()
    if not t or t.startswith(("WEBVTT", "Kind:", "Language:")) or t == last: continue
    last = t; out.append(f"[{stamp}] {t}")
open(dst, "w", encoding="utf-8").write("\n".join(out))
print(len(out), "lines")
