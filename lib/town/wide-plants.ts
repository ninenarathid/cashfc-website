/**
 * A giant (2x2, a reward) is drawn as one picture over its four plots: which picture of the atlas stands over them when
 * it is grown (stage 4, `A`) or ripe (stage 5, `B`). A younger one keeps a sprout on each plot.
 *
 * The garden's hybrids were drawn the same way over their two or three plots (`wide<Crop>…`, lib/town/wide-art.json)
 * until the owner, 2026-10-16: "ช่วยลดขนาดผักที่มีขนาดใหญ่ และใช้หลายช่อง gen ภาพใหม่ ให้ต้นเล็ก ใช้แค่ช่องเดียวพอ เนื่องจาก
 * พอมันใหญ่ มันทำให้ click พื้นที่ด้านหลังไม่ได้". One sown over several plots before then stands small on its root, as its
 * one-plot picture, with a sprout on each of its other plots (components/town/TownFarm); the wide pictures stay in the
 * atlas, unused.
 */
export function giantSprite(crop: string, stage: number): string | null {
  if (stage < 4) return null;
  return `giant${crop[0].toUpperCase()}${crop.slice(1)}${stage >= 5 ? "B" : "A"}`;
}
