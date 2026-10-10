import ART from "@/lib/town/element-skin-art.json";
import { ELEMENTS, type Element, type ToolLook, type ToolKind } from "@/lib/town/tools";
import type { Vec } from "@/lib/town/world";

const FORM: Record<ToolKind, { grip: Vec; head: Vec; size: number; seam: number }> = {
  pick: { grip: {x:32,y:49}, head:{x:32,y:13}, size:.64, seam:32 },
  axe: { grip: {x:28,y:49}, head:{x:37,y:16}, size:.60, seam:28 },
  rod: { grip: {x:17,y:47}, head:{x:47,y:5}, size:.62, seam:32 },
  hoe: { grip: {x:41,y:49}, head:{x:25,y:16}, size:.64, seam:40 },
  bugNet: { grip: {x:30,y:49}, head:{x:34,y:19}, size:.68, seam:31 },
  can: { grip: {x:17,y:27}, head:{x:37,y:32}, size:.36, seam:32 },
  pot: { grip: {x:11,y:32}, head:{x:33,y:31}, size:.34, seam:32 },
  pan: { grip: {x:48,y:48}, head:{x:26,y:26}, size:.38, seam:32 },
  grill: { grip: {x:55,y:24}, head:{x:33,y:31}, size:.38, seam:32 },
};
const images = new Map<ToolKind, HTMLImageElement>();
const hybrids = new Map<string, HTMLCanvasElement>();
export function skinElements(look: ToolLook): Array<{element: Element; stage: number}> {
  const active = look.gems.slice(0,2);
  return ELEMENTS.flatMap(element => {
    const i = active.indexOf(element);
    return i < 0 ? [] : [{element,stage: Math.min(3,Math.max(0,look.stages?.[i] ?? 0))}];
  });
}
/** Lazy by visible tool. Mixtures retain the two independently trained forms. */
export function elementSkin(item: string, look: ToolLook | null): {image: CanvasImageSource; cell: readonly number[]} | null {
  if(!look || !(item in FORM) || typeof Image === "undefined") return null;
  const kind=item as ToolKind, forms=skinElements(look);
  if(!forms.length)return null;
  let img=images.get(kind);
  if(!img){img=new Image();img.src=ART.tools[kind].image;images.set(kind,img);}
  if(!img.complete || !img.naturalWidth)return null;
  const at=(i:number)=>[ELEMENTS.indexOf(forms[i].element)*64,forms[i].stage*64,64,64] as const;
  if(forms.length===1)return {image:img,cell:at(0)};
  const key=`${kind}:${forms.map(f=>`${f.element}${f.stage}`).join(":")}`;
  let hybrid=hybrids.get(key);
  if(!hybrid){
    if(hybrids.size>=96)hybrids.clear();
    hybrid=document.createElement("canvas");hybrid.width=hybrid.height=64;
    const c=hybrid.getContext("2d")!,seam=FORM[kind].seam;
    c.imageSmoothingEnabled=false;
    // A narrow overlap connects the shaft/body; each side keeps its elemental silhouette.
    c.save();c.beginPath();c.rect(0,0,seam+1,64);c.clip();c.drawImage(img,...at(0),0,0,64,64);c.restore();
    c.save();c.beginPath();c.rect(seam,0,64-seam,64);c.clip();c.drawImage(img,...at(1),0,0,64,64);c.restore();
    hybrids.set(key,hybrid);
  }
  return {image:hybrid,cell:[0,0,64,64]};
}
export function drawElementSkin(ctx: CanvasRenderingContext2D,item:string,look:ToolLook|null,fist:Vec,height:number,side:1|-1,spot=false,under?:(head:Vec)=>void):Vec|null {
  const skin=elementSkin(item,look);
  if(!skin)return null;
  const form=FORM[item as ToolKind],k=height*form.size/64;
  const head={x:fist.x+side*(form.head.x-form.grip.x)*k,y:fist.y+(form.head.y-form.grip.y)*k};
  if(spot)return head;
  under?.(head);ctx.save();ctx.translate(fist.x,fist.y);ctx.scale(side,1);
  ctx.imageSmoothingEnabled=k<1;ctx.imageSmoothingQuality="high";
  const [sx,sy,w,h]=skin.cell;ctx.drawImage(skin.image,sx,sy,w,h,-form.grip.x*k,-form.grip.y*k,w*k,h*k);ctx.restore();
  return head;
}
