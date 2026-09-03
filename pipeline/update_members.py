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
import math
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
    # One label per encounter FF Logs ranks, which is why the last boss appears
    # twice: it is two ranked fights and the board should be able to ask about
    # each of them.
    "current_tier_labels": ["M9S", "M10S", "M11S", "M12S-1", "M12S-2"],

    # Tag thresholds
    "rare_pct": 10.0,
    "rare_show": 100,          # rarest achievements kept per member for their profile

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
    # How long a cached character page stays good for. Titles change whenever
    # somebody feels like it, so "fetched once, kept forever" would describe half
    # the roster by last month's choices. Twenty hours rather than twenty-four so
    # the daily sweep always finds everybody due rather than racing its own clock.
    "extras_max_age_h": 20,

    # Lalachievements enrichment. Their API only knows characters someone has added to
    # the site — roughly one in eight of this FC right now — and answers 500 for the
    # rest, so this is best-effort: results accumulate across runs and requesting an
    # unknown character queues it ("adding") for a later run to pick up.
    "lala_delay": 0.6,
    "lala_passes": 2,          # retry sweeps per run for ids that errored

    # The schedule runs every few hours so FFLogs coverage can accumulate, but these
    # two sources describe slow-moving collections. Re-reading them every run would
    # mean ~1,500 third-party requests every few hours for data that barely changes,
    # so they refresh roughly daily and other runs use the cache.
    "collect_max_age_h": 20,
    "lala_max_age_h": 20
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
    "future's rewritten", "dancing mad",
]

# Ultimate clears also show up as achievements, which matters because FF Logs is
# opt-in: a member who never uploaded a log, or who hides their profile, still has
# the achievement on Lodestone. Ids and duty names read off the FFXIV Collect
# catalogue. "Alternative Destiny" is the odd one out — it is the Futures Rewritten
# clear but its description never says "(Ultimate)", so it cannot be matched by text.
ULTIMATE_ACHV: dict[int, str] = {
    1993: "The Unending Coil of Bahamut",
    2107: "The Weapon's Refrain",
    2444: "The Epic of Alexander",
    3074: "Dragonsong's Reprise",
    3162: "The Omega Protocol",
    3617: "Futures Rewritten",
    4069: "Dancing Mad",
}

# Zones that expose a "Savage" difficulty without being a four-boss savage raid tier.
# They have to be excluded explicitly: the newest of them (currently "The Forked
# Tower: Magic") otherwise wins the "highest savage zone id" test and gets treated as
# the current tier, and every one of them gets swept during a legacy backfill.
NON_TIER_SAVAGE = ["deep dungeons", "criterion", "delubrum", "forked tower"]

# Extreme trials are their own zones — "Trials I (Extreme)", "Trials (Extreme)", … —
# listed at Normal difficulty, rather than a difficulty of some trial zone.
EXTREME_PATTERN = "(extreme)"

# FC rank meaning "not playing at the moment".
ON_VACATION_RANK = "On vacation"

# Rare achievements sorted into playstyles, so the board reflects that this game is
# not only raiding. Matched against FFXIV Collect's own type and category names, in
# order — first match wins, which is why gathering sits above crafting (both share
# the "Crafting & Gathering" type) and relics above the rest of "Items".
# Counts come from the ~1,700 achievements owned by 10% of players or fewer.
ACHV_BUCKETS: list[tuple[str, dict]] = [
    ("gatherer",   {"categories": {"Fisher", "Miner", "Botanist", "Gathering"}}),
    ("crafter",    {"types": {"Crafting & Gathering"}}),
    ("relic",      {"types": {"Items"}, "contains": ("Weapons", "Tools")}),
    ("explorer",   {"types": {"Exploration"}, "categories": {"Field Operations"}}),
    ("treasure",   {"categories": {"Treasure Hunt", "The Hunt"}}),
    ("goldsaucer", {"categories": {"Gold Saucer"}}),
    ("seasonal",   {"categories": {"Seasonal Events"}}),
    ("pvp",        {"types": {"PvP"}}),
    ("oldtimer",   {"types": {"Legacy"}}),
]


# Grades within a playstyle, hardest first, as a share of everything rare that exists
# in that playstyle.
#
# Absolute rather than a ranking against other members: a title should describe what
# someone actually did, so however many people clear the bar all of them earn it, and
# nobody is demoted because a keener collector joined the FC.
#
# Expressed as a share because the buckets are wildly different sizes — the rare
# achievements in Old-timer add up to 505 points against 53 for Gold Saucer, so one
# fixed score would be unreachable in one and trivial in the other. A share means
# "you hold this much of everything rare in that playstyle", which is the same claim
# whichever playstyle it is.
# "Ultimate" is deliberately avoided: in FFXIV that already means the Ultimate raids.
ACHV_TIERS: list[tuple[str, float]] = [
    ("legendary", 0.25),
    ("master", 0.12),
    ("expert", 0.05),
]

# Fewest achievements a graded playstyle can rest on. See tier_for.
GRADE_MIN_ACHV = 3

# Ownership below which an achievement is treated as a bonus rather than as part of
# what a playstyle asks of you. See bucket_maxima.
ATTAINABLE_PCT = 0.5

# Bump whenever achv_points or bucket_maxima changes. The ceilings are cached in
# extra.json so runs that read FFXIV Collect from cache can still grade, which also
# means a new formula would otherwise be graded against the old denominator forever.
BUCKET_MAX_VERSION = 2


def achv_points(pct: float | None) -> float:
    """What one rare achievement is worth: exactly how exclusive it is.

    rare_pct / pct, so an achievement 10% of players own scores 1, 1% scores 10 and
    0.2% scores 50.

    The old curve was 1 + log10(10 / pct), which squeezed the whole 0.2-10% range
    into 1.0-2.7 points. Rarity therefore barely mattered: a pile of nearly-common
    achievements beat a genuinely hard set every time, which is the opposite of what
    these tags are for. Rarity is now what the score is proportional to, and holding
    more of them still adds up because scores are summed.

    The floor matches FFXIV Collect's one-decimal rounding — anything displayed as
    0.0% would otherwise divide by nothing.
    """
    if pct is None:
        return 0.0
    return round(CONFIG["rare_pct"] / max(pct, 0.1), 3)


def bucket_count(v) -> int:
    """Bucket entries are {"n","min"}; older cached runs stored a bare count."""
    return int(v.get("n", 0)) if isinstance(v, dict) else int(v or 0)


def bucket_rarest(v) -> float | None:
    return v.get("min") if isinstance(v, dict) else None


def bucket_score(v) -> float:
    return float(v.get("score", 0.0)) if isinstance(v, dict) else 0.0


def bucket_maxima(rarity: dict[int, dict]) -> dict[str, float]:
    """What a dedicated player in each playstyle could realistically hold.

    Not the sum of everything rare, which is a completionist fantasy rather than a
    yardstick. Gathering has 61 achievements under 0.5% ownership — legendary fish
    and the like — and once rarity drives the score those 61 are 89% of the total,
    so every real collection measured against it lands near zero and no gatherer can
    ever be graded. PvP is worse at 97%; crafting, whose tail is only four
    achievements, is barely affected. Grading against the full sum therefore says
    nothing about the playstyle and everything about the shape of its tail.

    Achievements below ATTAINABLE_PCT are excluded from the denominator only. They
    still score in full, so holding one pushes somebody up the scale rather than
    being expected of them — which is the right way round for content that almost
    nobody finishes.
    """
    out: dict[str, float] = {}
    for info in rarity.values():
        pct = info.get("pct")
        if pct is None or pct > CONFIG["rare_pct"] or pct < ATTAINABLE_PCT:
            continue
        b = achv_bucket(info)
        if b:
            out[b] = round(out.get(b, 0.0) + achv_points(pct), 2)
    return out


def tier_for(score: float, ceiling: float | None,
             count: int = 99) -> tuple[str | None, float | None]:
    """Grade and share of the playstyle, or (None, None) without a ceiling.

    A grade also needs GRADE_MIN_ACHV achievements behind it. Now that one 0.2%
    achievement is worth 50 points, a single lucky find in a small playstyle —
    Treasure holds only 14 rare achievements in total — would otherwise clear the
    Legendary bar on its own, which is not a claim about how someone plays.
    """
    if not ceiling or score <= 0:
        return None, None
    # Clamped because the numerator counts achievements the denominator leaves out,
    # so holding a big pile of the near-impossible ones could in principle read as
    # more than everything.
    share = min(1.0, score / ceiling)
    if count < GRADE_MIN_ACHV:
        return None, share
    for name, need in ACHV_TIERS:
        if share >= need:
            return name, share
    return None, share


def achv_bucket(info: dict) -> str | None:
    """Which playstyle a rare achievement belongs to, or None if it fits nowhere."""
    cat = info.get("category") or ""
    typ = info.get("type") or ""
    for name, rule in ACHV_BUCKETS:
        if cat in rule.get("categories", ()):
            return name
        if typ in rule.get("types", ()):
            if "contains" in rule and not any(w in cat for w in rule["contains"]):
                continue
            return name
    return None


def active_first(members: list[dict]) -> list[dict]:
    """Same members, active ones first.

    Every remote stage here can be cut short — by the hourly FFLogs budget, by the
    step timeout, by an API having a bad day. Whatever gets dropped should be the
    people nobody is looking up, so process the active roster before the 300-odd
    members marked On vacation. These are the same dict objects, so writes still
    land in the caller's list.
    """
    on = [m for m in members if m.get("rank") != ON_VACATION_RANK]
    off = [m for m in members if m.get("rank") == ON_VACATION_RANK]
    return on + off

UA = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 "
                     "fc-member-board (personal FC tool)")}

