/**
 * A large window needs more space to see the town, without asking the GPU to
 * repaint a whole 4K screen for every frame. Keep at most a 2560×1440 image's
 * worth of pixels (the owner, 2026-10-31: "ให้ชื่อใต้ตัวละครและฉากคมด้วย"; at a
 * Full HD image's, names and scenery went soft on such a screen); the camera and
 * pointer still work in the window's CSS size.
 * Small screens keep their dense pixels, up to twice their CSS resolution.
 */
export const CANVAS_PIXELS = 2560 * 1440;

export function canvasDpr(width: number, height: number, deviceRatio: number): number {
  return Math.min(deviceRatio || 1, 2, Math.sqrt(CANVAS_PIXELS / Math.max(1, width * height)));
}
