import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure logic under lib/.
 *
 * Node, not jsdom: nothing tested here touches the DOM. The suites cover the
 * request gate on the Discord endpoint, the availability grid's storage format,
 * and the party arithmetic — the places where being quietly wrong costs
 * something, and where a pure function makes the cost cheap to check.
 *
 * .mts because this file is ESM and the nearest package.json has no
 * "type": "module"; Vite's native config loader warns otherwise.
 *
 * resolve.tsconfigPaths so "@/lib/..." resolves the way it does in the app,
 * reading the alias from tsconfig.json rather than restating it here. Vite does
 * this natively now, so no vite-tsconfig-paths plugin.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
