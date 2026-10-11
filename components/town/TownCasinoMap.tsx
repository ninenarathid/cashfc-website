"use client";
import type {TownMapRuntime,TownMapControls} from '@/lib/town/map-addon';
import {useEffect,useRef} from 'react';
import { clampCam, toIsoPoint, toScreen, zoomAt, type Cam } from '@/lib/town/camera';
import { CASINO_BOUNDS, CASINO_MACHINE_X, CASINO_SPAWN, casinoPath, casinoTileFromIso } from '@/lib/town/casino-map';
import { decodeLook,defaultLook } from '@/lib/town/look';
import { facingFor,loadPixelKit,WALK_FPS,type PixelKit } from '@/lib/town/pixeldoll';
import { SIT_HERE,SPEED,stepAlong,toIso,type Vec } from '@/lib/town/world';
import {reelAt,spinRevealed,type CasinoSpin,type SymbolId} from '@/lib/casino';
import {drawCasinoSymbol} from '@/lib/town/casino-symbol-art';
import {drawCasinoMarquee} from '@/lib/town/casino-marquee';
import {CASINO_FURNITURE,casinoScenery} from '@/lib/town/casino-scenery';
export type CasinoPeer={id:string;name:string;look:string;x:number;y:number;seat:number|null};
export type CasinoCameraControls=TownMapControls;
export const MACHINE_X=CASINO_MACHINE_X,SPAWN=CASINO_SPAWN;
type Walker={pos:Vec;path:Vec[];target:Vec;dx:number;dy:number};
export default function TownCasinoMap({native,self,peers,spins,selected,clock,pane='none',onReception,onDismiss,onMove,onSelect,onReady,onControls}:{native?:TownMapRuntime;self:CasinoPeer;peers:CasinoPeer[];spins:CasinoSpin[];selected:number;clock:()=>number;pane?:string;onReception?:()=>void;onDismiss?:()=>void;onMove:(x:number,y:number)=>void;onSelect:(n:number)=>void;onReady:(ready:boolean)=>void;onControls:(controls:CasinoCameraControls|null)=>void}){
  const canvas=useRef<HTMLCanvasElement>(null),driver=useRef<((stamp:number)=>void)|null>(null),live=useRef({native,self,peers,spins,selected,clock,pane,onReception,onDismiss,onMove,onSelect,onReady});live.current={native,self,peers,spins,selected,clock,pane,onReception,onDismiss,onMove,onSelect,onReady};
  const cam=useRef<Cam>({s:1.5,cx:0,cy:200}),follow=useRef(true),walkers=useRef(new Map<string,Walker>()),kits=useRef(new Map<number,PixelKit>()),asked=useRef(new Set<number>()),ready=useRef(false);
  const drag=useRef<{x:number;y:number;cam:Cam;distance:number}|null>(null);
  const hover=useRef<number|null>(null);
  useEffect(()=>{onControls({zoom:(factor)=>{cam.current.s=Math.max(1.2,Math.min(2.4,cam.current.s*factor));},recenter:()=>{follow.current=true;},frame:stamp=>driver.current?.(stamp)});return()=>onControls(null);},[onControls]);
  const art=useRef<Record<'slot'|'chair'|'planter'|'counter'|'sofa'|'wall'|'npc',HTMLImageElement>|null>(null),hits=useRef<Array<{n:number;x:number;y:number;w:number;h:number}>>([]);
  const background=useRef<HTMLCanvasElement|null>(null);
  useEffect(()=>{const images={} as NonNullable<typeof art.current>;
    for(const key of ['slot','chair','planter','counter','sofa','wall','npc'] as const){const img=new Image();img.onload=()=>{background.current=null;};img.src=key==='npc'?'/town/scenery-7ae61f173c.png':`/town/casino/v2/${key==='chair'?'stool':key}.png`;images[key]=img;}art.current=images;
  },[]);
  useEffect(()=>{for(const p of [self,...peers]){const look=decodeLook(p.look)??defaultLook(p.id);if(asked.current.has(look.race))continue;asked.current.add(look.race);void loadPixelKit(look.race).then(k=>kits.current.set(look.race,k)).catch(()=>asked.current.delete(look.race));}},[self.look,peers]);
  useEffect(()=>{
    const node=canvas.current!,ctx=node.getContext('2d');if(!ctx)return;let frame=0,last=0;
    const glyph=(id:SymbolId,x:number,y:number,size:number)=>drawCasinoSymbol(ctx,id,x,y,size);
    const draw=(stamp:number)=>{
      if(!live.current.native)frame=requestAnimationFrame(draw);if(document.hidden||(!live.current.native&&stamp-last<1000/30))return;
      const dt=Math.min(80,stamp-last||33)/1000;last=stamp;
      const {native,self,peers,spins,selected,clock,pane,onReady}=live.current,now=clock();
      const avatars=native?.session?[native.session.self,...native.session.avatars.values()]:[];
      const people=native?avatars.map(a=>({id:a.info.id,name:a.info.name,look:a.info.look??'',x:a.info.x,y:a.info.y,seat:null})):[self,...peers.filter(p=>p.id!==self.id)];
      if(!people.length)return;
      const ids=new Set(people.map(p=>p.id));for(const id of walkers.current.keys())if(!ids.has(id))walkers.current.delete(id);
      if(native)for(const a of avatars)walkers.current.set(a.info.id,{pos:a.pos,path:a.path,target:{x:a.info.x,y:a.info.y},dx:0,dy:1});
      for(const p of native?[]:people){let a=walkers.current.get(p.id);if(!a){a={pos:{...SPAWN},path:[],target:{...SPAWN},dx:0,dy:1};walkers.current.set(p.id,a);}
        if(a.target.x!==p.x||a.target.y!==p.y){a.target={x:p.x,y:p.y};a.path=casinoPath(a.pos,a.target);if(p.id===self.id)follow.current=true;}
        const previous=a.pos;const next=stepAlong(a.pos,a.path,SPEED*dt);a.pos=next.pos;a.path=next.path;
        if(Math.hypot(a.pos.x-previous.x,a.pos.y-previous.y)>.001){a.dx=a.pos.x-previous.x;a.dy=a.pos.y-previous.y;}
      }
      const mine=walkers.current.get(native?.session?.self.info.id??self.id)!;const arrived=!mine.path.length&&Math.hypot(mine.pos.x-MACHINE_X[selected-1],mine.pos.y-3.5)<.1;
      if(arrived!==ready.current){ready.current=arrived;onReady(arrived);}
      const box=node.getBoundingClientRect(),cw=box.width,ch=box.height,dpr=Math.min(devicePixelRatio||1,2);
      if(node.width!==Math.round(cw*dpr)||node.height!==Math.round(ch*dpr)){node.width=Math.round(cw*dpr);node.height=Math.round(ch*dpr);cam.current.s=cw<640?1.3:Math.max(1.5,Math.min(2.1,cw/950));}
      if(follow.current){const center=toIso(mine.pos.x,mine.pos.y);const open=pane!=='none';cam.current.cx=center.x+(open&&cw>=640?180/cam.current.s:0);const ground=Math.max(190,ch-82-(ch<650?248:280)-38);cam.current.cy=open&&cw<640?center.y+(ch/2-ground)/cam.current.s:center.y-65;}
      // Leave headroom for visible public displays when following a spectator.
      // A dragged camera stays under the viewer's control.
      if(follow.current&&pane==='none'&&cw>=640){
        for(let n=1;n<=5;n++){
          const x=MACHINE_X[n-1],active=spins.some(s=>s.machine===n)||(native?avatars.some(a=>!a.path.length&&a.info.sit===SIT_HERE&&Math.abs(a.pos.x-x)<.1&&Math.abs(a.pos.y-3.5)<.1):people.some(p=>p.seat===n));
          if(!active)continue;
          const p=toScreen(cam.current,toIso(x,2.5),cw,ch);
          if(p.x+41*cam.current.s<0||p.x-55*cam.current.s>cw)continue;
          cam.current.cy=Math.min(cam.current.cy,toIso(x,2.5).y-176+(ch/2-80)/cam.current.s);
        }
        // Keep the viewer's own feet above the bottom controls when walking away.
        cam.current.cy=Math.max(cam.current.cy,toIso(mine.pos.x,mine.pos.y).y-(ch/2-100)/cam.current.s);
      }
      cam.current=clampCam(cam.current,cw,ch,CASINO_BOUNDS);const v=cam.current;
      native?.view(v,cw,ch);
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#1b1c27';ctx.fillRect(0,0,cw,ch);
      const xy=(x:number,y:number)=>toScreen(v,toIso(x,y),cw,ch);
      const polygon=(points:Vec[],color:string)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();};
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      const point=(x:number,y:number,z=0)=>{const p=xy(x,y);return {x:p.x,y:p.y-z*v.s};};
      const scenery=casinoScenery(ctx,point,v.s);
      if(!background.current){
        const cached=document.createElement('canvas');cached.width=1000;cached.height=650;
        const c=cached.getContext('2d')!;c.imageSmoothingEnabled=false;
        const project=(x:number,y:number,z=0)=>{const p=toIso(x,y);return{x:p.x+420,y:p.y+140-z};};
        casinoScenery(c,project,1).background();
        // Architecture shares the same native pixels as the furniture and dolls.
        const wall=art.current?.wall;
        if(wall?.naturalWidth){for(let x=1;x<16;x+=2){const p=project(x,0);c.drawImage(wall,Math.round(p.x-46),Math.round(p.y-100),80,105);}
          for(let y=1;y<12;y+=2){const p=project(0,y);c.save();c.translate(Math.round(p.x+46),Math.round(p.y-100));c.scale(-1,1);c.drawImage(wall,0,0,80,105);c.restore();}}
        background.current=cached;
      }
      const corner=toScreen(v,{x:-420,y:-140},cw,ch);
      ctx.drawImage(background.current,Math.round(corner.x),Math.round(corner.y),1000*v.s,650*v.s);
      scenery.lights(stamp,reduced);
      // A lit tile marks the station under the pointer, in the same space as the doll.
      if(hover.current!==null&&hover.current>0)scenery.tile(MACHINE_X[hover.current-1]-.46,3.04,.92,.92,'#e3c37c30',1,'#d4b470');
      const bitmap=art.current;
      // A destination belongs to a tile, not to an overlay screen coordinate.
      if(mine.path.length){const goal=mine.path.at(-1)!;scenery.tile(Math.floor(goal.x)+.06,Math.floor(goal.y)+.06,.88,.88,'#d0b77d28',1,'#c5b779');}
      hits.current=[];const door=xy(8.5,11.7);hits.current.push({n:-1,x:door.x-45*v.s,y:door.y-25*v.s,w:90*v.s,h:55*v.s});
      const objects:Array<{depth:number;paint:()=>void}>=[];
      const cabinet=(n:number)=>{const x=MACHINE_X[n-1],y=2.5,p=xy(x,y),k=v.s,latest=spins.find(s=>s.machine===n),rolling=latest&&!spinRevealed(latest,now);
        if(!bitmap?.slot.naturalWidth){polygon([{x:p.x-33*k,y:p.y-97*k},{x:p.x+26*k,y:p.y-79*k},{x:p.x+26*k,y:p.y},{x:p.x-33*k,y:p.y-18*k}],selected===n?'#dcb774':'#b88b53');
        polygon([{x:p.x+26*k,y:p.y-79*k},{x:p.x+40*k,y:p.y-90*k},{x:p.x+40*k,y:p.y-10*k},{x:p.x+26*k,y:p.y}], '#855633');
        ctx.save();ctx.translate(p.x-3*k,p.y-56*k);ctx.transform(1,.3,0,1,0,0);ctx.fillStyle='#6b2c47';ctx.fillRect(-25*k,-36*k,50*k,71*k);ctx.fillStyle='#f4d192';ctx.font=`bold ${11*k}px sans-serif`;ctx.textAlign='center';ctx.fillText(`№ ${n}`,0,-19*k);ctx.fillStyle='#fff0d1';ctx.fillRect(-22*k,-10*k,44*k,27*k);
        for(let r=0;r<4;r++)glyph(latest?reelAt(latest,r,now):'popoto',(-16.5+r*11)*k,2*k,11*k);
        ctx.fillStyle=rolling?'#96dab6':'#d8ad69';ctx.fillRect(-11*k,24*k,22*k,5*k);ctx.restore();}
        if(bitmap?.slot.complete&&bitmap.slot.naturalWidth){
          const left=p.x-40*k,top=p.y-85*k;
          ctx.drawImage(bitmap.slot,Math.round(left),Math.round(top),72*k,85*k);
          // Four windows on the front face: perspective follows the cabinet itself.
          for(let r=0;r<4;r++){ctx.save();ctx.translate(left+(15+r*9)*k,top+(32+r*1.8)*k);ctx.transform(1,.21,0,1,0,0);glyph(latest?reelAt(latest,r,now,reduced):'popoto',0,0,8*k);ctx.restore();}
          ctx.fillStyle=selected===n?'#ffdf9b':'#c9ad80';ctx.font=`bold ${10*k}px sans-serif`;ctx.textAlign='center';ctx.fillText(String(n),p.x-7*k,p.y-89*k);
          if(rolling||latest?.prize&&now<Date.parse(latest.reveal_at)+2500){
            for(let light=0;light<6;light++){if(rolling&&!reduced&&Math.floor(stamp/150+light)%3===0)continue;ctx.fillStyle=rolling?'#f2d58a':'#b1d6a1';ctx.fillRect(left+(13+light*5)*k,top+(16+light*.9)*k,2*k,2*k);}
          }
          if(latest?.prize&&!rolling&&!reduced){
            const t=(now-Date.parse(latest.reveal_at))/1000;
            if(t>=0&&t<1.8)for(let chip=0;chip<14;chip++){
              const spread=Math.sin(chip*2.41),launch=18+(chip%5)*7;
              const x=left+(30+spread*35*t)*k,y=top+(45-launch*t+32*t*t)*k;
              ctx.globalAlpha=Math.min(1,(1.8-t)*2);ctx.fillStyle=chip%3===0?'#b55361':'#edc783';
              ctx.fillRect(Math.round(x),Math.round(y),(chip%2+1)*k,k);ctx.globalAlpha=1;
            }
          }
        }
        hits.current.push({n,x:p.x-40*k,y:p.y-85*k,w:72*k,h:90*k});
      };
      for(let n=1;n<=5;n++){
        const x=MACHINE_X[n-1];
        objects.push({depth:x+2.5,paint:()=>cabinet(n)});
        objects.push({depth:x+3.45,paint:()=>{
          const seat=xy(x,3.5),k=v.s;
          hits.current.push({n,x:seat.x-20*k,y:seat.y-38*k,w:40*k,h:45*k});
          if(bitmap?.chair.complete&&bitmap.chair.naturalWidth){ctx.drawImage(bitmap.chair,Math.round(seat.x-14*k),Math.round(seat.y-43*k),28*k,43*k);}
          if(selected===n)scenery.tile(x-.44,3.06,.88,.88,'#dec18e16',.8,'#c9aa61');
        }});
      }
      for(const item of CASINO_FURNITURE)objects.push({depth:item.x+item.y+item.w+item.h-.5,paint:()=>{
        const p=xy(item.x+item.w/2,item.y+item.h/2+(item.kind==='counter'?.8:0)),k=v.s;
        const sprite=item.kind==='plant'?bitmap?.planter:item.kind==='sofa'?bitmap?.sofa:bitmap?.counter;
        if(sprite?.naturalWidth)ctx.drawImage(sprite,Math.round(p.x-sprite.naturalWidth*k/2),Math.round(p.y-sprite.naturalHeight*k),sprite.naturalWidth*k,sprite.naturalHeight*k);
        if(item.kind==='counter')hits.current.push({n:0,x:p.x-65*k,y:p.y-110*k,w:130*k,h:110*k});
      }});
      // A native town banker stands behind the desk; its front lip occludes the feet.
      objects.push({depth:20,paint:()=>{const p=point(13.3,7.4,28),k=.75*v.s;
        if(bitmap?.npc.naturalWidth)ctx.drawImage(bitmap.npc,1,2773,62,78,Math.round(p.x-29*k),Math.round(p.y-77*k),62*k,78*k);
      }});
      objects.push({depth:30,paint:()=>{const p=point(13.5,8.5,90);ctx.fillStyle='#ead6a8';ctx.font=(10*v.s)+'px sans-serif';ctx.textAlign='center';ctx.fillText('พนักงาน Casino',p.x,p.y);}});
      for(const p of people){const a=walkers.current.get(p.id)!;objects.push({depth:a.pos.x+a.pos.y,paint:()=>{
        if(native){const avatar=avatars.find(a=>a.info.id===p.id);if(avatar)native.avatar(ctx,avatar,stamp,dpr);return;}
        const at=xy(a.pos.x,a.pos.y),look=decodeLook(p.look)??defaultLook(p.id),kit=kits.current.get(look.race),k=.85*v.s;
        const sit=!!p.seat&&!a.path.length,face=sit?{view:'back' as const,mirror:false}:facingFor(a.dx,a.dy);
        if(kit)kit.draw(ctx,look,face.view,face.mirror,at.x,at.y-(sit?35*v.s:0),k,{step:a.path.length?Math.floor(now/1000*WALK_FPS):undefined,sit,perch:false},dpr);
        else{ctx.fillStyle='#dcb68b';ctx.fillRect(at.x-8*k,at.y-38*k,16*k,30*k);}
        ctx.font=`${11*v.s}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='#211b2bdd';ctx.fillRect(at.x-30*v.s,at.y+9*v.s,60*v.s,18*v.s);ctx.fillStyle=p.id===self.id?'#f4d893':'#dfede4';ctx.fillText(p.name.slice(0,14),at.x,at.y+22*v.s);
      }});}
      for(const o of objects.sort((a,b)=>a.depth-b.depth))o.paint();
      // Public reels stay readable above every race, even with a closed slot UI.
      // Keep the last result visible until the machine spins again.
      for(let n=1;n<=5;n++){
        const latest=spins.find(s=>s.machine===n);
        const occupant=native?avatars.find(a=>!a.path.length&&a.info.sit===SIT_HERE&&Math.abs(a.pos.y-3.5)<.1&&Math.abs(a.pos.x-MACHINE_X[n-1])<.1)?.info.name:people.find(p=>p.seat===n)?.name;
        if(!latest&&!occupant&&!(selected===n&&pane==='slots'))continue;
        const p=xy(MACHINE_X[n-1],2.5);
        // A short phone already shows large reels in its open slot window.
        // Omit duplicate signs that would sit behind the town's top HUD.
        if(cw<640&&pane==='slots'&&p.y-176*v.s<104)continue;
        drawCasinoMarquee(ctx,n,latest,occupant??'พร้อมเล่น',now,p.x-7*v.s,p.y-176*v.s,v.s,reduced);
      }

    };driver.current=draw;if(!live.current.native)frame=requestAnimationFrame(draw);return()=>{driver.current=null;cancelAnimationFrame(frame);};
  },[]);
  const tileAt=(clientX:number,clientY:number)=>{const box=canvas.current!.getBoundingClientRect(),p=toIsoPoint(cam.current,clientX-box.left,clientY-box.top,box.width,box.height);return casinoTileFromIso(p.x,p.y);};
  return <div className="casino-town-canvas-wrap"><canvas ref={canvas} className="casino-town-canvas" tabIndex={0} role="application" aria-label="Cash Town · แมพ Casino แตะพื้นเพื่อเดิน แตะเครื่องเพื่อเล่น ลากเพื่อเลื่อนแมพ"
    onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,cam:{...cam.current},distance:0};}}
    onPointerMove={e=>{const d=drag.current;if(!d){const b=e.currentTarget.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;hover.current=[...hits.current].reverse().find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)?.n??null;e.currentTarget.style.cursor=hover.current!==null?'pointer':'default';return;}const dx=e.clientX-d.x,dy=e.clientY-d.y;d.distance=Math.max(d.distance,Math.hypot(dx,dy));if(d.distance>7){follow.current=false;hover.current=null;cam.current={...d.cam,cx:d.cam.cx-dx/d.cam.s,cy:d.cam.cy-dy/d.cam.s};}}}
    onPointerLeave={()=>{hover.current=null;}}
    onPointerUp={e=>{const d=drag.current;drag.current=null;if(!d||d.distance>7)return;const b=e.currentTarget.getBoundingClientRect(),hx=e.clientX-b.left,hy=e.clientY-b.top;if(live.current.native?.person(hx,hy)){live.current.onDismiss?.();return;}const hit=[...hits.current].reverse().find(h=>hx>=h.x&&hx<=h.x+h.w&&hy>=h.y&&hy<=h.y+h.h);if(hit){if(hit.n===-1)location.assign('/town?map=town');else if(hit.n===0)live.current.onReception?.();else live.current.onSelect(hit.n);return;}const p=tileAt(e.clientX,e.clientY);const machine=MACHINE_X.findIndex(x=>Math.abs(p.x-x)<1&&p.y<3.5&&p.y>-.5);
      if(machine>=0){live.current.onSelect(machine+1);return;}live.current.onMove(Math.floor(p.x)+.5,Math.floor(p.y)+.5);}}
    onPointerCancel={()=>{drag.current=null;}}
    onWheel={e=>{const b=e.currentTarget.getBoundingClientRect();follow.current=false;cam.current=zoomAt(cam.current,cam.current.s*(e.deltaY>0?.9:1.1),e.clientX-b.left,e.clientY-b.top,b.width,b.height,CASINO_BOUNDS);}}
    onKeyDown={e=>{const delta:Record<string,Vec>={ArrowUp:{x:-1,y:-1},ArrowDown:{x:1,y:1},ArrowLeft:{x:-1,y:1},ArrowRight:{x:1,y:-1}};const d=delta[e.key];if(!d)return;e.preventDefault();const a=walkers.current.get(self.id)?.pos??self;onMove(Math.floor(a.x+d.x)+.5,Math.floor(a.y+d.y)+.5);}} />
  </div>;
}
