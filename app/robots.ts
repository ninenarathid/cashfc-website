import type { MetadataRoute } from "next";

/**
 * Crawling is allowed. Indexing is not — and those are two different switches.
 *
 * The obvious way to keep a site off Google is `Disallow: /`, and it is the
 * wrong one here for two reasons.
 *
 * It does not actually remove anything. robots.txt tells a crawler not to
 * *fetch* the page; it says nothing about listing it. A URL Google already
 * knows, or finds linked from anywhere, can still appear in results as a bare
 * link with no description — and because Google is no longer allowed to fetch
 * the page, it can never see the noindex that would have taken it down. Blocked
 * plus already-indexed is the one state you cannot get out of. Allowing the
 * fetch is what lets the noindex in app/layout.tsx do its job.
 *
 * And it would break the FC's own Discord. Discordbot reads robots.txt before
 * unfurling a link, so a blanket disallow turns every member page and gallery
 * post somebody pastes in chat into a bare URL with no picture or title. The
 * opengraph routes exist precisely for that.
 *
 * So: come and read, then respect the noindex you find. If the site should
 * become findable again, remove the `robots` block from the root metadata —
 * not this file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
  };
}
