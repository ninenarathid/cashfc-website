"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Keeper } from "@/lib/town/keeper";
import type { TownSession } from "@/lib/town/session";
import { announcementText, type TownAnnouncement } from "@/lib/town/announcements";
import { defaultLook, decodeLook } from "@/lib/town/look";
import { loadPixelKit } from "@/lib/town/pixeldoll";
import { avatarBounds, paintAnnouncementAvatar, portraitCamera } from "./announcement-avatar";
import { heldPicture } from "./held";
import { TownFootContext } from "./TownFoot";
import TownIcon, { ICON_ATLAS } from "./TownIcon";

function Portrait({ event }: { event: TownAnnouncement }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let stopped = false, frame = 0;
    const look = decodeLook(event.portrait.look) ?? defaultLook(event.member);
    const icons = new Image(); icons.src=ICON_ATLAS.image;
    const held=heldPicture();
    const ready=(img: HTMLImageElement|null) => !img || img.complete ? Promise.resolve() : new Promise<void>(resolve => {img.addEventListener("load",()=>resolve(),{once:true});img.addEventListener("error",()=>resolve(),{once:true});});
    void Promise.all([loadPixelKit(look.race),ready(icons),ready(held)]).then(([kit]) => {
      if (stopped) return; const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
      const picture=document.createElement("canvas"); picture.width=picture.height=512;
      const draw=picture.getContext("2d");if(!draw)return;
      // Frame the person, rather than shrinking them to accommodate a long tool.
      paintAnnouncementAvatar(draw,kit,look,{ ...event.portrait,held:null },icons,false,0);
      const bounds=avatarBounds(draw), size=192;
      if(bounds.width<=0||bounds.height<=0)return;
      const camera=portraitCamera(bounds,kit.bodyHeightOf(look)??77,size);
      const motion=matchMedia("(prefers-reduced-motion: reduce)"), began=performance.now();let last=-Infinity;
      const paint=(now:number) => {
        if(stopped)return;
        if(now-last>=50){
          last=now;const elapsed=now-began,blink=event.portrait.expression==="blink"||(!motion.matches&&elapsed%3300>=2650&&elapsed%3300<2800);
          ctx.clearRect(0,0,384,384);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
          const bob=motion.matches?0:Math.round(Math.sin(elapsed/700));
          // Render source sprites directly at the portrait's resolution, retaining fine face and tool detail.
          const density=camera.scale*2;
          ctx.save();ctx.setTransform(density,0,0,density,camera.x*2,(camera.y+bob)*2);
          paintAnnouncementAvatar(ctx,kit,look,event.portrait,icons,blink,now,density,true);ctx.restore();
        }
        frame=requestAnimationFrame(paint);
      };frame=requestAnimationFrame(paint);
    }).catch(() => {});
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [event.member, event.portrait]);
  return <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm border border-[#a58556] bg-[radial-gradient(ellipse_at_50%_35%,#445245_0%,#263b32_55%,#17261f_100%)] shadow-[inset_0_0_0_2px_#171e16,inset_0_-12px_18px_#0d171b66] sm:h-28 sm:w-28">
    <canvas ref={canvas} width={384} height={384} aria-hidden className="block h-full w-full [image-rendering:auto]" />
    <span aria-hidden className="pointer-events-none absolute inset-0 border-2 border-[#101c18]/35" />
  </div>;
}
export default function TownAnnouncements({ keeper, session, th }: { keeper: Keeper; session: TownSession; th: boolean }) {
  const { head } = useContext(TownFootContext), [queue, setQueue] = useState<TownAnnouncement[]>([]);
  const language = useRef(th); language.current = th;
  useEffect(() => {
    let stopped = false, busy = false, again = false, cursor: number | null = null;
    const seenIds = new Set<number>();
    const accept = (events: TownAnnouncement[], initial: boolean) => {
      const fresh = events.filter(event => !seenIds.has(event.id));
      for (const event of fresh) {
        seenIds.add(event.id);
        session.townAnnouncement(event.id, announcementText(event, language.current), event.at, language.current ? "เมือง" : "Town");
      }
      if (!initial) setQueue(was => [...was, ...fresh]);
    };
    async function read() {
      if (document.hidden || !keeper.announcements || stopped) return;
      if (busy) { again = true; return; }
      busy = true;
      try {
        const page = await keeper.announcements(cursor, session.self.info.look ?? null);
        if (stopped || !page) return;
        accept(page.events, cursor === null); cursor = page.cursor;
      } finally { busy = false; if (again && !stopped) { again = false; void read(); } }
    }
    void read(); const timer = setInterval(() => void read(), 10000);
    const stopWatching = keeper.watchAnnouncements?.(() => void read());
    const seen = () => { if (!document.hidden) void read(); }; document.addEventListener("visibilitychange", seen);
    if (process.env.NODE_ENV !== "production") (window as unknown as { __townAnnouncements?: unknown }).__townAnnouncements = { show: (event: TownAnnouncement) => accept([event], false) };
    return () => { stopped = true; stopWatching?.(); clearInterval(timer); document.removeEventListener("visibilitychange", seen); if (process.env.NODE_ENV !== "production") delete (window as unknown as { __townAnnouncements?: unknown }).__townAnnouncements; };
  }, [keeper, session]);
  const event = queue[0];
  useEffect(() => { if (!event) return; const timer = setTimeout(() => setQueue(was => was.slice(1)), 8000); return () => clearTimeout(timer); }, [event]);
  if (!head || !event) return null;
  const message=announcementText(event,th),prefix=event.name+" ";
  return createPortal(<aside data-town-announcement={event.id} role="status" className="pop-in pointer-events-auto relative flex w-[min(32rem,calc(100vw-1.5rem))] items-center gap-3 rounded-lg border-2 border-[#c39a5b] bg-[#2b211a]/97 p-2 pr-9 text-[#f3e3c3] shadow-[inset_0_0_0_1px_#4e3e28,0_3px_0_#17120e,0_8px_24px_#0006]" data-state="open">
    <Portrait event={event} /><div className="min-w-0 py-1">
      <p className="mb-1 line-clamp-2 text-[15px] font-semibold leading-snug text-[#fff0d1] [overflow-wrap:anywhere]" title={event.name}>{event.name}</p>
      <p className="text-[13px] leading-relaxed text-[#e2d2b8]">{message.startsWith(prefix)?message.slice(prefix.length):message}</p>
    </div>
    <button type="button" aria-label={th ? "ปิดประกาศ" : "Dismiss announcement"} onClick={() => setQueue(was => was.slice(1))} className="absolute right-0 top-0 grid h-11 w-9 place-items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#f0ca83]"><TownIcon name="close" size={16}/></button>
  </aside>, head);
}
