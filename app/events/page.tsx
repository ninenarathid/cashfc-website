export const metadata = { title: "กิจกรรม — Cafe And SHabu" };

const PLANNED = [
  {
    title: "ตารางกิจกรรม FC",
    desc: "ปฏิทินรวมทุกงาน — เรดกิลด์, งานเลี้ยงเฮาส์, ถ่ายรูปหมู่, mount farm ประจำสัปดาห์",
  },
  {
    title: "ลงชื่อเข้าร่วม",
    desc: "สมาชิก login ด้วย Discord แล้วกดลงชื่อได้เลย เห็นกันหมดว่าใครมา ปาร์ตี้จัดง่าย",
  },
  {
    title: "สรุปหลังงาน",
    desc: "แปะรูป แจกรางวัล และบันทึกสถิติการเข้าร่วมของแต่ละคนอัตโนมัติ",
  },
];

export default function EventsPage() {
  return (
    <main className="pt-7">
      <div className="font-data text-[11px] uppercase tracking-[0.22em] text-amber">
        Events
      </div>
      <h1 className="font-display text-3xl font-bold">กิจกรรม</h1>
      <p className="mt-1 text-[13.5px] text-muted">
        โครงหน้านี้เตรียมไว้สำหรับเฟสถัดไป — เชื่อม Supabase + Discord login แล้วเปิดใช้ได้เลย
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
