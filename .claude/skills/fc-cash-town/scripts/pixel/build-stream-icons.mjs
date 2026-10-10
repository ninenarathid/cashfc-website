import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root=process.env.FC_REPO??process.cwd(),sharp=createRequire(path.join(root,'package.json'))('sharp');
const file=path.join(root,'lib/town/icon-atlas.json'),atlas=JSON.parse(fs.readFileSync(file,'utf8'));
const names=['springSample','rushingSample','riverGrit','mineralSand','mossFilter','wetClay','reedPith','waterMint','clearSpring','herbalWater','mineralWater','dawnBlend','rainBlend','moonBlend','springSalt','waterSampler','sluiceKey','filterFrame','mixingJug','sealedFlask','flowGauge','springRice','mintBroth','mineralCongee','moonTeaRice','buffWaterProperty','potSpringRice','potMintBroth','potMineralCongee','potMoonTeaRice','scrollSpringRice','scrollMintBroth','scrollMineralCongee','scrollMoonTeaRice','streamGate','streamFork'];
if(names.some(n=>Object.hasOwn(atlas.icons,n)))throw new Error('Stream sprites already packed');
const input=path.join(root,'.claude/skills/fc-cash-town/scripts/pixel/work/out/icons-stream-expanded.png'),{width,height}=await sharp(input).metadata();
const step=36,cols=Math.floor(atlas.size[0]/step),y0=atlas.size[1],overlays=[{input:path.join(root,'public',atlas.image.replace(/^\//,'')),left:0,top:0}];
for(let i=0;i<names.length;i++){
 const x=i%6,y=Math.floor(i/6),left=Math.floor(x*width/6),top=Math.floor(y*height/6);
 const cell=await sharp(input).extract({left,top,width:Math.floor((x+1)*width/6)-left,height:Math.floor((y+1)*height/6)-top}).png().toBuffer();
 const sprite=await sharp(cell).trim().resize({width:32,height:32,fit:'inside',kernel:'nearest'}).png().toBuffer(),m=await sharp(sprite).metadata();
 const ax=i%cols*step+2,ay=y0+Math.floor(i/cols)*step+2;atlas.icons[names[i]]=[ax,ay,m.width,m.height];overlays.push({input:sprite,left:ax,top:ay});
}
atlas.size[1]+=Math.ceil(names.length/cols)*step;
const png=await sharp({create:{width:atlas.size[0],height:atlas.size[1],channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(overlays).png().toBuffer();
const name=`icons-${crypto.createHash('sha256').update(png).digest('hex').slice(0,12)}.png`;
fs.writeFileSync(path.join(root,'public/town',name),png);atlas.image='/town/'+name;fs.writeFileSync(file,JSON.stringify(atlas,null,2)+'\n');
console.log('Packed 36 stream sprites: '+name);
