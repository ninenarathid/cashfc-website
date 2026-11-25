// crop the cheatsheet's circles into squares with a grid: node cs-crop.cjs src outdir
const sharp=require('sharp');
const [src,out]=process.argv.slice(2);
const P=[["p1",30,175,520],["p2",575,175,520],["p3",1195,180,520],["p4",1735,180,520],["p5",20,840,540],["p6",590,840,540],["p7",1195,840,560],["p8",1740,840,560]];
(async()=>{for(const [n,x,y,s] of P){const N=600;let svg='';for(let p=0;p<=100;p+=5){const v=p/100*N,maj=p%10===0;svg+=`<line x1="${v}" y1="0" x2="${v}" y2="${N}" stroke="#0ff" stroke-opacity="${maj?0.6:0.25}"/><line x1="0" y1="${v}" x2="${N}" y2="${v}" stroke="#0ff" stroke-opacity="${maj?0.6:0.25}"/>`;if(maj)svg+=`<text x="${v+2}" y="12" font-size="11" fill="#0ff">${p}</text><text x="2" y="${v-2}" font-size="11" fill="#0ff">${p}</text>`;}
await sharp(src).extract({left:x,top:y,width:s,height:s}).resize(N,N).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}">${svg}</svg>`)}]).png().toFile(`${out}/${n}.png`);}})();
