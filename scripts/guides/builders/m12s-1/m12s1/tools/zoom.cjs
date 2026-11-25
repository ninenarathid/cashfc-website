// usage: node zoom.cjs out.png img [sat]: one picture at 1320 wide with a 5% grid
const sharp=require("sharp");
const [out,f,sat="1.6"]=process.argv.slice(2);
(async()=>{const m=await sharp(f).metadata();const W=1320,H=Math.round(W*m.height/m.width);
const b=await sharp(f).resize(W,H).modulate({saturation:+sat}).png().toBuffer();
let svg="";for(let p=0;p<=100;p+=5){const vx=p/100*W,vy=p/100*H;svg+=`<line x1="${vx}" y1="0" x2="${vx}" y2="${H}" stroke="#0ff" stroke-opacity="${p%10?0.3:0.7}"/><line x1="0" y1="${vy}" x2="${W}" y2="${vy}" stroke="#0ff" stroke-opacity="${p%10?0.3:0.7}"/>`;if(p%10==0)svg+=`<text x="${vx+2}" y="14" fill="#ff0" font-size="14">${p}</text><text x="2" y="${vy-2}" fill="#ff0" font-size="14">${p}</text>`}
await sharp(b).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`)}]).png().toFile(out)})()
