#!/usr/bin/env bash
# Eye shapes (faces on the shared skull) and the skin keys of the bodies.  ./gen-faces.sh
set -u
cd "$(dirname "$0")"
eyes() { case $1 in
  big) echo "large sparkling anime eyes, each with two white highlights.";;
  sharp) echo "narrow sharp almond-shaped eyes with slightly upturned outer corners.";;
  droopy) echo "gentle droopy eyes with the outer corners turned down, half-lidded and sleepy.";;
  cat) echo "cat-like eyes with strongly upturned outer corners and a bold upper lid line.";;
  small) echo "small simple round eyes with tiny irises.";;
esac; }
for g in f m; do
  src=$([ $g = f ] && echo f-neutral-front || echo m-face-front)
  lash=$([ $g = f ] && echo "" || echo "No eyelashes. ")
  for e in big sharp droopy cat small; do
    out="$g-eyes_$e-front"; [ -f "work/out/$out.png" ] && continue
    sed "s|__EYES__|$(eyes $e)|; s|__LASH__|$lash|" prompts/eyes.txt > "prompts/e-$g-$e.txt"
    node gen.mjs "$out" gpt-image-2.5-sunburst low 1536x1024 "prompts/e-$g-$e.txt" "work/out/$src.png" | grep -v "^usage"
  done
done
for g in f m; do for v in front back; do
  out="$g-skinkey-$v"; [ -f "work/out/$out.png" ] && continue
  node gen.mjs "$out" gpt-image-2.5-sunburst low 1536x1024 prompts/skinkey.txt "work/out/$g-starter-$v.png" | grep -v "^usage"
done; done
