# Scouting frames (one every 3 s, 480 px) from each downloaded video, then the video is deleted (the disk is shared).
# Moments are later cut at 1080p with yt-dlp --download-sections (see cut.sh).
cd "$(dirname "$0")/../../../../../.."
FF=$(node -e 'console.log(require("./scripts/guides/tools/paths.cjs").ffmpeg())')
for f in scripts/guides/.work/dsr/vid/*.mp4; do
  id=$(basename $f .mp4); o=scripts/guides/.work/dsr/scout/$id; mkdir -p $o
  "$FF" -loglevel error -y -i $f -vf "fps=1/3,scale=480:-1" -q:v 6 $o/s%04d.jpg && rm -f $f && echo "scouted $id $(ls $o | wc -l)"
done
