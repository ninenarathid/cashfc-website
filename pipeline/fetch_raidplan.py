#!/usr/bin/env python3
"""Fetch RaidPlan's marker art and arena maps, once.

The guides on this site draw their arenas from coordinates, which is why they
work at all — but a diagram is easier to read when the floor under it is the
floor people were actually standing on, and when the waymark on it is the
waymark they saw. RaidPlan already has both, at good resolution, for every
Arcadion fight. This goes and gets them.

    python pipeline/fetch_raidplan.py                  # everything, FFXIV only
    python pipeline/fetch_raidplan.py --list           # say what it would fetch
    python pipeline/fetch_raidplan.py --icons          # just the markers
    python pipeline/fetch_raidplan.py --maps           # just the arenas
    python pipeline/fetch_raidplan.py --game all       # WoW, Lost Ark, the rest
    python pipeline/fetch_raidplan.py --out public/guides/raidplan

Files land under the output directory mirroring the CDN's own paths, so
`raid/ff.aac3/map/01.m9-main.jpg` is the M9 arena and `game/ffxiv/mark/way_a.png`
is waymark A. Anything already on disk is left alone, so re-running is cheap and
picks up only what is new.

── Where the list of things to fetch comes from ──────────────────────────

Nowhere is it published, so it is worked out rather than guessed:

* The catalogue — every game, expansion, raid, boss and map — is embedded in the
  planner page itself, in the payload React uses to render it. That is read and
  parsed, so the boss list is RaidPlan's own and not a copy of it going stale
  here.
* Arena maps follow one rule found in the site's own code:
  `/raid/{raid}/map/{boss}-{map}.jpg`, plus `/icon.jpg` and `/icon/{boss}.jpg`
  for the pictures beside the names.
* Marker art is named literally in the site's JavaScript, so the bundles are
  read and every `game/...` path in them is collected. This finds what the app
  actually uses; anything the app builds a name for at runtime it will not find,
  which is the honest limit of the approach.

── On being a guest ──────────────────────────────────────────────────────

This is somebody else's bandwidth and somebody else's work. So: one request at a
time with a pause between, a User-Agent that says who is asking, nothing fetched
twice, and no attempt to walk the CDN looking for files the site never mentions.
It is a few hundred files, once, not a crawler.

And the art is not RaidPlan's to give away either — the markers and the arena
photographs are Square Enix's, from the game. Using them on an FC's own guide
pages is the same thing every raid site does. Passing them off as this project's
work is not, and neither is re-hosting them for anybody else to hotlink.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from typing import Any, Iterable

import requests

BASE = "https://raidplan.io"
CDN = "https://cdn.raidplan.io"

# A seed page, only so there is something to read the catalogue out of. Any
# planner page carries the whole catalogue; this one is as good as another.
SEED = "/plan/create?raid=ffxiv.arcadion.aac3"

UA = ("cashfc-website/1.0 (FFXIV FC guide site; one-off asset fetch; "
      "contact: github.com/ninenarathid/cashfc-website)")

OUT = os.path.join("public", "guides", "raidplan")

# Every asset path the app names outright, wherever it names it.
#
# Deliberately not anchored to quotes. Half of them are written as template
# literals rather than as strings -- the waymarks among them, which are the
# whole point -- so a path is matched on its own shape instead. A false
# positive costs one 404 that gets logged; a missed waymark costs the guides.
ASSET = re.compile(r'(?:game|wow)/[A-Za-z0-9_./%-]+\.(?:png|jpg|jpeg|svg|webp|avif)')
CHUNKS = re.compile(r'/_next/static/chunks/[A-Za-z0-9_.-]+\.js')


class Fetcher:
    """One session, one pace, and a note of everything it did."""

    def __init__(self, delay: float, dry: bool):
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        self.delay = delay
        self.dry = dry
        self.last = 0.0
        self.got = 0
        self.skipped = 0
        self.failed: list[str] = []

    def _wait(self) -> None:
        gap = self.delay - (time.time() - self.last)
        if gap > 0:
            time.sleep(gap)
        self.last = time.time()

    def text(self, url: str) -> str:
        self._wait()
        r = self.s.get(url, timeout=30)
        r.raise_for_status()
        return r.text

    def file(self, path: str, dest: str) -> bool:
        """Fetch one CDN path to disk. Returns whether anything was written."""
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            self.skipped += 1
            return False
        if self.dry:
            self.got += 1
            return True
        self._wait()
        try:
            r = self.s.get(f"{CDN}/{path}", timeout=60)
        except requests.RequestException as e:
            self.failed.append(f"{path}: {e}")
            return False
        # A CDN miss comes back as a styled 404 page rather than as nothing, so
        # the content type is checked as well as the status: an HTML file saved
        # under a .png is worse than no file, because it looks like it worked.
        if r.status_code != 200 or "text/html" in r.headers.get("content-type", ""):
            self.failed.append(f"{path}: {r.status_code}")
            return False
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(r.content)
        self.got += 1
        return True


def balanced(s: str, i: int) -> str:
    """The JSON value starting at s[i], however deeply nested.

    The catalogue arrives inside a page rather than from an endpoint, so it has
    to be cut out of the surrounding text. Counting brackets while respecting
    strings is the whole trick, and it is exact — a regex here would work until
    the first boss whose name contains a bracket.
    """
    close = {"[": "]", "{": "}"}[s[i]]
    depth = 0
    instr = False
    esc = False
    for j in range(i, len(s)):
        c = s[j]
        if instr:
            if esc:
                esc = False
            elif c == chr(92):          # a backslash escapes the next character
                esc = True
            elif c == '"':
                instr = False
        elif c == '"':
            instr = True
        elif c in "[{":
            depth += 1
        elif c in "]}":
            depth -= 1
            if depth == 0:
                return s[i:j + 1]
    raise ValueError("unbalanced JSON in the page payload")


def payload(html: str, key: str, has: str) -> Any:
    """Pull one JSON list out of the page by the key that introduces it.

    The key alone is not enough to find it: the payload nests, and `raids`
    names both the list of games and the list of raids inside each of them. So
    every candidate is parsed and the one whose entries carry `has` wins, which
    identifies the list by its shape rather than by its position.
    """
    needle = f'"{key}":['
    at = -1
    while True:
        at = html.find(needle, at + 1)
        if at < 0:
            raise LookupError(f"no {key} list carrying {has} in the page")
        try:
            got = json.loads(balanced(html, at + len(needle) - 1))
        except ValueError:
            continue
        if isinstance(got, list) and got and isinstance(got[0], dict) and has in got[0]:
            return got


def unescape(html: str) -> str:
    """The payload is JSON inside a JSON string, so it is quoted twice."""
    return html.replace(chr(92) + '"', '"')


def catalogue(f: Fetcher) -> list[dict]:
    """Every game RaidPlan knows, with its expansions and raids."""
    html = unescape(f.text(BASE + SEED))
    return payload(html, "games", "expansions")


def bosses(f: Fetcher, raid_path: str) -> list[dict]:
    """The bosses and maps of one raid, read off that raid's own planner page."""
    html = unescape(f.text(f"{BASE}/plan/create?raid={raid_path}"))
    for r in payload(html, "initialRaids", "bosses"):
        if r.get("path") == raid_path:
            return r.get("bosses") or []
    return []


