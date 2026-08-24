export const metadata = { title: "มินิเกม — Cafe And SHabu" };

const PLANNED = [
  {
    title: "จับรางวัลสด",
    desc: "สุ่มผู้โชคดีจากรายชื่อสมาชิกหรือผู้เข้าร่วมกิจกรรม ทุกคนเห็นผลพร้อมกันแบบเรียลไทม์",
  },
  {
    title: "ทายปัญหา / บิงโก",
    desc: "เกมตอบคำถามเนื้อเรื่อง FFXIV หรือบิงโกในงานเลี้ยง เก็บคะแนนอัตโนมัติ",
  },
  {
    title: "Leaderboard",
    desc: "อันดับสะสมจากทุกกิจกรรม ใครขยันร่วมงานสุดในเดือนนี้ มีรางวัลรออยู่",
  },
];

export default function GamesPage() {
  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-amber">
        Games
      </div>
      <h1 className="font-display text-3xl font-bold">มินิเกม</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        โครงหน้านี้เตรียมไว้สำหรับเฟสถัดไป — ระบบสุ่มรางวัลและเก็บคะแนนจะใช้ Supabase Realtime
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {PLANNED.map((p) => (
          <div key={p.title} className="rounded-xl border border-line bg-surface p-4">
            <div className="font-display font-semibold">{p.title}</div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{p.desc}</p>
            <div className="mt-3 inline-block rounded-full border border-dashed border-line px-2.5 py-0.5 text-[11.5px] text-muted">
              เร็วๆ นี้
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
