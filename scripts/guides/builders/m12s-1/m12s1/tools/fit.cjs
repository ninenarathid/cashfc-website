// usage: node fit.cjs img out.png "cx,cy,r;cx,cy,r" -> picture at 1100 wide with candidate circles (cy in % height, r in % width) in cyan
const sharp=require("sharp");
const [f,out,spec]=process.argv.slice(2);
(async()=>{const m=await sharp(f).metadata();const W=1100,H=Math.round(W*m.height/m.width);
const b=await sharp(f).resize(W,H).png().toBuffer();
let svg="";for(let p=0;p<=100;p+=10){svg+=`<line x1="${p/100*W}" y1="0" x2="${p/100*W}" y2="${H}" stroke="#fff" stroke-opacity="0.25"/><line x1="0" y1="${p/100*H}" x2="${W}" y2="${p/100*H}" stroke="#fff" stroke-opacity="0.25"/>`}
spec.split(";").filter(Boolean).forEach((c,i)=>{const [x,y,r]=c.split(",").map(Number);svg+=`<circle cx="${x/100*W}" cy="${y/100*H}" r="${r/100*W}" fill="none" stroke="${["#0ff","#f0f","#0f0","#00f","#f00","#fff","#000"][i%7]}" stroke-width="2.5"/><circle cx="${x/100*W}" cy="${y/100*H}" r="4" fill="#0ff"/>`});
await sharp(b).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`)}]).png().toFile(out)})()
