#!/usr/bin/env python3
"""Chase the people whose Collection tile still says "Not on FFXIV Collect yet".

Run daily. It looks at exactly who the site is showing that badge to, works out
which of the two reasons applies to each, and does the corresponding thing.

    python pipeline/collect_missing.py
    python pipeline/collect_missing.py --dry-run     # say who and why
    python pipeline/collect_missing.py --no-register # fetch only, add nobody

── The two reasons, which need opposite fixes ────────────────────────────

Collect has never heard of them. Nothing on that site knows a character exists
until somebody looks them up, and for four of the roster nobody ever has, so the
API answers 404 and the nightly pipeline records "no data" five hundred times a
day without ever fixing it. The fix is to press Add once; after that the pipeline
keeps them current on its own and this script never has to touch them again.

Nobody ever asked on their behalf. This is every guest. The pipeline works from
the FC roster, and a guest is by definition not on it — so their tile has always
been empty even when Collect knows them perfectly well. Both guests on file turn
out to have public achievements and a real collection sitting there unread. The
fix is to go and read it, which nothing else in this project does.

── What it writes, and what it deliberately leaves alone ─────────────────

For a roster member: the Collect cache in extra.json, and their shelf in
achv.json. Not members.json — that file is rendered from cache by the pipeline
in one pass and writing to it here would be overwritten within four hours by a
run that had the same numbers anyway. Registration is the part that lasts.

For a guest: guests.json gains the counts, because nothing else will ever put
them there. That file is this project's own and the frontend reads it through
lib/guest-data.ts.

Achievements are spliced into achv.json rather than rewritten, the same way
refresh_member.py does it: the catalogue is shared, and another member may still
be pointing at an entry this one no longer holds.

── On being a guest on somebody else's site ──────────────────────────────

FFXIV Collect is one person's hobby project with no paid tier and no published
rate limit, and both asking about a character and adding one make it go and read
a Lodestone page. So this waits between characters, checks before it asks for
anything, says who it is in its User-Agent, and stops at the first sign of being
unwelcome rather than retrying into a wall. On a normal day it has six people to
look at and most of them need nothing.
"""
from __future__ import annotations

import argparse
import re
import sys
import time

import requests

import update_members as P

SITE = "https://ffxivcollect.com"
# There is no documented way to add a character; the site's own page offers it as
# a button, and this is what that button posts.
TOKEN_PAGE = f"{SITE}/characters/search"
TOKEN_RE = re.compile(r'<meta name="csrf-token" content="([^"]+)"')

BROWSER = {"User-Agent": (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 cashfc-member-board "
    "(personal FC tool, daily sweep of characters with no collection data)")}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def targets(board: dict, guests: dict) -> list[dict]:
    """Everybody the site is currently showing the empty-collection badge to.

    The test is the frontend's own: MemberView calls the collection "unknown"
    when both counts are null, which is what draws that badge. Reading the same
    condition from the same file is what keeps this script pointed at the people
    who actually see it, rather than at a definition that drifted.

    Guests are all of them. Their counts are null because nothing has ever asked
    on their behalf, so the badge is on every one of them by construction.
    """
    out = [
        {"id": m["id"], "name": m.get("name") or "?", "rank": m.get("rank"),
         "kind": "member"}
        for m in board.get("members") or []
        if m.get("mounts") is None and m.get("minions") is None
    ]
    out += [
        {"id": int(cid), "name": (home.get("name") or "?"), "rank": "Guest",
         "kind": "guest"}
        for cid, home in (guests or {}).items()
    ]
    return out


def fresh_token(session: requests.Session) -> str:
    r = session.get(TOKEN_PAGE, headers=BROWSER, timeout=30)
    r.raise_for_status()
    m = TOKEN_RE.search(r.text)
    if not m:
        raise SystemExit("No CSRF token on the search page — the site has changed shape.")
    return m.group(1)


def known(session: requests.Session, cid: int) -> bool | None:
    """True if Collect has them, False if not, None if it would not say."""
    r = session.get(f"{P.COLLECT_API}/characters/{cid}", headers=P.UA, timeout=30)
    if r.status_code == 200:
        return True
    if r.status_code == 404:
        return False
    return None


def register(session: requests.Session, cid: int, token: str) -> int:
    """Press Add. A redirect is the site's way of saying it worked."""
    r = session.post(
        f"{SITE}/characters/{cid}/view",
        headers={**BROWSER, "X-CSRF-Token": token, "Referer": TOKEN_PAGE},
        allow_redirects=False, timeout=60,
    )
    return r.status_code


