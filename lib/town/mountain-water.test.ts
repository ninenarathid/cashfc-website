import { describe, expect, it } from "vitest";
import { mountainWater } from "./mountain-water";
import { CAMP, LOOKOUT, MOUTH, GATE_ROWS, cliffAt, mountainGround } from "./mountain";
import { MOUNTAIN, FOREST, asBuilt, fishFrom, groundLook, walkable } from "./world";

describe("regional fishing places", () => {
  it("casts from walkable tiles into painted mountain water and has both habitats", () => asBuilt(() => {
    const habitats=new Set<string>();
    let found=0;
    for(let y=MOUNTAIN.y;y<MOUNTAIN.y+MOUNTAIN.h;y++)for(let x=MOUNTAIN.x;x<MOUNTAIN.x+MOUNTAIN.w;x++){
      const place=fishFrom(x,y);
      if(!place)continue;
      found++;habitats.add(place.habitat!);
      expect(walkable(x,y)).toBe(true);
      expect(mountainWater(place.float.x-MOUNTAIN.x,place.float.y-MOUNTAIN.y)).toBeTruthy();
      expect(groundLook(place.float.x,place.float.y)).toBe("water");
    }
    expect(found).toBeGreaterThan(20);
    expect([...habitats].sort()).toEqual(["headwater","pool"]);
  }));

  it("keeps the existing crossings dry and forbids water on cliff faces", () => {
    for(let v=0;v<56;v+=0.5)for(let u=0;u<72;u+=0.5){
      if(cliffAt(u,v)||mountainGround(u,v)==="road")expect(mountainWater(u,v)).toBeNull();
    }
  });

  it("keeps the camp, lookout, mine and every terrace reachable from the gate", () => asBuilt(() => {
    const keys=new Set<string>(),queue:Array<[number,number]>=[[MOUNTAIN.x+68,MOUNTAIN.y+GATE_ROWS[0]]];
    while(queue.length){
      const [x,y]=queue.pop()!;
      const key=`${x},${y}`;
      if(keys.has(key)||x<MOUNTAIN.x||y<MOUNTAIN.y||x>=MOUNTAIN.x+MOUNTAIN.w||y>=MOUNTAIN.y+MOUNTAIN.h||!walkable(x,y))continue;
      keys.add(key);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])queue.push([x+dx,y+dy]);
    }
    for(const [u,v] of [...MOUTH,[CAMP.u+1,CAMP.v],[LOOKOUT.u+1,LOOKOUT.v+2],[10,15]])
      expect(keys.has(`${MOUNTAIN.x+u},${MOUNTAIN.y+v}`),`${u},${v}`).toBe(true);
  }));

  it("offers each forest habitat without permitting casts from water itself",()=>asBuilt(()=>{
    const habitats=new Set<string>();
    for(let y=FOREST.y;y<FOREST.y+FOREST.h;y++)for(let x=FOREST.x;x<FOREST.x+FOREST.w;x++){
      const place=fishFrom(x,y);
      if(place){expect(walkable(x,y)).toBe(true);habitats.add(place.habitat!);}
    }
    expect([...habitats].sort()).toEqual(["creek","headwater","pool"]);
  }));
});
