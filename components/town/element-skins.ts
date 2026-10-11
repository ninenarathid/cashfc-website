import nativeArt from "@/lib/town/relic-native-art.json";
import { ELEMENTS, GEMS, type Element, type ToolLook } from "@/lib/town/tools";
import type { Vec } from "@/lib/town/world";
import { HELD_ART, drawIconRim, drawLongTool, handOf, handSize, heldPicture, isLongTool, longHead, rimFor } from "./held";
import { ICON_ATLAS, drawIcon, type IconName } from "./TownIcon";

type Skin = { image: HTMLCanvasElement; cell: readonly number[]; hue: string; accent?: string; stage: number };
let icons: HTMLImageElement | null = null;
const appearances = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();
const previews = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

const RELIC_ART=nativeArt as {cell:number;elements:Element[];tools:Record<string,string>;twins?:Record<string,string>;pickHeads:number[][];pickTwinHeads:number[][];rodUpright?:string;rodTwin?:string;rodWidth:number;rodHeight:number;rodGrip:number[]};
export const ROD_ART_GRIP=RELIC_ART.rodGrip;
const relicImages=new Map<string,HTMLImageElement>();
const rodMaterials=new Map<string,HTMLCanvasElement>();
const nativeCells=new Map<string,string>();
for(const [tool,cell] of Object.entries(HELD_ART.tools))nativeCells.set('held:'+cell.slice(0,4).join(','),tool);
for(const [tool,cell] of Object.entries(HELD_ART.fine??{}))nativeCells.set('held:'+cell.slice(0,4).join(','),tool);
for(const tool of Object.keys(RELIC_ART.tools)){
  const cell=ICON_ATLAS.icons[tool as IconName];if(cell)nativeCells.set('icon:'+cell.slice(0,4).join(','),tool);
}
const wetCan=ICON_ATLAS.icons['canFull' as IconName];
if(wetCan)nativeCells.set('icon:'+wetCan.slice(0,4).join(','),'can');
function relicImage(src:string|undefined):HTMLImageElement|null {
  if(!src||typeof Image==='undefined')return null;
  let img=relicImages.get(src);if(!img){img=new Image();img.src=src;relicImages.set(src,img);}
  return img.complete&&img.naturalWidth?img:null;
}
function twinSocket(look:ToolLook|null):boolean {
  return !!look&&look.gems.length>=2&&look.gems[0]===look.gems[1];
}
/** Complete detailed rod; cached once per element combination and facing. */
export function rodElementMaterial(look:ToolLook|null,side:1|-1=1):HTMLCanvasElement|null {
  const active=look?skinElements(look):[],twin=twinSocket(look);
  const img=active.length?relicImage(twin?RELIC_ART.rodTwin:RELIC_ART.rodUpright):null;
  if(!img)return null;
  const key=active.map(e=>e.element).join(':')+':'+twin+':'+side;const cached=rodMaterials.get(key);if(cached)return cached;
  const w=RELIC_ART.rodWidth,h=RELIC_ART.rodHeight;
  const image=document.createElement('canvas');image.width=w;image.height=h;
  const c=image.getContext('2d')!;c.imageSmoothingEnabled=false;
  if(side===-1){c.translate(w,0);c.scale(-1,1);}
  for(let i=0;i<active.length;i++){
    const y=active.length===1?0:i*h/2,part=active.length===1?h:h/2;
    c.drawImage(img,RELIC_ART.elements.indexOf(active[i].element)*w,y,w,part,0,y,w,part);
  }
  rodMaterials.set(key,image);return image;
}

