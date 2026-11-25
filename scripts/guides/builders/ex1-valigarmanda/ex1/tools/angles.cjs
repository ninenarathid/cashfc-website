const sharp=require('sharp');
// usage: node angles.cjs img cx cy r [r2]  (cx,cy,r in percent) -> orange angle ranges (0=up, clockwise)
(async()=>{
 const [f,cxp,cyp,...rs]=process.argv.slice(2);
 const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const W=info.width,H=info.height;
 for (const rp of rs){
  const cx=cxp/100*W, cy=cyp/100*H, r=rp/100*W; let runs=[],cur=null;
  for(let a=0;a<360;a+=0.5){const t=a*Math.PI/180; const x=Math.round(cx+r*Math.sin(t)), y=Math.round(cy-r*Math.cos(t));
   let cls='-'; if(x>=0&&y>=0&&x<W&&y<H){const i=(y*W+x)*3; const R=data[i],G=data[i+1],B=data[i+2]; cls=(R-B>55 && R>120)?'O':(R>230&&G>230&&B>230)?'W':'D';}
   if(!cur||cur.c!==cls){cur={c:cls,a0:a,a1:a};runs.push(cur);} else cur.a1=a;}
  console.log('r='+rp+': '+runs.filter(x=>x.c==='O').map(x=>`${x.a0}-${x.a1}`).join('  '));
 }
})();
