const sharp=require('sharp');
// usage: node bands2.cjs img cx cy d excl.json -> dark-floor runs along s=x+y and t=x-y over the whole diamond (excluding circles)
(async()=>{
 const [f,cx,cy,d,ex]=process.argv.slice(2).map((v,i)=>i&&i<4?+v:v);
 const excl=JSON.parse(ex||'[]');
 const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const W=info.width,H=info.height;
 const S={},T={};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const px=x/W*100,py=y/H*100;
  if(Math.abs(px-cx)+Math.abs(py-cy)>d-1.5)continue;
  if(excl.some(([ex,ey,er])=>Math.hypot(px-ex,py-ey)<er))continue;
  const i=(y*W+x)*3,R=data[i],G=data[i+1],B=data[i+2];
  const dark=(R<70&&G<70&&B<70&&Math.abs(R-B)<15);
  const s=Math.round((px+py)*2)/2, t=Math.round((px-py)*2)/2;
  S[s]=S[s]||[0,0]; S[s][1]++; if(dark)S[s][0]++;
  T[t]=T[t]||[0,0]; T[t][1]++; if(dark)T[t][0]++;
 }
 const runs=(M)=>{const ks=Object.keys(M).map(Number).sort((a,b)=>a-b);let out=[],cur=null;for(const k of ks){const c=M[k][0]>0?'gap':'band';if(!cur||cur.c!==c){cur={c,a:k,b:k};out.push(cur);}else cur.b=k;}return out.map(r=>`${r.c}[${r.a},${r.b}]`).join(' ');};
 console.log('s=x+y:',runs(S)); console.log('t=x-y:',runs(T));
})();