def splice_achievements(achv: dict, cid: int, ids: list[int],
                        rarity: dict[int, dict]) -> int:
    """Put one character's shelf into the whole-roster achievement file.

    Added to, never pruned: the catalogue is shared, and an entry this character
    has stopped holding may still be the only copy another one points at.
    """
    if not ids:
        return 0
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
    return added


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--delay", type=float, default=4.0,
                    help="seconds between characters (default 4)")
    ap.add_argument("--limit", type=int, default=None,
                    help="stop after this many, leaving the rest for tomorrow")
    ap.add_argument("--dry-run", action="store_true",
                    help="say who is missing and why, and change nothing")
    ap.add_argument("--no-register", action="store_true",
                    help="fetch for characters Collect knows; add nobody")
    a = ap.parse_args()

    board = P.load_json("members.json", {})
    if not board.get("members"):
        log("data/members.json has no roster — run update_members.py first.")
        return 1
    guest_file = P.load_json("guests.json", {})
    todo = targets(board, guest_file.get("guests") or {})
    if a.limit:
        todo = todo[: a.limit]

    if not todo:
        log("Nobody is missing a collection. Nothing to do.")
        return 0

    n_guest = sum(1 for t in todo if t["kind"] == "guest")
    log(f"{len(todo)} with no collection on file "
        f"({len(todo) - n_guest} roster, {n_guest} guests), {a.delay}s apart")

    session = requests.Session()
    token = ""
    rarity = P.collect_rarity_map() if not a.dry_run else {}
    # The mount and minion catalogues too, so a member read here comes away with
    # their rare ones worked out rather than with the field left empty.
    collections = P.collection_rarity_map() if not a.dry_run else {}
    extra = P.load_json("extra.json", {})
    cache = extra.setdefault("collect", {})
    achv = P.load_json("achv.json", {"catalog": {}, "members": {}})

    added = fetched = still_empty = failed = 0
    touched_guest = False

    for i, who in enumerate(todo, 1):
        cid, name, kind = who["id"], who["name"], who["kind"]
        state = known(session, cid)

        if state is None:
            log(f"! {name} — Collect answered with neither yes nor no; stopping here")
            break

        if state is False:
            if a.dry_run or a.no_register:
                log(f"  {name} ({cid}) — not on Collect at all")
                continue
            if not token:
                token = fresh_token(session)
            code = register(session, cid, token)
            if code in (200, 301, 302, 303):
                added += 1
                log(f"+ {name} ({cid}) — added to Collect")
            elif code in (401, 403, 419, 422):
                # The session or token went stale. One retry with a fresh one.
                token = fresh_token(session)
                time.sleep(a.delay)
                if register(session, cid, token) in (200, 301, 302, 303):
                    added += 1
                    log(f"+ {name} ({cid}) — added to Collect")
                else:
                    failed += 1
                    log(f"! {name} ({cid}) — refused twice; stopping here")
                    break
            elif code == 429:
                log("! Asked to slow down. Stopping — try again tomorrow.")
                break
            else:
                failed += 1
                log(f"? {name} ({cid}) — unexpected {code}")
                continue
            # Collect reads the Lodestone in the background, so what it has a
            # second after the Add is usually nothing. Tomorrow's run collects
            # it; today's job was to get them on the list.
            time.sleep(a.delay)
            continue

        # Known to Collect and still showing nothing here, which for a guest is
        # every time: nobody has ever asked on their behalf.
        if a.dry_run:
            log(f"  {name} ({cid}) — on Collect, never read from here ({kind})")
            continue

        one = {"id": cid, "name": name, "rank": who["rank"]}
        # The pipeline's own Collect stage, run against a party of one: same
        # thresholds, same scoring, same cache shape, because it is the same
        # function. A copy of it here would drift within a month.
        P.run_collect([one], rarity, 0.0, cache, collections)

        if one.get("mounts") is None and one.get("minions") is None:
            still_empty += 1
            log(f"  {name} — Collect has them but returned nothing usable")
        else:
            fetched += 1
            log(f"= {name} — {one.get('mounts')} mounts, {one.get('minions')} minions, "
                f"{one.get('rare_achv')} rare achievements")

        splice_achievements(achv, cid, one.pop("_rare_ids", None) or [], rarity)

        if kind == "guest":
            # The one file that will ever hold this. A guest is not on the
            # roster, so members.json has no row to render these into.
            home = guest_file.setdefault("guests", {}).setdefault(str(cid), {})
            home.update({
                "mounts": one.get("mounts"), "minions": one.get("minions"),
                "rare_achv": one.get("rare_achv"),
                "ach_public": one.get("ach_public"),
                "portrait": one.get("portrait"),
                "collect_seen": time.strftime("%Y-%m-%d", time.gmtime()),
            })
            touched_guest = True

        time.sleep(a.delay)

    if a.dry_run:
        log("Dry run — nothing written.")
        return 0

    P.save_json("extra.json", extra)
    P.save_json("achv.json", achv)
    if touched_guest:
        P.save_json("guests.json", guest_file)

    log(f"Done. Added {added}, read {fetched}, "
        f"{still_empty} known but empty"
        + (f", {failed} failed" if failed else ""))
    if added:
        log("Newly added characters have nothing to read yet. The next run "
            "collects them, and the pipeline renders roster members into "
            "members.json within four hours.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("Stopped. Every character is its own request, so running again "
            "picks up where this left off.")
        sys.exit(130)
