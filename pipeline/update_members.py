#!/usr/bin/env python3
"""
FC Member Board — data pipeline v2
==================================
รายวัน:   Lodestone สมาชิก + FFLogs (tier ปัจจุบัน + ultimates) + FFXIV Collect
           + ฟีดความเคลื่อนไหว (diff) + history + ข่าว official + nameday (ทยอย)
รายสัปดาห์: เพิ่ม --full-history เพื่อกวาด savage ทุก tier ย้อนหลัง

Outputs (โฟลเดอร์ data/):
  members.json   ข้อมูลเบาสำหรับหน้า list
  raids.json     รายละเอียด raid เต็มรายคน (โหลดเฉพาะหน้า /member/[id])
  feed.json      เหตุการณ์ความเคลื่อนไหวล่าสุด
  history.json   สถิติรวมรายวันของ FC
  news.json      หัวข้อข่าว official จาก Lodestone
  snapshot.json  สรุปย่อไว้ diff วันถัดไป
  extra.json     nameday สะสม

Usage:
  python pipeline/update_members.py                    # รายวัน
  python pipeline/update_members.py --full-history     # กวาด savage ทุก tier
  python pipeline/update_members.py --skip-fflogs --limit 5
  python pipeline/update_members.py --list-zones
"""

import argparse
import datetime as dt
import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────────────────────
CONFIG = {
    "fc_id": "9233505136016478451",
    "fc_name": "Cafe And SHabu",
    "world": "Tonberry",
    "dc": "Elemental",
    "lodestone_host": "na",
    "server_slug": "Tonberry",
    "server_region": "JP",

    "delay_lodestone": 1.5,
    "delay_collect": 0.7,

    "fflogs_batch_size": 5,

    # ป้ายบอสของ tier ปัจจุบัน (เรียงตามลำดับบอสใน zone) — แก้เมื่อ tier ใหม่ออก
    "current_tier_labels": ["M9S", "M10S", "M11S", "M12S"],

    # เกณฑ์แท็ก
    "rare_pct": 10.0,
    "collector_rare_min": 5,
    "collector_mounts_min": 300,
    "crafter_achv_min": 120,
    "pvp_achv_min": 60,

    # ฟีด
    "feed_max": 200,
    "show_leaves": False,      # แสดงเหตุการณ์ "สมาชิกออกจาก FC" ไหม
    "news_max": 8,
    # กรองข่าว official เฉพาะแพตช์ใหญ่/อีเวนต์ (แก้เพิ่มได้)
    "news_keywords": [
        "patch", "update", "special site", "event", "letter from the producer",
        "the rising", "moonfire", "starlight", "heavensturn", "hatching",
        "make it rain", "all saints", "little ladies", "valentione",
        "fan festival", "expansion",
    ],
    "nameday_batch": 80,       # scrape nameday วันละกี่คน (วนจนครบ)
}

# ป้ายบอสของ tier เก่า: จับจากชื่อ zone (substring) -> (prefix, เลขเริ่ม)
LEGACY_LABELS = [
    ("Cruiserweight", "M", 5), ("Light-heavyweight", "M", 1),
    ("Anabaseios", "P", 9), ("Abyssos", "P", 5), ("Asphodelos", "P", 1),
    ("Eden's Promise", "E", 9), ("Eden's Verse", "E", 5), ("Eden's Gate", "E", 1),
    ("Alphascape", "O", 9), ("Sigmascape", "O", 5), ("Deltascape", "O", 1),
    ("Creator", "A", 9), ("Midas", "A", 5), ("Gordias", "A", 1),
]

ULTIMATE_PATTERNS = [
    "ultimate", "unending coil", "weapon's refrain", "weapons refrain",
    "epic of alexander", "dragonsong", "omega protocol", "futures rewritten",
    "future's rewritten",
]

UA = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 "
                     "fc-member-board (personal FC tool)")}

