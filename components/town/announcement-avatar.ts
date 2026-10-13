import { skinsOf, type Look } from "@/lib/town/look";
import type { PixelKit } from "@/lib/town/pixeldoll";
import { isRod } from "@/lib/town/gear";
import { readToolWord, toolWord } from "@/lib/town/tools";
import type { TownAnnouncement } from "@/lib/town/announcements";
import { ICON_ATLAS, drawIcon, type IconName } from "./TownIcon";
import { ROD_LOOKS, drawLongTool, handOf, isLongTool, levelHue, toolGrip } from "./held";
import { drawElementSkin, elementAppearance, rodElementMaterial, ROD_ART_GRIP } from "./element-skins";

/** Draw the actual avatar before framing it as a portrait; never cut the body into a floating fragment. */
export function paintAnnouncementAvatar(ctx: CanvasRenderingContext2D, kit: PixelKit, look: Look,
  portrait: TownAnnouncement["portrait"], icons: HTMLImageElement, blink: boolean, now: number, density=1, smooth=false) {
  const feet = { x: 256, y: 440 }, tall = kit.bodyHeightOf(look) ?? 77;
  kit.draw(ctx, look, "front", false, feet.x, feet.y, 1, { blink, smooth, talk: portrait.expression === "talk" && Math.floor(now/170)%2===0 },density);
  const stack = portrait.held, item = stack?.item;
  if (!item) return;
  const fist = toolGrip(feet, tall, 1, 1, look.race), skin = readToolWord(toolWord(stack));
  if (isRod(item)) {
    const long = Math.min(36, tall*.62), lean = .3, material = rodElementMaterial(skin, 1);
    if (material) {
      ctx.save(); ctx.translate(fist.x, fist.y); ctx.rotate(lean);
      const scale = long / ROD_ART_GRIP[1];
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(material, -ROD_ART_GRIP[0]*scale, -long, material.width*scale, material.height*scale); ctx.restore();
    } else {
      const wood = ROD_LOOKS[item], steps = Math.ceil(long);
      const point = (i: number) => ({ x: Math.round(fist.x+Math.sin(lean)*long*i/steps), y: Math.round(fist.y-Math.cos(lean)*long*i/steps) });
      for (let i=0;i<=steps;i++) { const p=point(i); ctx.fillStyle=wood.edge;ctx.fillRect(p.x-1,p.y-1,i<steps*.45?4:3,3); }
      for (let i=0;i<=steps;i++) { const p=point(i);ctx.fillStyle=i<steps*.16?wood.grip:i%6===0?wood.joint:wood.cane;ctx.fillRect(p.x,p.y,i<steps*.45?2:1,1); }
      const reel=point(steps*.2);ctx.fillStyle=wood.edge;ctx.fillRect(reel.x+1,reel.y-1,4,4);ctx.fillStyle=wood.reel??"#bfa170";ctx.fillRect(reel.x+2,reel.y,2,2);
    }
  } else if (handOf(item)) {
    const full = portrait.wet && `${item}Full` in ICON_ATLAS.icons;
    if (full) drawIcon(ctx,icons,`${item}Full` as IconName,fist.x,fist.y+3,Math.round(tall*.25));
    else {
      // The map rim uses the plain tool's mask. A different elemental head leaves that old outline visible.
      // For portraits, light the actual material's alpha silhouette instead of enlarging the old mask.
      ctx.save();
      if(skin?.glow){ctx.shadowColor=levelHue(skin);ctx.shadowBlur=(skin.glow===2?1.1:.7)*density;}
      const grip={ x:fist.x,y:fist.y+1 };
      if(isLongTool(item))drawLongTool(ctx,item,grip,tall,1,density,undefined,undefined,(img,cell)=>elementAppearance(img,cell,skin));
      else drawElementSkin(ctx,item,skin?{...skin,glow:0}:null,grip,tall,1,false,undefined,now,true);
      ctx.restore();
    }
  } else {
    const icon = (item.startsWith("scroll") ? "scroll" : item) as IconName;
    if (icon in ICON_ATLAS.icons) drawIcon(ctx,icons,icon,fist.x,fist.y-4,15);
  }
  ctx.fillStyle="#2a1b12";ctx.fillRect(fist.x-2,fist.y-1,4,4);
  ctx.fillStyle=skinsOf(look.race)[look.skin]?.hex??"#e8b98f";ctx.fillRect(fist.x-1,fist.y,2,2);
}

/** Measure the character once so a blink or a change of equipment cannot zoom the portrait. */
export function avatarBounds(ctx: CanvasRenderingContext2D) {
  const { width, height } = ctx.canvas, pixels=ctx.getImageData(0,0,width,height).data;
  let left=width,top=height,right=0,bottom=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);
  }
  return { left,top,width:right-left,height:bottom-top };
}

/** Headroom above the hair, shoulders centred, and a continuous torso at the frame's lower edge. */
export function portraitCamera(bounds: ReturnType<typeof avatarBounds>, bodyHeight: number, size: number) {
  const waist=440-bodyHeight*.4;
  const scale=Math.min((size-12)/Math.max(1,waist-bounds.top),(size-16)/Math.max(1,bounds.width));
  const centre=bounds.left+bounds.width/2;
  const handRoom=Math.min(size*.065,Math.max(0,(size-bounds.width*scale)/2-8));
  return { scale,x:Math.round(size/2-centre*scale-handRoom),y:Math.round(size-waist*scale) };
}
