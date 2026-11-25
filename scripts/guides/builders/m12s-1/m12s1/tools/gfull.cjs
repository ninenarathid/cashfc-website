// usage: node gfull.cjs out.png src.png [x0 y0 w h] -> region shown at 1280 wide with a grid every 100 px in source coords
const sharp=require("sharp");
const [out,src,x0="0",y0="0",w="1920",h="1080"]=process.argv.slice(2);
(async()=>{const X0=+x0,Y0=+y0,W0=+w,H0=+h;const s=1280/W0;const W=1280,H=Math.round(H0*s);
const b=await sharp(src).extract({left:X0,top:Y0,width:W0,height:H0}).resize(W,H).png().toBuffer();
let svg="";for(let x=Math.ceil(X0/100)*100;x<=X0+W0;x+=100){const v=(x-X0)*s;svg+=`<line x1="${v}" y1="0" x2="${v}" y2="${H}" stroke="#0ff" stroke-opacity="0.45"/><text x="${v+2}" y="12" font-size="12" fill="#ff0" font-family="Arial">${x}</text>`}
for(let y=Math.ceil(Y0/100)*100;y<=Y0+H0;y+=100){const v=(y-Y0)*s;svg+=`<line x1="0" y1="${v}" x2="${W}" y2="${v}" stroke="#0ff" stroke-opacity="0.45"/><text x="2" y="${v-2}" font-size="12" fill="#ff0" font-family="Arial">${y}</text>`}
await sharp(b).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`)}]).png().toFile(out)})()
