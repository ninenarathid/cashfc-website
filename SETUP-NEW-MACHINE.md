# ย้ายโปรเจกต์ + Claude Code ไปเครื่องใหม่

คู่มือนี้พาไปถึงจุดที่ **Claude Code ทำงานได้เต็มความสามารถเหมือนเครื่องเดิม** —
ไม่ใช่แค่ `npm run dev` ขึ้น แต่รวมถึง skills, plugins, ความจำของโปรเจกต์ และ MCP

เรียงตามลำดับที่ควรทำ ข้ามข้อไหนก็ได้ถ้ารู้ว่าไม่ใช้

---

## 1. ลงของพื้นฐาน

| อย่าง | เวอร์ชันที่เครื่องเดิมใช้ | หมายเหตุ |
|---|---|---|
| Node.js | v24.19.0 (npm 11.17.0) | Next 16 + React 19 ต้องการ Node 20+ |
| Python | 3.12.10 | ใช้รัน `pipeline/*.py` เท่านั้น ไม่เกี่ยวกับเว็บ |
| Git | ล่าสุด | ตั้ง `user.name` / `user.email` ให้เรียบร้อย |
| Claude Code | `npm i -g @anthropic-ai/claude-code` | |

```powershell
node -v; npm -v; python --version; git --version
```

---

## 2. ดึงโค้ด

```powershell
git clone https://github.com/ninenarathid/cashfc-website.git fcnext
cd fcnext
npm install
pip install -r pipeline/requirements.txt
```

**วางไว้ path เดิมจะง่ายที่สุด** — `E:\NinenineProject\fcnext`
ชื่อโฟลเดอร์ความจำของ Claude ผูกกับ path (ดูข้อ 5) วางที่เดิม = ไม่ต้องแก้อะไร

`CLAUDE.md` กับ `AGENTS.md` ติดมากับ repo อยู่แล้ว ไม่ต้องทำอะไรเพิ่ม
(บล็อกใน `AGENTS.md` ถูก `next dev` เขียนทับทุกครั้ง — ถ้าเห็นมันโผล่ใน `git status` นั่นปกติ commit ไปพร้อมงานได้)

---

## 3. Environment variables

ทำเอง ไม่ต้อง copy ไฟล์ข้ามเครื่อง — `.gitignore` บล็อก `.env*` ไว้ตั้งใจ

- แม่แบบ: `.env.local.example`
- ทางลัดที่ได้ครบกว่าพิมพ์เอง (รวมตัวแปร Discord ที่มีแต่บน production):
  ```powershell
  npx vercel link
  npx vercel env pull .env.local
  ```

Secret ของ GitHub Actions และ Vercel อยู่บน cloud อยู่แล้ว **ไม่ต้องย้าย** — pipeline รายวันกับ auto-deploy ทำงานต่อได้ทันที

---

## 4. ย้ายคอนฟิก Claude Code

ทุกอย่างอยู่ใน `%USERPROFILE%\.claude\` ของเครื่องเดิม สิ่งที่ต้องย้ายมีแค่ 3 อย่าง

### 4.1 บนเครื่องเดิม — รวมไฟล์

```powershell
$dst = "$env:USERPROFILE\Desktop\claude-transfer"
New-Item -ItemType Directory -Force $dst | Out-Null
New-Item -ItemType Directory -Force "$dst\memory" | Out-Null

Copy-Item "$env:USERPROFILE\.claude\settings.json" $dst
# สกิลส่วนตัว — เนื้อไฟล์จริงอยู่ที่ ~\.agents\skills
# (ใน ~\.claude\skills เป็นแค่ symlink ชี้มาที่นี่ copy ตรงนั้นจะได้ลิงก์เสีย)
Copy-Item "$env:USERPROFILE\.agents\skills\*" "$dst\skills" -Recurse -Force
Copy-Item "$env:USERPROFILE\.claude\projects\e--NinenineProject-fcnext\memory\*" "$dst\memory"

Compress-Archive "$dst\*" "$env:USERPROFILE\Desktop\claude-transfer.zip" -Force
```

> **อย่าใส่ `.credentials.json` หรือ `.claude.json` ลงไปในซิป** — อันแรกคือโทเคน login
> อันหลังมี API key ของ MCP ปนอยู่ ทั้งคู่ตั้งใหม่บนเครื่องปลายทางดีกว่า (ข้อ 4.3, 6)

### 4.2 บนเครื่องใหม่ — วางไฟล์

รัน `claude` ในโฟลเดอร์โปรเจกต์ **หนึ่งครั้งก่อน** ให้มันสร้างโครง `~/.claude` แล้วปิด จากนั้น

```powershell
$src = "$env:USERPROFILE\Desktop\claude-transfer"

# settings: เปิด plugin ui-ux-pro-max + fullstack-dev-skills, effortLevel = max
Copy-Item "$src\settings.json" "$env:USERPROFILE\.claude\settings.json" -Force

# skills ส่วนตัว 16 ตัว (supabase, vitest, agent-browser, vercel-*, ฯลฯ)
# วางเนื้อไฟล์ตรงเข้า .claude\skills ได้เลย ไม่ต้องทำ symlink ตามเครื่องเดิม
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item "$src\skills\*" "$env:USERPROFILE\.claude\skills\" -Recurse -Force

# ความจำของโปรเจกต์ — หาโฟลเดอร์ที่ Claude เพิ่งสร้างให้ ไม่ต้องเดาชื่อ
$proj = Get-ChildItem "$env:USERPROFILE\.claude\projects" -Directory |
        Where-Object { $_.Name -like '*fcnext*' } | Select-Object -First 1
