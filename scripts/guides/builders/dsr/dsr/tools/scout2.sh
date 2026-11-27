# The remaining videos, fetched small (360p) only for scouting, then deleted (shared disk).
cd "$(dirname "$0")/../../../../../.."
FF=$(node -e 'console.log(require("./scripts/guides/tools/paths.cjs").ffmpeg())')
for id in "$@"; do
  f=scripts/guides/.work/dsr/vid/$id.mp4
  node scripts/guides/tools/yt.mjs -q --no-warnings -f "bv*[height<=360][vcodec^=avc1]/bv*[height<=360]" -o "$f" "https://youtu.be/$id" || { echo "FAIL $id"; continue; }
  o=scripts/guides/.work/dsr/scout/$id; mkdir -p $o
  "$FF" -loglevel error -y -i $f -vf "fps=1/3,scale=480:-1" -q:v 6 $o/s%04d.jpg && rm -f $f && echo "scouted $id $(ls $o | wc -l)"
done
