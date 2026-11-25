const sharp=require('sharp');
// usage: node bands.cjs img x0 x1 y0 y1  -> for s=x+y and t=x-y bins (percent), count dark-floor pixels / arena pixels
(async()=>{
 const [f,x0,x1,y0,y1]=process.argv.slice(2).map((v,i)=>i?+v:v);
 const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const W=info.width,H=info.height;
 const S={},T={};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const px=x/W*100,py=y/H*100; if(px<x0||px>x1||py<y0||py>y1)continue;
  // inside the big diamond?
  if(Math.abs(px-50.2)+Math.abs(py-49.3)>44)continue;
  const i=(y*W+x)*3,R=data[i],G=data[i+1],B=data[i+2];
  const dark=(R<70&&G<70&&B<70&&Math.abs(R-B)<15);
  const s=Math.round(px+py), t=Math.round(px-py);
  S[s]=S[s]||[0,0]; S[s][1]++; if(dark)S[s][0]++;
  T[t]=T[t]||[0,0]; T[t][1]++; if(dark)T[t][0]++;
 }
 const show=(M,n)=>console.log(n+': '+Object.keys(M).map(Number).sort((a,b)=>a-b).map(k=>`${k}:${M[k][0]?'#':'.'}`).join(' '));
 show(S,'s=x+y'); show(T,'t=x-y');
})();
