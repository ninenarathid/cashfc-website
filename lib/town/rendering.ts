/**
 * A large window needs more space to see the town, without asking the GPU to
 * repaint four million pixels for every frame. Keep at most a Full HD image's
 * worth of pixels; the camera and pointer still work in the window's CSS size.
 * Small screens keep their dense pixels, up to twice their CSS resolution.
 */
export const CANVAS_PIXELS = 1920 * 1080;

export function canvasDpr(width: number, height: number, deviceRatio: number): number {
  return Math.min(deviceRatio || 1, 2, Math.sqrt(CANVAS_PIXELS / Math.max(1, width * height)));
}
