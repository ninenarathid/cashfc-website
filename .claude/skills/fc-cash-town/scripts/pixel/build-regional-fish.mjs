// Native 32px sprites: silhouette, fins, whiskers and markings vary by species.
// Append to the current atlas without resampling any existing sprite.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const root=process.env.FC_REPO??process.cwd(), sharp=createRequire(path.join(root,'package.json'))('sharp');
await import('../db/repo-ts-town.mjs');
const { REGIONAL_SPECIES, REGIONAL_DISHES } = await import('@/lib/town/regional-fish');
const file=path.join(root,'lib/town/icon-atlas.json'),atlas=JSON.parse(fs.readFileSync(file,'utf8'));
const palettes=[['#8eaf77','#d5e6ae','#537249'],['#c89453','#f7d49a','#8c5c35'],['#839dac','#dce8e6','#4c6779'],['#ad747f','#e7b9b4','#714450'],['#64a8a0','#bbe3c9','#356a67'],['#8373a6','#cbbce7','#534e75']];
function canvas(){
 const pixels=Buffer.alloc(32*32*4),ink='#292a36';
 const dot=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=32||y>=32)return;const p=(y*32+x)*4;pixels[p]=parseInt(c.slice(1,3),16);pixels[p+1]=parseInt(c.slice(3,5),16);pixels[p+2]=parseInt(c.slice(5,7),16);pixels[p+3]=255;};
 const line=(x,y,u,v,c)=>{const n=Math.max(Math.abs(u-x),Math.abs(v-y));for(let i=0;i<=n;i++)dot(x+(u-x)*i/(n||1),y+(v-y)*i/(n||1),c);};
 const poly=(points,c,edge=true)=>{for(let y=0;y<32;y++)for(let x=0;x<32;x++){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[u,v]=points[j];if((b>y)!==(v>y)&&x<(u-a)*(y-b)/(v-b)+a)inside=!inside;}if(inside)dot(x,y,c);}if(edge)points.forEach(([x,y],i)=>line(x,y,...points[(i+1)%points.length],ink));};
 return {pixels,dot,line,poly,ink};
}
const profiles=[[[7,14],[12,10],[22,12],[26,16],[21,21],[11,20]],[[6,13],[13,9],[23,11],[27,16],[21,21],[10,22]],[[5,16],[9,12],[22,13],[27,17],[21,20],[8,20]],[[7,15],[16,7],[24,13],[26,17],[17,24],[9,21]],[[6,12],[16,11],[23,14],[26,18],[20,22],[7,21]],[[6,15],[12,9],[20,8],[25,14],[25,20],[16,25],[8,22]],[[6,13],[15,9],[24,13],[27,19],[21,23],[7,21]],[[3,16],[9,13],[24,12],[28,15],[24,19],[8,20]],[[3,15],[8,11],[15,13],[20,20],[25,21],[29,17],[28,23],[22,25],[15,20],[8,19]]];
function fishSprite(shape,index,region){
 const c=canvas(),[body,light,shade]=palettes[(index+region*2)%palettes.length],offset=index%3-1;
 const points=profiles[shape].map(([x,y])=>[x,y+(x>12&&x<24?offset:0)]);
 if(shape!==8)c.poly([[23,15],[30,10+(index%2)],[28,17],[31,24-(index%3)],[23,20]],shade);
 const tall=shape===1||shape===3||shape===5||shape===6;
 c.poly([[12,13],[13, tall?3+index%4:7+index%3],[19,6+index%4],[23,14]],shade);
 c.poly([[12,20],[18,27-index%3],[21,21]],shade);
 c.poly(points,body);
 c.line(10,14,21,13+offset,light);c.line(10,20,21,21+offset,shade);
 if(index%4===0){for(let x=12;x<24;x+=3)c.line(x,14,x-2,20,shade);}
 if(index%4===1){for(let x=12;x<23;x+=3){c.dot(x,15+(x%2),shade);c.dot(x+1,19,light);}}
 if(index%4===2)c.line(11,17,24,17+offset,shade);
 if(index%4===3){for(let x=12;x<23;x+=3)c.line(x,16,x+1,18,light);}
 c.poly([[11,18],[16,16],[15,21]],shade);
 c.dot(shape===4?8:9,15,light);c.dot(shape===4?8:9,16,c.ink);c.line(5,18,8,18,c.ink);
 if(shape===2||shape===6){c.line(5,18,2,22,light);c.line(6,19,5,24,shade);}
 if(shape===7){c.line(2,16,7,16,light);if(index>12)for(let x=11;x<26;x+=4)c.poly([[x,13],[x+1,9],[x+3,13]],light);}
 if(shape===3&&region===2){c.line(13,21,11,28,light);c.line(16,22,16,29,shade);}
 if(shape===8)c.line(9,14,25,22,light);
 return c.pixels;
}
function mealSprite(index,pot=false){
 const c=canvas(),[body,light,shade]=palettes[index%palettes.length];
 if(pot){c.poly([[5,15],[3,13],[1,14],[1,19],[5,20]],'#685244');c.poly([[26,15],[29,13],[31,15],[30,20],[26,20]],'#685244');}
 c.poly([[4,16],[7,12],[25,12],[28,16],[25,26],[10,28],[6,24]],pot?'#916844':'#c29267');
 c.poly([[5,15],[11,11],[22,11],[28,16],[23,21],[10,21]],'#e4c592');
 c.poly([[7,16],[12,13],[23,14],[25,17],[21,20],[10,19]],index%3===0?'#dec39c':index%3===1?'#b98048':'#e2dcc1');
 for(let j=0;j<3;j++){const x=9+j*5,y=14+(j+index)%3;c.poly([[x,y],[x+4,y-1],[x+5,y+2],[x+1,y+3]],j===1?body:light);c.line(x+1,y+1,x+3,y+1,shade);}
 for(let j=0;j<3;j++){const x=9+(j*7+index)%15,y=14+(j+index)%5;c.line(x,y,x+2,y-2,'#557b44');c.dot(x+1,y-1,'#91af68');}
 if(index%3===0)c.line(13,14,18,18,'#faf0d3');
 if(index%3===1){c.dot(10,17,'#e68e45');c.dot(21,17,'#e68e45');}
 if(index%3===2){c.line(11,15,12,18,'#765342');c.line(21,14,22,17,'#765342');}
 c.line(10,23,22,24,'#a37a53');c.line(7,22,8,25,'#f1d3a0');
 if(pot){c.line(12,9,11,6,'#a8b8a7');c.line(21,8,20,4,'#cbd4ba');}
 return c.pixels;
}
const sprites=[];
for(const [region,rows] of Object.values(REGIONAL_SPECIES).entries())for(const [index,row]of rows.entries())sprites.push({name:row[0],pixels:fishSprite(row[3],index,region)});
for(const [index,id]of Object.keys(REGIONAL_DISHES).entries()){sprites.push({name:id,pixels:mealSprite(index)});sprites.push({name:'pot'+id[0].toUpperCase()+id.slice(1),pixels:mealSprite(index,true)});}
const cols=Math.floor(atlas.size[0]/36),fresh=sprites.filter(s=>!Object.hasOwn(atlas.icons,s.name)),y0=atlas.size[1];
fresh.forEach((s,i)=>atlas.icons[s.name]=[i%cols*36+2,y0+Math.floor(i/cols)*36+2,32,32]);
atlas.size[1]+=Math.ceil(fresh.length/cols)*36;
const overlays=[{input:path.join(root,'public',atlas.image.replace(/^\//,'')),left:0,top:0}];
for(const s of sprites){const input=await sharp(s.pixels,{raw:{width:32,height:32,channels:4}}).png().toBuffer(),[left,top]=atlas.icons[s.name];overlays.push({input,left,top});s.input=input;}
const png=await sharp({create:{width:atlas.size[0],height:atlas.size[1],channels:4,background:'#00000000'}}).composite(overlays).png().toBuffer();
const name='icons-'+crypto.createHash('sha256').update(png).digest('hex').slice(0,12)+'.png';
fs.writeFileSync(path.join(root,'public/town',name),png);atlas.image='/town/'+name;fs.writeFileSync(file,JSON.stringify(atlas,null,2)+'\n');
const contact=await sharp({create:{width:12*48,height:Math.ceil(sprites.length/12)*48,channels:4,background:'#253c3b'}}).composite(sprites.map((s,i)=>({input:s.input,left:i%12*48+8,top:Math.floor(i/12)*48+8}))).png().toBuffer();
fs.mkdirSync(path.join(root,'.codex/adventure-qa'),{recursive:true});fs.writeFileSync(path.join(root,'.codex/adventure-qa/regional-fish-sprites.png'),contact);
console.log(JSON.stringify({sprites:sprites.length,new:fresh.length,atlas:name,bytes:png.length}));
