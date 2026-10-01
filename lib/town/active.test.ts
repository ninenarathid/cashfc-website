import { describe, expect, it } from "vitest";
import { RESUME_MS, readRecord } from "./active";

const me = { id: "u1", name: "Nine", face: null, color: "#4fb8a8" };
const at = 1_000_000;
const raw = (r: object) => JSON.stringify(r);

describe("resuming the town after a reload", () => {
  it("resumes a tab that was in town a moment ago, microphone and all", () => {
    const r = readRecord(raw({ me, voice: true, muted: true, seenAt: at - 2_000 }), at);
    expect(r).toMatchObject({ me, voice: true, muted: true });
  });

  it("never resumes a stale record, so reopened tabs do not walk anybody in", () => {
    expect(readRecord(raw({ me, voice: true, muted: false, seenAt: at - RESUME_MS - 1 }), at)).toBeNull();
  });

  it("ignores a record from the future, or one that is not ours", () => {
    expect(readRecord(raw({ me, voice: false, muted: false, seenAt: at + 60_000 }), at)).toBeNull();
    expect(readRecord(raw({ voice: true, seenAt: at }), at)).toBeNull();
    expect(readRecord("{not json", at)).toBeNull();
    expect(readRecord(null, at)).toBeNull();
  });

  it("keeps only what it knows, of the types it expects", () => {
    const r = readRecord(raw({ me: { ...me, color: "red", face: 3 }, voice: "yes", muted: 1, seenAt: at, cap: -1 }), at);
    expect(r).toEqual({ me: { id: "u1", name: "Nine", face: null, color: "#6aa9e0" }, voice: false, muted: false, seenAt: at, testTopic: undefined, cap: undefined });
  });
});
