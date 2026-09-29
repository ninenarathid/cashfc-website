import { describe, expect, it } from "vitest";
import index from "@/lib/duty-art.json";
import { indexDutyArt } from "../scripts/prebuild.mjs";

describe("lib/duty-art.json", () => {
  // Every build rewrites the file, so production is never behind the folder;
  // this is for the copy in the repository, which the tests and a fresh
  // checkout's first `next dev` read.
  it("lists exactly the pictures in public/duty (run `node scripts/prebuild.mjs` after adding one)", () => {
    expect(index).toEqual(indexDutyArt());
  });
});
