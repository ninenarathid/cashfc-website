// usage: node pair.cjs out.png a.png b.png [c.png d.png]  -> side by side at native size (600)
const sharp=require('sharp');
(async()=>{const [out,...fs]=process.argv.slice(2);const cols=Math.min(2,fs.length);const S=600;const rows=Math.ceil(fs.length/cols);
const comps=[];for(const [i,f] of fs.entries()){comps.push({input:await sharp(f).resize(S,S).png().toBuffer(),left:(i%cols)*(S+6),top:Math.floor(i/cols)*(S+6)});}
await sharp({create:{width:cols*(S+6),height:rows*(S+6),channels:3,background:'#000'}}).composite(comps).png().toFile(out);})();
