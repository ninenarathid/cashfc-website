import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const root=process.env.FC_REPO ?? process.cwd();
const sharp=createRequire(path.join(root,'package.json'))('sharp');
const input=path.join(root,'.claude/skills/fc-cash-town/scripts/pixel/work/out/icons-wood.png');
const json=path.join(root,'lib/town/icon-atlas.json');
const atlas=JSON.parse(fs.readFileSync(json,'utf8'));
const names=['knottedWood','straightWood','heartwood','pineBark','pinePitch','pineNut','rootFiber','cedarSliver','splitPlank','carvingBlank','pitchSeal','sapSyrup','pineNutFlour','rootTwine','woodOil','notchGauge','grainLens','fellingWedge','barkKnife','sapTap','braceStake','pineNutRice','cedarBroth','pineNutCake','sapGlazedFish','buffGrain','potPineNutRice','potCedarBroth','potPineNutCake','potSapGlazedFish'];
if(names.some(n=>Object.hasOwn(atlas.icons,n)))throw new Error('Wood icons already packed; build from the atlas preceding this expansion.');
const {width,height}=await sharp(input).metadata();
const sprites=[];
for(let i=0;i<names.length;i++){
 const left=Math.floor((i%6)*width/6),top=Math.floor(Math.floor(i/6)*height/5);
 const cell=await sharp(input).extract({left,top,width:Math.floor((i%6+1)*width/6)-left,height:Math.floor((Math.floor(i/6)+1)*height/5)-top}).png().toBuffer();
 const sprite=await sharp(cell).trim().resize({width:32,height:32,fit:'inside',kernel:'nearest'}).png().toBuffer();
 const meta=await sharp(sprite).metadata();
 sprites.push({name:names[i],input:sprite,width:meta.width,height:meta.height});
}
const cols=Math.floor(atlas.size[0]/36),rows=Math.ceil(names.length/cols),y0=atlas.size[1];
const overlays=[{input:path.join(root,'public',atlas.image.replace(/^\//,'')),left:0,top:0}];
sprites.forEach((s,i)=>{const left=(i%cols)*36+2,top=y0+Math.floor(i/cols)*36+2;atlas.icons[s.name]=[left,top,s.width,s.height];overlays.push({input:s.input,left,top});});
atlas.size[1]+=rows*36;
const png=await sharp({create:{width:atlas.size[0],height:atlas.size[1],channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(overlays).png().toBuffer();
const file=`icons-${crypto.createHash('sha256').update(png).digest('hex').slice(0,12)}.png`;
fs.writeFileSync(path.join(root,'public/town',file),png);atlas.image=`/town/${file}`;
fs.writeFileSync(json,JSON.stringify(atlas,null,2)+'\n');
console.log(`Packed ${names.length} wood sprites; ${png.length} bytes.`);
