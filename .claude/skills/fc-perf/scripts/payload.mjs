#!/usr/bin/env node
/*
 * What one visit to a page costs: the HTML, the RSC payload a client-side
 * navigation or prefetch downloads instead, and the JS and CSS the HTML asks
 * for, raw and gzipped. Against a production server only — `next start` or
 * the live site — because `next dev` ships unminified code and lies.
 *
 *   node payload.mjs <base-url> <path> [more paths] [--json]
 *   node payload.mjs http://localhost:3100 / /members /party
 *   node payload.mjs https://cashfc-website.vercel.app / /gallery
 *
 * The RSC number matters as much as the JS: every <Link> in the viewport
 * prefetches a static page's RSC, so a heavy page is paid for on every other
 * page that links to it (the nav links to /members from everywhere).
 *
 * Shared chunks are counted in every page's total, because a first visit pays
 * them; the "new" column is what that page adds over the pages listed before
 * it, which is roughly what navigating there costs.
 */
import { gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const json = args.includes("--json");
// Git Bash turns an argument like "/members" into "C:/Program Files/Git/members"
// before node sees it. Undo that, so the same command works from either shell.
const unMsys = (p) => p.replace(/^[A-Za-z]:[\\/](?:[^\\/]*[\\/])*?Git(?=[\\/]|$)/i, "").replace(/\\/g, "/") || "/";
const [base, ...paths] = args.filter((a) => a !== "--json").map((a, i) => (i === 0 ? a : unMsys(a)));
if (!base || !paths.length) {
  console.error("usage: node payload.mjs <base-url> <path> [more paths] [--json]");
  process.exit(2);
}

const seen = new Set();
const rows = [];
for (const path of paths) {
  const url = new URL(path, base).href;
  const htmlRes = await fetch(url, { headers: { "user-agent": "fc-perf-payload" } });
  const html = Buffer.from(await htmlRes.arrayBuffer());

  // The flight data a soft navigation fetches. `_rsc` keeps CDNs from mixing
  // it up with the HTML, the way the router's own requests do.
  const rscUrl = new URL(url);
  rscUrl.searchParams.set("_rsc", "fcperf");
  const rscRes = await fetch(rscUrl, { headers: { RSC: "1", "user-agent": "fc-perf-payload" } });
  const rsc = Buffer.from(await rscRes.arrayBuffer());
  const rscOk = (rscRes.headers.get("content-type") ?? "").includes("text/x-component");

  const text = html.toString("utf8");
  const assets = [...new Set([
    ...[...text.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"[^>]+rel="stylesheet"/g)].map((m) => m[1]),
  ])].map((src) => new URL(src.replace(/&amp;/g, "&"), url).href);

  let js = 0, jsGz = 0, css = 0, cssGz = 0, fresh = 0, freshGz = 0;
  for (const a of assets) {
    const body = Buffer.from(await (await fetch(a)).arrayBuffer());
    const gz = gzipSync(body, { level: 6 }).length;
    if (/\.css(\?|$)/.test(a)) { css += body.length; cssGz += gz; } else { js += body.length; jsGz += gz; }
    if (!seen.has(a)) { seen.add(a); fresh += body.length; freshGz += gz; }
  }

  rows.push({
    path,
    status: htmlRes.status,
    cache: htmlRes.headers.get("x-vercel-cache") ?? htmlRes.headers.get("cf-cache-status") ?? "",
    html: html.length, htmlGz: gzipSync(html).length,
    rsc: rscOk ? rsc.length : null, rscGz: rscOk ? gzipSync(rsc).length : null,
    js, jsGz, css, cssGz, assets: assets.length, fresh, freshGz,
  });
}

if (json) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const kb = (n) => (n == null ? "   -   " : `${(n / 1024).toFixed(0).padStart(5)} KB`);
  console.log("path".padEnd(22), "status cache ", "   HTML gz", "   RSC raw", "    RSC gz", "     JS gz", "    CSS gz", "  files", "   new gz");
  for (const r of rows) {
    console.log(
      r.path.padEnd(22), String(r.status).padEnd(6), r.cache.padEnd(6),
      kb(r.htmlGz), kb(r.rsc), kb(r.rscGz), kb(r.jsGz), kb(r.cssGz),
      String(r.assets).padStart(6), kb(r.freshGz),
    );
  }
  if (rows.some((r) => r.rsc == null)) console.log("\n(-) RSC not returned as text/x-component for that path");
}
