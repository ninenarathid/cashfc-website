import { ITEMS } from "./items";
import { LINES, type LineId } from "./lines";
import type { Stack } from "./trade";

export interface TownAnnouncement {
  id: number; at: number; member: string; name: string;
  kind: "forge" | "rank" | "legend" | "forest" | "recipe" | "cross" | "depth" | "bridge" | "lamps";
  subject: string; level: number;
  portrait: { look: string | null; expression: string; held?: Stack | null; wet?: boolean };
}
export interface AnnouncementPage { cursor: number; events: TownAnnouncement[] }
/** One template serves both the portrait banner and the chat log. */
export function announcementText(event: TownAnnouncement, th: boolean): string {
  const item = event.subject in ITEMS ? ITEMS[event.subject as keyof typeof ITEMS].name[th ? "th" : "en"] : event.subject;
  switch (event.kind) {
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
