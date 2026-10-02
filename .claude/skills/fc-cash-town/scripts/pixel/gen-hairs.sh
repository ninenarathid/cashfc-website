#!/usr/bin/env bash
# Hairstyle sheets as in-place edits of each gender's bald sheets.  ./gen-hairs.sh <g> <hair> [<g> <hair> ...]
set -u
cd "$(dirname "$0")"
desc() { case $1 in
  twin) echo "long twin tails tied high on both sides of the head with small brown ribbons, with soft side-swept bangs|, except the two small brown ribbons";;
  spiky) echo "short spiky messy hair with a cowlick sticking up on top, short at the sides, bangs swept to one side|";;
  bun) echo "all the hair pulled up into one big round bun on top of the head, with short straight bangs across the forehead|";;
  bob) echo "a chin-length bob cut with straight blunt bangs across the forehead|";;
  long) echo "long straight hair falling down the back to the waist, with straight bangs across the forehead|";;
  pony) echo "a high ponytail tied at the back of the head with a small brown ribbon, the tail hanging down behind, with side-swept bangs|, except the small brown ribbon";;
esac; }
run() { local g=$1 h=$2 who; [ "$g" = f ] && who="her" || who="him"
  IFS='|' read -r hair ties <<< "$(desc "$h")"
  for v in front back poses; do
    case $v in front) view="";; back) view="This is a back view: show the back of the hairstyle.";; poses) view="Draw the same hairstyle in every pose, seen from that pose's angle; in the back-view pose show the back of the hairstyle.";; esac
    sed "s|__WHO__|$who|; s|__HAIR__|$hair|; s|__TIES__|$ties|; s|__VIEW__|$view|" prompts/hair.txt > "prompts/h-$h-$g-$v.txt"
    [ -f "work/out/$g-$h-$v.png" ] || node gen.mjs "$g-$h-$v" gpt-image-2.5-sunburst low 1536x1024 "prompts/h-$h-$g-$v.txt" "work/out/$g-bald-$v.png" | grep -v "^usage"
  done; }
while [ $# -ge 2 ]; do run "$1" "$2"; shift 2; done
