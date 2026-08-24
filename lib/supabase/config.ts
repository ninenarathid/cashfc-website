export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true เมื่อผู้ใช้ตั้งค่า env ของ Supabase แล้ว — ถ้ายัง เว็บส่วนกระดานยังทำงานได้ปกติ */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
