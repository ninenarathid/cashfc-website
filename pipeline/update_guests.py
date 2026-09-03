#!/usr/bin/env python3
"""Look up the people who registered here but are not in the Free Company.

A guest is somebody who claimed a character the FC roster does not contain — a
friend, a static-mate from another company, an alt on another world. The site
knows their name and their picture, because they told it, and nothing else. So
their row said less than any FC member's, and the two questions anybody actually
has about somebody from outside — which world, and whose company — went
unanswered.

    python pipeline/update_guests.py
    python pipeline/update_guests.py --dry-run     # say who it would look up
    python pipeline/update_guests.py --force       # re-read everybody

── Why this is its own file ──────────────────────────────────────────────

The main pipeline works from the FC roster, which by definition never mentions a
guest. The list of them lives in Supabase instead, and this is the only part of
the pipeline that reads it.

It reads with the anon key — the same one already shipped inside the website's
JavaScript, where anybody can read it — and it only reads. Nothing here needs
permission to write anything, so nothing here is given it. The result is a data
file the site loads like any other, which is also why no database column and no
migration are involved: a fact scraped from a public page is not something a
member owns or edits.

Guests are few and the answers barely move, so a character already on file is
left alone for a week — long enough that this costs a handful of requests, short
enough that somebody who transfers server is not described by last month's
answer forever. --force re-reads everybody now.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time

import requests
from bs4 import BeautifulSoup

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "data")

LODESTONE = "https://na.finalfantasyxiv.com/lodestone/character/{cid}/"
UA = {"User-Agent": ("cashfc-website/1.0 (FFXIV FC member board; "
                     "github.com/ninenarathid/cashfc-website)")}
DELAY = 1.5

# How long a guest's world and company are taken on trust before being read
# again. They change when somebody transfers or joins a company, which is rare
# but not never, and a week of being wrong about which server a friend is on is
# about as long as anybody would forgive. Seven entries a week is nothing to
# The Lodestone; re-reading everybody every night for this would be.
MAX_AGE_DAYS = 7


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def load(name: str, fallback):
    path = os.path.join(DATA, name)
    if not os.path.exists(path):
        return fallback
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(name: str, value) -> None:
    with open(os.path.join(DATA, name), "w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False, indent=1)
        f.write("\n")


def env_local() -> dict[str, str]:
    """The website's own env file, so this runs locally without ceremony."""
    out: dict[str, str] = {}
    path = os.path.join(os.path.dirname(HERE), ".env.local")
    if not os.path.exists(path):
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip("\"'")
    return out


def claimed_ids(url: str, key: str) -> list[dict]:
    """Every verified claim, from PostgREST. Read-only, with the public key."""
    r = requests.get(
        f"{url}/rest/v1/profiles",
        params={"select": "character_id,character_name",
                "character_id": "not.is.null",
                "character_verified_at": "not.is.null"},
        headers={"apikey": key, "Authorization": f"Bearer {key}", **UA},
        timeout=30)
    r.raise_for_status()
    return r.json()


def look_up(cid: int) -> dict | None:
    """World, data centre and Free Company, from the character's own page."""
    r = requests.get(LODESTONE.format(cid=cid), headers=UA, timeout=30)
    if r.status_code == 404:
        return {"gone": True}
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    world, dc = None, None
    el = soup.select_one("p.frame__chara__world")
    if el:
        # Written as "Tonberry [Elemental]" — the world and the data centre it
        # belongs to, in one line.
        text = el.get_text(" ", strip=True)
        if "[" in text:
            world, rest = text.split("[", 1)
            world, dc = world.strip(), rest.rstrip("]").strip()
        else:
            world = text.strip()

    fc_el = soup.select_one(".character__freecompany__name h4")
    name_el = soup.select_one("p.frame__chara__name")
    return {
        "name": name_el.get_text(strip=True) if name_el else None,
        "world": world,
        "dc": dc,
        # None means they are in no company at all, which is a real answer and
        # a different one from "we have not looked".
        "fc": fc_el.get_text(strip=True) if fc_el else None,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true",
                    help="re-read guests already on file")
    a = ap.parse_args()

    env = {**env_local(), **os.environ}
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        log("No Supabase URL/anon key — nothing to read. "
            "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
        # Not a failure: a checkout without the website's env is a normal thing
        # to run the rest of the pipeline in.
        return 0

    board = load("members.json", {})
    roster = {m["id"] for m in board.get("members") or []}
    if not roster:
        log("No roster on file — run update_members.py first.")
        return 1

    try:
        claims = claimed_ids(url, key)
    except Exception as ex:
        log(f"Could not read the claims: {ex}")
        return 1

    guests = {c["character_id"]: c.get("character_name")
              for c in claims if c.get("character_id") not in roster}
    log(f"{len(claims)} verified claims, {len(guests)} of them from outside the FC")

    out = load("guests.json", {"guests": {}})
    known = out.setdefault("guests", {})

    def due(cid: int) -> bool:
        entry = known.get(str(cid))
        if entry is None:
            return True                       # never looked at
        seen = entry.get("seen")
        if not seen:
            return True                       # written before dates were kept
        try:
            age = (dt.date.today() - dt.date.fromisoformat(seen)).days
        except ValueError:
            return True                       # unreadable date, read them again
        return age >= MAX_AGE_DAYS

    todo = [cid for cid in guests if a.force or due(cid)]
    if a.dry_run:
        for cid in todo:
            log(f"  would look up {guests[cid] or cid} ({cid})")
        log(f"{len(todo)} to look up, {len(guests) - len(todo)} already on file")
        return 0

    for n, cid in enumerate(todo, 1):
        try:
            got = look_up(cid)
        except Exception as ex:
            log(f"  ! {cid}: {ex}")
            continue
        if got:
            # Merged over what is already there, not written in its place. This
            # entry is shared: collect_missing.py puts the mount and minion
            # counts in it and update_guest_stats.py puts the tags and clears,
            # and a straight assignment here would have deleted both — which it
            # never did only because until now this never revisited anybody.
            known[str(cid)] = {**known.get(str(cid), {}), **got,
                               "seen": time.strftime("%Y-%m-%d")}
        if n % 10 == 0:
            log(f"  {n}/{len(todo)}")
        time.sleep(DELAY)

    # Somebody who left the FC becomes a guest and somebody who joins stops
    # being one, so entries for people now on the roster are dropped rather than
    # left to contradict the board.
    for cid in list(known):
        if int(cid) in roster:
            del known[cid]

    out["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    out["count"] = len(known)
    save("guests.json", out)
    log(f"guests.json — {len(known)} guests on file")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
