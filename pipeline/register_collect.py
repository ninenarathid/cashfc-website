#!/usr/bin/env python3
"""Introduce the roster to FFXIV Collect, once.

Four hundred of five hundred members return 404 from FFXIV Collect, which is why
their Collection tiles on this site are empty. It is not that their data is
private — it is that Collect has never heard of them. Nothing on that site knows
a character exists until somebody looks them up, and nobody has.

So this looks them all up. One pass, one request each, active members first, and
then it is done: after a character is registered the nightly pipeline keeps them
current on its own, and this script has no reason to run again.

    python pipeline/register_collect.py                 # the whole roster
    python pipeline/register_collect.py --dry-run       # count who is missing
    python pipeline/register_collect.py --limit 50      # a taste first

── On being a guest ──────────────────────────────────────────────────────

FFXIV Collect is one person's hobby site with no paid tier and no published rate
limit, and every registration makes it go and read a Lodestone page. That cost is
theirs, not ours. So this waits several seconds between characters, checks
whether somebody is already known before asking for anything, says who it is in
its User-Agent, and stops on the first sign of being unwelcome rather than
retrying into a wall.

It is also the only part of this project that drives a website's own controls
rather than a documented API, because there is no documented way to add a
character — the site's search page offers it as a button and that is all there
is. Which means it can break without warning, and if it does the right response
is to leave it broken rather than to work harder at it.

── What it does, exactly ─────────────────────────────────────────────────

The same two steps a person makes by hand: ask the site whether it knows the
character, and if not, press the button on their search result that says Add.
That is a POST to /characters/<lodestone id>/view with a session and a CSRF
token, which is what the page does when clicked.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

import requests

DATA = Path(__file__).resolve().parent.parent / "data"
SITE = "https://ffxivcollect.com"
API = f"{SITE}/api"
ON_VACATION_RANK = "On vacation"

UA = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 "
                     "cashfc-member-board (personal FC tool, one-off roster import)")}

# A page of the site, fetched only to be given a session and a CSRF token. Its
# own search results are not needed: /view takes a Lodestone id directly, so
# searching for each character by name would double the work for nothing.
TOKEN_PAGE = f"{SITE}/characters/search"
TOKEN_RE = re.compile(r'<meta name="csrf-token" content="([^"]+)"')


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def active_first(members: list[dict]) -> list[dict]:
    """Active members before the ones marked On vacation.

    The same order the pipeline uses. If this run is cut short — a bad
    connection, a change of mind, somebody closing the laptop — what it will not
    have reached is the people nobody is looking up.
    """
    on = [m for m in members if m.get("rank") != ON_VACATION_RANK]
    off = [m for m in members if m.get("rank") == ON_VACATION_RANK]
    return on + off


def fresh_token(session: requests.Session) -> str:
    r = session.get(TOKEN_PAGE, headers=UA, timeout=30)
    r.raise_for_status()
    m = TOKEN_RE.search(r.text)
    if not m:
        raise SystemExit("No CSRF token on the search page — the site has changed shape.")
    return m.group(1)


def known(session: requests.Session, cid: int) -> bool | None:
    """True if Collect already has them, False if not, None if it would not say."""
    r = session.get(f"{API}/characters/{cid}", headers=UA, timeout=30)
    if r.status_code == 200:
        return True
    if r.status_code == 404:
        return False
    return None


def register(session: requests.Session, cid: int, token: str) -> int:
    """Press Add. A redirect is the site's way of saying it worked."""
    r = session.post(
        f"{SITE}/characters/{cid}/view",
        headers={**UA, "X-CSRF-Token": token, "Referer": TOKEN_PAGE},
        allow_redirects=False, timeout=60,
    )
    return r.status_code


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--delay", type=float, default=4.0,
                    help="seconds between characters (default 4)")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true",
                    help="count who is missing and change nothing")
    ap.add_argument("--force", action="store_true",
                    help="re-register members Collect already knows")
    args = ap.parse_args()

    members = json.loads((DATA / "members.json").read_text(encoding="utf-8"))["members"]
    todo = active_first(members)
    if args.limit:
        todo = todo[: args.limit]

    log(f"{len(todo)} members to check, active first, {args.delay}s apart")

    session = requests.Session()
    token = fresh_token(session) if not args.dry_run else ""

    added = skipped = missing = failed = 0
    for i, m in enumerate(todo, 1):
        cid, name = m["id"], m.get("name", "?")
        state = known(session, cid)

        if state is None:
            # Not a no: a refusal or a wobble. Either way, stop asking.
            log(f"! {name} — Collect answered with neither yes nor no; stopping here")
            break
        if state and not args.force:
            skipped += 1
        else:
            if args.dry_run:
                missing += 1
            else:
                code = register(session, cid, token)
                if code in (301, 302, 303, 200):
                    added += 1
                elif code in (401, 403, 419, 422):
                    # The session or the token has gone stale. One retry with a
                    # new one; if that fails too, the answer is no.
                    token = fresh_token(session)
                    time.sleep(args.delay)
                    if register(session, cid, token) in (301, 302, 303, 200):
                        added += 1
                    else:
                        failed += 1
                        log(f"! {name} ({cid}) — refused twice; stopping here")
                        break
                elif code == 429:
                    log("! Asked to slow down. Stopping — run again later with a longer --delay.")
                    break
                else:
                    failed += 1
                    log(f"? {name} ({cid}) — unexpected {code}")

        if i % 20 == 0 or i == len(todo):
            log(f"{i}/{len(todo)} | added {added} | already known {skipped}"
                + (f" | missing {missing}" if args.dry_run else "")
                + (f" | failed {failed}" if failed else ""))

        # Only after actually asking for something. Skipping somebody Collect
        # already knows costs one cached GET and does not deserve a wait.
        if i < len(todo) and (args.force or state is False):
            time.sleep(args.delay)

    if args.dry_run:
        log(f"Done. {missing} of {len(todo)} are not in FFXIV Collect yet.")
    else:
        log(f"Done. Added {added}, already known {skipped}, failed {failed}.")
        log("Their collections arrive on the next pipeline run — or force one now with "
            "--skip-fflogs --skip-lala to fetch them straight away.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Stopped. Nothing is half-done: every character is its own request, "
            "and running again picks up where this left off.")
        sys.exit(130)
