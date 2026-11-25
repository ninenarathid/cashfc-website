const sharp=require('sharp');
(async()=>{
 const [f,t0,s0]=process.argv.slice(2).map((v,i)=>i?+v:v);
 const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const W=info.width,H=info.height; const A={},B={}; const armA={},armB={};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const px=x/W*100,py=y/H*100; const s=px+py,t=px-py;
  const i=(y*W+x)*3,R=data[i],G=data[i+1],B_=data[i+2];
  const o=(R-B_>60&&R>110);
  if(!o)continue;
  const dt=Math.abs(t-t0), ds=Math.abs(s-s0);
  if(dt>3.5&&dt<7){const k=Math.round(s);A[k]=(A[k]||0)+1;}
  if(ds>3.5&&ds<7){const k=Math.round(t);B[k]=(B[k]||0)+1;}
  if(dt<2){const k=Math.round(s);armA[k]=1;}
  if(ds<2){const k=Math.round(t);armB[k]=1;}
 }
 const runs=(M)=>{const ks=Object.keys(M).map(Number).sort((a,b)=>a-b);let out=[],cur=null;for(const k of ks){if(!cur||k>cur.b+1){cur={a:k,b:k};out.push(cur);}else cur.b=k;}return out.map(r=>`[${r.a},${r.b}]`).join(' ');};
 console.log('cuts on arm t~'+t0+' at s:',runs(A)); console.log('cuts on arm s~'+s0+' at t:',runs(B));
 console.log('arm t extent in s:',runs(armA)); console.log('arm s extent in t:',runs(armB));
})();
