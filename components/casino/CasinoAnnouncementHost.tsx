"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTownActive } from '@/lib/town/active';
type Announcement = { id: string; player_name: string; prize_name: string; created_at: string };
/** Only committed live awards enter this feed. Laboratory spins never write it. */
export default function CasinoAnnouncementHost() {
  const pathname = usePathname();
  if (pathname === '/town' || pathname.startsWith('/town/')) return null;
  return <ActiveCasinoAnnouncementHost />;
}
function ActiveCasinoAnnouncementHost() {
  const active = useTownActive();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const uid = active && !active.testTopic ? active.me.id : null;
  useEffect(() => {
    setAnnouncement(null);
    if (!uid) return;
    const client = createClient(); if (!client) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const revealTimers=new Set<ReturnType<typeof setTimeout>>();
    const seen = new Set<string>();
    const channel = client.channel(`casino-announcements:${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'town_casino_announcements' }, ({ new: row }) => {
        const r = row as Announcement;
        if (typeof r.id !== 'string' || typeof r.player_name !== 'string' || typeof r.prize_name !== 'string' ||
          seen.has(r.id) || Date.now() - Date.parse(r.created_at) > 15000) return;
        seen.add(r.id); if (seen.size > 100) seen.delete(seen.values().next().value!);
        const delay=Math.max(0,Date.parse(r.created_at)-Date.now());
        const reveal=setTimeout(()=>{revealTimers.delete(reveal);setAnnouncement(r);clearTimeout(timer);timer=setTimeout(()=>setAnnouncement(null),9000);},Math.min(delay,10000));revealTimers.add(reveal);
      }).subscribe();
    return () => { clearTimeout(timer);for(const t of revealTimers)clearTimeout(t);void client.removeChannel(channel); };
  }, [uid]);
  if (!announcement) return null;
  return <aside role="status" aria-live="polite" className="fixed bottom-24 left-1/2 z-[110] w-[min(92vw,540px)] -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-100 p-4 text-center text-amber-950 shadow-xl">
    <strong>✦ Popoto Casino ✦</strong><p className="mt-1">{announcement.player_name} ได้ {announcement.prize_name}!</p>
    <button className="mt-2 text-sm underline" onClick={() => setAnnouncement(null)} aria-label="ปิดประกาศ Casino">ปิด</button>
  </aside>;
}
