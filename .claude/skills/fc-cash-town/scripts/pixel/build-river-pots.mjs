import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const root=process.env.FC_REPO ?? process.cwd();
const sharp=createRequire(path.join(root,'package.json'))('sharp');
const input=path.join(root,'.claude/skills/fc-cash-town/scripts/pixel/work/out/icons-river-pots.png');
const json=path.join(root,'lib/town/icon-atlas.json');
const atlas=JSON.parse(fs.readFileSync(json,'utf8'));
const names=['potCreekBroth','potSmokedBrookBowl','potTorrentSkewer','potSpringDumpling'];
if(names.some(n=>Object.hasOwn(atlas.icons,n)))throw new Error('River pots already packed.');
const {width,height}=await sharp(input).metadata();
const sprites=[];
for(let i=0;i<names.length;i++){
 const left=Math.floor(i*width/4);
 const cell=await sharp(input).extract({left,top:0,width:Math.floor((i+1)*width/4)-left,height}).png().toBuffer();
 const sprite=await sharp(cell).trim().resize({width:32,height:32,fit:'inside',kernel:'nearest'}).png().toBuffer();
 const meta=await sharp(sprite).metadata();
 sprites.push({name:names[i],input:sprite,width:meta.width,height:meta.height});
}
const overlays=[{input:path.join(root,'public',atlas.image.replace(/^\//,'')),left:0,top:0}], y0=atlas.size[1];
sprites.forEach((s,i)=>{const left=i*36+2,top=y0+2;atlas.icons[s.name]=[left,top,s.width,s.height];overlays.push({input:s.input,left,top});});
atlas.size[1]+=36;
const png=await sharp({create:{width:atlas.size[0],height:atlas.size[1],channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(overlays).png().toBuffer();
const file=`icons-${crypto.createHash('sha256').update(png).digest('hex').slice(0,12)}.png`;
fs.writeFileSync(path.join(root,'public/town',file),png);atlas.image=`/town/${file}`;
fs.writeFileSync(json,JSON.stringify(atlas,null,2)+'\n');
console.log(`Packed ${names.length} river pots; ${png.length} bytes.`);
