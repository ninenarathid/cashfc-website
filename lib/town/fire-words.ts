/** What the finder of a half of the forge's great fire (lib/town/great-fire) is told, in one line: the half, and whether it lit the fire. */
export function fireFoundWords(fire: { half: "flint" | "tinder"; lit: boolean }, th: boolean): string {
  const half = fire.half === "flint"
    ? (th ? "พบหินเพลิง! เก็บเข้าคลังของหมู่บ้านในชื่อคุณ" : "A flint! It goes into the village's keeping under your name")
    : (th ? "พบเชื้อไฟ! เก็บเข้าคลังของหมู่บ้านในชื่อคุณ" : "Tinder! It goes into the village's keeping under your name");
  return fire.lit ? half + (th ? " · ไฟใหญ่ของเตาติดแล้ว" : " · The forge's great fire is lit") : half;
}
