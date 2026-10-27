import type {Vec} from './world';

/** The room's size in tiles: thirty-two wide, so that ten machines stand in one row along the back wall (the owner, 2026-10-27: "ป้ายบัง เครื่องอื่น ช่วยทำแมพให้ใหญ่ขึ้นกว่านี้ด้วย"). */
export const CASINO_SIZE = { w: 32, h: 12 } as const;
/** Furniture footprints are shared by the renderer and the movement grid. */
export const CASINO_FURNITURE = [
  {kind:'sofa',x:1,y:8,w:3,h:2},
  {kind:'counter',x:22,y:7,w:3,h:2},
  {kind:'sofa',x:27,y:8,w:3,h:2},
  {kind:'plant',x:0,y:7,w:1,h:1},
  {kind:'plant',x:12,y:8,w:1,h:1},
  {kind:'plant',x:31,y:8,w:1,h:1},
] as const;
/** The counter, where the casino's man stands. */
export const CASINO_COUNTER = CASINO_FURNITURE.find(f => f.kind === 'counter')!;
export type CasinoFurniture = typeof CASINO_FURNITURE[number];
type Point = (x:number,y:number,z?:number)=>Vec;

/** Native geometry: seams, walls and props use the actual movement projection. */
export function casinoScenery(ctx:CanvasRenderingContext2D,point:Point,scale:number) {
  const poly=(coords:Array<[number,number,number?]>,fill:string,stroke?:string)=>{
    ctx.beginPath();coords.forEach(([x,y,z],i)=>{const p=point(x,y,z);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.lineWidth=Math.max(1,scale);ctx.strokeStyle=stroke;ctx.stroke();}
  };
  const tile=(x:number,y:number,w:number,h:number,fill:string,z=0,stroke?:string)=>poly([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],fill,stroke);
  const block=(x:number,y:number,w:number,h:number,z:number,top:number,colors:[string,string,string])=>{
    poly([[x,y+h,z],[x+w,y+h,z],[x+w,y+h,top],[x,y+h,top]],colors[1],'#241f22');
    poly([[x+w,y,z],[x+w,y+h,z],[x+w,y+h,top],[x+w,y,top]],colors[2],'#241f22');
    tile(x,y,w,h,colors[0],top,'#241f22');
  };
  const line=(a:[number,number,number],b:[number,number,number],color:string,width=1)=>{
    const p=point(...a),q=point(...b);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=color;ctx.lineWidth=width*scale;ctx.stroke();
  };
  const ellipse=(x:number,y:number,z:number,rx:number,ry:number,color:string)=>{
    const p=point(x,y,z);ctx.beginPath();ctx.ellipse(p.x,p.y,rx*scale,ry*scale,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  };
  const background=()=>{
    const {w:W,h:H}=CASINO_SIZE,mid=W/2-8;
    block(0,0,W,H,-12,-1,['#3b383b','#30292b','#4a3a32']);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const edge=x===0||x===W-1||y===0||y===H-1;
      tile(x,y,1,1,edge?'#59675c':(x+y)%2?'#707d6b':'#969981',0,'#4e574a');
      for(let i=0;i<16;i++){
        const a=((x*17+y*31+i*7)%11)/15+.1,b=((x*7+y*13+i*3)%11)/15+.1;
        line([x+a,y+b,0],[x+a+.09,y+b,0],(x+y+i)%2?'#abb09838':'#424e3a30');
      }
      line([x+.04,y+.04,0],[x+.96,y+.04,0],'#c2bf9633');
    }
    tile(1,1.1,W-2,3.15,'#49303b',.3,'#29222a');
    tile(1.12,1.22,W-2.24,2.91,'#824b4a',.5,'#b79356');
    tile(1.22,1.32,W-2.44,2.71,'#603a43',.6);
    for(let y=1.4;y<4;y+=.22)for(let x=1.3;x<W-1.2;x+=.24){
      const noise=(Math.floor(x*91)+Math.floor(y*113))%5;
      line([x,y,.7],[x+.035,y,.7],noise===0?'#8c566126':'#33233324');
    }
    for(let x=1.35;x<W-1.3;x+=.55)line([x,4.02,.8],[x+.2,4.02,.8],'#bb985c',1.5);
    // (the way in, in the middle of the front wall)
    tile(mid+7.4,9,2.2,3,'#56353c',.5,'#b69258');
    line([mid+7.6,9,.8],[mid+7.6,12,.8],'#cfaa67',2);line([mid+9.4,9,.8],[mid+9.4,12,.8],'#cfaa67',2);
    // The entry has actual steps and depth; the carpet continues over their treads.
    for(let step=3;step>=0;step--){
      const y=12+step*.25,z=-4-step*5;
      block(mid+7.35,y,2.3,.25,z-5,z,['#674c37','#46312b','#392a26']);
      tile(mid+7.55,y,1.9,.25,'#743c47',z+.5,'#b48d51');
      line([mid+7.35,y,z],[mid+9.65,y,z],'#c39a5b');
    }
    for(const x of [mid+7.25,mid+9.75]){
      block(x-.15,11.75,.3,.3,0,38,['#b39058','#684630','#49362b']);
      block(x-.2,11.7,.4,.4,34,39,['#d8b97a','#a07a49','#6b4c35']);
      ellipse(x,11.9,43,4,5,'#d3ae65');
    }

  };
  const furniture=(item:CasinoFurniture)=>{
    const {x,y,w,h}=item;
    if(item.kind==='sofa'){
      block(x,y,w,h,5,18,['#683d47','#492e38','#3e2931']);
      block(x,y,w,.35,18,42,['#9c5c5c','#6d3e4a','#533440']);
      for(let seat=0;seat<3;seat++)block(x+seat+.16,y+.45,.7,1.18,18,24,['#96565a','#643b44','#58333d']);
      for(const dx of [0,w-.25])block(x+dx,y,.25,h,14,32,['#9f7250','#684634','#50372d']);
      for(const dx of [.4,w-.4])block(x+dx,y+h-.2,.12,.12,0,8,['#c0a05d','#97723e','#6c4e2f']);
    }else if(item.kind==='counter'){
      block(x,y,w,h,0,36,['#815e43','#594232','#423329']);
      for(let panel=0;panel<3;panel++)poly([[x+panel+.12,y+h,6],[x+panel+.86,y+h,6],[x+panel+.86,y+h,28],[x+panel+.12,y+h,28]],'#42332b','#97744b');
      block(x-.1,y-.1,w+.2,h+.2,36,42,['#b19461','#826345','#57402e']);
      ellipse(x+2.35,y+.9,43,7,3,'#665030');ellipse(x+2.35,y+.9,48,4,5,'#d5b76d');
    }
  };
  const lights=(stamp:number,reduced:boolean)=>{
    const lamps=[...Array.from({length:CASINO_SIZE.w/2},(_,i)=>[2*i+1,0]),...Array.from({length:CASINO_SIZE.h/2},(_,i)=>[0,2*i+1])];
    for(const [x,y] of lamps){
      const base=point(x,y,55),p={x:base.x+(x===0?39:-39)*scale,y:base.y},pulse=reduced?1:1+Math.sin(stamp/1700+x+y)*.025;
      const glow=ctx.createRadialGradient(p.x,p.y,2*scale,p.x,p.y,33*scale);
      glow.addColorStop(0,`rgba(244,195,98,${.2*pulse})`);glow.addColorStop(1,'rgba(244,195,98,0)');
      ctx.fillStyle=glow;ctx.fillRect(p.x-33*scale,p.y-33*scale,66*scale,66*scale);
    }
  };
  return {background,furniture,lights,tile};
}
