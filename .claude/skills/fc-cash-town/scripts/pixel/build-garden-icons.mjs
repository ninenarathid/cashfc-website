import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root=process.env.FC_REPO??process.cwd(),sharp=createRequire(path.join(root,'package.json'))('sharp');
const dir=path.join(root,'.claude/skills/fc-cash-town/scripts/pixel/work/out'),file=path.join(root,'lib/town/icon-atlas.json');
const atlas=JSON.parse(fs.readFileSync(file,'utf8'));
const crops=['BottleGourd','RowBean','TrellisBerry','BlueCorn','TeaBush','SunflowerPatch','RedOkra','LotusRootBed'];
const groups=[{input:'icons-garden.png',cols:6,rows:7,size:32,names:['bottleGourd','rowBean','trellisBerry','blueCorn','teaBush','sunflowerPatch','redOkra','lotusRootBed','gourdCup','beanPaste','berryJam','blueCornFlour','driedTea','sunflowerOil','lotusStarch','pollenBrush','graftKnife','rootGuide','soilScoop','seedTray','gardenTwine','pollenRice','berryTea','blueCornCake','lotusGardenSoup','buffPollen','potPollenRice','potBerryTea','potBlueCornCake','potLotusGardenSoup',...crops.map(c=>'seed'+c),'gardenTrellisMarker','gardenPollenMark','gardenWaterMark','gardenNotebook']},{input:'grow-garden.png',cols:8,rows:2,size:64,names:['A','B'].flatMap(s=>crops.map(c=>'grow'+c+s))}];
if(groups.flatMap(g=>g.names).some(n=>Object.hasOwn(atlas.icons,n)))throw new Error('Garden icons already packed.');
const overlays=[{input:path.join(root,'public',atlas.image.replace(/^\//,'')),left:0,top:0}];
for(const group of groups){
 const input=path.join(dir,group.input),{width,height}=await sharp(input).metadata(),step=group.size+4,cols=Math.floor(atlas.size[0]/step),y0=atlas.size[1];
 for(let i=0;i<group.names.length;i++){
  const x=i%group.cols,y=Math.floor(i/group.cols),left=Math.floor(x*width/group.cols),top=Math.floor(y*height/group.rows);
  const cell=await sharp(input).extract({left,top,width:Math.floor((x+1)*width/group.cols)-left,height:Math.floor((y+1)*height/group.rows)-top}).png().toBuffer();
  const sprite=await sharp(cell).trim().resize({width:group.size,height:group.size,fit:'inside',kernel:'nearest'}).png().toBuffer(),m=await sharp(sprite).metadata();
  const ax=(i%cols)*step+2,ay=y0+Math.floor(i/cols)*step+2;atlas.icons[group.names[i]]=[ax,ay,m.width,m.height];overlays.push({input:sprite,left:ax,top:ay});
 }
 atlas.size[1]+=Math.ceil(group.names.length/cols)*step;
}
const png=await sharp({create:{width:atlas.size[0],height:atlas.size[1],channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(overlays).png().toBuffer();
const name=`icons-${crypto.createHash('sha256').update(png).digest('hex').slice(0,12)}.png`;
fs.writeFileSync(path.join(root,'public/town',name),png);atlas.image='/town/'+name;fs.writeFileSync(file,JSON.stringify(atlas,null,2)+'\n');
console.log(`Packed 42 garden items and 16 growth sprites: ${name}`);
