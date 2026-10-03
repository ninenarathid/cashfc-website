/*
 * Lets a plain `node` script import the repo's own TypeScript (lib/town's rules and its keeper), so a dry run drives
 * the code that ships rather than a copy of it. Node strips the types by itself; what it does not know is the "@/…"
 * alias, the missing ".ts" on the repo's imports (the alias's and the relative ones), or a JSON import without
 * `with { type: "json" }`. These hooks supply the three.
 */
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const within = (url) => url?.startsWith("file:") && fileURLToPath(url).replace(/\\/g, "/").toLowerCase().startsWith(REPO.toLowerCase());
const found = (base) => [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((p) => existsSync(p) && /\.[a-z]+$/.test(p));

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const file = found(`${REPO}/${specifier.slice(2)}`);
      if (!file) throw new Error(`cannot resolve ${specifier} in the repo`);
      return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && within(context.parentURL) && !/\.[a-z]+$/.test(specifier)) {
      const file = found(fileURLToPath(new URL(specifier, context.parentURL)));
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".json")) {
      return { format: "module", source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`, shortCircuit: true };
    }
    if (url.startsWith("file:") && url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  },
});
