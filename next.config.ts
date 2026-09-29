import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * The duty pictures, packed in beside the link-preview renderer.
   *
   * public/ is served by the CDN and is not on the filesystem of a serverless
   * function, so the card route's readFileSync found nothing in production and
   * — because a missing picture is a card that still works — said nothing about
   * it. Every party link unfurled with a flat colour where the screenshot
   * should be, and it looked deliberate.
   *
   * Tracing them in rather than fetching them over HTTP: the renderer would be
   * asking the CDN for our own file, one round trip that can time out, to
   * answer something the disk already knows. Twenty pictures, a megabyte in
   * total.
   *
   * The popoto on a member's card is the same problem in a smaller size: one
   * three-kilobyte picture read off the disk, which is only there if it is
   * named here.
   */
  outputFileTracingIncludes: {
    "/party/[id]/opengraph-image": ["./public/duty/**/*"],
    "/member/[id]/opengraph-image": ["./assets/popoto/popoto-og.png"],
  },

  /*
   * The pictures in public/, kept by the browser for a week.
   *
   * Next serves them with max-age=0, because a file there could change under
   * the same name, so every page view asked Vercel again for every picture on
   * it — the logo and the nav icons on every page, a duty card, a guide's map —
   * and each asking was a request on the bill even when the answer was
   * "unchanged". These are almost never replaced in place; a new picture comes
   * with a new name. A week is how long a replaced one could look old.
   *
   * By extension as well as by folder: /guides is a folder of maps and also the
   * guide pages, and a page kept for a week would be a week out of date.
   */
  async headers() {
    const week = [{
      key: "Cache-Control",
      value: "public, max-age=604800, stale-while-revalidate=86400",
    }];
    return [
      { source: "/:dir(duty|guides|wallet|emotes|ui)/:path*.:ext(png|jpg|jpeg|webp|avif|gif|svg)", headers: week },
      { source: "/:name(logo|logo-header|icon-512|sprout).png", headers: week },
    ];
  },
};

export default nextConfig;