export function skinElements(look: ToolLook): Array<{element: Element; stage: number}> {
  const active = look.gems.slice(0,2);
  return ELEMENTS.flatMap(element => {
    const i = active.indexOf(element);
    return i < 0 ? [] : [{element,stage: Math.min(3,Math.max(0,look.stages?.[i] ?? 0))}];
  });
}
/** Generated heads share the original shaft, grip, scale and facing of the native game sprite. */
export function elementAppearance(img:HTMLImageElement|null,cell:readonly number[]|undefined,look:ToolLook|null):HTMLCanvasElement|null {
  if(!img?.complete||!img.naturalWidth||!cell)return null;
  const active=look?skinElements(look):[];
  const family=img.src.endsWith(HELD_ART.image)?'held':'icon';
  const tool=nativeCells.get(family+':'+cell.slice(0,4).join(','));
  const twin=twinSocket(look);
  const generated=active.length&&tool?relicImage((twin?RELIC_ART.twins:RELIC_ART.tools)?.[tool]):null;
  let cache=appearances.get(img);if(!cache){cache=new Map();appearances.set(img,cache);}
  const key=cell.join(',')+':'+active.map(e=>e.element+e.stage).join(':')+':'+twin+':'+(generated?'relic':'native');
  const cached=cache.get(key);if(cached)return cached;
  if(cache.size>=96)cache.clear();
  const [x,y,nativeW,nativeH]=cell,detail=generated?3:1,w=nativeW*detail,h=nativeH*detail;
  const image=document.createElement('canvas');image.width=w;image.height=h;
  const c=image.getContext('2d')!;c.imageSmoothingEnabled=false;c.drawImage(img,x,y,nativeW,nativeH,0,0,w,h);
  if(!active.length){cache.set(key,image);return image;}
  const long=family==='held',headH=long?Math.ceil(h*(tool==='bugNet'?.4:tool==='axe'?.3:.24)):h;
  if(generated){
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.clearRect(0,0,w,headH);
    for(let i=0;i<active.length;i++){
      // Two physical materials: opposite pick tips/body sides, or upper/lower edges of a single blade.
      const vertical=long&&tool!=='pick',split=active.length>1;
      const bx=split&&!vertical?i*Math.floor(w/2):0,by=split&&vertical?i*Math.floor(headH/2):0;
      const bw=split&&!vertical?(i===0?Math.floor(w/2):w-Math.floor(w/2)):w;
      const bh=split&&vertical?(i===0?Math.floor(headH/2):headH-Math.floor(headH/2)):headH;
      c.save();c.beginPath();c.rect(bx,by,bw,bh);c.clip();
      const size=RELIC_ART.cell;
      const index=RELIC_ART.elements.indexOf(active[i].element);
      const rect=tool==='pick'?(twin?RELIC_ART.pickTwinHeads:RELIC_ART.pickHeads)[index]:null;
      if(rect){
        // Keep both curved tips and their original proportions, joining at the existing shaft.
        const [sx,sy,sw,sh]=rect,scale=Math.min((w-2*detail)/sw,(headH-detail)/sh),dw=sw*scale,dh=sh*scale;
        c.drawImage(generated,index*size+sx,sy,sw,sh,(w-dw)/2,headH-dh,dw,dh);
      }else c.drawImage(generated,index*size,0,size,size,0,0,w,headH);
      c.restore();
    }
  }else{
    // Native fallback while the small atlas loads; never hold an empty tool.
    c.globalCompositeOperation='source-atop';
    for(let i=0;i<active.length;i++){
      c.fillStyle=GEMS[active[i].element].hue;c.globalAlpha=.38;
      c.fillRect(i*w/active.length,0,w/active.length,headH);
    }
  }
  c.globalCompositeOperation='source-atop';c.globalAlpha=.85;
  const pixel=Math.max(1,Math.round(h/(long?52:32)));
  if(long)for(let i=0;i<active.length;i++){
    c.fillStyle=GEMS[active[i].element].hue;
    for(let band=0;band<active[i].stage;band++)c.fillRect(0,Math.round(headH+h*(.08+band*.085)+i*pixel*2),w,pixel);
  }
  cache.set(key,image);return image;
}
/** Draw a coloured bag sprite using exactly the ordinary icon's dimensions and anchor. */
export function drawElementIcon(ctx: CanvasRenderingContext2D,img: HTMLImageElement | null,name: IconName,look: ToolLook | null,cx:number,cy:number,size:number): boolean {
  const skin=elementAppearance(img,ICON_ATLAS.icons[name],look);
  if(!skin)return false;
  const k=size/Math.max(skin.width,skin.height);
  ctx.save();ctx.imageSmoothingEnabled=skin.width>size;ctx.imageSmoothingQuality='high';
  ctx.drawImage(skin,cx-skin.width*k/2,cy-skin.height*k/2,skin.width*k,skin.height*k);
  ctx.restore();return true;
}
/** The equipment preview is also derived from its existing game sprite. */
export function elementSkin(item: string,look: ToolLook | null): Skin | null {
  if(!look||typeof Image==='undefined')return null;
  const active=skinElements(look);
  if(!active.length)return null;
  const long=HELD_ART.tools[item];
  let picture: HTMLImageElement | null;
  if(long)picture=heldPicture();
  else {
    if(!icons){icons=new Image();icons.src=ICON_ATLAS.image;}
    picture=icons;
  }
  const image=elementAppearance(picture,long??ICON_ATLAS.icons[item as IconName],look);
  if(!image)return null;
  const main=active.length===1||active[0].stage>active[1].stage?0:1,primary=active[main],secondary=active[1-main];
  let preview=previews.get(image);
  if(!preview){
    preview=document.createElement('canvas');preview.width=preview.height=64;
    const c=preview.getContext('2d')!,k=56/Math.max(image.width,image.height);
    c.imageSmoothingEnabled=k<1;c.imageSmoothingQuality='high';
    c.drawImage(image,Math.round((64-image.width*k)/2),Math.round((64-image.height*k)/2),image.width*k,image.height*k);
    previews.set(image,preview);
  }
  return {image:preview,cell:[0,0,64,64],hue:GEMS[primary.element].hue,accent:secondary?GEMS[secondary.element].hue:undefined,stage:primary.stage};
}
/** Dev canvas review shares the live long-tool and hand-tool renderers, including the original grips. */
export function drawElementSkin(ctx:CanvasRenderingContext2D,item:string,look:ToolLook|null,fist:Vec,height:number,side:1|-1,spot=false,under?:(head:Vec)=>void,now=0,still=false):Vec|null {
  const rim=look?.glow?rimFor(look,now,0,still):undefined;
  if(isLongTool(item)){
    if(spot)return heldPicture()?longHead(item,fist,height,side):null;
    return drawLongTool(ctx,item,fist,height,side,1,under,rim,(img,cell)=>elementAppearance(img,cell,look));
  }
  const hand=handOf(item),name=item as IconName;
  if(!hand||!ICON_ATLAS.icons[name]||typeof Image==='undefined')return null;
  if(!icons){icons=new Image();icons.src=ICON_ATLAS.image;}
  if(!icons.complete||!icons.naturalWidth)return null;
  const size=handSize(hand,height,1),cy=fist.y-size*.25+hand.hang*size,head={x:fist.x,y:cy};
  if(spot)return head;
  under?.(head);ctx.save();
  const flipped=(side===-1)!==!!hand.turn,cx=flipped?0:fist.x;
  if(flipped){ctx.translate(fist.x,0);ctx.scale(-1,1);}
  if(rim)drawIconRim(ctx,icons,ICON_ATLAS.icons[name],cx,cy,size,rim,1);
  if(!drawElementIcon(ctx,icons,name,look,cx,cy,size))drawIcon(ctx,icons,name,cx,cy,size);
  ctx.restore();return head;
}
