// ASCII map of the frame: w white, l light orange (1 layer on white), O dark orange (2 layers on white), d dark floor, b brown (orange on floor), g green
const sharp=require('sharp');
(async()=>{
 const [f,stepS]=process.argv.slice(2); const st=+(stepS||2.5);
 const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const W=info.width,H=info.height;
 let hdr='     '; for(let x=0;x<=100;x+=st) hdr+=(Math.round(x)%10===0)?'|':' '; console.log(hdr);
 for(let y=0;y<=100;y+=st){let line=String(y).padStart(4)+' ';
  for(let x=0;x<=100;x+=st){const X=Math.min(W-1,Math.round(x/100*W)),Y=Math.min(H-1,Math.round(y/100*H));const i=(Y*W+X)*3;const R=data[i],G=data[i+1],B=data[i+2];
   let c='?'; if(R>235&&G>235&&B>235)c='w'; else if(R>230&&G>185&&B>110)c='l'; else if(R>220&&G>150&&B<90)c='O'; else if(R<70&&G<70&&B<70)c='d'; else if(G>R+10)c='g'; else if(R>100&&R-B>40)c='b';
   line+=c;}
  console.log(line);}
})();
