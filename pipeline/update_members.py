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
    "current_tier_labels": ["M9S", "M10S", "M11S", "M12S"],

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
    """Return (savage_tiers, ultimates, extremes), each newest -> oldest.

    Getting the classification right matters twice over: the newest savage tier is
    what the site calls "the current tier", and anything wrongly counted as a tier
    also gets swept during a legacy backfill, which the free API budget cannot afford.
    """
    q = ("{ worldData { zones { id name "
         "expansion { name } difficulties { id name } } } }")
    zones = fflogs_query(token, q)["data"]["worldData"]["zones"] or []
    ults, tiers, extremes = [], [], []
    for z in zones:
        name_l = (z["name"] or "").lower()
        diffs = z.get("difficulties") or []
        base = {"id": z["id"], "name": z["name"],
                "expansion": (z.get("expansion") or {}).get("name")}
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
        slots = list(range(len(labels) - 1)) + [len(labels) - 1, len(labels) - 1]
    else:
        slots = list(range(len(rankings)))
    clears = [False] * (len(labels) if labels else len(rankings))
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
        if split and slot == len(labels) - 1:
            part = "-1" if i == len(rankings) - 2 else "-2"
        if kills <= 0 and pct is None:
            continue
        out.append({
            "label": (labels[slot] + part if labels and slot is not None
                      and slot < len(labels) else None),
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
    # The newest expansion re-lists every older Ultimate under one "Ultimates (Legacy)"
    # zone, so its three zones cover all seven fights. Rotating through all nine
    # ultimate zones instead meant a member was asked about one of them per run and
    # showed a single Ultimate for weeks while holding several.
    cur_ults = [z for z in ults if z["expansion"] == current["expansion"]]
    zones = [current] + cur_extremes + cur_ults
    rotating = older + [z for z in ults if z not in cur_ults]
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
    log(f"FFLogs zones this run: {len(zones)} — "
        + ", ".join(z["name"] for z in zones))

    # Only the zones actually queried, so a zone left out this run keeps whatever a
    # previous run stored for it instead of being wiped.
    queried = {z["id"] for z in zones}
    ult_ids = {z["id"] for z in ults} & queried
    ex_ids = {z["id"] for z in cur_extremes} & queried
    zmeta = {z["id"]: z for z in zones}
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
        save_json("extra.json", extra)

    save_json("extra.json", extra)

    for start in range(0, len(queue), bs):
        chunk = queue[start:start + bs]
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

            # Drop rows written before ultimates were stored per fight. They carry
            # only a zone name, and two different zones are both called "Ultimates
            # (Legacy)", so they cannot be told apart on screen. Better to show
            # nothing for a day or two until the zone rotation refills them.
            new_ults = [u for u in entry.get("ultimates", []) if u.get("name")]
            new_ults = [u for u in new_ults if u.get("zone_id") not in ult_ids]
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
                elif zid in ult_ids:
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
                  "ach_public", "portrait", "ult_achv")

# Bump whenever COLLECT_FIELDS gains something, or whenever achv_points changes.
# Cached entries written before a new field existed cannot supply it, and because the
# cache is judged fresh by age alone the field would stay empty forever — which is
# exactly what happened to ult_achv. Bucket scores are cached the same way, so a new
# scoring formula that did not bump this would keep serving the old numbers until the
# cache aged out.
COLLECT_CACHE_VERSION = 3


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
    for i, m in enumerate(active_first(members), 1):
        m.update({"mounts": None, "minions": None, "rare_achv": None,
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
        except Exception as ex:
            log(f"Collect error @ {m['name']}: {ex}")
        else:
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
            tags.append("unknown" if blind else "casual")
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
    # Every tag, not just the raiding ones — the FC does plenty besides raid, and a
    # history that only tracks raid progress can only ever tell that story.
    tag_counts: dict[str, int] = {}
    for m in members:
        for t in m["tags"]:
            tag_counts[t] = tag_counts.get(t, 0) + 1

    row = {"date": today, "total": len(members), "tags": tag_counts,
           "raider": has("tier-clear") + has("prog"),   # kept: older rows use this key
           "ultimate": has("ultimate"), "extreme": has("extreme"),
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
    todo = [m for m in active_first(members)
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
    ap.add_argument("--skip-lala", action="store_true",
                    help="skip the Lalachievements enrichment pass")
    ap.add_argument("--full-history", action="store_true",
                    help="sweep every savage tier ever released (weekly run)")
    ap.add_argument("--full-extras", action="store_true",
                    help="fetch nameday + race/clan for the whole roster in one run")
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

    # Grades are a share of everything rare in each playstyle, so the ceilings have to
    # survive runs that read FFXIV Collect from cache and never see the catalogue.
    # If they are missing, fetch the catalogue on its own — it is a single request,
    # and without it no playstyle tag can be graded at all.
    if not rarity and not state.get("bucket_max") and not args.skip_collect:
        try:
            rarity = collect_rarity_map()
        except Exception as ex:
            log(f"Playstyle grades — could not load the achievement catalogue: {ex}")
    if rarity:
        state["bucket_max"] = bucket_maxima(rarity)
        save_json("extra.json", extra)
    ceilings = state.get("bucket_max") or {}
    if not ceilings:
        log("Playstyle grades skipped — no achievement catalogue available")

    # After every source has reported, so the cutoffs see the real distribution.
    assign_tags(members, ceilings)

    if not args.skip_news:
        build_news()
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
