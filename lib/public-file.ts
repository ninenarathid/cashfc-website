import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * A file from public/, as bytes, wherever the site is running.
 *
 * On Vercel, and under `next dev` and `next start`, public/ sits on the disk
 * beside the code — on Vercel only if next.config.ts traces the file into the
 * function that asks for it, which is the part that has gone wrong before. On
 * Cloudflare it is on no disk at all: the files are the Worker's static assets,
 * reached through its ASSETS binding.
 *
 * Null for a file that is not there, so a card can draw itself without its
 * picture rather than fail.
 */
export async function publicFile(file: string): Promise<Uint8Array | null> {
  const assets = cloudflareAssets();
  if (assets) {
    // The binding answers by path; the host is never looked at.
    const res = await assets.fetch(new URL(file, "https://assets.invalid"));
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  }
  try {
    return await readFile(path.join(process.cwd(), "public", file));
  } catch {
    return null;
  }
}

function cloudflareAssets(): { fetch(input: URL): Promise<Response> } | null {
  try {
    return getCloudflareContext().env.ASSETS ?? null;
  } catch {
    // Not on Cloudflare: the context only exists inside the Worker.
    return null;
  }
}
