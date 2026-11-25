// Tile 4 full frames (game area y135-945) 2x2 for comparing. usage: node tile4.cjs out.png f1 f2 f3 f4
const sharp=require('sharp');
const [out,...fs]=process.argv.slice(2);
(async()=>{const tiles=await Promise.all(fs.map(f=>sharp(f).extract({left:0,top:135,width:1920,height:810}).resize(960,405).toBuffer()));
await sharp({create:{width:1920,height:810,channels:3,background:'#000'}}).composite(tiles.map((b,i)=>({input:b,left:(i%2)*960,top:Math.floor(i/2)*405}))).png().toFile(out);})();