New-Item -ItemType Directory -Force "$($proj.FullName)\memory" | Out-Null
Copy-Item "$src\memory\*" "$($proj.FullName)\memory\" -Force
```

> **เรื่อง symlink ที่ต้องรู้:** เครื่องเดิมเก็บสกิลจริงไว้ที่ `~\.agents\skills\` แล้วทำ symlink
> เข้าไปใน `~\.claude\skills\` (ตัวติดตั้งสกิลทำให้ ดูแหล่งที่มาแต่ละตัวได้ใน `~\.agents\.skill-lock.json`)
> เครื่องใหม่ไม่ต้องทำตามโครงนี้ — วางโฟลเดอร์สกิลจริงลง `~\.claude\skills\` ตรง ๆ Claude อ่านได้เหมือนกัน
>
> โฟลเดอร์ `~\.claude\skills\synced\` (docs, docx, pdf, pptx, xlsx, skill-creator) **ไม่ต้องย้าย** —
> มันซิงก์จากบัญชีเองหลัง `/login`

### 4.3 login

```powershell
claude
```
แล้วพิมพ์ `/login` — ใช้บัญชีเดิม (narathidsp@gmail.com)

ครั้งแรกที่เปิด Claude จะไปโหลด plugin จาก marketplace บน GitHub เองตามที่ `settings.json` สั่งไว้
เช็กด้วย `/plugin` ว่าขึ้นครบสองตัว:

| plugin | มาจาก |
|---|---|
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` |
| `fullstack-dev-skills` | `jeffallan/claude-skills` |

---

## 5. เรื่องโฟลเดอร์ความจำ (จุดที่พลาดกันบ่อย)

Claude เก็บความจำของแต่ละโปรเจกต์แยกตาม **path** ของโฟลเดอร์ โดยแปลง `:` และ `\` เป็น `-`

| โปรเจกต์อยู่ที่ | โฟลเดอร์ความจำ |
|---|---|
| `E:\NinenineProject\fcnext` | `~\.claude\projects\e--NinenineProject-fcnext\memory\` |
| `D:\work\fcnext` | `~\.claude\projects\d--work-fcnext\memory\` |

วางผิดโฟลเดอร์ = Claude มองไม่เห็นความจำ แต่ไม่มี error ให้เห็น สคริปต์ในข้อ 4.2 เลี่ยงปัญหานี้
ด้วยการให้ Claude สร้างโฟลเดอร์เองก่อนแล้วค่อยหาชื่อจริง

ในนั้นมี 8 ไฟล์ — `MEMORY.md` เป็นสารบัญที่โหลดเข้า context ทุกเซสชัน ที่เหลือเป็นความจำรายเรื่อง
(ตัวระบุ deploy, กติกา RLS, ข้อควรระวังเรื่อง notification, กติกาการ stage ไฟล์เวลามีหลายเซสชัน ฯลฯ)
**ย้ายให้ครบทั้งโฟลเดอร์** ถ้าขาด `MEMORY.md` ไฟล์ที่เหลือจะไม่ถูกหยิบมาใช้

### ตรวจว่าความจำติดจริง

เปิด `claude` ในโปรเจกต์แล้วถามว่า *"production URL ของโปรเจกต์นี้คืออะไร"* — ถ้าตอบได้โดยไม่ต้องเปิดไฟล์ = ติดแล้ว

---

## 6. MCP

| ตัว | ต้องทำอะไรบนเครื่องใหม่ |
|---|---|
| **designmd** (stdio, local) | เพิ่มใหม่ด้วยคำสั่งข้างล่าง — API key อยู่ในเครื่องเดิมที่ `~\.claude.json` → `mcpServers.designmd.env.DESIGNMD_API_KEY` |
| **claude.ai connectors** (Notion, Claude Docs, Gmail, Google Drive, Atlassian ฯลฯ) | ไม่ต้อง copy อะไร — ผูกกับบัญชี authorize ใหม่ที่ claude.ai → Settings → Connectors หรือ `/mcp` ในเซสชัน |

```powershell
claude mcp add designmd --env DESIGNMD_API_KEY=<คีย์จากเครื่องเดิม> -- npx -y designmd-mcp@0.2.1
```

โปรเจกต์นี้ไม่มี `.mcp.json` ของตัวเอง ทุก MCP เป็นระดับผู้ใช้ทั้งหมด

---

## 7. เช็กลิสต์ปิดงาน

```powershell
npm test         # vitest — ต้องผ่าน ไม่ต้องใช้ env
npm run dev      # เปิด localhost:3000
```

- [ ] หน้าแรกขึ้น กระดานสมาชิกมีข้อมูล → โค้ด + `npm install` โอเค
- [ ] ปุ่ม **Login Discord** ขึ้น (ไม่ใช่หน้า error) → `.env.local` ฝั่ง Supabase ครบ
- [ ] หน้าแอดมินเข้าได้ → `SUPABASE_SERVICE_ROLE_KEY` ถูกต้อง
- [ ] `/plugin` ขึ้นครบ 2 ตัว → plugins โหลดแล้ว
- [ ] ถาม Claude เรื่อง production URL แล้วตอบได้ → ความจำติด
- [ ] `/mcp` ขึ้น designmd เป็น connected → MCP โอเค
- [ ] `python pipeline/update_members.py --help` รันผ่าน → Python deps ครบ

> เว็บออกแบบให้ทำงานต่อได้แม้ไม่มีคีย์ Supabase (กระดานยังขึ้นปกติ ปุ่ม login จะหายไปเฉย ๆ)
> ดังนั้น "หน้าแรกขึ้น" ไม่ได้แปลว่า env ครบ — ต้องไล่เช็กลิสต์ให้ครบทุกข้อ
