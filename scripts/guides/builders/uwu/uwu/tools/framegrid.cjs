// g4.cjs out.png files... : 2 cols at 960x540 with a 100px grid (labels in full-res px)
const sharp=require("sharp"),path=require("path");const [out,...fs]=process.argv.slice(2);
(async()=>{const comp=[];let g="";for(let x=0;x<=1920;x+=100){g+=`<line x1="${x/2}" y1="0" x2="${x/2}" y2="540" stroke="#0ff" stroke-opacity="${x%500?0.25:0.7}"/>`;if(x%200==0)g+=`<text x="${x/2+2}" y="10" font-size="10" fill="#ff0">${x}</text>`;}
for(let y=0;y<=1080;y+=100){g+=`<line x1="0" y1="${y/2}" x2="960" y2="${y/2}" stroke="#0ff" stroke-opacity="${y%500?0.25:0.7}"/>`;if(y%200==0)g+=`<text x="2" y="${y/2-2}" font-size="10" fill="#ff0">${y}</text>`;}
const G=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">${g}</svg>`);
for(const [i,f] of fs.entries()){const b=await sharp(f).resize(960,540).composite([{input:G}]).toBuffer();const X=(i%2)*964,Y=Math.floor(i/2)*564;
comp.push({input:Buffer.from(`<svg width="960" height="22"><rect width="100%" height="100%" fill="#400"/><text x="4" y="17" fill="#fff" font-size="17" font-family="Arial">${path.basename(f)}</text></svg>`),left:X,top:Y});comp.push({input:b,left:X,top:Y+22});}
await sharp({create:{width:1928,height:Math.ceil(fs.length/2)*564,channels:3,background:"#222"}}).composite(comp).png().toFile(out);console.log(out)})();
