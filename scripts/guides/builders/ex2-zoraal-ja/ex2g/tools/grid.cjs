// Grid of images, each fit into a tile, labelled. usage: node grid.cjs out.png cols tileW tileH f1 f2 ...
const sharp=require('sharp');
const [out,colsA,wA,hA,...fs]=process.argv.slice(2); const cols=+colsA,W=+wA,H=+hA,T=18,P=3;
(async()=>{const comp=[];for(const [i,f] of fs.entries()){const x=(i%cols)*(W+P),y=Math.floor(i/cols)*(H+T+P);
comp.push({input:Buffer.from(`<svg width="${W}" height="${T}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="14" fill="#ffd23f" font-size="13" font-family="Arial">${f.split(/[\/]/).pop()}</text></svg>`),left:x,top:y});
comp.push({input:await sharp(f).resize(W,H,{fit:'contain',background:'#222'}).toBuffer(),left:x,top:y+T});}
const rows=Math.ceil(fs.length/cols);await sharp({create:{width:cols*(W+P),height:rows*(H+T+P),channels:3,background:'#222'}}).composite(comp).png().toFile(out);console.log(out);})();
