# Cut a 2-second section per "id:seconds" argument at 1080p and keep three frames (t, t+0.7, t+1.4) as
# .work/dsr/cand/<id>-<s>{a,b,c}.jpg; the section is deleted at once (the disk is shared).
cd "$(dirname "$0")/../../../../../.."
FF=$(node -e 'console.log(require("./scripts/guides/tools/paths.cjs").ffmpeg())')
O=scripts/guides/.work/dsr/cand; mkdir -p $O
for a in "$@"; do
  id=${a%%:*}; t=${a##*:}
  [ -f $O/$id-${t}a.jpg ] && continue
  tmp=$O/tmp-$id-$t.mp4
  node scripts/guides/tools/yt.mjs -q --no-warnings -f "bv*[height<=1080][vcodec^=avc1]/bv*[height<=1080]" --download-sections "*$t-$((t+2))" --force-keyframes-at-cuts -o "$tmp" "https://youtu.be/$id" >/dev/null 2>&1
  if [ -f $tmp ]; then
    "$FF" -loglevel error -y -ss 0 -i $tmp -frames:v 1 -q:v 2 $O/$id-${t}a.jpg
    "$FF" -loglevel error -y -ss 0.7 -i $tmp -frames:v 1 -q:v 2 $O/$id-${t}b.jpg
    "$FF" -loglevel error -y -ss 1.4 -i $tmp -frames:v 1 -q:v 2 $O/$id-${t}c.jpg
    echo "ok $id $t"
  else echo "FAIL $id $t"; fi
  rm -f $tmp $O/tmp-*.part
done
