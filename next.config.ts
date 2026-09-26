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
};

export default nextConfig;
