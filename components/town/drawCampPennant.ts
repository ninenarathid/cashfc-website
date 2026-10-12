import type {FieldCamp} from '@/lib/town/camps';
/** Cloth moves a pixel column at a time from the planted pole; its woven mark remains readable. */
export function drawCampPennant(ctx:CanvasRenderingContext2D,c:FieldCamp,x:number,y:number,s:number,t:number,still:boolean){
 if(!c.flag)return;const u=2*s,px=Math.round(x+12*s),py=Math.round(y-44*s),col=c.flag.line==='farming'?'#799456':c.flag.line==='helpers'?'#668fa0':'#b36d49';
 ctx.fillStyle='#473728';ctx.fillRect(px-u,y-2*s,6*s,2*s);ctx.fillStyle='#705837';ctx.fillRect(px,py,2*s,44*s);ctx.fillStyle='#b89b62';ctx.fillRect(px,py,2*s,3*s);
 for(let i=0;i<9;i++){const wave=still?0:Math.round(Math.sin(t/260-i*.45)*Math.min(2,i/3));ctx.fillStyle=i%3===0?'#4c5342':col;ctx.fillRect(px+u+i*u,py+u+wave*u,u,(i>6?11-i:5)*u);ctx.fillStyle='#d7c99a';ctx.fillRect(px+u+i*u,py+u+wave*u,u,u);if(i>=2&&i<=5){ctx.fillStyle='#e2d9aa';ctx.fillRect(px+u+i*u,py+(i===2||i===5?3:4)*u+wave*u,u,u);}}
}
