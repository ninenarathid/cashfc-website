// Several crops stacked vertically at a common width, labelled. usage: node crops.cjs out.png W "file:l,t,w,h" ...
const sharp=require('sharp');
const [out,Wa,...specs]=process.argv.slice(2); const W=+Wa;
(async()=>{let y=0; const comp=[];
for(const s of specs){const k=s.lastIndexOf(':'); const f=s.slice(0,k), r=s.slice(k+1); const [l,t,w,h]=r.split(',').map(Number);
 const H=Math.round(W*h/w); const b=await sharp(f).extract({left:l,top:t,width:w,height:h}).resize(W,H).toBuffer();
 comp.push({input:Buffer.from(`<svg width="${W}" height="18"><rect width="100%" height="100%" fill="#000"/><text x="4" y="14" fill="#ff0" font-size="13" font-family="Arial">${f.split(/[\/]/).pop()} ${r} (${(w/h).toFixed(2)}:1)</text></svg>`),left:0,top:y}); y+=18;
 comp.push({input:b,left:0,top:y}); y+=H+4;}
await sharp({create:{width:W,height:y,channels:3,background:'#333'}}).composite(comp).png().toFile(out); console.log(out,W,y);})();
