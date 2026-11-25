// Final crop -> webp ~1000 wide. usage: node cut.cjs <in.png> <out.webp> l t w h [outW=1000] [q=85]
const sharp=require('sharp');
const [inp,out,l,t,w,h,ow,q]=process.argv.slice(2);
(async()=>{const W=+(ow||1000), H=Math.round(W*h/w);
const info=await sharp(inp).extract({left:+l,top:+t,width:+w,height:+h}).resize(W,H,{kernel:'lanczos3'}).webp({quality:+(q||85)}).toFile(out);
console.log(out, info.width+'x'+info.height, (info.size/1024).toFixed(0)+'KB', 'ratio', (w/h).toFixed(2));})();
