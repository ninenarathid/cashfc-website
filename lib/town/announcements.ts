import { ITEMS } from "./items";
import { LINES, type LineId } from "./lines";
import type { Stack } from "./trade";

export interface TownAnnouncement {
  id: number; at: number; member: string; name: string;
  kind: "forge" | "rank" | "legend" | "forest" | "recipe" | "cross" | "depth" | "bridge" | "lamps" | "admin" | "casino" | "giant";
  subject: string; level: number;
  /** (a giant fish's call, v309: the hook it calls to and where its float is, for the "ไปช่วย" chip) */
  to?: { hook: string; x: number; y: number } | null;
  portrait: { look: string | null; expression: string; held?: Stack | null; wet?: boolean };
}
export interface AnnouncementPage { cursor: number; events: TownAnnouncement[] }
/** One template serves both the portrait banner and the chat log. */
export function announcementText(event: TownAnnouncement, th: boolean): string {
  const item = event.subject in ITEMS ? ITEMS[event.subject as keyof typeof ITEMS].name[th ? "th" : "en"] : event.subject;
  switch (event.kind) {
    case "admin": return `${event.name} ${event.subject}`;
    // (the subject is the prize's own name, as Aqua wrote it at the casino's desk: v299)
    case "casino": return th ? `${event.name} ได้รางวัล ${event.subject} จาก Popoto Casino!` : `${event.name} won ${event.subject} at the Popoto Casino!`;
    // (the subject is the angler's own words, lib/town/giant-fish's callWords: a call for a netter)
    case "giant": return th ? `${event.name} ขอคนช่วยช้อนปลายักษ์: ${event.subject}` : `${event.name} needs a netter for a giant fish: ${event.subject}`;
    case "forge": return th ? `${event.name} ตีบวก ${item} +${event.level} สำเร็จ!` : `${event.name} forged ${item} to +${event.level}!`;
    case "rank": { const line = LINES[event.subject as LineId]?.name; return th ? `${event.name} ถึงขั้น ${event.level} สาย${line?.th ?? item}!` : `${event.name} reached ${line?.en ?? item} rank ${event.level}!`; }
    case "legend": return th ? `${event.name} จับ ${item} เป็นคนแรกของเมือง!` : `${event.name} made the town's first catch of ${item}!`;
    case "forest": return th ? `${event.name} พบ ${item} เป็นคนแรกของเมือง!` : `${event.name} made the town's first discovery of ${item}!`;
    case "recipe": return th ? `${event.name} ค้นพบสูตร ${item} เป็นคนแรกของเมือง!` : `${event.name} discovered the town's first ${item} recipe!`;
    case "cross": return th ? `${event.name} ผสมพันธุ์ ${item} สำเร็จเป็นคนแรกของเมือง!` : `${event.name} bred the town's first ${item}!`;
    case "depth": return th ? `${event.name} เปิดทางถึงชั้นลึกสุดของเหมือง!` : `${event.name} opened the way to the deepest mine floor!`;
    case "bridge": return th ? "สะพานเมืองสร้างเสร็จแล้ว ด้วยแรงของทุกคน!" : "Together, the town has completed its bridge!";
    case "lamps": return th ? "ทุกโคมสว่างแล้ว คืนนี้เมืองสว่างด้วยแรงของทุกคน!" : "Every lantern is lit: the town shines through everyone's help!";
  }
}