FFLOGS_TOKEN_URL = "https://www.fflogs.com/oauth/token"
FFLOGS_API_URL = "https://www.fflogs.com/api/v2/client"
COLLECT_API = "https://ffxivcollect.com/api"
LALA_API = "https://lalachievements.com/api"

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
            rank, level, job_icon = None, None, None
            for li in e.select("ul.entry__freecompany__info li"):
                span = li.select_one("span")
                if li.select_one("i.list__ic__class") and span:
                    # The level shown is the level of the job they are wearing,
                    # and the icon beside it says which one. The name is not in
                    # this markup, only the picture — job_icon_name() below is
                    # what turns one into the other.
                    icon = li.select_one("i.list__ic__class img")
                    job_icon = icon["src"] if icon and icon.has_attr("src") else None
                    try:
                        level = int(span.get_text(strip=True))
                    except ValueError:
                        level = None
                elif span and rank is None:
                    rank = span.get_text(strip=True)
            members.append({
                "id": cid,
                "name": e.select_one("p.entry__name").get_text(strip=True),
                "rank": rank, "level": level, "job_icon": job_icon,
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
    """Return (savage_tiers, ultimates, extremes), each newest -> oldest.

    Getting the classification right matters twice over: the newest savage tier is
    what the site calls "the current tier", and anything wrongly counted as a tier
    also gets swept during a legacy backfill, which the free API budget cannot afford.
    """
    q = ("{ worldData { zones { id name "
         "expansion { name } difficulties { id name } "
         "encounters { id name } } } }")
    zones = fflogs_query(token, q)["data"]["worldData"]["zones"] or []
    ults, tiers, extremes = [], [], []
    for z in zones:
        name_l = (z["name"] or "").lower()
        diffs = z.get("difficulties") or []
        base = {"id": z["id"], "name": z["name"],
                "expansion": (z.get("expansion") or {}).get("name"),
                "encounters": [{"id": e["id"], "name": e["name"]}
                               for e in (z.get("encounters") or [])]}
        if any(p in name_l for p in ULTIMATE_PATTERNS):
            ults.append({**base, "difficulty": None})
        elif EXTREME_PATTERN in name_l:
            extremes.append({**base, "difficulty": None})
        elif any((d.get("name") or "").lower() == "savage" for d in diffs):
            if any(p in name_l for p in NON_TIER_SAVAGE):
                continue
            tiers.append({**base, "difficulty": next(
                d["id"] for d in diffs if (d.get("name") or "").lower() == "savage")})
    for lst in (tiers, ults, extremes):
        lst.sort(key=lambda z: z["id"], reverse=True)
    return tiers, ults, extremes


def zone_labels(zone_name: str, is_current: bool) -> list[str] | None:
    if is_current:
        return CONFIG["current_tier_labels"]
    for sub, prefix, start in LEGACY_LABELS:
        if sub.lower() in (zone_name or "").lower():
            return [f"{prefix}{start + i}S" for i in range(4)]
    return None


def build_char_query(chunk: list[dict], zones_for) -> str:
    """zones_for(member) -> the zones to ask about for that member.

    Per member rather than per batch so a one-off sweep can cost extra only for
    the people who still need it.
    """
    body = []
    for i, m in enumerate(chunk):
        zq = []
        for z in zones_for(m):
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
    """Convert zoneRankings -> (encounters that have data, one clear flag per label).

    FFLogs splits a two-part final boss into two encounters — AAC Heavyweight reports
    Lindwurm and Lindwurm II, Anabaseios reports Athena and Pallas Athena — so a
    four-boss tier comes back with five rows. Mapping rows to labels positionally
    would therefore credit the tier clear to part one. Both extra rows belong to the
    final label, they are shown separately as M12S-1 and M12S-2 because they are
    fought and parsed separately, and only part two counts as clearing the tier.
    """
    rankings = blob.get("rankings") or []
    split = bool(labels) and len(rankings) == len(labels) + 1
    if split:
        # Each part gets a slot of its own. They were sharing the last one, with
        # part two overwriting part one, which was right while the board showed a
        # single M12S chip and wrong the moment it wants to show both: a member
        # who is through part one and learning part two had nothing to say so.
        slots = list(range(len(rankings)))
    else:
        slots = list(range(len(rankings)))
    clears = [False] * max(len(labels or []), len(rankings))
    out = []
    for i, rk in enumerate(rankings):
        slot = slots[i] if i < len(slots) else None
        kills = rk.get("totalKills") or 0
        pct = rk.get("rankPercent")
        med = rk.get("medianPercent")
        if slot is not None and slot < len(clears):
            # A later row for the same slot overwrites deliberately: for a split boss
            # the final part is the one that counts.
            clears[slot] = kills > 0
        # Part one and part two of a split boss get their own labels so the board
        # does not show the same name twice with different parses.
        part = ""
        if kills <= 0 and pct is None:
            continue
        out.append({
            "label": (labels[slot] + part if labels and slot is not None
                      and slot < len(labels) else None),
            "encounter_id": (rk.get("encounter") or {}).get("id"),
            "name": (rk.get("encounter") or {}).get("name"),
            "best": round(pct) if pct is not None else None,
            "median": round(med) if med is not None else None,
            "kills": kills,
            "job": rk.get("bestSpec") or rk.get("spec"),
        })
    return out, clears


# How many of a character's recent reports to look through. Six covers about six
# raid nights, which is the window a progress number is still interesting in.
PROGRESS_REPORTS = 6
PROGRESS_BATCH = 6

# How recently a pull has to have happened to count as "still learning". Content
# matters less than freshness here: somebody pulling UCOB last week is progging
# UCOB, whatever tier the rest of the FC is on. Ten days is a little over a raid
# week, so missing one night keeps a member on the board and drifting away takes
# them off it.
PROGRESS_FRESH_DAYS = 10


def _further(phase: int, pct: float | None,
             best_phase: int, best_pct: float | None) -> bool:
    """Is this pull deeper into the fight than the best one so far?

    Phase first, percentage second, and in that order for a reason: boss health
    resets when a phase does. A pull that died at 5% in phase one has a lower
    percentage than one that reached phase four at 60%, and comparing the two
    numbers alone would call the first pull the better one and report somebody as
    barely into a fight they are most of the way through.

    Both are held together because they only mean anything together — the
    percentage is of whatever the boss was doing at the time.
    """
    if pct is None:
        return False
    if best_pct is None:
        return True
    if (phase or 0) != (best_phase or 0):
        return (phase or 0) > (best_phase or 0)
    return pct < best_pct


def _best_pulls(token: str, chunk: list[dict], want: dict[int, str],
                report_cache: dict) -> dict[str, dict]:
    """Best wipe per in-progress fight for each member in the chunk.

    zoneRankings only knows kills. A fight somebody is still learning is invisible
    there — bestAmount 0, no ranks, nothing at all — because FF Logs only ranks
    kills. The pull that reached 0.9% lives in the report instead, so this walks a
    different and heavier road: the reports a character appears in, then the fights
    inside each one.

    Reports are cached across the chunk because an FC raids together: eight members
    usually share the same handful of report codes, and fetching each one once
    turns the expensive half of this pass into a rounding error.

    Attribution is per player, not per report. A report is a night, and somebody
    can sit a pull out — friendlyPlayers on each fight says who was actually in it.
    """
    aliases = []
    for i, m in enumerate(chunk):
        aliases.append(
            f"c{i}: character(name: {json.dumps(m['name'])}, "
            f"serverSlug: \"{CONFIG['server_slug']}\", "
            f"serverRegion: \"{CONFIG['server_region']}\") "
            f"{{ recentReports(limit: {PROGRESS_REPORTS}) "
            f"{{ data {{ code startTime }} }} }}")
    q = "query { characterData { " + " ".join(aliases) + " } }"
    try:
        data = (fflogs_query(token, q)["data"]["characterData"] or {})
    except Exception as ex:
        log(f"Progress — recent reports failed: {ex}")
        return {}

    codes_for: dict[str, list[str]] = {}
    wanted_codes: list[str] = []
    started: dict[str, float] = {}
    cutoff = time.time() - PROGRESS_FRESH_DAYS * 86400
    # Two very different silences look the same from the outside: FF Logs
    # returning no reports for anybody, and returning plenty that are all older
    # than the window. The first is a broken query and the second is an FC that
    # has not raided lately, and only one of them is worth fixing.
    raw = stale = 0
    newest = 0.0
    for i, m in enumerate(chunk):
        blob = data.get(f"c{i}") or {}
        rr = ((blob.get("recentReports") or {}).get("data") or [])
        raw += len(rr)
        codes = []
        for r in rr:
            code = r.get("code")
            if not code:
                continue
            # startTime is milliseconds. A stale report is skipped before it is
            # fetched, which is also the cheapest place to skip it.
            ts = (r.get("startTime") or 0) / 1000.0
            newest = max(newest, ts)
            if ts and ts < cutoff:
                stale += 1
                continue
            started[code] = ts
            codes.append(code)
        codes_for[str(m["id"])] = codes
        for c in codes:
            if c not in report_cache and c not in wanted_codes:
                wanted_codes.append(c)

    if not wanted_codes:
        log(f"Progress — {raw} recent report(s) offered for {len(chunk)} member(s), "
            + (f"all {stale} older than {PROGRESS_FRESH_DAYS} days"
               f" (newest {time.strftime('%Y-%m-%d', time.gmtime(newest))})"
               if raw else "none at all — FF Logs has no recent uploads for them"))

    for start in range(0, len(wanted_codes), PROGRESS_BATCH):
        batch = wanted_codes[start:start + PROGRESS_BATCH]
        parts = [
            f"r{j}: report(code: {json.dumps(code)}) {{ "
            "masterData { actors(type: \"Player\") { id name } } "
            "fights { encounterID kill bossPercentage lastPhase "
            "endTime friendlyPlayers } }"
            for j, code in enumerate(batch)
        ]
        try:
            rd = (fflogs_query(token, "query { reportData { " + " ".join(parts)
                               + " } }")["data"]["reportData"] or {})
        except Exception as ex:
            log(f"Progress — report batch failed: {ex}")
            continue
        for j, code in enumerate(batch):
            rep = rd.get(f"r{j}")
            if not rep:
                report_cache[code] = {}
                continue
            actors = {a["id"]: a["name"]
                      for a in ((rep.get("masterData") or {}).get("actors") or [])}
            per_name: dict[str, dict] = {}
            report_start = started.get(code, 0)
            for f in (rep.get("fights") or []):
                eid = f.get("encounterID")
                if eid not in want:
                    continue
                # A fight's endTime is milliseconds from the start of the report,
                # so this is the moment the pull actually finished rather than the
                # evening it belonged to. Worth the arithmetic: "cleared at 23:41"
                # is a thing that happened, and "cleared on Tuesday" is a filing
                # date.
                ts = report_start + (f.get("endTime") or 0) / 1000.0
                killed = bool(f.get("kill"))
                pct = f.get("bossPercentage")
                if not killed and pct is None:
                    continue
                for aid in (f.get("friendlyPlayers") or []):
                    nm = actors.get(aid)
                    if not nm:
                        continue
                    cur = per_name.setdefault(nm, {})
                    prev = cur.get(eid)
                    if prev is None:
                        prev = cur[eid] = {"pct": None, "phase": 0, "pulls": 0,
                                           "ts": ts, "killed_ts": 0}
                    prev["pulls"] += 1
                    prev["ts"] = max(prev["ts"], ts)
                    if killed:
                        prev["killed_ts"] = max(prev["killed_ts"], ts)
                    elif _further(f.get("lastPhase") or 0, pct,
                                  prev["phase"], prev["pct"]):
                        prev["pct"] = pct
                        prev["phase"] = f.get("lastPhase") or 0
            report_cache[code] = per_name

    out: dict[str, dict] = {}
    for m in chunk:
        best: dict[int, dict] = {}
        for code in codes_for.get(str(m["id"]), []):
            for eid, rec in (report_cache.get(code) or {}).get(m["name"], {}).items():
                cur = best.get(eid)
                if cur is None:
                    best[eid] = dict(rec)
                else:
                    cur["pulls"] += rec["pulls"]
                    if _further(rec["phase"], rec["pct"],
                                cur["phase"], cur["pct"]):
                        cur["pct"], cur["phase"] = rec["pct"], rec["phase"]
                    cur["ts"] = max(cur.get("ts") or 0, rec.get("ts") or 0)
                    cur["killed_ts"] = max(cur.get("killed_ts") or 0,
                                           rec.get("killed_ts") or 0)
        if best:
            out[str(m["id"])] = best
    return out


def run_fflogs(members: list[dict], raids: dict, full_history: bool) -> dict | None:
    token = fflogs_token()
    if not token:
        log("Skipping FFLogs — FFLOGS_CLIENT_ID / FFLOGS_CLIENT_SECRET not set")
        for m in members:
            m["fflogs"] = raids.get(str(m["id"]), {}).get("_status", "skipped")
        return None

    tiers, ults, extremes = fflogs_zones(token)
    if not tiers:
        log("FFLogs: no savage tier found — skipping")
        return None
    current = tiers[0]

    extra = load_json("extra.json", {})
    state = extra.setdefault("pipeline", {})
    cur_extremes = [z for z in extremes if z["expansion"] == current["expansion"]]
    older = tiers[1:]

    # Measured against the live API: roughly nine points per member-zone, against a
    # 3,600/hour budget. Fourteen zones therefore covered only 25 members before the
    # budget was gone. The current tier and its extreme trials are what the board
    # filters on, so those are the fixed set, and everything else — ultimates, older
    # tiers — takes one rotating slot per run. Each additional zone costs about a
    # fifth of the members a run can reach.
    # The newest expansion re-lists every older Ultimate under one "Ultimates
    # (Legacy)" zone, and this used to assume that zone therefore answered for every
    # older fight. It does not: FF Logs keeps rankings in the zone of the expansion
    # the kill was logged in, so somebody who cleared UCOB in Shadowbringers has it
    # in a Shadowbringers zone and nowhere else. Checked against a member holding
    # UCOB, TEA and DSR — the current Ultimates (Legacy) zone reported none of them.
    #
    # An Ultimate clear never expires, so the fix is to ask every ultimate zone once
    # per member and then stop. Members not yet swept cost six extra zones, which
    # slows a run to roughly 23 members instead of 40; once the roster is covered
    # the extra zones disappear and the pace returns.
    cur_ults = [z for z in ults if z["expansion"] == current["expansion"]]
    old_ults = [z for z in ults if z not in cur_ults]
    zones = [current] + cur_extremes + cur_ults
    rotating = older + old_ults
    if full_history:
        zones += rotating
        log(f"FFLogs [FULL HISTORY] — adding all {len(rotating)} other zones; "
            "expect to exhaust the hourly budget after a few dozen members")
    elif rotating:
        idx = int(state.get("zone_cursor", 0)) % len(rotating)
        zones.append(rotating[idx])
        state["zone_cursor"] = (idx + 1) % len(rotating)
        log(f"FFLogs rotating zone {idx + 1}/{len(rotating)}: {rotating[idx]['name']}")

    log(f"FFLogs current tier: {current['name']} ({current['id']}) "
        f"[{current['expansion']}]")
    # Every Ultimate plus the current tier. An old Ultimate belongs here because
    # people still learn them years later; whether it shows is decided by how
    # recently it was pulled, not by which tier it belongs to.
    want_encounters: dict[int, str] = {}
    for e in current.get("encounters") or []:
        want_encounters[e["id"]] = "savage"
    for z in ults:
        for e in z.get("encounters") or []:
            want_encounters[e["id"]] = "ultimate"

    # Who still needs the one-off sweep of the older ultimate zones.
    swept = set(state.get("ult_swept") or [])
    sweeping: set[str] = set()

    log(f"FFLogs zones this run: {len(zones)} — "
        + ", ".join(z["name"] for z in zones))
    left = len([m for m in members if str(m["id"]) not in swept])
    if left and not full_history:
        log(f"FFLogs ultimate sweep — {left}/{len(members)} members still need the "
            f"{len(old_ults)} older ultimate zones asked once")

    # Only the zones actually queried, so a zone left out this run keeps whatever a
    # previous run stored for it instead of being wiped.
    def zones_for(m: dict) -> list[dict]:
        if full_history or str(m["id"]) in swept:
            return zones
        sweeping.add(str(m["id"]))
        return zones + [z for z in old_ults if z not in zones]

    queried = {z["id"] for z in zones}
    ex_ids = {z["id"] for z in cur_extremes} & queried
    # Every zone that could appear in any member's query, so zmeta can resolve it.
    zmeta = {z["id"]: z for z in zones + old_ults}
    enc_names = {e["id"]: e["name"]
                 for z in [current, *ults]
                 for e in (z.get("encounters") or [])}
    # One report serves everybody who was in it, and an FC raids together.
    report_cache: dict = {}
    bs = CONFIG["fflogs_batch_size"]

    # Members already covered in this pass. A run gets through a fraction of the
    # roster before the budget runs out, so without this every run would re-fetch the
    # same first names forever and the rest would never be reached. Tracked by id
    # rather than by index so it survives people joining and leaving.
    done_ids = set(state.get("fflogs_cycle") or [])
    queue = [m for m in active_first(members) if str(m["id"]) not in done_ids]
    if not queue:
        done_ids = set()
        queue = active_first(members)
        log("FFLogs — previous pass covered everyone; starting a new one")
    log(f"FFLogs — {len(queue)} members left in this pass "
        f"({len(done_ids)}/{len(members)} already covered)")

    def remember(processed: list[dict]) -> None:
        done_ids.update(str(x["id"]) for x in processed)
        state["fflogs_cycle"] = sorted(done_ids)
        # Whoever was swept for the older ultimate zones is swept for good — an
        # Ultimate clear never expires, so asking again would buy nothing. Recorded
        # alongside the cursor so a run cut short by the quota keeps what it did.
        ids = {str(x["id"]) for x in processed}
        swept.update(ids & sweeping)
        state["ult_swept"] = sorted(swept)
        save_json("extra.json", extra)

    save_json("extra.json", extra)

    for start in range(0, len(queue), bs):
        chunk = queue[start:start + bs]
        try:
            payload = fflogs_query(token, build_char_query(chunk, zones_for))
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

            # Drop rows written before ultimates were stored per fight. They carry
            # only a zone name, and two different zones are both called "Ultimates
            # (Legacy)", so they cannot be told apart on screen. Better to show
            # nothing for a day or two until the zone rotation refills them.
            member_zone_ids = {z["id"] for z in zones_for(m)}
            member_ult_ids = {z["id"] for z in ults} & member_zone_ids
            new_ults = [u for u in entry.get("ultimates", []) if u.get("name")]
            new_ults = [u for u in new_ults if u.get("zone_id") not in member_ult_ids]
            new_ex = entry.get("extremes", [])
            new_ex = [e for e in new_ex if e.get("zone_id") not in ex_ids]
            legacy = entry.get("legacy", [])
            has_any = False

            for key, zblob in blob.items():
                if not key.startswith("z") or not isinstance(zblob, dict):
                    continue
                zid = int(key[1:])
                z = zmeta[zid]
                if zid in ex_ids:
                    # Extreme trials: no tier labels, one row per trial. Kept per
                    # encounter so the board can filter on individual fights.
                    encs, _ = encounters_from_blob(zblob, None)
                    for e in encs:
                        has_any = True
                        new_ex.append({
                            "zone": z["name"], "zone_id": zid,
                            "expansion": z.get("expansion"),
                            "name": e["name"], "best": e["best"],
                            "kills": e["kills"], "job": e["job"],
                            "cleared": e["kills"] > 0,
                        })
                elif zid in member_ult_ids:
                    # One row per ultimate, not per zone: "Ultimates (Legacy)" holds
                    # five separate fights, and rolling them into a single entry threw
                    # away which ones a member had actually cleared.
                    encs, _ = encounters_from_blob(zblob, None)
                    for e in encs:
                        has_any = True
                        new_ults.append({
                            "zone": z["name"], "zone_id": zid,
                            "expansion": z.get("expansion"),
                            "name": e["name"], "best": e["best"],
                            "kills": e["kills"], "job": e["job"],
                            "cleared": e["kills"] > 0,
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

            new_ults.sort(key=lambda u: (-u["zone_id"], u.get("name") or ""))
            new_ex.sort(key=lambda e: (-e["zone_id"], e["name"] or ""))
            legacy.sort(key=lambda lz: lz["zone_id"], reverse=True)
            entry["ultimates"] = new_ults
            entry["extremes"] = new_ex
            entry["legacy"] = legacy
            entry["_status"] = "ok" if (has_any or entry.get("current", {}).get("encounters")
                                       or new_ults or new_ex or legacy) else "none"
            m["fflogs"] = entry["_status"]

        rl = payload["data"].get("rateLimitData") or {}
        spent, limit = rl.get("pointsSpentThisHour", 0), rl.get("limitPerHour", 3600)
        if limit and spent > limit * 0.85:
            # Sleeping out the reset can burn an hour per stall and still not finish, so
            # bank what we have and let the next scheduled run continue instead. Members
            # not reached keep whatever their previous run stored.
            save_json("raids.json", raids)
            remember(queue[: start + bs])
            log(f"FFLogs quota nearly spent ({spent:.0f}/{limit}) after "
                f"{min(start + bs, len(queue))}/{len(queue)} members — "
                "stopping here; the next run resumes from the next member")
            for rest in queue[start + bs:]:
                rest["fflogs"] = raids.get(str(rest["id"]), {}).get("_status", "pending")
            break

        # Progress for the members just processed. Kept to whoever has something
        # unfinished: a cleared fight is complete and says nothing about progress,
        # and the report walk is the expensive half of this pipeline.
        pending = []
        for m in chunk:
            entry = raids.get(str(m["id"])) or {}
            cur = entry.get("current") or {}
            done_names = {e.get("name") for e in (cur.get("encounters") or [])
                          if (e.get("kills") or 0) > 0}
            done_names |= {u.get("name") for u in (entry.get("ultimates") or [])
                           if (u.get("kills") or 0) > 0}
            unfinished = {eid: kind for eid, kind in want_encounters.items()
                          if enc_names.get(eid) not in done_names}
            if unfinished and entry.get("_status") not in ("hidden", "none"):
                pending.append(m)
        if pending and not full_history:
            try:
                found = _best_pulls(token, pending, want_encounters, report_cache)
            except Exception as ex:
                log(f"Progress — pass failed: {ex}")
                found = {}
            # Logged either way: without this, a pass that never ran and one that
            # ran and found nothing look identical from the outside.
            log(f"Progress — read logs for {len(pending)} member(s), "
                f"{len(found)} with something recent "
                f"({len(report_cache)} reports cached)")
            for m in pending:
                entry = raids.setdefault(str(m["id"]), {})
                cur = entry.get("current") or {}
                # How many times each fight has ever been killed, which is what
                # separates a first clear from a Tuesday.
                kill_count: dict[str, int] = {}
                for e in (cur.get("encounters") or []) + (entry.get("ultimates") or []):
                    if e.get("name"):
                        kill_count[e["name"]] = e.get("kills") or 0
                done_names = {n for n, k in kill_count.items() if k > 0}
                rows = []
                for eid, rec in (found.get(str(m["id"])) or {}).items():
                    name = enc_names.get(eid)
                    if not name:
                        continue
                    killed_ts = rec.get("killed_ts") or 0
                    ts = rec.get("ts") or 0
                    if killed_ts:
                        # Killed in these logs: say so, and drop the best wipe.
                        # "Was at 0.9%" stops being the story the moment it dies.
                        #
                        # Only the first one, and only when that can be shown.
                        # Somebody who cleared the tier months ago and went back
                        # in to help a friend was being announced as having Just
                        # cleared it, which is both wrong and the opposite of the
                        # news — they are the veteran in that party, not the one
                        # who finally got there.
                        #
                        # Exactly one kill on record is the whole test. More than
                        # one and this was not the first; none at all and we
                        # cannot tell, which is a reason to say nothing rather
                        # than a reason to guess. A first clear that goes
                        # unmentioned is a smaller failure than a veteran
                        # congratulated for arriving.
                        if kill_count.get(name, 0) != 1:
                            continue
                        rows.append({
                            "encounter_id": eid, "name": name,
                            "kind": want_encounters.get(eid), "state": "cleared",
                            "pct": None, "phase": 0, "pulls": rec["pulls"],
                            "last": time.strftime("%Y-%m-%d", time.gmtime(killed_ts)),
                            "last_ts": int(killed_ts),
                        })
                        continue
                    # A kill recorded on an earlier run counts too, even if it is
                    # not in the reports still on file.
                    if name in done_names or rec.get("pct") is None:
                        continue
                    rows.append({
                        "encounter_id": eid, "name": name,
                        "kind": want_encounters.get(eid), "state": "learning",
                        "pct": round(rec["pct"], 2), "phase": rec["phase"],
                        "pulls": rec["pulls"],
                        "last": (time.strftime("%Y-%m-%d", time.gmtime(ts))
                                 if ts else None),
                        "last_ts": int(ts) if ts else None,
                    })
                # A first clear leads, because it is the bigger news. Otherwise
                # the furthest they have got: deepest phase, then lowest boss
                # percentage. Sorting wipes by date instead put last night's
                # first-pull reset above the 0.9% from the night before, which
                # is the wrong end of the story — "how far are they" is the
                # question, and the answer does not get smaller because a week
                # went badly.
                rows.sort(key=lambda r: (
                    r["state"] == "cleared",
                    r["phase"] or 0,
                    -(r["pct"] if r["pct"] is not None else 100.0),
                    r["last"] or "",
                ), reverse=True)
                if rows:
                    entry["progress"] = rows
                else:
                    entry.pop("progress", None)

        done = min(start + bs, len(queue))
        if done % 50 < bs:
            log(f"FFLogs — {done}/{len(queue)} members")
            save_json("raids.json", raids)   # checkpoint: a timeout keeps this much
            remember(queue[:done])
        time.sleep(0.3)
    else:
        remember(queue)                      # whole pass finished without stopping

    save_json("raids.json", raids)
    return {"current_zone": current, "ultimate_zones": ults,
            "extreme_zones": cur_extremes}


# Grades for job proficiency, hardest first. Absolute, like the playstyle grades:
# whoever clears the bar earns it. The board only shows Expert and above — the point
# is finding somebody who could teach a newcomer, and below that the answer is no.
JOB_TIERS: list[tuple[str, float]] = [
    ("legendary", 80.0),
    ("master", 65.0),
    ("expert", 50.0),
]

# Content is not equally hard, and a parse percentile is only ever measured against
# the people doing that same content — so 99 in an Ultimate is measured against a far
# stronger field than 99 in an Extreme, and should not count the same.
#
# Two knobs, because they answer different questions:
#   weight — how much a fight shapes someone's average at all
#   bonus  — what the same parse is worth once it is in there
CONTENT_WEIGHT = {"ultimate": 3.0, "savage": 2.0, "legacy": 1.5, "extreme": 1.0}
CONTENT_BONUS = {"ultimate": 12.0, "savage": 5.0, "legacy": 3.0, "extreme": 0.0}


def score_jobs(entry: dict) -> dict[str, dict]:
    """Rate each job this member has logged on, for "who could teach this?".

    Skill is their best parses averaged with each fight weighted by how many times
    they killed it, not the single highest and not a flat mean.

    Flat mean was wrong: a Samurai main with 22 kills at 99 on their usual fight was
    dragged to Master by two fights they had touched twice, whose parses mean almost
    nothing. Weighting by kills says a parse earned over twenty pulls describes the
    player and a parse from two does not — which is the same reason the single
    highest is no good either.

    Experience then *scales* that skill rather than adding to it. Adding them up let a
    99 parse off two kills reach Expert on the parse alone, which is exactly the
    person you would not ask. As a multiplier, a thin record caps what a good parse
    can be worth, and the two components it blends are:

    * kills, log-scaled — the gap between 5 and 50 kills is enormous, 500 to 1,000
      barely matters;
    * distinct fights — someone who has only ever done one boss knows one boss.
    """
    acc: dict[str, dict] = {}

    def add(job, best, kills, kind):
        if not job:
            return
        r = acc.setdefault(job, {"fights": 0, "kills": 0, "parses": []})
        r["fights"] += 1
        r["kills"] += kills or 0
        if best is not None:
            # A fight with no kills still counts once, so a pure prog parse is not
            # thrown away entirely. Capped at 100 so the hardest content cannot
            # invent a parse better than a perfect one.
            weight = max(kills or 0, 1) * CONTENT_WEIGHT[kind]
            r["parses"].append((min(100.0, best + CONTENT_BONUS[kind]), weight, kind))

    for e in (entry.get("current") or {}).get("encounters", []):
        add(e.get("job"), e.get("best"), e.get("kills"), "savage")
    for e in entry.get("extremes", []):
        add(e.get("job"), e.get("best"), e.get("kills"), "extreme")
    for u in entry.get("ultimates", []):
        add(u.get("job"), u.get("best"), u.get("kills"), "ultimate")
    for lz in entry.get("legacy", []):
        for e in lz.get("encounters", []):
            add(e.get("job"), e.get("best"), e.get("kills"), "legacy")

    out: dict[str, dict] = {}
    for job, r in acc.items():
        wsum = sum(w for _, w, _ in r["parses"])
        parse = (round(sum(p * w for p, w, _ in r["parses"]) / wsum, 1)
                 if wsum else 0.0)
        hardest = max((k for _, _, k in r["parses"]),
                      key=lambda k: CONTENT_WEIGHT[k], default=None)
        depth = min(1.0, math.log10(1 + r["kills"]) / 2.0)    # ~100 kills tops it out
        breadth = min(1.0, r["fights"] / 4.0)                 # four fights tops it out
        experience = 0.7 * depth + 0.3 * breadth
        # Floor of 0.25: a strong parse on a thin record still counts for something,
        # just nowhere near enough to reach a tier on its own.
        score = round(parse * (0.25 + 0.75 * experience), 1)
        tier = next((n for n, need in JOB_TIERS if score >= need), None)
        out[job] = {"fights": r["fights"], "kills": r["kills"], "parse": parse,
                    "score": score, "tier": tier, "hardest": hardest}
    return out


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
    for e in entry.get("extremes", []):
        if e.get("best") is not None:
            best = max(best or 0, e["best"])
    m["parse"] = best
    m["savage_kills"] = sum(1 for c in cur.get("clears", []) if c)
    # The furthest thing still being learned, for the roster row. Only the best
    # one: a list of every unfinished boss is a paragraph, and the deepest pull is
    # the one that answers "how far are they".
    prog = entry.get("progress") or []
    # The headline and the whole list. Somebody can clear two bosses for the
    # first time in one week and be learning two more, and picking one of those
    # four to represent the others was throwing away most of what happened.
    m["progress"] = prog[0] if prog else None
    m["progress_all"] = prog or None
    # Any ranked encounter in the current tier, cleared or not — what separates
    # "progging" from "has not touched it".
    m["current_seen"] = bool(cur.get("encounters"))
    ults = entry.get("ultimates", [])
    m["ult_clears"] = sum(1 for u in ults if u.get("cleared"))
    # Named, so the board can say which ultimates without loading raids.json.
    m["ult_cleared"] = sorted({u["name"] for u in ults
                               if u.get("cleared") and u.get("name")})
    m["current_clears"] = cur.get("clears") or None

    # Extreme trials of the current patch: the board filters on individual fights, so
    # keep the cleared names as well as the count.
    # Only the cleared names and total kills. A per-member "out of N" would be wrong
    # here: this list holds the trials FFLogs had data for, not every trial in the
    # patch. The board compares against board.extremes for the real denominator.
    ex = entry.get("extremes", [])
    m["ex_cleared"] = sorted(e["name"] for e in ex if e.get("cleared") and e.get("name"))
    m["ex_kills"] = sum(e.get("kills") or 0 for e in ex)

    # Per-job proficiency, plus the single best job so the board can name one without
    # loading the whole raid file.
    jobs = score_jobs(entry)
    m["job_scores"] = jobs
    best_job = max(jobs.items(), key=lambda kv: kv[1]["score"], default=None)
    m["job_top"] = ({"job": best_job[0], **best_job[1]}
                    if best_job and best_job[1]["tier"] else None)

    # Separates "raided in an older expansion" from "raiding now", which the tags need.
    m["legacy_clears"] = sum(
        1 for lz in entry.get("legacy", [])
        for e in lz.get("encounters", []) if (e.get("kills") or 0) > 0)
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
        out[a["id"]] = {
            "pct": pct,
            "type": (a.get("type") or {}).get("name"),
            "name": a.get("name"),
            "icon": a.get("icon"),
            "category": (a.get("category") or {}).get("name"),
            "patch": a.get("patch"),
            "points": a.get("points"),
            "title": ((a.get("reward") or {}).get("title") or {}).get("name"),
        }
    log(f"FFXIV Collect — achievement reference list: {len(out)} entries")
    return out


COLLECT_FIELDS = ("mounts", "minions", "rare_achv",
                  "ach_public", "portrait", "ult_achv", "achv_seen_at")

# Bump whenever COLLECT_FIELDS gains something, or whenever achv_points changes.
# Cached entries written before a new field existed cannot supply it, and because the
# cache is judged fresh by age alone the field would stay empty forever — which is
# exactly what happened to ult_achv. Bucket scores are cached the same way, so a new
# scoring formula that did not bump this would keep serving the old numbers until the
# cache aged out.
COLLECT_CACHE_VERSION = 4


def keep_achievements(m: dict, prev: dict) -> None:
    """Carry the last readable achievements forward when this reading has none.

    Achievements are readable only while The Lodestone is set to show them, and
    that switch gets flipped both ways — sometimes on purpose, sometimes by a
    patch resetting a profile. Without this, one reading taken during a closed
    window wipes a member's shelf and their playstyle grades, and nothing brings
    them back until they open it again and somebody notices.

    So a reading that cannot see achievements is treated as no news rather than
    as bad news. It does not touch `ach_public`, which keeps saying what the
    profile says right now, and it records when the shelf was last actually
    read, so a page showing it can say how old it is instead of implying it is
    current.

    The same reasoning covers a fetch that failed or a character Collect has
    never heard of. Neither is evidence that anything went away.
    """
    if m.get("rare_achv") is not None:
        return                              # this reading saw them; nothing to keep
    if prev.get("rare_achv") is None:
        return                              # nothing was ever known
    m["rare_achv"] = prev.get("rare_achv")
    m["achv_buckets"] = dict(prev.get("achv_buckets") or {})
    if prev.get("rare_ids"):
        m["_rare_ids"] = list(prev["rare_ids"])
    # An Ultimate the achievement vouched for stays vouched for. FF Logs may
    # never have had a log of it, and a closed profile is not a lost clear.
    if not m.get("ult_achv"):
        m["ult_achv"] = list(prev.get("ult_achv") or [])
    m["achv_seen_at"] = prev.get("achv_seen_at")


def merge_ultimates(members: list[dict]) -> None:
    """Union the FF Logs ultimates with the ones proved by achievements.

    FF Logs only knows about fights somebody uploaded, so a member can hold the
    clear achievement and still show nothing there. Counting both means the board
    stops calling those members "no data" when Lodestone says otherwise.
    """
    gained = 0
    for m in members:
        from_logs = set(m.get("ult_cleared") or [])
        from_achv = set(m.get("ult_achv") or [])
        merged = sorted(from_logs | from_achv)
        if from_achv - from_logs:
            gained += 1
        m["ult_cleared"] = merged
        m["ult_clears"] = len(merged)
        # Which ones only the achievement vouches for, so the page can say so
        # rather than implying there is a log to go and read.
        m["ult_achv_only"] = sorted(from_achv - from_logs)
    log(f"Ultimates — achievements added clears for {gained} members "
        "that FF Logs did not have")


def hydrate_collect(members: list[dict], cache: dict) -> int:
    """Fill collection stats in from the last fetch instead of hitting the API.

    members.json is rebuilt from scratch every run, so a stage that does not run
    would otherwise blank the fields it owns. Caching them is what lets the schedule
    run often for FFLogs progress without re-asking FFXIV Collect about 502
    characters each time — their mount and minion counts do not move by the hour.
    """
    hit = 0
    for m in members:
        c = cache.get(str(m["id"]))
        if not c:
            m.update({k: None for k in COLLECT_FIELDS})
            continue
        for k in COLLECT_FIELDS:
            m[k] = c.get(k)
        m["achv_buckets"] = dict(c.get("achv_buckets") or {})
        if c.get("rare_ids"):
            m["_rare_ids"] = list(c["rare_ids"])
        hit += 1
    return hit


def run_collect(members: list[dict], rarity: dict[int, dict], delay: float,
                cache: dict) -> None:
    today = time.strftime("%Y-%m-%d", time.gmtime())
    for i, m in enumerate(active_first(members), 1):
        # What was known last time. A reading that comes back without
        # achievements is not allowed to erase them, so the old values have to
        # be to hand before this one overwrites anything.
        prev = cache.get(str(m["id"])) or {}
        m.update({"mounts": None, "minions": None, "rare_achv": None,
                  "ach_public": None, "portrait": None})
        got = False
        try:
            r = requests.get(f"{COLLECT_API}/characters/{m['id']}",
                             params={"ids": "true"}, headers=UA, timeout=30)
            if r.status_code != 404:
                r.raise_for_status()
                d = r.json()
                m["portrait"] = d.get("portrait")
                m["mounts"] = (d.get("mounts") or {}).get("count")
                m["minions"] = (d.get("minions") or {}).get("count")
                ach = d.get("achievements") or {}
                m["ach_public"] = ach.get("public")
                ids = ach.get("ids") or []
                # Independent of FF Logs on purpose — this is the evidence for members
                # who never uploaded a log or who hide their profile there.
                m["ult_achv"] = sorted({ULTIMATE_ACHV[a] for a in ids if a in ULTIMATE_ACHV})
                if m["ach_public"] and ids:
                    rare = 0
                    buckets: dict[str, dict] = {}
                    rarest: list[tuple[float, int]] = []
                    for aid in ids:
                        info = rarity.get(aid)
                        if not info:
                            continue
                        if info["pct"] is not None and info["pct"] <= CONFIG["rare_pct"]:
                            rare += 1
                            rarest.append((info["pct"], aid))
                            # Playstyle buckets count rare achievements only: everyone
                            # trips over the common ones, so they say nothing about how
                            # someone actually spends their time.
                            b = achv_bucket(info)
                            if b:
                                slot = buckets.setdefault(
                                    b, {"n": 0, "min": None, "score": 0.0})
                                slot["n"] += 1
                                p = info["pct"]
                                slot["score"] = round(
                                    slot["score"] + achv_points(p), 2)
                                if slot["min"] is None or p < slot["min"]:
                                    slot["min"] = p
                    m["rare_achv"] = rare
                    m["achv_buckets"] = buckets
                    # Rarest first, capped: a member can hold hundreds under 10%, and the
                    # profile page only shows a shelf of them. Underscore-prefixed so it
                    # is dropped before members.json is written.
                    rarest.sort()
                    m["_rare_ids"] = [aid for _, aid in rarest[: CONFIG["rare_show"]]]
                    m["achv_seen_at"] = today
                got = True
        except Exception as ex:
            log(f"Collect error @ {m['name']}: {ex}")
        # A closed profile, a fetch that failed, and a character Collect has
        # never heard of are all no news rather than bad news. Done before the
        # cache is written so what is carried forward is carried forward there
        # too, and not quietly dropped on the next run.
        keep_achievements(m, prev)
        if got:
            cache[str(m["id"])] = {**{k: m.get(k) for k in COLLECT_FIELDS},
                                   "rare_ids": m.get("_rare_ids") or [],
                                   "achv_buckets": m.get("achv_buckets") or {}}
        if i % 50 == 0:
            log(f"FFXIV Collect — {i}/{len(members)} members")
        time.sleep(delay)


# ──────────────────────────────────────────────────────────────────────────────
# 3b) Lalachievements — real acquisition dates
# ──────────────────────────────────────────────────────────────────────────────
def _last_date(items: list[dict]) -> int | None:
    xs = [x.get("date") for x in items or [] if x.get("date")]
    return max(xs) if xs else None


def lala_summary(d: dict) -> dict:
    """Boil a character payload down to the few fields worth storing.

    Every item carries a `date`. Anything the character already owned when the site
    first indexed them is stamped with that index date, so the earliest dates are not
    real; the *latest* date is, which is the one we want. Achievements are the best
    signal of the three because Lodestone publishes their true completion dates going
    back years — but they are absent entirely when the player hides achievements.
    """
    lm, lmi = _last_date(d.get("mounts")), _last_date(d.get("minions"))
    la = _last_date(d.get("achievements"))
    return {
        "last_mount": lm, "last_minion": lmi, "last_achv": la,
        "last_active": max([x for x in (lm, lmi, la) if x], default=None),
        "mounts": len(d.get("mounts") or []),
        "minions": len(d.get("minions") or []),
        "achievements": len(d.get("achievements") or []),
        "achv_private": bool(d.get("achievementsPrivate")),
        "mount_rank": d.get("mountRank"), "minion_rank": d.get("minionRank"),
        "achv_rank": d.get("achievementRank"),
        "race": d.get("raceName"), "tribe": d.get("tribeName"),
        # When the site last re-read this character from Lodestone. last_active can
        # never be fresher than this, so the frontend has to show it for context.
        "synced": (d.get("updatedAt") or 0) // 1000 or None,
        "indexed": (d.get("createdAt") or 0) // 1000 or None,
    }


def run_lalachievements(members: list[dict], extra: dict) -> None:
    store = extra.setdefault("lala", {})
    delay = CONFIG["lala_delay"]
    pending = active_first(members)
    stats = {"ok": 0, "adding": 0, "failed": 0}

    for pass_no in range(1, CONFIG["lala_passes"] + 1):
        if not pending:
            break
        still = []
        for i, m in enumerate(pending, 1):
            try:
                r = requests.get(f"{LALA_API}/char/{m['id']}/", headers=UA, timeout=30)
                if r.status_code != 200:
                    still.append(m)
                else:
                    d = r.json()
                    if isinstance(d, dict) and set(d.keys()) == {"status"}:
                        # Not indexed yet; the request itself queues them for later.
                        if pass_no == 1:
                            stats["adding"] += 1
                        still.append(m)
                    else:
                        store[str(m["id"])] = lala_summary(d)
                        stats["ok"] += 1
            except Exception:
                still.append(m)
            if i % 100 == 0:
                log(f"Lalachievements pass {pass_no} — {i}/{len(pending)}")
            time.sleep(delay)
        pending = still
    stats["failed"] = len(pending)

    save_json("extra.json", extra)
    log(f"Lalachievements — {stats['ok']} fetched this run, "
        f"{stats['adding']} queued for indexing, {stats['failed']} unavailable; "
        f"{len(store)}/{len(members)} known in total")
    inject_lala(members, store)


def inject_lala(members: list[dict], store: dict) -> None:
    """Copy stored Lalachievements values onto members.

    Separate from the fetch so a run that skips the fetch still shows what earlier
    runs collected, rather than dropping last_active for everyone.
    """
    for m in members:
        s = store.get(str(m["id"])) or {}
        m["last_active"] = (time.strftime("%Y-%m-%d", time.gmtime(s["last_active"]))
                            if s.get("last_active") else None)
        m["lala_synced"] = (time.strftime("%Y-%m-%d", time.gmtime(s["synced"]))
                            if s.get("synced") else None)
        m["mount_rank"] = s.get("mount_rank")
        m["minion_rank"] = s.get("minion_rank")
        if not m.get("race") and s.get("race"):
            m["race"] = s["race"]          # fallback only; Lodestone is authoritative
            m["clan"] = m.get("clan") or s.get("tribe")


# ──────────────────────────────────────────────────────────────────────────────
# 4) Tags
# ──────────────────────────────────────────────────────────────────────────────
def build_achievements(members: list[dict], rarity: dict[int, dict]) -> None:
    """Write the rarest achievements per member, plus a catalog of just those.

    Split into its own file because only /member/[id] renders it; members.json stays
    the light payload the board loads. The catalog holds only referenced ids rather
    than all ~3,950, which keeps it to a fraction of the full list.
    """
    per: dict[str, list[int]] = {}
    used: set[int] = set()
    for m in members:
        ids = m.pop("_rare_ids", None)
        if ids:
            per[str(m["id"])] = ids
            used.update(ids)

    if not per:
        # --skip-collect, or Collect was unreachable. Keep the previous file rather
        # than replacing real data with an empty one.
        log("Rare achievements — nothing collected this run, keeping the existing file")
        return

    catalog = {}
    for aid in sorted(used):
        info = rarity.get(aid) or {}
        catalog[str(aid)] = {
            "name": info.get("name"), "pct": info.get("pct"),
            "icon": info.get("icon"), "category": info.get("category"),
            "type": info.get("type"), "patch": info.get("patch"),
            "points": info.get("points"), "title": info.get("title"),
            # Which playstyle tag this one feeds, so the page can show why it counts
            # rather than leaving the connection to the tags implicit.
            "bucket": achv_bucket(info),
        }
    save_json("achv.json", {"catalog": catalog, "members": per})
    log(f"Rare achievements — {len(per)} members, {len(catalog)} distinct achievements")


def _all_extreme_names(raids: dict) -> set[str]:
    """Every current-patch extreme FFLogs reported, cleared by anyone or not."""
    out = set()
    for entry in raids.values():
        if not isinstance(entry, dict):
            continue
        for e in entry.get("extremes") or []:
            if e.get("name"):
                out.add(e["name"])
    return out


def _cut(values: list, pct: float) -> float:
    """Value at the given percentile of whatever the FC actually has."""
    xs = sorted(x for x in values if x)
    if not xs:
        return float("inf")
    return xs[min(len(xs) - 1, int(len(xs) * pct / 100))]


def assign_tags(members: list[dict], bucket_max: dict[str, float] | None = None) -> None:
    """Tag the roster against how this FC actually looks, not fixed numbers.

    The old rules read as wrong on real data. Absolute cutoffs (300 mounts, 120
    crafting achievements) describe some other FC, "raider" covered anyone with a
    single kill years ago, and everyone whose logs and achievements are both private
    collapsed into one big "unknown" bucket even when their extreme-trial record was
    sitting right there.
    """
    # One cutoff per playstyle, taken across only the members who have any of that
    # kind at all. A shared threshold would be meaningless: 84 rare relic
    # achievements exist against 33 for Gold Saucer, so the same number means very
    # different things depending on the bucket.
    bucket_cut = {
        name: _cut([bucket_count((m.get("achv_buckets") or {}).get(name))
                    for m in members], 70)
        for name, _ in ACHV_BUCKETS
    }
    log("Tag cutoffs from this roster — "
        + " ".join(f"{k}>={v}" for k, v in bucket_cut.items() if v != float("inf")))

    ceilings = bucket_max or {}

    for m in members:
        tags = []
        clears = m.get("current_clears") or []
        cleared_n = sum(1 for c in clears if c)

        if m.get("ult_clears", 0) > 0:
            tags.append("ultimate")

        # One state per member, newest evidence wins: raiding this tier beats having
        # raided years ago. Without the chain someone could read as both at once.
        #
        # There is no separate "raider" tag. It sat alongside tier-clear and prog on
        # every current-tier raider and said nothing those two did not already say
        # more precisely.
        if clears and cleared_n == len(clears):
            tags.append("tier-clear")                # current tier fully cleared
        elif cleared_n > 0 or m.get("current_seen"):
            # Logged in the tier without clearing everything — which is what progging
            # is. Keyed off having any ranked encounter, so someone still working on
            # the first boss counts too.
            tags.append("prog")
        elif m.get("legacy_clears", 0) > 0 or m.get("ult_clears", 0) > 0:
            tags.append("veteran")                   # cleared before, not this tier

        if m.get("ex_cleared"):
            tags.append("extreme")

        # Playstyle tags, graded against everyone else who plays that way.
        tiers: dict[str, str] = {}
        for name, _ in ACHV_BUCKETS:
            v = (m.get("achv_buckets") or {}).get(name)
            n = bucket_count(v)
            if not n:
                continue
            # Recorded for anyone who has any of this kind, not only for those who
            # clear the tag cut: the share is what the leaderboards rank by, and
            # mixing shares with raw scores in one column compares two scales. The
            # cut only decides whether the playstyle is a big enough part of what
            # they do to label them with it.
            t, share = tier_for(bucket_score(v), ceilings.get(name), n)
            if share is not None and isinstance(v, dict):
                v["share"] = round(share, 4)
            if n >= bucket_cut[name]:
                tags.append(name)
                if t:
                    tiers[name] = t
        m["achv_tiers"] = tiers

        if not tags:
            blind = (m.get("fflogs") in ("hidden", "none", "skipped", "error", "pending")
                     and not m.get("ach_public") and not m.get("mounts"))
            # Achievements deliberately closed is not the same as nothing to
            # say. Nearly half the roster was reading as "Casual" — a claim
            # about how they play — when the only true statement was that we
            # cannot see. `is False` and not falsy: None means Collect has
            # never looked, which is the "No data" case below.
            if m.get("ach_public") is False:
                tags.append("private")
            else:
                tags.append("unknown" if blind else "casual")
        m["tags"] = list(dict.fromkeys(tags))


# ──────────────────────────────────────────────────────────────────────────────
# 5) Activity feed + history
# ──────────────────────────────────────────────────────────────────────────────
# Stats watched to decide whether a character did anything since the last run.
TRACKED_STATS = ("parse", "ult", "mounts", "minions", "rare", "level", "cc")


# What a playstyle is called in a sentence, matching the tag labels on the board.
BUCKET_LABEL = {
    "crafter": "Crafter", "gatherer": "Gatherer", "relic": "Relic grinder",
    "explorer": "Explorer", "treasure": "Treasure hunter",
    "goldsaucer": "Gold Saucer collector", "seasonal": "Seasonal collector",
    "pvp": "PvP player", "oldtimer": "Old-timer",
}
TIER_LABEL = {"legendary": "Legendary", "master": "Master", "expert": "Expert"}
TIER_RANK = {"expert": 1, "master": 2, "legendary": 3}

# Round numbers worth remarking on. "+1 mount" every other day is noise; passing
# 500 of them is not.
MOUNT_MARKS = (100, 200, 300, 400, 500, 600, 700)
MINION_MARKS = (200, 300, 400, 500, 600, 700, 800)


def _marks_crossed(before, after, marks) -> int | None:
    """The highest milestone passed between two counts, if any."""
    if before is None or after is None:
        return None
    hit = [x for x in marks if before < x <= after]
    return max(hit) if hit else None


# ──────────────────────────────────────────────────────────────────────────────
# Naming what happened
# ──────────────────────────────────────────────────────────────────────────────
def learn_job_icons(extra: dict, character_id: int) -> dict[str, str]:
    """Read one character's class_job page and learn every icon on it."""
    cache = extra.setdefault("job_icons", {})
    host = CONFIG["lodestone_host"]
    try:
        r = requests.get(
            f"https://{host}.finalfantasyxiv.com/lodestone/character/{character_id}/class_job/",
            headers=UA, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        for li in soup.select(".character__job li"):
            icon = li.select_one(".character__job__icon img")
            name = li.select_one(".character__job__name")
            if icon and icon.has_attr("src") and name:
                cache[icon["src"]] = name.get_text(strip=True)
    except Exception as ex:
        log(f"Job icons — could not read class_job for {character_id}: {ex}")
    return cache


def job_of(m: dict, extra: dict) -> str | None:
    """The job this member is wearing, by name, if we can say."""
    icon = m.get("job_icon")
    if not icon:
        return None
    cache = extra.setdefault("job_icons", {})
    if icon not in cache:
        # One page names every job there is, so a miss is worth one fetch and
        # then never again.
        learn_job_icons(extra, m["id"])
    return cache.get(icon)


def best_parse_fight(m: dict, raids: dict) -> tuple[str, str | None] | None:
    """Which encounter the member's best parse came from, and on what job.

    members.json keeps only the number, because that is all the board shows. The
    feed wants to say where it happened, and raids.json has kept the per-fight
    breakdown all along — so the answer is a lookup rather than another request.
    """
    entry = raids.get(str(m["id"])) or {}
    target = m.get("parse")
    if target is None:
        return None
    pools = [(entry.get("current") or {}).get("encounters") or [],
             entry.get("ultimates") or [],
             entry.get("extremes") or []]
    for lz in entry.get("legacy") or []:
        pools.append(lz.get("encounters") or [])
    for pool in pools:
        for e in pool:
            if e.get("best") == target and e.get("name"):
                return e["name"], e.get("job")
    return None


def make_snapshot(members: list[dict], rare_ids: dict | None = None) -> dict:
    rare_ids = rare_ids or {}
    return {str(m["id"]): {
        "name": m["name"], "parse": m.get("parse"), "ult": m.get("ult_clears", 0),
        "mounts": m.get("mounts"), "minions": m.get("minions"),
        "rare": m.get("rare_achv"), "level": m.get("level"),
        "cc": m.get("current_clears"),
        # Kept so the feed can name what somebody actually earned rather than
        # counting it. A count only ever produces "unlocked 3 rare achievements",
        # which is the least interesting true thing to say about the event.
        "rare_ids": sorted(rare_ids.get(str(m["id"])) or []),
        "tiers": dict(m.get("achv_tiers") or {}),
        "jobs": {j: v.get("tier") for j, v in (m.get("job_scores") or {}).items()
                 if v.get("tier")},
        "ex": sorted(m.get("ex_cleared") or []),
        "ults": sorted(m.get("ult_cleared") or []),
    } for m in members}


def build_feed(members: list[dict], today: str,
               raids: dict | None = None, extra: dict | None = None) -> None:
    old = load_json("snapshot.json", {})
    # achv.json is written just before this runs and holds both the per-member
    # rare achievement ids and the catalogue they index into, so the feed can say
    # which achievement somebody earned and how rare it is.
    achv = load_json("achv.json", {})
    catalog = achv.get("catalog") or {}
    new = make_snapshot(members, achv.get("members") or {})
    by_id = {str(m["id"]): m for m in members}
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
            # Every improvement counts. A personal best is a personal best, and the
            # feed no longer drowns in them now that grades, named achievements and
            # extreme clears sit alongside.
            if n["parse"] is not None and (o.get("parse") or -1) < n["parse"]:
                # A number on its own is a number. Naming the fight is what
                # makes it something anybody can react to — 98 on an Ultimate
                # and 98 on a four-year-old extreme are not the same news.
                where = best_parse_fight(by_id.get(mid) or {}, raids or {})
                text = f"set a new best parse: {n['parse']}"
                if where:
                    fight, job = where
                    text += f" on {fight}"
                    if job:
                        text += f" as {re.sub(r'([a-z])([A-Z])', r' ', job)}"
                ev("parse_up", mid, n["name"], text)
            occ, ncc = o.get("cc") or [], n.get("cc") or []
            for i, c in enumerate(ncc):
                if c and (i >= len(occ) or not occ[i]):
                    lb = labels[i] if i < len(labels) else f"boss {i+1}"
                    ev("boss_clear", mid, n["name"], f"cleared {lb} for the first time 🎉")
            knows_ults = "ults" in o
            gained_ult = ([u for u in n["ults"] if u not in (o.get("ults") or [])]
                          if knows_ults else [])
            if gained_ult:
                for u in gained_ult:
                    ev("ult_clear", mid, n["name"], f"cleared {u} 🏆")
            elif n["ult"] > (o.get("ult") or 0):
                # FF Logs saw a clear it cannot name — still worth saying.
                ev("ult_clear", mid, n["name"], "cleared an Ultimate 🏆")

            if "ex" in o:
                for x in n["ex"]:
                    if x not in (o.get("ex") or []):
                        ev("ex_clear", mid, n["name"], f"cleared {x} (Extreme)")

            # Playstyle and job grades: the milestones people actually talk about,
            # and the ones the rest of the board is built around.
            if "tiers" in o:
                o_tiers = o.get("tiers") or {}
                for bucket, tier in (n["tiers"] or {}).items():
                    if TIER_RANK.get(tier, 0) > TIER_RANK.get(o_tiers.get(bucket), 0):
                        ev("grade_up", mid, n["name"],
                           f"is now a {TIER_LABEL.get(tier, tier)} "
                           f"{BUCKET_LABEL.get(bucket, bucket)} ✨")
            if "jobs" in o:
                o_jobs = o.get("jobs") or {}
                for job, tier in (n["jobs"] or {}).items():
                    if TIER_RANK.get(tier, 0) > TIER_RANK.get(o_jobs.get(job), 0):
                        ev("job_up", mid, n["name"],
                           f"is now a {TIER_LABEL.get(tier, tier)} "
                           f"{re.sub(r'([a-z])([A-Z])', r'\1 \2', job)}")
            mark = _marks_crossed(o.get("mounts"), n["mounts"], MOUNT_MARKS)
            if mark:
                ev("mounts_up", mid, n["name"], f"passed {mark} mounts 🐎")
            mark = _marks_crossed(o.get("minions"), n["minions"], MINION_MARKS)
            if mark:
                ev("minions_up", mid, n["name"], f"passed {mark} minions")

            # Name the rarest of whatever arrived, and say how rare it is —
            # "0.4% of players have it" is the part that makes it worth reading.
            gained = ([i for i in n["rare_ids"] if i not in set(o.get("rare_ids") or [])]
                      if "rare_ids" in o else [])
            if gained:
                def _pct(i):
                    v = (catalog.get(str(i)) or {}).get("pct")
                    return 999.0 if v is None else float(v)
                gained.sort(key=_pct)
                info = catalog.get(str(gained[0])) or {}
                name = info.get("name")
                pct = info.get("pct")
                if name:
                    text = f"earned {name}"
                    if pct is not None and pct <= 5:
                        text += f" — only {pct}% of players have it"
                    if len(gained) > 1:
                        text += f", and {len(gained) - 1} more"
                    ev("rare_up", mid, n["name"], text)
                elif n["rare"] is not None and (o.get("rare") or 0) < n["rare"]:
                    ev("rare_up", mid, n["name"],
                       f"unlocked {n['rare'] - o['rare']} rare achievement(s)")
            if (o.get("level") or 0) < 100 and n["level"] == 100:
                # The level on the roster belongs to whichever job they are
                # wearing, so that is the one that just capped.
                job = job_of(by_id.get(mid) or {}, extra) if extra is not None else None
                ev("level_100", mid, n["name"],
                   f"reached level 100 on {job}!" if job else "reached level 100!")
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


def build_history(members: list[dict], today: str, guests: int | None = None) -> None:
    hist = load_json("history.json", {"rows": []})
    has = lambda t: sum(1 for m in members if t in m["tags"])  # noqa: E731
    final_boss = sum(1 for m in members
                     if (m.get("current_clears") or [False])[-1])
    # Every tag, not just the raiding ones — the FC does plenty besides raid, and a
    # history that only tracks raid progress can only ever tell that story.
    tag_counts: dict[str, int] = {}
    for m in members:
        for t in m["tags"]:
            tag_counts[t] = tag_counts.get(t, 0) + 1

    # How the company itself is doing, rather than what it plays. Recorded from
    # here on: no row before today has these, because nothing was counting them,
    # and they cannot be worked out after the fact from anything that was kept.
    vacation = sum(1 for m in members if m.get("rank") == ON_VACATION_RANK)
    row = {"date": today, "total": len(members), "tags": tag_counts,
           "raider": has("tier-clear") + has("prog"),   # kept: older rows use this key
           "ultimate": has("ultimate"), "extreme": has("extreme"),
           "unknown": has("unknown"), "final_boss": final_boss,
           "active": len(members) - vacation, "vacation": vacation}
    if guests is not None:
        row["guests"] = guests
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


def parse_title(soup) -> str | None:
    """The title the character is actually wearing in game.

    Sits above the name in the Lodestone header and is the label the player chose
    for themselves, which is why the site shows it in place of the FC rank: the
    rank says where somebody sits in this Free Company's hierarchy, the title says
    who they decided to be. Plenty of characters have none, so the caller has to
    cope with null.
    """
    el = soup.select_one("p.frame__chara__title")
    text = el.get_text(strip=True) if el else ""
    return text or None


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
    """Scrape per-character detail (title, nameday, race/clan) from Lodestone.

    A single page request covers all of it, so this stays exactly as gentle on
    Lodestone as the old nameday-only pass. Normally it works through 'batch'
    characters per run and cycles until everyone is covered; --full-extras sweeps
    the whole roster in one go instead, which is what the once-a-day schedule
    does and what the initial backfill did.

    Entries expire. None of this is fixed for life — a title in particular is
    changed whenever somebody feels like it — so a cache that only ever filled in
    blanks would have frozen half the roster at whatever they happened to be
    wearing the first time this ran.
    """
    extra = load_json("extra.json", {"nameday": {}})
    namedays = extra.setdefault("nameday", {})
    charas = extra.setdefault("chara", {})
    # Due if never fetched, if the cached entry predates a field, or if it has
    # simply gone stale. The middle case is keyed on the key being absent rather
    # than on its value, so a character who genuinely wears no title is not
    # mistaken for one who has never been asked.
    cutoff = time.time() - CONFIG["extras_max_age_h"] * 3600
    def due(m: dict) -> bool:
        c = charas.get(str(m["id"]))
        if c is None or str(m["id"]) not in namedays:
            return True
        if "title" not in c:
            return True
        return float(c.get("at") or 0) < cutoff
    todo = [m for m in active_first(members) if due(m)]
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
            charas[str(m["id"])] = {**parse_race_clan(soup),
                                    "title": parse_title(soup),
                                    "at": time.time()}
        except Exception as ex:
            log(f"Character extras error @ {m['name']}: {ex}")
        if i % 20 == 0:
            log(f"Character extras — {i}/{len(todo)}")
        time.sleep(CONFIG["delay_lodestone"])
    save_json("extra.json", extra)
    with_race = sum(1 for v in charas.values() if v.get("race"))
    with_title = sum(1 for v in charas.values() if v.get("title"))
    log(f"Character extras — nameday {len(namedays)}/{len(members)}, "
        f"race {with_race}/{len(members)}, title {with_title}/{len(members)}")
    # inject into members
    for m in members:
        c = charas.get(str(m["id"])) or {}
        m["nameday"] = namedays.get(str(m["id"]))
        m["race"] = c.get("race")
        m["clan"] = c.get("clan")
        m["title"] = c.get("title")


# ──────────────────────────────────────────────────────────────────────────────
# main
# ──────────────────────────────────────────────────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-fflogs", action="store_true")
    ap.add_argument("--skip-collect", action="store_true")
    ap.add_argument("--skip-news", action="store_true")
    ap.add_argument("--skip-lala", action="store_true",
                    help="skip the Lalachievements enrichment pass")
    ap.add_argument("--full-history", action="store_true",
                    help="sweep every savage tier ever released (weekly run)")
    ap.add_argument("--full-extras", action="store_true",
                    help="fetch title + nameday + race/clan for the whole roster in one run")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--nameday-batch", type=int, default=CONFIG["nameday_batch"])
    ap.add_argument("--collect-delay", type=float, default=CONFIG["delay_collect"])
    ap.add_argument("--collect-max-age", type=float, default=CONFIG["collect_max_age_h"],
                    help="hours before FFXIV Collect is re-fetched (0 = every run)")
    ap.add_argument("--lala-max-age", type=float, default=CONFIG["lala_max_age_h"],
                    help="hours before Lalachievements is re-fetched (0 = every run)")
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

    # Collection stats change slowly, and the schedule runs often so FFLogs coverage
    # can catch up. Re-asking FFXIV Collect about 502 characters every run would be
    # rude for data that barely moves, so it refreshes at most once a day and every
    # other run reads the cache.
    extra = load_json("extra.json", {})
    state = extra.setdefault("pipeline", {})
    collect_cache = extra.setdefault("collect", {})
    fresh = (time.time() - float(state.get("collect_at") or 0)) < args.collect_max_age * 3600
    outdated = int(state.get("collect_v") or 0) != COLLECT_CACHE_VERSION
    refresh_collect = not args.skip_collect and (not fresh or not collect_cache or outdated)
    if outdated and collect_cache:
        log("FFXIV Collect — cache predates the current field set, refetching")

    rarity: dict[int, dict] = {}
    if refresh_collect:
        rarity = collect_rarity_map()
        run_collect(members, rarity, args.collect_delay, collect_cache)
        state["collect_at"] = time.time()
        state["collect_v"] = COLLECT_CACHE_VERSION
        save_json("extra.json", extra)
        build_achievements(members, rarity)
    else:
        hit = hydrate_collect(members, collect_cache)
        log(f"FFXIV Collect — reused cached stats for {hit}/{len(members)} members"
            + (" (--skip-collect)" if args.skip_collect else ""))
        for m in members:
            m.pop("_rare_ids", None)   # achv.json is already correct; leave it alone

    build_character_extras(members, args.nameday_batch, args.full_extras)

    # Same reasoning, and this one accumulates in extra.json anyway: members already
    # fetched keep their values, so a skipped run costs nothing but freshness.
    extra = load_json("extra.json", {})
    state = extra.setdefault("pipeline", {})
    lala_fresh = (time.time() - float(state.get("lala_at") or 0)) < args.lala_max_age * 3600
    if not args.skip_lala and not lala_fresh:
        run_lalachievements(members, extra)
        state["lala_at"] = time.time()
        save_json("extra.json", extra)
    else:
        inject_lala(members, extra.get("lala") or {})
        log(f"Lalachievements — reused {len(extra.get('lala') or {})} cached entries")

    # After Collect, because that is where the achievement evidence comes from.
    merge_ultimates(members)

    # Grades are a share of what a playstyle realistically asks of you, so the
    # ceilings have to survive runs that read FFXIV Collect from cache and never see
    # the catalogue. If they are missing — or were computed by an older version of
    # bucket_maxima — fetch the catalogue on its own. It is a single request, and
    # without it no playstyle tag can be graded at all.
    stale_ceilings = int(state.get("bucket_max_v") or 0) != BUCKET_MAX_VERSION
    if stale_ceilings and state.get("bucket_max"):
        log("Playstyle ceilings — formula changed, recomputing")
    if not rarity and (stale_ceilings or not state.get("bucket_max"))             and not args.skip_collect:
        try:
            rarity = collect_rarity_map()
        except Exception as ex:
            log(f"Playstyle grades — could not load the achievement catalogue: {ex}")
    if rarity:
        state["bucket_max"] = bucket_maxima(rarity)
        state["bucket_max_v"] = BUCKET_MAX_VERSION
        save_json("extra.json", extra)
    ceilings = state.get("bucket_max") or {}
    if not ceilings:
        log("Playstyle grades skipped — no achievement catalogue available")

    # After every source has reported, so the cutoffs see the real distribution.
    assign_tags(members, ceilings)

    if not args.skip_news:
        build_news()
    build_feed(members, today, raids, extra)
    # The feed may have learned what a job icon is called on its way past, and
    # that is worth keeping: it is one fetch that names every job in the game.
    save_json("extra.json", extra)
    # Guests are not on the roster, so their number comes from the file the
    # guest pass writes. Absent on a checkout that has never run it, and then
    # the row simply has no guest count rather than claiming there are none.
    guest_file = load_json("guests.json", {})
    build_history(members, today,
                  guest_file.get("count") if guest_file else None)

    out = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "fc": {"name": CONFIG["fc_name"], "id": CONFIG["fc_id"],
               "world": CONFIG["world"], "dc": CONFIG["dc"],
               "region": CONFIG["server_region"], "total": len(members)},
        "current_tier": {
            "labels": CONFIG["current_tier_labels"],
            "zone": (zone_info or {}).get("current_zone"),
        },
        # Every extreme trial of the current patch, in FFLogs order, so the board can
        # offer one filter chip per fight without hardcoding the list.
        "extremes": sorted({name for m in members for name in (m.get("ex_cleared") or [])}
                           | {e for e in _all_extreme_names(raids)}),
        "members": members,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    log(f"Wrote members.json — {len(members)} members")


if __name__ == "__main__":
    main()