def icon_paths(f: Fetcher) -> list[str]:
    """Every marker the app names in its own source."""
    html = f.text(BASE + SEED)
    found = set(ASSET.findall(html))
    for chunk in sorted(set(CHUNKS.findall(html))):
        found.update(ASSET.findall(f.text(BASE + chunk)))
    return sorted(found)


def map_paths(f: Fetcher, games: list[dict], only: str,
              raid_filter: str | None) -> list[str]:
    """Every arena, boss portrait and raid badge, per the site's own URL rule."""
    out: list[str] = []
    for game in games:
        if only != "all" and game.get("id") != only:
            continue
        for exp in game.get("expansions") or []:
            for raid in exp.get("raids") or []:
                path, cdn = raid.get("path"), raid.get("cdnId")
                if not path or not cdn:
                    continue
                if raid_filter and path != raid_filter:
                    continue
                out.append(f"raid/{cdn}/icon.jpg")
                for boss in bosses(f, path):
                    bid = boss.get("cdnId") or boss.get("id")
                    out.append(f"raid/{cdn}/icon/{bid}.jpg")
                    for m in boss.get("maps") or [{"slug": None}]:
                        slug = m.get("slug")
                        tail = f"-{slug}" if slug else ""
                        out.append(f"raid/{cdn}/map/{bid}{tail}.jpg")
    return out


