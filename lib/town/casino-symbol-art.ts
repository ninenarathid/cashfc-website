import type {SymbolId} from '@/lib/casino';
const patterns:Record<SymbolId,string[]>={
  seven:['................','................','..ooooooooooo...','..orrrrrrrrro...','..orrhhhhrrro...','.......ohrrro...','......ohrrro....','.....ohrrro.....','.....orrrro.....','....ohrrro......','....orrrro......','...ohrrro.......','...orrrro.......','...oooooo.......','................','................'],
  cherry:['................','.......gg.......','.....glgg.......','....ggg.g.......','....g...g.......','...g.....g......','..ooo....ooo....','.orrro..orrrro..','orhrrroorhrrrro.','orrhrrrorrhrrro.','orrrrrrorrsrrro.','.orrssroorrsro..','..oooo..oooo....','................','................','................'],
  gold:['................','................','.......oooo.....','......ohhhho....','.....ohhhhhho...','....ohhhhhhho...','...ohhhhhhhhho..','..ohhhhhhhhhho..','.oggggggggggggo.','.oggggggggggggo.','.osssssssssssso.','..oooooooooooo..','................','................','................','................'],
  popoto:['.......gg.......','.....glggg......','......ggg.......','.......g........','.....oooo.......','...oohhhhoo.....','..ohhhhhhhho....','.ohhhhhhhhhho...','.ohhshhhshhho...','.ohhshhhshhho...','.ohhhhhhhhhho...','..ohhhhshhho....','...ohhhhhoo.....','....ooooo.......','................','................'],
};
const palette:Record<SymbolId,Record<string,string>>={seven:{o:'#6c2534',r:'#b83b4c',h:'#ec826f'},cherry:{o:'#663040',r:'#ba3b52',h:'#f59885',s:'#892e43',g:'#48633b',l:'#8db366'},gold:{o:'#70512f',h:'#f2d58a',g:'#d6a452',s:'#a47838'},popoto:{o:'#7b5034',h:'#dab074',s:'#54362d',g:'#4b773c',l:'#91b35c'}};
const mini:Record<SymbolId,string[]>={seven:['........','.orrrro.','.ohhrro.','....ro..','...ro...','..ro....','..ro....','........'],cherry:['...gg...','..g..g..','.oo..oo.','orhoorho','orrroorr','.oro.oro','........','........'],gold:['........','...ooo..','..ohhho.','.ohhhhho','oggggggo','.ossso..','..ooo...','........'],popoto:['...gg...','...g....','..oooo..','.ohhhho.','ohshshho','ohhhhhho','.ohhho..','..ooo...']};
/** Shared native pixels: the cabinet and the UI show the same reel symbols. */
export function drawCasinoSymbol(ctx:CanvasRenderingContext2D,id:SymbolId,x:number,y:number,size:number){
  if(size<16){const step=size/8;for(let row=0;row<8;row++)for(let col=0;col<8;col++){const color=palette[id][mini[id][row][col]];if(color){ctx.fillStyle=color;ctx.fillRect(x+(col-4)*step,y+(row-4)*step,step,step);}}return;}
  const step=size/16;for(let row=0;row<16;row++)for(let col=0;col<16;col++){
    const color=palette[id][patterns[id][row]?.[col]];if(!color)continue;
    ctx.fillStyle=color;ctx.fillRect(x+(col-8)*step,y+(row-8)*step,step,step);
  }
}
