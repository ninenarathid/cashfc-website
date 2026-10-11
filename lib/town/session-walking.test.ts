import { describe, expect, it, vi } from "vitest";
import { TownSession } from "./session";
import { SPEED } from "./world";

/** Exercise the actual frame method without opening a room or microphone. */
function session() {
  const self = {pos:{x:30,y:30},path:[{x:50,y:30}],info:{pet:null,hold:null}};
  const other = {pos:{x:30,y:31},path:[{x:50,y:31}],info:{pet:null,hold:null}};
  return Object.assign(Object.create(TownSession.prototype), {
    self, avatars:new Map([["B",other]]), steppedAt:1000,
    options:{terrain:{}}, sitWhenThere:null, voice:{active:false},tell:vi.fn(),
  });
}
describe("returning to a walking tab", () => {
  it("a two-second interruption advances both players by two seconds, preserving the rest of their paths", () => {
    const s=session();s.step(3000,0.05);
    expect(s.self.pos.x).toBeCloseTo(30+SPEED*2);expect(s.self.path).toHaveLength(1);
    expect(s.avatars.get("B").pos.x).toBeCloseTo(30+SPEED*2);
  });
  it("a long interruption reaches the destination naturally", () => {
    const s=session();s.step(31000,0.05);
    expect(s.self.pos).toEqual({x:50,y:30});expect(s.self.path).toEqual([]);
  });
  it("the first frame walks normally rather than teleporting to the end", () => {
    const s=session();s.steppedAt=0;s.step(1000,0.05);
    expect(s.self.pos.x).toBeCloseTo(30+SPEED*0.05);expect(s.self.path).toHaveLength(1);
  });
});
