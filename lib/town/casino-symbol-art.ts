import type {SymbolId} from '@/lib/casino';
import REELS from './casino-reels.json';
const patterns:Partial<Record<SymbolId,string[]>>={
  seven:['................','................','..ooooooooooo...','..orrrrrrrrro...','..orrhhhhrrro...','.......ohrrro...','......ohrrro....','.....ohrrro.....','.....orrrro.....','....ohrrro......','....orrrro......','...ohrrro.......','...orrrro.......','...oooooo.......','................','................'],
  cherry:['................','.......gg.......','.....glgg.......','....ggg.g.......','....g...g.......','...g.....g......','..ooo....ooo....','.orrro..orrrro..','orhrrroorhrrrro.','orrhrrrorrhrrro.','orrrrrrorrsrrro.','.orrssroorrsro..','..oooo..oooo....','................','................','................'],
  gold:['................','................','.......oooo.....','......ohhhho....','.....ohhhhhho...','....ohhhhhhho...','...ohhhhhhhhho..','..ohhhhhhhhhho..','.oggggggggggggo.','.oggggggggggggo.','.osssssssssssso.','..oooooooooooo..','................','................','................','................'],
  popoto:['.......gg.......','.....glggg......','......ggg.......','.......g........','.....oooo.......','...oohhhhoo.....','..ohhhhhhhho....','.ohhhhhhhhhho...','.ohhshhhshhho...','.ohhshhhshhho...','.ohhhhhhhhhho...','..ohhhhshhho....','...ohhhhhoo.....','....ooooo.......','................','................'],
};
const palette:Partial<Record<SymbolId,Record<string,string>>>={seven:{o:'#6c2534',r:'#b83b4c',h:'#ec826f'},cherry:{o:'#663040',r:'#ba3b52',h:'#f59885',s:'#892e43',g:'#48633b',l:'#8db366'},gold:{o:'#70512f',h:'#f2d58a',g:'#d6a452',s:'#a47838'},popoto:{o:'#7b5034',h:'#dab074',s:'#54362d',g:'#4b773c',l:'#91b35c'}};
const mini:Partial<Record<SymbolId,string[]>>={seven:['........','.orrrro.','.ohhrro.','....ro..','...ro...','..ro....','..ro....','........'],cherry:['...gg...','..g..g..','.oo..oo.','orhoorho','orrroorr','.oro.oro','........','........'],gold:['........','...ooo..','..ohhho.','.ohhhhho','oggggggo','.ossso..','..ooo...','........'],popoto:['...gg...','...g....','..oooo..','.ohhhho.','ohshshho','ohhhhhho','.ohhho..','..ooo...']};
/**
 * A symbol drawn through the town's pipeline (gen.mjs, cut by build-icons.mjs into the casino's own small picture,
 * lib/town/casino-reels.json and public/town/casino): the evercold's, which came after the four above (a cluster of ice
 * crystals with the gold star of a rare thing). Drawn at the size asked, its pixels hard.
 */
const DRAWN:Partial<Record<SymbolId,string>>={evercold:'reelEvercoldB'};
const ICONS=REELS as unknown as {image:string;icons:Record<string,[number,number,number,number]>};
let sheet:HTMLImageElement|null=null;
/** The casino's own picture, asked for once: resolves when it has come (a drawing made before then is made again by its caller). */
export function casinoSymbolsReady():Promise<void>{
  if(typeof Image==='undefined')return Promise.resolve();
  if(!sheet){sheet=new Image();sheet.src=`/town/casino/${ICONS.image.split('/').pop()}`;}
  const img=sheet;
  return img.complete&&img.naturalWidth?Promise.resolve():new Promise(done=>{img.addEventListener('load',()=>done(),{once:true});img.addEventListener('error',()=>done(),{once:true});});
}
function drawnSymbol(ctx:CanvasRenderingContext2D,name:string,x:number,y:number,size:number){
  const cell=ICONS.icons[name];if(!cell||typeof Image==='undefined')return;
  if(!sheet){sheet=new Image();sheet.src=`/town/casino/${ICONS.image.split('/').pop()}`;}
  if(!sheet.complete||!sheet.naturalWidth)return;
  const [sx,sy,w,h]=cell,k=size/Math.max(w,h);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,sx,sy,w,h,x-w*k/2,y-h*k/2,w*k,h*k);ctx.restore();
}
/** Shared native pixels: the cabinet and the UI show the same reel symbols. */
export function drawCasinoSymbol(ctx:CanvasRenderingContext2D,id:SymbolId,x:number,y:number,size:number){
  const pal=palette[id],big=patterns[id],small=mini[id];
  if(!pal||!big||!small){const name=DRAWN[id];if(name)drawnSymbol(ctx,name,x,y,size);return;}
  if(size<16){const step=size/8;for(let row=0;row<8;row++)for(let col=0;col<8;col++){const color=pal[small[row][col]];if(color){ctx.fillStyle=color;ctx.fillRect(x+(col-4)*step,y+(row-4)*step,step,step);}}return;}
  const step=size/16;for(let row=0;row<16;row++)for(let col=0;col<16;col++){
    const color=pal[big[row]?.[col]];if(!color)continue;
    ctx.fillStyle=color;ctx.fillRect(x+(col-8)*step,y+(row-8)*step,step,step);
  }
}
