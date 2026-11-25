// Tile the game area (y135-945) of several full frames, 2 per row at 960x405, labelled.
// usage: node tilegame.cjs out.png f1 f2 ...
const sharp=require('sharp');
const [out,...fs]=process.argv.slice(2);const W=960,H=405,T=18;
(async()=>{const comp=[];for(const [i,f] of fs.entries()){const x=(i%2)*W,y=Math.floor(i/2)*(H+T);
comp.push({input:Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="14" fill="#ffd23f" font-size="14" font-family="Arial">${f.split(/[\/]/).pop()}</text></svg>`),left:x,top:y});
comp.push({input:await sharp(f).extract({left:0,top:135,width:1920,height:810}).resize(W,H).toBuffer(),left:x,top:y+T});}
await sharp({create:{width:2*W,height:Math.ceil(fs.length/2)*(H+T),channels:3,background:'#000'}}).composite(comp).png().toFile(out);console.log(out);})();
