#!/usr/bin/env bash
# The character creator's own Lalafell hairstyles (13 per gender, plus the girls' curly bobble pigtails),
# described in words, as in-place edits of the girl's bald sheets (the shared skull).  ./gen-official.sh [id ...]
set -u
cd "$(dirname "$0")"
desc() { case $1 in
  f01) echo "hair gathered up into a messy high topknot with a few loose spiky strands sticking up, long side locks framing the face and side-swept bangs|";;
  f02) echo "short hair with a small tuft tied up on the very top of the head like a sprout, two thin braids hanging at the sides of the face and short bangs|";;
  f03) echo "an updo with the hair rolled into a round bun on top toward one side, soft curls falling at the sides of the face and bangs swept to the side|";;
  f04) echo "side-swept bangs, the hair tucked behind the ears and tied into a low ponytail at the back of the neck|";;
  f05) echo "long straight hair with a side parting, tucked behind the ear on one side and falling past the shoulders|";;
  f06) echo "a chin-length bob with straight blunt bangs and a plain white hairband|, except the white hairband";;
  f07) echo "hair swept back off the forehead and gathered at the back of the head, the ends curling outward at the nape|";;
  f08) echo "straight shoulder-length hair with long wispy bangs, loosely tied low at the back|";;
  f09) echo "fluffy hair held back from the face by a plain white hairband, with curled ends at the back|, except the white hairband";;
  f10) echo "two high pigtails on top of the head tied with large white ribbons, with full bangs|, except the two white ribbons";;
  f11) echo "a straight jaw-length bob with a side parting and the bangs swept to one side|";;
  f12) echo "long hair with a deep side parting, swept over one shoulder and half tied back|";;
  f13) echo "long hair with side-swept bangs and a single braid hanging down one side|";;
  f14) echo "two short curly pigtails low at the sides of the head, each tied with a small pink bobble, with full bangs|, except the two pink bobbles";;
  m01) echo "a shaggy, fluffy bowl cut that covers the tops of the ears, with full bangs|";;
  m02) echo "short messy layered hair with a tiny ponytail sticking up at the back of the crown|";;
  m03) echo "short hair at the sides with the top tied into a small topknot bun|";;
  m04) echo "long side-swept bangs falling over one eye, with a short neat back|";;
  m05) echo "a short quiff, the front swept up and to the side|";;
  m06) echo "straight shoulder-length hair with a centre parting|";;
  m07) echo "a very short buzz cut, close to the scalp all over|";;
  m08) echo "a rounded bowl cut with one pointed tuft sticking straight up on top, like an onion|";;
  m09) echo "spiky hair swept straight back, with short spikes|";;
  m10) echo "medium-length messy layered hair with long sideburns|";;
  m11) echo "hair in tight braided rows running back over the head, with a thin band across the forehead|";;
  m12) echo "wild spiky hair blown out to the sides|";;
  m13) echo "tall spiky hair standing straight up|";;
esac; }
ALL="f01 f02 f03 f04 f05 f06 f07 f08 f09 f10 f11 f12 f13 f14 m01 m02 m03 m04 m05 m06 m07 m08 m09 m10 m11 m12 m13"
for id in ${@:-$ALL}; do
  IFS='|' read -r hair ties <<< "$(desc "$id")"
  for v in front back; do
    out="f-$id-$v"
    [ -f "work/out/$out.png" ] && continue
    case $v in front) view="";; back) view="This is a back view: show the back of the hairstyle.";; esac
    sed "s|__WHO__|the character|; s|__HAIR__|$hair|; s|__TIES__|$ties|; s|__VIEW__|$view|" prompts/hair.txt > "prompts/h-$id-$v.txt"
    node gen.mjs "$out" gpt-image-2.5-sunburst low 1536x1024 "prompts/h-$id-$v.txt" "work/out/f-bald-$v.png" | grep -v "^usage"
  done
done
