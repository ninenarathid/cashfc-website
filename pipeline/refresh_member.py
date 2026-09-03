#!/usr/bin/env python3
"""Bring one member's collection up to date now, without waiting for the queue.

The nightly pipeline asks FFXIV Collect about five hundred characters and takes
its time about it, politely. That is the right pace for a schedule and the wrong
one for the moment somebody says "I've just made my achievements public, why is
the site still empty?"

    python pipeline/refresh_member.py "Aqua Eleison"
    python pipeline/refresh_member.py 15308846
    python pipeline/refresh_member.py "Aqua Eleison" --no-refresh   # skip step 1

── Why this is two problems, not one ─────────────────────────────────────

The site does not read The Lodestone. It reads FFXIV Collect, which reads The
Lodestone, and Collect only does so when somebody asks it to. So a member can
open their profile and change nothing at all here: Collect goes on serving the
answer it took months ago. That is not a stale cache on our side that a re-run
would fix — re-running the whole pipeline would fetch the same old answer five
hundred times.

So step one presses Refresh on Collect, which is the button a person would press
on the character's page there, and waits for the re-read. Step two does what the
pipeline's Collect stage does, for one character, by calling the pipeline's own
code rather than a copy of it — the scoring, the rarity threshold and the
playstyle buckets cannot drift from the nightly run because they are the same
functions.

What this writes is the cache and the achievement file. Everything derived from
them — the member's tags, their grades, the feed — is left to the pipeline,
which is told at the end how to rebuild it all from cache in one quick pass and
without asking Collect about anybody else.
"""
from __future__ import annotations

import argparse
import re
import sys
import time

import requests

import update_members as P

SITE = "https://ffxivcollect.com"
# The Refresh button on a character's page. A GET here is a redirect to /404 —
# it is posted, the way the site's own markup says (`data-method="post"`).
REFRESH = SITE + "/character/refresh/{cid}"
TOKEN_RE = re.compile(r'<meta name="csrf-token" content="([^"]+)"')

BROWSER = {"User-Agent": (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 cashfc-member-board "
    "(personal FC tool, single-character refresh)")}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def find(members: list[dict], who: str) -> dict:
    """A member by Lodestone id, or by name, or by enough of a name."""
    if who.isdigit():
        for m in members:
            if str(m["id"]) == who:
                return m
    lower = who.lower()
    exact = [m for m in members if m["name"].lower() == lower]
    part = [m for m in members if lower in m["name"].lower()]
    for hits in (exact, part):
        if len(hits) == 1:
            return hits[0]
        if len(hits) > 1:
            names = ", ".join(m["name"] for m in hits[:8])
            sys.exit(f"{who!r} matches {len(hits)} members: {names}")
    sys.exit(f"Nobody on the roster matches {who!r}")


def ask_collect_to_reread(cid: int) -> bool:
    """Press Refresh, and say whether Collect actually re-read the character.

    Collect rate-limits this on its own, so a press that changes nothing is a
    normal outcome rather than a failure — the data on hand is simply as fresh
    as Collect is willing to make it.
    """
    s = requests.Session()
    page = s.get(f"{SITE}/characters/{cid}", headers=BROWSER, timeout=30)
    page.raise_for_status()
    token = TOKEN_RE.search(page.text)
    if not token:
        log("No CSRF token on the character page — the site has changed shape.")
        return False

    before = s.get(f"{P.COLLECT_API}/characters/{cid}",
                   headers=P.UA, timeout=30).json().get("last_parsed")
    r = s.post(REFRESH.format(cid=cid),
               headers={**BROWSER, "X-CSRF-Token": token.group(1),
                        "Referer": f"{SITE}/characters/{cid}"},
               allow_redirects=False, timeout=180)
    log(f"Refresh — HTTP {r.status_code}")

    # Collect re-reads The Lodestone in the background, so the answer is not
    # ready the instant the POST returns.
    for wait in (3, 5, 8, 12):
        time.sleep(wait)
        after = s.get(f"{P.COLLECT_API}/characters/{cid}",
                      headers=P.UA, timeout=30).json().get("last_parsed")
        if after != before:
            log(f"Collect re-read them — {before} to {after}")
            return True
    log(f"Collect did not re-read them (still {before}); using what it has")
    return False


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("who", help="Lodestone id, or a name or part of one")
    ap.add_argument("--no-refresh", action="store_true",
                    help="do not ask Collect to re-read The Lodestone first")
    a = ap.parse_args()

    board = P.load_json("members.json", {})
    members = board.get("members") or []
    if not members:
        sys.exit("data/members.json has no roster — run the pipeline first.")
    who = find(members, a.who)
    cid = who["id"]
    log(f"{who['name']} — {cid}")

    if not a.no_refresh:
        ask_collect_to_reread(cid)

    extra = P.load_json("extra.json", {})
    cache = extra.setdefault("collect", {})
    before = dict(cache.get(str(cid)) or {})

    # The pipeline's own Collect stage, run against a party of one. Same
    # thresholds, same scoring, same cache shape — because it is the same code.
    rarity = P.collect_rarity_map()
    collections = P.collection_rarity_map()
    one = {"id": cid, "name": who["name"], "rank": who.get("rank")}
    P.run_collect([one], rarity, 0.0, cache, collections)

    if one.get("rare_achv") is None and one.get("ach_public") is not True:
        log(f"Achievements are still not readable (ach_public="
            f"{one.get('ach_public')!r}). Nothing new to record.")
        if before.get("rare_achv") is not None:
            log(f"Keeping the {before['rare_achv']} already on file.")

    P.save_json("extra.json", extra)
    log("extra.json — Collect cache updated")

    # achv.json is a whole-roster file that the pipeline only rewrites on a full
    # Collect pass, so one member's shelf is spliced into it here. The catalogue
    # holds only ids somebody actually has, so new ones are added and nothing is
    # removed — another member may still be pointing at an entry this one drops.
    ids = one.pop("_rare_ids", None) or []
    achv = P.load_json("achv.json", {"catalog": {}, "members": {}})
    if ids:
        achv.setdefault("members", {})[str(cid)] = ids
        catalog = achv.setdefault("catalog", {})
        added = 0
        for aid in ids:
            if str(aid) in catalog:
                continue
            info = rarity.get(aid) or {}
            catalog[str(aid)] = {
                "name": info.get("name"), "pct": info.get("pct"),
                "icon": info.get("icon"), "category": info.get("category"),
                "type": info.get("type"), "patch": info.get("patch"),
                "points": info.get("points"), "title": info.get("title"),
                "bucket": P.achv_bucket(info),
            }
            added += 1
        P.save_json("achv.json", achv)
        log(f"achv.json — {len(ids)} on the shelf, {added} new to the catalogue")

    log("")
    log(f"  rare achievements  {one.get('rare_achv')}")
    log(f"  playstyle buckets  "
        f"{ {k: v['n'] for k, v in (one.get('achv_buckets') or {}).items()} }")
    log(f"  mounts / minions   {one.get('mounts')} / {one.get('minions')}")
    log(f"  ultimates by achv  {one.get('ult_achv')}")
    log(f"  achievements read  {one.get('achv_seen_at')}")
    log("")
    log("Now rebuild the derived files from cache — no Collect calls, one pass:")
    log("  python pipeline/update_members.py --skip-fflogs --skip-news "
        "--skip-lala --skip-collect")


if __name__ == "__main__":
    main()
