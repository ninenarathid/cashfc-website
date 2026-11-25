const sharp=require('sharp');
// usage: node grid.cjs in out [size]
(async()=>{
 const [inp,out,sz]=process.argv.slice(2); const N=+(sz||880);
 const base=await sharp(inp).resize(N,N,{fit:'fill'}).png().toBuffer();
 let svg='';
 for(let p=0;p<=100;p+=5){const v=p/100*N; const major=p%10===0;
  svg+=`<line x1="${v}" y1="0" x2="${v}" y2="${N}" stroke="${major?'#00ffff':'#00ffff'}" stroke-opacity="${major?0.55:0.22}" stroke-width="1"/>`;
  svg+=`<line x1="0" y1="${v}" x2="${N}" y2="${v}" stroke="#00ffff" stroke-opacity="${major?0.55:0.22}" stroke-width="1"/>`;
  if(major){svg+=`<text x="${v+2}" y="12" font-size="11" fill="#0ff" font-family="Arial">${p}</text><text x="2" y="${v-2}" font-size="11" fill="#0ff" font-family="Arial">${p}</text>`;}
 }
 await sharp(base).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}">${svg}</svg>`)}]).png().toFile(out);
})();
