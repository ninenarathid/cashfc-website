import type{FarmFrame}from'./TownFarm';import type{CropId}from'@/lib/town/items';
/** One plant grows across its real footprint; leaves and lobes are native complete pixel cells. */
export function drawGiantPlant(f:FarmFrame,x:number,y:number,crop:CropId,stage:number,dead:boolean){const{ctx,project,s,still,now}=f,c=project({x:x+1,y:y+1}),unit=Math.max(1,Math.round(2*s)),growth=.25+.15*stage,cx=Math.round(c.x),cy=Math.round(c.y),sway=still||dead?0:Math.round(Math.sin(now/1400+x)*s);
 const cell=(u:number,v:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(cx+u*unit),Math.round(cy+v*unit),unit,unit);};
 ctx.fillStyle='#292d1f65';ctx.beginPath();ctx.ellipse(cx,cy+2*s,19*s,7*s,0,0,Math.PI*2);ctx.fill();
 const green=dead?['#716a45','#938467','#a29770']:['#36543a','#62834b','#9aad63'];
 for(let j=0;j<6;j++){const angle=j*Math.PI/3,reach=(10+4*(j%2))*growth;for(let k=0;k<reach;k++){const u=Math.cos(angle)*k,v=-4+Math.sin(angle)*k*.45;cell(Math.round(u)+sway/unit,Math.round(v),green[k%3]);if(k>1)cell(Math.round(u)+1+sway/unit,Math.round(v),green[1]);}}
 if(stage<2)return;
 const pumpkin=crop==='pumpkin',cabbage=crop==='cabbage',colors=dead?['#5d4d35','#807052','#9a8a66']:pumpkin?['#6d4b2f','#b77b3a','#dcaa58']:cabbage?['#3f613e','#7b9c55','#bdd18a']:crop==='carrot'?['#815334','#c7823e','#e3b264']:crop==='daikon'?['#8e946e','#c6ce9d','#e4e1b9']:['#615038','#93815a','#b9a276'];
 const rx=(pumpkin||cabbage?14:7)*growth,ry=(pumpkin||cabbage?10:12)*growth;
 for(let v=-Math.ceil(ry);v<=Math.ceil(ry);v++)for(let u=-Math.ceil(rx);u<=Math.ceil(rx);u++){
  const d=(u/rx)**2+(v/ry)**2;if(d>1)continue;
  // Ribs follow the round surface rather than forming flat vertical bars.
  const latitude=Math.sqrt(Math.max(.08,1-(v/ry)**2)),rib=Math.abs(u)/(rx*latitude),groove=pumpkin&&Math.abs(rib*3-Math.round(rib*3))<.12||cabbage&&Math.floor(Math.sqrt(d)*7)%3===0;
  const edge=d>.87,highlight=u<-rx*.15&&v<-ry*.1&&!groove;cell(u,v-3,colors[edge||groove?0:highlight?2:1]);
  if(!dead&&pumpkin&&u===-Math.round(rx*latitude*.45)&&v<-ry*.25)cell(u,v-3,'#e8bf72');
 }
 const top=-Math.ceil(ry)-3;for(let k=0;k<5;k++){cell(Math.round(k*.4),top-k,green[k<2?0:1]);if(k<3)cell(1,top-k,green[2]);}
 for(const side of [-1,1])for(let k=0;k<6*growth;k++){const u=side*(rx-2+k),v=-2+Math.floor(k*.45);cell(Math.round(u),v,green[0]);if(k>1&&k<5){cell(Math.round(u),v-1,green[1]);cell(Math.round(u),v-2,green[2]);}}
}
