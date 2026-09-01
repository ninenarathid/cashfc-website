-- ─────────────────────────────────────────────────────────────────────────
-- v23 — site updates an admin can write
--
-- The changelog began life in a TypeScript file, on the reasoning that a change
-- to the site arrives as a deploy so the note about it belongs in the same
-- commit. That is true of changes somebody wrote code for. It is not true of
-- everything the FC wants to announce about the site, and it made every wording
-- fix a deploy — which meant, in practice, that only one person could ever write
-- one. So they move here.
--
-- One row per day rather than one per line. A day is what the page groups by
-- and what an admin edits as a unit: a heading and the few things that changed
-- under it. Splitting the lines into their own table would mean ordering them,
-- joining them back, and giving a heading to whichever row happened to be
-- first.
--
-- Both languages are columns rather than a language column and two rows,
-- because these are one announcement said twice and not two announcements. A
-- row missing one side falls back to the other in the reader rather than
-- disappearing — half an announcement is more use than none.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.site_updates (
  id         bigint generated always as identity primary key,
  -- The day it went live, which is what the page shows and sorts by. Not
  -- created_at: an admin writing Tuesday's note on Wednesday should be able to
  -- say Tuesday.
  on_date    date not null,
  title_th   text,
  title_en   text,
  /**
   * The lines under that day, as [{ kind, th, en }].
   *
   * JSON because they are edited together, always read together, and never
   * queried apart. `kind` is one of new | better | fix, checked in the form
   * rather than here so an unknown one renders plainly instead of failing an
   * insert somebody cannot fix from the page they are on.
   */
  items      jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_updates_when
  on public.site_updates (on_date desc, id desc);

alter table public.site_updates enable row level security;

-- Everybody reads them; they are the front page.
drop policy if exists "site updates: read" on public.site_updates;
create policy "site updates: read"
  on public.site_updates for select using (true);

-- Only admins write. This is the site talking about itself, not a place members
-- post, so there is no owner rule to go alongside — an author who is not an
-- admin has no business here even for their own row.
drop policy if exists "site updates: admin write" on public.site_updates;
create policy "site updates: admin write"
  on public.site_updates for all
  using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete on table public.site_updates from anon, authenticated;
grant insert, update, delete on table public.site_updates to authenticated;

-- ─── What was already in the file ────────────────────────────────────────
-- Seeded so the section does not empty itself the moment it starts reading from
-- here. Only on a first run: on_date is unique enough for this, and re-running
-- the migration should not duplicate three days of notes.
insert into public.site_updates (on_date, title_th, title_en, items)
select * from (values
  ('2026-09-02'::date,
   'รูปในแกลเลอรีโหลดเร็วขึ้น 32 เท่า',
   'The gallery got 32x lighter',
   '[{"kind":"better",
      "th":"หน้าแกลเลอรีเคยส่งรูปต้นฉบับเต็มความละเอียดมาให้ทั้งที่แสดงแค่กล่องกว้าง 325px ตอนนี้มีรูปย่อแยกต่างหาก หน้าหนึ่งจาก 64 MB เหลือ 2 MB",
      "en":"The gallery was sending full-resolution originals to fill a box 325 pixels across. It now has proper thumbnails: one page went from 64 MB to 2 MB."},
     {"kind":"better",
      "th":"ไฟล์ต้นฉบับไม่ถูกแตะเลย ไม่ย่อ ไม่บีบอัดซ้ำ กดเปิดดูรูปยังได้ไฟล์เดิมทุกไบต์",
      "en":"Originals are untouched — not resized, not re-encoded. Opening a picture still gives you the file exactly as it was uploaded."}]'::jsonb),
  ('2026-09-01'::date, null, null,
   '[{"kind":"new",
      "th":"หน้า Admin ดูได้แล้วว่าใครผูกบัญชีด้วย Discord หรือ Google และเรียงตารางตามคอลัมน์ไหนก็ได้",
      "en":"The admin panel now shows which service each member signed in with, Discord or Google, and the table sorts by any column."},
     {"kind":"fix",
      "th":"กระดิ่งแจ้งเตือนเคยบอกว่าทุกอย่างเป็นประกาศใหม่ รวมถึงข้อความจากหน้า Feedback ตอนนี้บอกถูกประเภทแล้ว และกดไปที่เรื่องนั้นได้เลย",
      "en":"The notification bell used to call everything a new announcement, including replies on Feedback. It now says which kind, and takes you there."},
     {"kind":"fix",
      "th":"ข้อมูล Achievement จะไม่หายอีกแล้วถ้ามีใครตั้งโปรไฟล์เป็น Private ระบบจะเก็บของเดิมไว้และบอกว่าอ่านมาเมื่อไหร่",
      "en":"Achievements no longer vanish when somebody sets their Lodestone profile to private. The last reading is kept, with the date it was taken."}]'::jsonb),
  ('2026-08-31'::date, null, null,
   '[{"kind":"new",
      "th":"หน้าแรกบอกวันเกิดสมาชิกที่กำลังจะถึงใน 7 วันข้างหน้า",
      "en":"The home page now shows members'' birthdays for the week ahead."},
     {"kind":"new",
      "th":"ไกด์ M9S ใช้แผนผังสนามจริงจากในเกม พร้อมมาร์คของจริง และไทม์ไลน์แบบเส้นเวลาที่กดดูแต่ละสกิลได้",
      "en":"The M9S guide uses the real arena floor and the game''s own waymarks, with a timeline you can click through skill by skill."}]'::jsonb)
) as seed(on_date, title_th, title_en, items)
where not exists (select 1 from public.site_updates);