def main(argv: Iterable[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", default=OUT, help=f"where to put them (default {OUT})")
    ap.add_argument("--game", default="ffxiv",
                    help="ffxiv, wow, la, nw … or all (default ffxiv)")
    ap.add_argument("--raid", help="one raid path, e.g. ffxiv.arcadion.aac3")
    ap.add_argument("--icons", action="store_true", help="markers only")
    ap.add_argument("--maps", action="store_true", help="arenas only")
    ap.add_argument("--list", action="store_true",
                    help="print what would be fetched and stop")
    ap.add_argument("--delay", type=float, default=0.25,
                    help="seconds between requests (default 0.25)")
    a = ap.parse_args(list(argv) if argv is not None else None)

    want_icons = a.icons or not a.maps
    want_maps = a.maps or not a.icons

    f = Fetcher(a.delay, dry=a.list)
    wanted: list[str] = []

    if want_icons:
        print("reading the app for marker names...", file=sys.stderr)
        icons = icon_paths(f)
        # The markers belong to whichever game names them, and the paths say so.
        if a.game != "all":
            keep = ("game/" + a.game + "/", a.game + "/")
            icons = [p for p in icons if p.startswith(keep)]
        print(f"  {len(icons)} markers", file=sys.stderr)
        wanted += icons

    if want_maps:
        print("reading the catalogue for arenas...", file=sys.stderr)
        maps = map_paths(f, catalogue(f), a.game, a.raid)
        print(f"  {len(maps)} arenas and portraits", file=sys.stderr)
        wanted += maps

    wanted = sorted(set(wanted))
    if a.list:
        for p in wanted:
            print(p)
        print(f"\n{len(wanted)} files", file=sys.stderr)
        return 0

    print(f"fetching {len(wanted)} files into {a.out}", file=sys.stderr)
    for n, path in enumerate(wanted, 1):
        dest = os.path.join(a.out, *path.split("/"))
        if f.file(path, dest) and n % 25 == 0:
            print(f"  {n}/{len(wanted)}", file=sys.stderr)

    # A note of what came from where, so that six months from now it is obvious
    # these are not this project's drawings.
    if not f.dry:
        os.makedirs(a.out, exist_ok=True)
        with open(os.path.join(a.out, "SOURCE.json"), "w", encoding="utf-8") as fh:
            json.dump({
                "from": CDN,
                "fetched": time.strftime("%Y-%m-%d"),
                "note": "Marker art and arena maps from raidplan.io. The art is "
                        "Square Enix's, from FFXIV; RaidPlan hosts it. Used here "
                        "for one FC's guide pages.",
                "files": len(wanted),
            }, fh, indent=2)
            fh.write("\n")

    print(f"\n{f.got} fetched, {f.skipped} already here, {len(f.failed)} failed",
          file=sys.stderr)
    for line in f.failed[:20]:
        print("  ! " + line, file=sys.stderr)
    if len(f.failed) > 20:
        print(f"  ... and {len(f.failed) - 20} more", file=sys.stderr)
    return 1 if f.got == 0 and f.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