FFLOGS_TOKEN_URL = "https://www.fflogs.com/oauth/token"
FFLOGS_API_URL = "https://www.fflogs.com/api/v2/client"
COLLECT_API = "https://ffxivcollect.com/api"

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def load_json(name: str, default):
    try:
        with open(os.path.join(DATA_DIR, name), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def save_json(name: str, obj) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


# ──────────────────────────────────────────────────────────────────────────────
# 1) Lodestone — สมาชิก
# ──────────────────────────────────────────────────────────────────────────────
def scrape_members() -> list[dict]:
    base = (f"https://{CONFIG['lodestone_host']}.finalfantasyxiv.com"
            f"/lodestone/freecompany/{CONFIG['fc_id']}/member/")
    members, page, total_pages = [], 1, 1
    while page <= total_pages:
        r = requests.get(base, params={"page": page}, headers=UA, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        if page == 1:
            pager = soup.select_one("li.btn__pager__current")
            m = re.search(r"Page \d+ of (\d+)", pager.get_text()) if pager else None
            total_pages = int(m.group(1)) if m else 1
        for e in soup.select("li.entry"):
            link = e.select_one("a.entry__bg")
            cid = int(re.search(r"/character/(\d+)/", link["href"]).group(1))
            avatar_img = e.select_one(".entry__chara__face img")
            rank, level = None, None
            for li in e.select("ul.entry__freecompany__info li"):
                span = li.select_one("span")
                if li.select_one("i.list__ic__class") and span:
                    try:
                        level = int(span.get_text(strip=True))
                    except ValueError:
                        level = None
                elif span and rank is None:
                    rank = span.get_text(strip=True)
            members.append({
                "id": cid,
                "name": e.select_one("p.entry__name").get_text(strip=True),
                "rank": rank, "level": level,
                "avatar": avatar_img["src"] if avatar_img else None,
            })
        log(f"Lodestone page {page}/{total_pages} — รวม {len(members)} คน")
        page += 1
        time.sleep(CONFIG["delay_lodestone"])
    return members


# ──────────────────────────────────────────────────────────────────────────────
# 2) FFLogs
# ──────────────────────────────────────────────────────────────────────────────
def fflogs_token() -> str | None:
    cid = os.environ.get("FFLOGS_CLIENT_ID")
    secret = os.environ.get("FFLOGS_CLIENT_SECRET")
    if not cid or not secret:
        return None
    r = requests.post(FFLOGS_TOKEN_URL, data={"grant_type": "client_credentials"},
                      auth=(cid, secret), timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def fflogs_query(token: str, query: str, retries: int = 3) -> dict:
    for _ in range(retries):
        r = requests.post(FFLOGS_API_URL, json={"query": query},
                          headers={"Authorization": f"Bearer {token}", **UA}, timeout=90)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", 60))
            log(f"FFLogs 429 — พัก {wait}s")
            time.sleep(wait)
            continue
        r.raise_for_status()
        payload = r.json()
        if "data" not in payload:
            raise RuntimeError(f"FFLogs error: {json.dumps(payload)[:400]}")
        return payload
    raise RuntimeError("FFLogs: retry เกินกำหนด")


def fflogs_zones(token: str) -> tuple[list[dict], list[dict]]:
    """คืน (savage_zones ใหม่->เก่า, ultimate_zones ใหม่->เก่า)"""
    q = ("{ worldData { zones { id name "
         "expansion { name } difficulties { id name } } } }")
    zones = fflogs_query(token, q)["data"]["worldData"]["zones"] or []
    ults, savages = [], []
    for z in zones:
        name_l = (z["name"] or "").lower()
        diffs = z.get("difficulties") or []
        exp = (z.get("expansion") or {}).get("name")
        if any(p in name_l for p in ULTIMATE_PATTERNS):
            ults.append({"id": z["id"], "name": z["name"],
                         "expansion": exp, "difficulty": None})
        elif any((d.get("name") or "").lower() == "savage" for d in diffs):
            sav = next(d["id"] for d in diffs
                       if (d.get("name") or "").lower() == "savage")
            savages.append({"id": z["id"], "name": z["name"],
                            "expansion": exp, "difficulty": sav})
    savages.sort(key=lambda z: z["id"], reverse=True)
    ults.sort(key=lambda z: z["id"], reverse=True)
    return savages, ults


def zone_labels(zone_name: str, is_current: bool) -> list[str] | None:
    if is_current:
        return CONFIG["current_tier_labels"]
    for sub, prefix, start in LEGACY_LABELS:
        if sub.lower() in (zone_name or "").lower():
            return [f"{prefix}{start + i}S" for i in range(4)]
    return None


def build_char_query(chunk: list[dict], zones: list[dict]) -> str:
    body = []
    for i, m in enumerate(chunk):
        zq = []
        for z in zones:
            args = f"zoneID: {z['id']}"
            if z.get("difficulty"):
                args += f", difficulty: {z['difficulty']}"
            zq.append(f"z{z['id']}: zoneRankings({args})")
    # ^ loop closes below
        body.append(
            f"c{i}: character(name: {json.dumps(m['name'])}, "
            f"serverSlug: \"{CONFIG['server_slug']}\", "
            f"serverRegion: \"{CONFIG['server_region']}\") "
            f"{{ hidden {' '.join(zq)} }}"
        )
    return ("query { rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn } "
            "characterData { " + " ".join(body) + " } }")


def encounters_from_blob(blob: dict, labels: list[str] | None) -> tuple[list[dict], list[bool]]:
    """แปลง zoneRankings -> (encounters ที่มีข้อมูล, clears ครบทุกช่อง)"""
    rankings = blob.get("rankings") or []
    clears = [False] * (len(labels) if labels else len(rankings))
    out = []
    for i, rk in enumerate(rankings):
        kills = rk.get("totalKills") or 0
        pct = rk.get("rankPercent")
        med = rk.get("medianPercent")
        if i < len(clears):
            clears[i] = kills > 0
        if kills <= 0 and pct is None:
            continue
        out.append({
            "label": labels[i] if labels and i < len(labels) else None,
            "name": (rk.get("encounter") or {}).get("name"),
            "best": round(pct) if pct is not None else None,
            "median": round(med) if med is not None else None,
            "kills": kills,
            "job": rk.get("bestSpec") or rk.get("spec"),
        })
    return out, clears


def run_fflogs(members: list[dict], raids: dict, full_history: bool) -> dict | None:
    token = fflogs_token()
    if not token:
        log("ข้าม FFLogs — ไม่พบ FFLOGS_CLIENT_ID / FFLOGS_CLIENT_SECRET")
        for m in members:
            m["fflogs"] = raids.get(str(m["id"]), {}).get("_status", "skipped")
        return None

    savages, ults = fflogs_zones(token)
    if not savages:
        log("FFLogs: ไม่พบ savage zone — ข้าม")
        return None
    current = savages[0]
    scan_savages = savages if full_history else [current]
    zones = scan_savages + ults
    log(f"FFLogs current tier: {current['name']} ({current['id']})")
    log(f"FFLogs zones สแกนรอบนี้: {len(zones)} zones"
        + (" [FULL HISTORY]" if full_history else ""))

    ult_ids = {z["id"] for z in ults}
    zmeta = {z["id"]: z for z in zones}
    bs = CONFIG["fflogs_batch_size"]

    for start in range(0, len(members), bs):
        chunk = members[start:start + bs]
        try:
            payload = fflogs_query(token, build_char_query(chunk, zones))
        except Exception as ex:
            log(f"FFLogs batch {start} error: {ex}")
            for m in chunk:
                m["fflogs"] = "error"
            continue

        data = payload["data"]["characterData"] or {}
        for i, m in enumerate(chunk):
            blob = data.get(f"c{i}")
            rid = str(m["id"])
            entry = raids.setdefault(rid, {})
            if blob is None:
                m["fflogs"] = "none"
                entry["_status"] = "none"
                continue
            if blob.get("hidden"):
                m["fflogs"] = "hidden"
                entry["_status"] = "hidden"
                continue

            new_ults = entry.get("ultimates", [])
            new_ults = [u for u in new_ults if u.get("zone_id") not in ult_ids]
            legacy = entry.get("legacy", [])
            has_any = False

            for key, zblob in blob.items():
                if not key.startswith("z") or not isinstance(zblob, dict):
                    continue
                zid = int(key[1:])
                z = zmeta[zid]
                if zid in ult_ids:
                    encs, _ = encounters_from_blob(zblob, None)
                    best = max((e["best"] for e in encs if e["best"] is not None),
                               default=None)
                    kills = sum(e["kills"] for e in encs)
                    if kills > 0 or best is not None:
                        has_any = True
                        new_ults.append({
                            "zone": z["name"], "zone_id": zid,
                            "expansion": z.get("expansion"),
                            "best": best, "kills": kills,
                            "job": next((e["job"] for e in encs if e["job"]), None),
                            "cleared": kills > 0,
                        })
                else:
                    is_current = zid == current["id"]
                    labels = zone_labels(z["name"], is_current)
                    encs, clears = encounters_from_blob(zblob, labels)
                    if is_current:
                        if encs:
                            has_any = True
                        entry["current"] = {
                            "zone": z["name"], "zone_id": zid,
                            "expansion": z.get("expansion"),
                            "encounters": encs, "clears": clears,
                        }
                    elif encs:
                        has_any = True
                        legacy = [lz for lz in legacy if lz.get("zone_id") != zid]
                        legacy.append({
                            "zone": z["name"], "zone_id": zid,
                            "expansion": z.get("expansion"), "encounters": encs,
                        })

            # ถ้า tier เปลี่ยน: ย้าย current เก่าไป legacy
            old_cur = entry.get("current")
            if old_cur and old_cur.get("zone_id") != current["id"]:
                if old_cur.get("encounters"):
                    legacy = [lz for lz in legacy
                              if lz.get("zone_id") != old_cur["zone_id"]]
                    legacy.append({k: old_cur[k] for k in
                                   ("zone", "zone_id", "expansion", "encounters")})
                entry.pop("current", None)

            new_ults.sort(key=lambda u: u["zone_id"], reverse=True)
            legacy.sort(key=lambda lz: lz["zone_id"], reverse=True)
            entry["ultimates"] = new_ults
            entry["legacy"] = legacy
            entry["_status"] = "ok" if (has_any or entry.get("current", {}).get("encounters")
                                       or new_ults or legacy) else "none"
            m["fflogs"] = entry["_status"]

        rl = payload["data"].get("rateLimitData") or {}
        spent, limit = rl.get("pointsSpentThisHour", 0), rl.get("limitPerHour", 3600)
        if limit and spent > limit * 0.85:
            wait = int(rl.get("pointsResetIn", 300)) + 10
            log(f"FFLogs ใกล้เต็มโควตา ({spent:.0f}/{limit}) — พัก {wait}s")
            time.sleep(wait)
        done = min(start + bs, len(members))
        if done % 50 < bs:
            log(f"FFLogs — {done}/{len(members)} คน")
        time.sleep(0.3)

    return {"current_zone": current, "ultimate_zones": ults}


def summarize_raids(m: dict, raids: dict) -> None:
    """สรุปจาก raids (merged) ลง members.json — parse, kills, current_clears"""
    entry = raids.get(str(m["id"])) or {}
    best = None
    cur = entry.get("current") or {}
    for e in cur.get("encounters", []):
        if e.get("best") is not None:
            best = max(best or 0, e["best"])
    for u in entry.get("ultimates", []):
        if u.get("best") is not None:
            best = max(best or 0, u["best"])
    for lz in entry.get("legacy", []):
        for e in lz.get("encounters", []):
            if e.get("best") is not None:
                best = max(best or 0, e["best"])
    m["parse"] = best
    m["savage_kills"] = sum(1 for c in cur.get("clears", []) if c)
    m["ult_clears"] = sum(1 for u in entry.get("ultimates", []) if u.get("cleared"))
    m["current_clears"] = cur.get("clears") or None
    m.setdefault("fflogs", entry.get("_status", "skipped"))


# ──────────────────────────────────────────────────────────────────────────────
# 3) FFXIV Collect
# ──────────────────────────────────────────────────────────────────────────────
def collect_rarity_map() -> dict[int, dict]:
    r = requests.get(f"{COLLECT_API}/achievements", headers=UA, timeout=120)
    r.raise_for_status()
    out = {}
    for a in r.json().get("results", []):
        try:
            pct = float(str(a.get("owned", "")).replace("%", ""))
        except ValueError:
            pct = None
        out[a["id"]] = {"pct": pct, "type": (a.get("type") or {}).get("name")}
    log(f"FFXIV Collect — ฐาน achievement {len(out)} รายการ")
    return out


def run_collect(members: list[dict], rarity: dict[int, dict], delay: float) -> None:
    for i, m in enumerate(members, 1):
        m.update({"mounts": None, "minions": None, "rare_achv": None,
                  "craft_achv": None, "pvp_achv": None,
                  "ach_public": None, "portrait": None})
        try:
            r = requests.get(f"{COLLECT_API}/characters/{m['id']}",
                             params={"ids": "true"}, headers=UA, timeout=30)
            if r.status_code == 404:
                continue
            r.raise_for_status()
            d = r.json()
            m["portrait"] = d.get("portrait")
            m["mounts"] = (d.get("mounts") or {}).get("count")
            m["minions"] = (d.get("minions") or {}).get("count")
            ach = d.get("achievements") or {}
            m["ach_public"] = ach.get("public")
            ids = ach.get("ids") or []
            if m["ach_public"] and ids:
                rare = craft = pvp = 0
                for aid in ids:
                    info = rarity.get(aid)
                    if not info:
                        continue
                    if info["pct"] is not None and info["pct"] <= CONFIG["rare_pct"]:
                        rare += 1
                    if info["type"] == "Crafting & Gathering":
                        craft += 1
                    elif info["type"] == "PvP":
                        pvp += 1
                m["rare_achv"], m["craft_achv"], m["pvp_achv"] = rare, craft, pvp
        except Exception as ex:
            log(f"Collect error @ {m['name']}: {ex}")
        if i % 50 == 0:
            log(f"FFXIV Collect — {i}/{len(members)} คน")
        time.sleep(delay)


# ──────────────────────────────────────────────────────────────────────────────
# 4) แท็ก
# ──────────────────────────────────────────────────────────────────────────────
def assign_tags(m: dict) -> None:
    tags = []
    if m.get("ult_clears", 0) > 0:
        tags += ["ultimate", "raider"]
    elif m.get("savage_kills", 0) > 0 or m.get("parse") is not None:
        tags.append("raider")
    if (m.get("rare_achv") or 0) >= CONFIG["collector_rare_min"]:
        tags.append("collector")
    elif (m.get("mounts") or 0) >= CONFIG["collector_mounts_min"]:
        tags.append("collector")
    if (m.get("craft_achv") or 0) >= CONFIG["crafter_achv_min"]:
        tags.append("crafter")
    if (m.get("pvp_achv") or 0) >= CONFIG["pvp_achv_min"]:
        tags.append("pvp")
    if not tags:
        no_logs = m.get("fflogs") in ("hidden", "none", "skipped", "error", "pending")
        tags.append("unknown" if (no_logs and not m.get("ach_public")) else "casual")
    m["tags"] = list(dict.fromkeys(tags))


# ──────────────────────────────────────────────────────────────────────────────
# 5) ฟีดความเคลื่อนไหว + history
# ──────────────────────────────────────────────────────────────────────────────
def make_snapshot(members: list[dict]) -> dict:
    return {str(m["id"]): {
        "name": m["name"], "parse": m.get("parse"), "ult": m.get("ult_clears", 0),
        "mounts": m.get("mounts"), "minions": m.get("minions"),
        "rare": m.get("rare_achv"), "level": m.get("level"),
        "cc": m.get("current_clears"),
    } for m in members}


def build_feed(members: list[dict], today: str) -> None:
    old = load_json("snapshot.json", {})
    new = make_snapshot(members)
    events: list[dict] = []
    labels = CONFIG["current_tier_labels"]

    def ev(etype, mid, name, text):
        events.append({"date": today, "type": etype, "id": int(mid),
                       "name": name, "text": text})

    if old:  # รอบแรกไม่สร้างฟีด (กันสแปม 502 รายการ)
        for mid, n in new.items():
            o = old.get(mid)
            if o is None:
                ev("new_member", mid, n["name"], "เข้าร่วม FC — ยินดีต้อนรับ!")
                continue
            if n["parse"] is not None and (o.get("parse") or -1) < n["parse"]:
                ev("parse_up", mid, n["name"], f"ทำ parse นิวไฮ {n['parse']}")
            occ, ncc = o.get("cc") or [], n.get("cc") or []
            for i, c in enumerate(ncc):
                if c and (i >= len(occ) or not occ[i]):
                    lb = labels[i] if i < len(labels) else f"บอส {i+1}"
                    ev("boss_clear", mid, n["name"], f"เคลียร์ {lb} ครั้งแรก 🎉")
            if n["ult"] > (o.get("ult") or 0):
                ev("ult_clear", mid, n["name"], "เคลียร์ Ultimate — Legend! 🏆")
            if n["mounts"] is not None and o.get("mounts") is not None:
                d = n["mounts"] - o["mounts"]
                if d > 0:
                    ev("mounts_up", mid, n["name"], f"ได้ mount ใหม่ +{d}")
            if n["rare"] is not None and o.get("rare") is not None and n["rare"] > o["rare"]:
                ev("rare_up", mid, n["name"],
                   f"ปลดล็อก rare achievement +{n['rare'] - o['rare']}")
            if (o.get("level") or 0) < 100 and n["level"] == 100:
                ev("level_100", mid, n["name"], "ถึงเลเวล 100 แล้ว!")
        if CONFIG["show_leaves"]:
            for mid, o in old.items():
                if mid not in new:
                    ev("leave", mid, o.get("name", "?"), "ออกจาก FC")

    feed = load_json("feed.json", {"events": []})
    feed["events"] = (events + feed.get("events", []))[: CONFIG["feed_max"]]
    save_json("feed.json", feed)
    save_json("snapshot.json", new)
    log(f"ฟีด — เพิ่ม {len(events)} เหตุการณ์")


def build_history(members: list[dict], today: str) -> None:
    hist = load_json("history.json", {"rows": []})
    has = lambda t: sum(1 for m in members if t in m["tags"])  # noqa: E731
    final_boss = sum(1 for m in members
                     if (m.get("current_clears") or [False])[-1])
    row = {"date": today, "total": len(members), "raider": has("raider"),
           "ultimate": has("ultimate"), "collector": has("collector"),
           "unknown": has("unknown"), "final_boss": final_boss}
    hist["rows"] = [r for r in hist["rows"] if r["date"] != today] + [row]
    save_json("history.json", hist)


# ──────────────────────────────────────────────────────────────────────────────
# 6) ข่าว official + nameday
# ──────────────────────────────────────────────────────────────────────────────
def build_news() -> None:
    try:
        host = CONFIG["lodestone_host"]
        r = requests.get(f"https://{host}.finalfantasyxiv.com/lodestone/topics/",
                         headers=UA, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        items = []
        for e in soup.select("li.news__list--topics"):
            if len(items) >= CONFIG["news_max"]:
                break
            a = e.select_one("p.news__list--title a")
            if not a:
                continue
            title_l = a.get_text(strip=True).lower()
            if not any(k in title_l for k in CONFIG["news_keywords"]):
                continue  # เอาเฉพาะแพตช์ใหญ่/อีเวนต์ official
            ts = re.search(r"ldst_strftime\((\d+)", str(e))
            items.append({
                "title": a.get_text(strip=True),
                "url": f"https://{host}.finalfantasyxiv.com" + a["href"],
                "date": dt.datetime.utcfromtimestamp(int(ts.group(1))).strftime("%Y-%m-%d")
                        if ts else None,
            })
        save_json("news.json", {"items": items})
        log(f"ข่าว official — {len(items)} หัวข้อ")
    except Exception as ex:
        log(f"ข่าว official error: {ex}")
        if not os.path.exists(os.path.join(DATA_DIR, "news.json")):
            save_json("news.json", {"items": []})


NAMEDAY_RE = re.compile(
    r"(\d+)(?:st|nd|rd|th) Sun of the (\d+)(?:st|nd|rd|th) (Astral|Umbral) Moon")


def build_namedays(members: list[dict], batch: int) -> None:
    extra = load_json("extra.json", {"nameday": {}})
    store = extra.setdefault("nameday", {})
    todo = [m for m in members if str(m["id"]) not in store][:batch]
    host = CONFIG["lodestone_host"]
    for i, m in enumerate(todo, 1):
        try:
            r = requests.get(
                f"https://{host}.finalfantasyxiv.com/lodestone/character/{m['id']}/",
                headers=UA, timeout=30)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            el = soup.select_one("p.character-block__birth")
            text = el.get_text(strip=True) if el else None
            month = day = None
            if text:
                g = NAMEDAY_RE.search(text)
                if g:
                    day = int(g.group(1))
                    moon = int(g.group(2))
                    month = moon * 2 - 1 if g.group(3) == "Astral" else moon * 2
            store[str(m["id"])] = {"text": text, "month": month, "day": day}
        except Exception as ex:
            log(f"nameday error @ {m['name']}: {ex}")
        if i % 20 == 0:
            log(f"nameday — {i}/{len(todo)}")
        time.sleep(CONFIG["delay_lodestone"])
    save_json("extra.json", extra)
    log(f"nameday — สะสมแล้ว {len(store)}/{len(members)} คน")
    # inject ลง members
    for m in members:
        m["nameday"] = store.get(str(m["id"]))


# ──────────────────────────────────────────────────────────────────────────────
# main
# ──────────────────────────────────────────────────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-fflogs", action="store_true")
    ap.add_argument("--skip-collect", action="store_true")
    ap.add_argument("--skip-news", action="store_true")
    ap.add_argument("--full-history", action="store_true",
                    help="กวาด savage ทุก tier ย้อนหลัง (รันรายสัปดาห์)")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--nameday-batch", type=int, default=CONFIG["nameday_batch"])
    ap.add_argument("--collect-delay", type=float, default=CONFIG["delay_collect"])
    ap.add_argument("--list-zones", action="store_true")
    ap.add_argument("--out", default=os.path.join(DATA_DIR, "members.json"))
    args = ap.parse_args()

    if args.list_zones:
        token = fflogs_token()
        if not token:
            sys.exit("ต้องตั้งค่า FFLOGS_CLIENT_ID / FFLOGS_CLIENT_SECRET ก่อน")
        sav, ult = fflogs_zones(token)
        print("SAVAGE ZONES:", *[f"  {z['id']:>4}  {z['name']}  [{z['expansion']}]"
                                 for z in sav], sep="\n")
        print("ULTIMATE ZONES:", *[f"  {z['id']:>4}  {z['name']}  [{z['expansion']}]"
                                   for z in ult], sep="\n")
        return

    today = time.strftime("%Y-%m-%d", time.gmtime())
    log("เริ่ม pipeline v2" + (" [FULL HISTORY]" if args.full_history else ""))

    members = scrape_members()
    if args.limit:
        members = members[: args.limit]

    raids = load_json("raids.json", {})
    zone_info = None
    if args.skip_fflogs:
        for m in members:
            m["fflogs"] = raids.get(str(m["id"]), {}).get("_status", "skipped")
    else:
        zone_info = run_fflogs(members, raids, args.full_history)
    for m in members:
        summarize_raids(m, raids)
    save_json("raids.json", raids)

    if args.skip_collect:
        for m in members:
            m.update({"mounts": None, "minions": None, "rare_achv": None,
                      "craft_achv": None, "pvp_achv": None,
                      "ach_public": None, "portrait": None})
    else:
        run_collect(members, collect_rarity_map(), args.collect_delay)

    for m in members:
        assign_tags(m)

    if not args.skip_news:
        build_news()
    build_namedays(members, args.nameday_batch)
    build_feed(members, today)
    build_history(members, today)

    out = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "fc": {"name": CONFIG["fc_name"], "id": CONFIG["fc_id"],
               "world": CONFIG["world"], "dc": CONFIG["dc"],
               "region": CONFIG["server_region"], "total": len(members)},
        "current_tier": {
            "labels": CONFIG["current_tier_labels"],
            "zone": (zone_info or {}).get("current_zone"),
        },
        "members": members,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    log(f"เขียน members.json — {len(members)} คน เรียบร้อย")


if __name__ == "__main__":
    main()
