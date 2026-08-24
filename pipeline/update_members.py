#!/usr/bin/env python3
"""
FC Member Board — data pipeline v2
==================================
Daily:    Lodestone roster + FFLogs (current tier + ultimates) + FFXIV Collect
          + activity feed (diff) + history + official news + character extras
Weekly:   add --full-history to sweep every savage tier ever released

Outputs (data/ folder):
  members.json   lightweight data for the list page
  raids.json     full per-member raid detail (loaded only by /member/[id])
  feed.json      most recent activity events
  history.json   daily FC-wide stat rollup
  news.json      official Lodestone headlines
  snapshot.json  compact summary used to diff against the next run
  extra.json     accumulated nameday + race/clan per character

Usage:
  python pipeline/update_members.py                    # daily
  python pipeline/update_members.py --full-history     # sweep every savage tier
  python pipeline/update_members.py --full-extras      # race/nameday for everyone
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

    # Boss labels for the current tier, in zone encounter order — change when a new tier lands
    "current_tier_labels": ["M9S", "M10S", "M11S", "M12S"],

    # Tag thresholds
    "rare_pct": 10.0,
    "collector_rare_min": 5,
    "collector_mounts_min": 300,
    "crafter_achv_min": 120,
    "pvp_achv_min": 60,

    # Feed
    "feed_max": 200,
    "show_leaves": False,      # emit "member left the FC" events?
    "news_max": 8,
    # Keep only major patch/event headlines from the official news (extend as needed)
    "news_keywords": [
        "patch", "update", "special site", "event", "letter from the producer",
        "the rising", "moonfire", "starlight", "heavensturn", "hatching",
        "make it rain", "all saints", "little ladies", "valentione",
        "fan festival", "expansion",
    ],
    "nameday_batch": 80,       # character pages per run (cycles until everyone is covered)
}

# Boss labels for older tiers: matched on zone name (substring) -> (prefix, first number)
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
# 1) Lodestone — roster
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
        log(f"Lodestone page {page}/{total_pages} — {len(members)} members so far")
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
            log(f"FFLogs 429 — sleeping {wait}s")
            time.sleep(wait)
            continue
        r.raise_for_status()
        payload = r.json()
        if "data" not in payload:
            raise RuntimeError(f"FFLogs error: {json.dumps(payload)[:400]}")
        return payload
    raise RuntimeError("FFLogs: retry limit exceeded")


def fflogs_zones(token: str) -> tuple[list[dict], list[dict]]:
    """Return (savage_zones newest->oldest, ultimate_zones newest->oldest)."""
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
    """Convert zoneRankings -> (encounters that have data, one clear flag per slot)."""
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
        log("Skipping FFLogs — FFLOGS_CLIENT_ID / FFLOGS_CLIENT_SECRET not set")
        for m in members:
            m["fflogs"] = raids.get(str(m["id"]), {}).get("_status", "skipped")
        return None

    savages, ults = fflogs_zones(token)
    if not savages:
        log("FFLogs: no savage zone found — skipping")
        return None
    current = savages[0]
    scan_savages = savages if full_history else [current]
    zones = scan_savages + ults
    log(f"FFLogs current tier: {current['name']} ({current['id']})")
    log(f"FFLogs zones scanned this run: {len(zones)} zones"
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

            # Tier rolled over: move the previous current zone into legacy
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
            log(f"FFLogs quota nearly spent ({spent:.0f}/{limit}) — sleeping {wait}s")
            time.sleep(wait)
        done = min(start + bs, len(members))
        if done % 50 < bs:
            log(f"FFLogs — {done}/{len(members)} members")
        time.sleep(0.3)

    return {"current_zone": current, "ultimate_zones": ults}


def summarize_raids(m: dict, raids: dict) -> None:
    """Roll the merged raids entry up into members.json — parse, kills, current_clears."""
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
    log(f"FFXIV Collect — achievement reference list: {len(out)} entries")
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
            log(f"FFXIV Collect — {i}/{len(members)} members")
        time.sleep(delay)


# ──────────────────────────────────────────────────────────────────────────────
# 4) Tags
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
# 5) Activity feed + history
# ──────────────────────────────────────────────────────────────────────────────
# Stats watched to decide whether a character did anything since the last run.
TRACKED_STATS = ("parse", "ult", "mounts", "minions", "rare", "level", "cc")


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

    # Carry a "last day a tracked stat moved" marker forward on every entry. This is
    # the seed for a real activity filter once a few weeks have accumulated; on the
    # very first run there is nothing to compare against, so it stays None.
    for mid, n in new.items():
        o = old.get(mid)
        if o is None:
            n["chg"] = today if old else None
        else:
            # A stat going *to* None means the fetch failed, not that anything
            # happened — only a real new value counts as activity.
            moved = any(n.get(k) is not None and n.get(k) != o.get(k)
                        for k in TRACKED_STATS)
            n["chg"] = today if moved else o.get("chg")

    if old:  # skip the feed on the very first run (it would spam 502 entries)
        for mid, n in new.items():
            o = old.get(mid)
            if o is None:
                ev("new_member", mid, n["name"], "joined the FC — welcome!")
                continue
            if n["parse"] is not None and (o.get("parse") or -1) < n["parse"]:
                ev("parse_up", mid, n["name"], f"set a new best parse: {n['parse']}")
            occ, ncc = o.get("cc") or [], n.get("cc") or []
            for i, c in enumerate(ncc):
                if c and (i >= len(occ) or not occ[i]):
                    lb = labels[i] if i < len(labels) else f"boss {i+1}"
                    ev("boss_clear", mid, n["name"], f"cleared {lb} for the first time 🎉")
            if n["ult"] > (o.get("ult") or 0):
                ev("ult_clear", mid, n["name"], "cleared an Ultimate — Legend! 🏆")
            if n["mounts"] is not None and o.get("mounts") is not None:
                d = n["mounts"] - o["mounts"]
                if d > 0:
                    ev("mounts_up", mid, n["name"], f"picked up {d} new mount(s)")
            if n["rare"] is not None and o.get("rare") is not None and n["rare"] > o["rare"]:
                ev("rare_up", mid, n["name"],
                   f"unlocked {n['rare'] - o['rare']} rare achievement(s)")
            if (o.get("level") or 0) < 100 and n["level"] == 100:
                ev("level_100", mid, n["name"], "reached level 100!")
        if CONFIG["show_leaves"]:
            for mid, o in old.items():
                if mid not in new:
                    ev("leave", mid, o.get("name", "?"), "left the FC")

    for m in members:
        m["last_change"] = new[str(m["id"])].get("chg")

    feed = load_json("feed.json", {"events": []})
    feed["events"] = (events + feed.get("events", []))[: CONFIG["feed_max"]]
    save_json("feed.json", feed)
    save_json("snapshot.json", new)
    log(f"Feed — {len(events)} new event(s)")


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
# 6) Official news + character extras
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
                continue  # keep only major official patch/event headlines
            ts = re.search(r"ldst_strftime\((\d+)", str(e))
            items.append({
                "title": a.get_text(strip=True),
                "url": f"https://{host}.finalfantasyxiv.com" + a["href"],
                "date": dt.datetime.utcfromtimestamp(int(ts.group(1))).strftime("%Y-%m-%d")
                        if ts else None,
            })
        save_json("news.json", {"items": items})
        log(f"Official news — {len(items)} headline(s)")
    except Exception as ex:
        log(f"Official news error: {ex}")
        if not os.path.exists(os.path.join(DATA_DIR, "news.json")):
            save_json("news.json", {"items": []})


NAMEDAY_RE = re.compile(
    r"(\d+)(?:st|nd|rd|th) Sun of the (\d+)(?:st|nd|rd|th) (Astral|Umbral) Moon")


GENDER_SIGNS = {"♀": "Female", "♂": "Male"}


def parse_nameday(soup) -> dict:
    el = soup.select_one("p.character-block__birth")
    text = el.get_text(strip=True) if el else None
    month = day = None
    if text:
        g = NAMEDAY_RE.search(text)
        if g:
            day = int(g.group(1))
            moon = int(g.group(2))
            month = moon * 2 - 1 if g.group(3) == "Astral" else moon * 2
    return {"text": text, "month": month, "day": day}


def parse_race_clan(soup) -> dict:
    """Pull Race / Clan / Gender out of a Lodestone character page.

    Lodestone renders it as one block titled "Race/Clan/Gender" whose body reads
    "<race><br><clan> / <gender sign>". Some layouts put the gender sign in its own
    span, so split on tag boundaries and strip the sign off whichever part carries it.
    """
    for box in soup.select(".character-block__box"):
        title = box.select_one(".character-block__title")
        if not title or "race" not in title.get_text(strip=True).lower():
            continue
        name = box.select_one(".character-block__name")
        if not name:
            continue
        gender, parts = None, []
        for raw in name.get_text("\n", strip=True).split("\n"):
            sign = re.search(r"[♀♂]", raw)
            if sign:
                gender = GENDER_SIGNS.get(sign.group(0))
                raw = re.sub(r"\s*/?\s*[♀♂]\s*", "", raw)
            raw = raw.strip()
            if raw:
                parts.append(raw)
        return {"race": parts[0] if parts else None,
                "clan": parts[1] if len(parts) > 1 else None,
                "gender": gender}
    return {"race": None, "clan": None, "gender": None}


def build_character_extras(members: list[dict], batch: int, full: bool) -> None:
    """Scrape per-character detail (nameday + race/clan) from Lodestone.

    A single page request covers both, so this stays exactly as gentle on Lodestone
    as the old nameday-only pass. Normally it works through 'batch' characters per
    run and cycles until everyone is covered; --full-extras sweeps the whole roster
    in one go instead (used for the initial backfill).
    """
    extra = load_json("extra.json", {"nameday": {}})
    namedays = extra.setdefault("nameday", {})
    charas = extra.setdefault("chara", {})
    todo = [m for m in members
            if str(m["id"]) not in namedays or str(m["id"]) not in charas]
    if not full:
        todo = todo[:batch]
    host = CONFIG["lodestone_host"]
    if todo:
        log(f"Character extras — fetching {len(todo)} character page(s)"
            + (" [FULL]" if full else ""))
    for i, m in enumerate(todo, 1):
        try:
            r = requests.get(
                f"https://{host}.finalfantasyxiv.com/lodestone/character/{m['id']}/",
                headers=UA, timeout=30)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            namedays[str(m["id"])] = parse_nameday(soup)
            charas[str(m["id"])] = parse_race_clan(soup)
        except Exception as ex:
            log(f"Character extras error @ {m['name']}: {ex}")
        if i % 20 == 0:
            log(f"Character extras — {i}/{len(todo)}")
        time.sleep(CONFIG["delay_lodestone"])
    save_json("extra.json", extra)
    with_race = sum(1 for v in charas.values() if v.get("race"))
    log(f"Character extras — nameday {len(namedays)}/{len(members)}, "
        f"race {with_race}/{len(members)}")
    # inject into members
    for m in members:
        c = charas.get(str(m["id"])) or {}
        m["nameday"] = namedays.get(str(m["id"]))
        m["race"] = c.get("race")
        m["clan"] = c.get("clan")


# ──────────────────────────────────────────────────────────────────────────────
# main
# ──────────────────────────────────────────────────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-fflogs", action="store_true")
    ap.add_argument("--skip-collect", action="store_true")
    ap.add_argument("--skip-news", action="store_true")
    ap.add_argument("--full-history", action="store_true",
                    help="sweep every savage tier ever released (weekly run)")
    ap.add_argument("--full-extras", action="store_true",
                    help="fetch nameday + race/clan for the whole roster in one run")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--nameday-batch", type=int, default=CONFIG["nameday_batch"])
    ap.add_argument("--collect-delay", type=float, default=CONFIG["delay_collect"])
    ap.add_argument("--list-zones", action="store_true")
    ap.add_argument("--out", default=os.path.join(DATA_DIR, "members.json"))
    args = ap.parse_args()

    if args.list_zones:
        token = fflogs_token()
        if not token:
            sys.exit("Set FFLOGS_CLIENT_ID / FFLOGS_CLIENT_SECRET first")
        sav, ult = fflogs_zones(token)
        print("SAVAGE ZONES:", *[f"  {z['id']:>4}  {z['name']}  [{z['expansion']}]"
                                 for z in sav], sep="\n")
        print("ULTIMATE ZONES:", *[f"  {z['id']:>4}  {z['name']}  [{z['expansion']}]"
                                   for z in ult], sep="\n")
        return

    today = time.strftime("%Y-%m-%d", time.gmtime())
    log("Starting pipeline v2" + (" [FULL HISTORY]" if args.full_history else ""))

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
    build_character_extras(members, args.nameday_batch, args.full_extras)
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
    log(f"Wrote members.json — {len(members)} members")


if __name__ == "__main__":
    main()
