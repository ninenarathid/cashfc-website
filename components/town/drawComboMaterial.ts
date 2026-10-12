import type{ComboCue}from'@/lib/town/combo-types';
/** Small materials leave the actual action point; no illustrative sprite is transformed. */
export function drawComboMaterial(ctx:CanvasRenderingContext2D,x:number,y:number,s:number,elapsed:number,cue:ComboCue,still=false){
 const t=Math.max(0,elapsed/1000);if(t>1.6)return;ctx.save();ctx.translate(Math.round(x),Math.round(y));const pixel=Math.max(1,Math.round(2*s));
 const dot=(dx:number,dy:number,color:string,a=1)=>{ctx.globalAlpha=a;ctx.fillStyle=color;ctx.fillRect(Math.round(dx*s),Math.round(dy*s),pixel,pixel);};
 if(still){for(const[dx,dy]of[[-4,-4],[3,-7],[6,-2]])dot(dx,dy,cue==='water'?'#b8e2d3':cue==='wood'?'#c5d69a':'#e6d8b1',.75);ctx.restore();return;}
 if(cue==='water'){
  for(let i=0;i<13;i++){const age=t-i*.017;if(age<0||age>1.1)continue;const angle=i*2.399,dx=Math.cos(angle)*(8+i%4*3)*age,dy=-(18+i%5*4)*age+27*age*age;dot(dx,dy,i%3?'#a6d5c6':'#e1eee0',Math.max(0,1-age));}
  for(let ring=0;ring<2;ring++){const age=t-ring*.18;if(age<0||age>.95)continue;for(let i=0;i<20;i++){if((i+ring)%4===0)continue;const a=i*Math.PI/10;dot(Math.cos(a)*(4+age*15),Math.sin(a)*(2+age*5),'#76b7a5',(1-age)*.6);}}
 }else if(cue==='wood'){
  for(let i=0;i<10;i++){const age=t-i*.035;if(age<0||age>1.25)continue;const side=i%2?1:-1,dx=side*(3+14*age)+Math.sin(age*6+i)*2,dy=-12*age+14*age*age-i%3*3;dot(dx,dy,i%3?'#9bbc78':'#d1d99e',Math.max(0,1-age/1.25));dot(dx+side*2,dy-1,'#7d9b67',Math.max(0,.8-age*.65));}
 }else{
  for(let ring=0;ring<3;ring++){const age=t-ring*.2;if(age<0||age>.95)continue;const radius=4+age*23;for(let i=0;i<28;i++){if((i+ring)%5<2)continue;const a=i*Math.PI/14;dot(Math.cos(a)*radius,Math.sin(a)*radius*.55-6,'#d6cea0',Math.max(0,1-age)*.65);}}
  for(let i=0;i<6;i++)dot(Math.sin(i*2.4)*5,-7-t*9-i%3*3,i%2?'#e5e7bf':'#a7caba',Math.max(0,1-t));
 }ctx.restore();
}
