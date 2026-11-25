// usage: node zoom.cjs img x0 y0 w out  -> crop (percent) with a 1% grid, 800px
const sharp=require('sharp');
(async()=>{
 const [f,x0s,y0s,ws,out]=process.argv.slice(2); const x0=+x0s,y0=+y0s,w=+ws,N=800;
 const m=await sharp(f).metadata(); const W=m.width,H=m.height;
 let svg='';for(let p=0;p<=w;p++){const v=p/w*N;const maj=(x0+p)%5===0;svg+=`<line x1="${v}" y1="0" x2="${v}" y2="${N}" stroke="#0ff" stroke-opacity="${maj?0.55:0.12}"/>`;if(maj)svg+=`<text x="${v+2}" y="12" font-size="12" fill="#0ff">${x0+p}</text>`;}
 for(let p=0;p<=w;p++){const v=p/w*N;const maj=(y0+p)%5===0;svg+=`<line x1="0" y1="${v}" x2="${N}" y2="${v}" stroke="#0ff" stroke-opacity="${maj?0.55:0.12}"/>`;if(maj)svg+=`<text x="2" y="${v-2}" font-size="12" fill="#0ff">${y0+p}</text>`;}
 await sharp(f).extract({left:Math.round(x0/100*W),top:Math.round(y0/100*H),width:Math.round(w/100*W),height:Math.round(w/100*H)}).resize(N,N).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}">${svg}</svg>`)}]).png().toFile(out);
})();
