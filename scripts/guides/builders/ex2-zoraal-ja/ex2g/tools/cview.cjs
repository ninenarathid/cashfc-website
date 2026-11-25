// Crop with a grid labelled in CROP coordinates (for blur boxes / marks).
// usage: node cview.cjs <src> <out.png> x y w h [step=50] [outScale=1]
const sharp=require('sharp');
const [src,out,x,y,w,h,stepA,scA]=process.argv.slice(2); const W=+w,H=+h,st=+(stepA||50),sc=+(scA||1);
(async()=>{const OW=Math.round(W*sc),OH=Math.round(H*sc);
const buf=await sharp(src).extract({left:+x,top:+y,width:W,height:H}).resize(OW,OH).toBuffer();
let s='';for(let gx=st;gx<W;gx+=st){const X=gx*sc;const major=gx%100===0;s+=`<line x1="${X}" y1="0" x2="${X}" y2="${OH}" stroke="#0f0" stroke-opacity="${major?0.5:0.22}"/>`;if(major)s+=`<text x="${X+2}" y="11" fill="#0f0" font-size="11" font-family="Arial">${gx}</text>`;}
for(let gy=st;gy<H;gy+=st){const Y=gy*sc;const major=gy%100===0;s+=`<line x1="0" y1="${Y}" x2="${OW}" y2="${Y}" stroke="#0f0" stroke-opacity="${major?0.5:0.22}"/>`;if(major)s+=`<text x="2" y="${Y-2}" fill="#0f0" font-size="11" font-family="Arial">${gy}</text>`;}
await sharp(buf).composite([{input:Buffer.from(`<svg width="${OW}" height="${OH}">${s}</svg>`),left:0,top:0}]).png().toFile(out);console.log(out,OW,OH);})();
