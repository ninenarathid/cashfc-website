const sharp=require('sharp');
// usage: node montage.cjs out.png cols file1 file2 ...
(async()=>{
 const [out,colsS,...files]=process.argv.slice(2); const cols=+colsS; const C=440;
 const rows=Math.ceil(files.length/cols); const comps=[]; let svg='';
 for (const [i,f] of files.entries()){ const x=(i%cols)*(C+10), y=Math.floor(i/cols)*(C+30);
  comps.push({input: await sharp(f).resize(C,C,{fit:'contain',background:'#222'}).png().toBuffer(), left:x, top:y+24});
  svg+=`<text x="${x+4}" y="${y+18}" font-family="Arial" font-size="16" fill="#ff0">${f.split(/[\/]/).pop()}</text>`; }
 const W=cols*(C+10), H=rows*(C+30);
 await sharp({create:{width:W,height:H,channels:3,background:'#000'}}).composite([...comps,{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`),left:0,top:0}]).png().toFile(out);
})();
