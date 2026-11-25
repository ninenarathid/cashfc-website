// Zoom a region of an image. usage: node zoom.cjs <img> <out.png> x y w h [scale=2]
const sharp=require('sharp');
const [i,o,x,y,w,h,s]=process.argv.slice(2);const S=+(s||2);
sharp(i).extract({left:+x,top:+y,width:+w,height:+h}).resize(Math.round(w*S),Math.round(h*S),{kernel:'lanczos3'}).png().toFile(o).then(()=>console.log(o));
