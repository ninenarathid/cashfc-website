// node peek.cjs full.png x y w h out.png  -> crop at native px with a 50px grid labelled in crop coords
const sharp=require('sharp');
const [f,x,y,w,h,out]=process.argv.slice(2);(async()=>{const W=+w,H=+h;let svg='';
for(let p=0;p<=W;p+=50){const maj=p%100===0;svg+=`<line x1="${p}" y1="0" x2="${p}" y2="${H}" stroke="#0ff" stroke-opacity="${maj?0.4:0.12}"/>`;if(maj)svg+=`<text x="${p+2}" y="12" font-size="12" fill="#0ff">${p}</text>`;}
for(let p=0;p<=H;p+=50){const maj=p%100===0;svg+=`<line x1="0" y1="${p}" x2="${W}" y2="${p}" stroke="#0ff" stroke-opacity="${maj?0.4:0.12}"/>`;if(maj)svg+=`<text x="2" y="${p-2}" font-size="12" fill="#0ff">${p}</text>`;}
await sharp(f).extract({left:+x,top:+y,width:W,height:H}).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`)}]).png().toFile(out);})();
