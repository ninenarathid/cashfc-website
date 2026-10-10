/** The viewer's own capacity selects the chest's appearance, on every map. */
export function boxSprite(slots: number, open = false): string {
  const tier = slots >= 40 ? 40 : slots >= 30 ? 30 : slots >= 20 ? 20 : 10;
  return `storebox${tier}${open ? "Open" : ""}`;
}
