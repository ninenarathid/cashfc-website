/**
 * A member's colour, made safe to write words in.
 *
 * The accent is not decoration: it is the headings, the links, the buttons and
 * the name on somebody's page. That is why the palette in the profile form is a
 * palette and not a colour input — every swatch in it was picked to be legible
 * against the site's dark ground.
 *
 * Which ruled out the two colours people asked for most. Black is not a shade
 * of anything here, it is invisible, and a member who wanted a black page got
 * an unreadable one instead. So the darkest picks are lifted for the jobs where
 * the colour has to be read, and left exactly as chosen for the jobs where it
 * is only seen — the swatch, and the wash behind their name. Somebody choosing
 * black still gets a black banner; the words over it are graphite rather than
 * black, because black words on a black page are not a style, they are a bug
 * with a colour picker in front of it.
 *
 * Nothing already in the palette is touched: every one of those sits well above
 * the floor, and shifting a colour a member has been wearing for months to fix
 * a colour they did not pick would be the worse trade.
 */

/** WCAG relative luminance, which is what "too dark to read" actually means. */
function luminance(r: number, g: number, b: number) {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const hex = (s: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number];
};

const out = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** Below this a colour cannot be read on the site's ground at all. */
const FLOOR = 0.13;
/** And when one has to be rescued, this is where it lands: read, not merely visible. */
const TARGET = 0.2;

/**
 * The same colour, light enough to be text.
 *
 * Lifted by mixing towards white, which keeps the hue: a dark red stays red and
 * arrives as a lighter red rather than as pink or as grey. Black has no hue to
 * keep and comes back as the grey that is the honest reading of it.
 */
export function readableAccent(colour: string): string {
  const rgb = hex(colour);
  if (!rgb) return colour;
  const [r, g, b] = rgb;
  if (luminance(r, g, b) >= FLOOR) return colour;

  // Luminance rises with the mix, so the answer can be cornered rather than
  // solved. Twelve halvings puts it within a rounding error of the target.
  let lo = 0, hi = 1;
  for (let i = 0; i < 12; i++) {
    const t = (lo + hi) / 2;
    const at = (v: number) => v + (255 - v) * t;
    if (luminance(at(r), at(g), at(b)) < TARGET) lo = t; else hi = t;
  }
  const t = hi;
  return out(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}
