# Cut one 1080p frame per "id:seconds" argument into .work/dsr/cand/<id>-<s>.png (a 2-second section is fetched, then deleted).
cd "$(dirname "$0")/../../../../../.."
FF=$(node -e 'console.log(require("./scripts/guides/tools/paths.cjs").ffmpeg())')
O=scripts/guides/.work/dsr/cand; mkdir -p $O
for a in "$@"; do
  id=${a%%:*}; t=${a##*:}; out=$O/$id-$t.png
  [ -f $out ] && continue
  tmp=$O/tmp-$id-$t.mp4
  node scripts/guides/tools/yt.mjs -q --no-warnings -f "bv*[height<=1080][vcodec^=avc1]/bv*[height<=1080]" --download-sections "*$t-$((t+2))" --force-keyframes-at-cuts -o "$tmp" "https://youtu.be/$id" >/dev/null 2>&1
  "$FF" -loglevel error -y -i $tmp -frames:v 1 $out && echo "ok $id $t" || echo "FAIL $id $t"
  rm -f $tmp $O/tmp-*.part
done
