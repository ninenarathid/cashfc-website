const sharp=require('sharp');
// ASCII map of the big diamond in (s=x+y, t=x-y): '#' bare floor, 'o' AoE, ' ' outside
(async()=>{
 const [f,cx,cy,d,step]=process.argv.slice(2).map((v,i)=>i?+v:v);
 const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const W=info.width,H=info.height; const st=step||2;
 const s0=cx+cy-d, s1=cx+cy+d, t0=cx-cy-d, t1=cx-cy+d;
 let hdr='      '; for(let s=Math.ceil(s0);s<=s1;s+=st) hdr+=(Math.round(s)%10===0||Math.round(s)%10===1)?'|':' ';
 console.log(hdr+'  (s from '+Math.ceil(s0)+' step '+st+')');
 for(let t=Math.floor(t1);t>=t0;t-=st){
  let line=String(t).padStart(5)+' ';
  for(let s=Math.ceil(s0);s<=s1;s+=st){
   const px=(s+t)/2, py=(s-t)/2; const x=Math.round(px/100*W), y=Math.round(py/100*H);
   if(Math.abs(px-cx)+Math.abs(py-cy)>d-1||x<0||y<0||x>=W||y>=H){line+=' ';continue;}
   const i=(y*W+x)*3,R=data[i],G=data[i+1],B=data[i+2];
   const dark=(R<70&&G<70&&B<70&&Math.abs(R-B)<15);
   const white=(R>200&&G>200&&B>200);
   line+= dark?'#':white?'w':(R-B>60?'o':'?');
  }
  console.log(line);
 }
})();
