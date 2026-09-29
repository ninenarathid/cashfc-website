import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * How OpenNext builds the site for Cloudflare. See wrangler.jsonc.
 *
 * The prerendered pages are served from the Worker's own static assets. Nothing
 * here revalidates: a page changes when the data changes, and the data changes
 * by deploying, so a cache that only ever holds what the build made is all the
 * site needs — and it needs no R2 bucket made first.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
