const sharp=require('sharp');
// classify pixels of the picture as orange or not; test models of line AoEs through orbs
(async()=>{
 const f=process.argv[2]; const orbs=JSON.parse(process.argv[3]);
 const {data,info}=await sharp(f).removeAlpha().resize(220,220).raw().toBuffer({resolveWithObject:true});
 const W=info.width;
 const isO=(x,y)=>{const i=(y*W+x)*3;const R=data[i],G=data[i+1],B=data[i+2];return (R-B>50&&R>150);};
 const pts=[];for(let y=0;y<W;y++)for(let x=0;x<W;x++){const px=x/W*100,py=y/W*100; if(orbs.some(o=>Math.hypot(o[0]-px,o[1]-py)<7.5))continue; pts.push([px,py,isO(x,y)]);}
 const dirs=JSON.parse(process.argv[4]||'[0,45,90,135]');
 for (const w of [6,8,10,12,13,14,16]){
  let agree=0, fp=0, fn=0;
  for(const [px,py,o] of pts){
   let cov=false;
   for(const ob of orbs){for(const d of dirs){const t=d*Math.PI/180;const ux=Math.sin(t),uy=-Math.cos(t);const dx=px-ob[0],dy=py-ob[1];const perp=Math.abs(dx*uy-dy*ux); if(perp<=w/2){cov=true;break;}} if(cov)break;}
   if(cov===o)agree++; else if(cov)fp++; else fn++;
  }
  console.log('w',w,'agree',(agree/pts.length*100).toFixed(1),'falsePos',fp,'falseNeg',fn);
 }
})();
