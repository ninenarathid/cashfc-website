#!/usr/bin/env python3
"""Ask The Lodestone itself whether a character's achievements are private.

Run daily. It reads each character's achievement page — the page a person would
open to check — and records what it actually said.

    python pipeline/verify_achievements.py
    python pipeline/verify_achievements.py --batch 120   # a slice, not the lot
    python pipeline/verify_achievements.py --dry-run

── Why the site was calling people private who were not ──────────────────

The board never read The Lodestone for this. It read FFXIV Collect, which reads
The Lodestone only when somebody presses Refresh on that character — so the
"achievements private" flag was as old as the last press, and some presses were
very old. Farcia Soluna's record had last been read on 12 August, three weeks
before she opened her achievements; the board went on calling her private, and
told her on her own page to go and change a setting she had already changed.
Pyrozus Helison's was last read in December 2023. Dumb Bunny's in February 2022.

Re-reading Collect more often could never have fixed it: six runs a day faithfully
re-fetched the same stale answer. The staleness was on Collect's side.

It goes wrong in the other direction too. Aqua Eleison's record on Collect says
public; her Lodestone page today says private. She closed it after Collect last
looked, and the board would have kept showing achievements she had since hidden.

So the flag that decides the tag comes from the source now. The page answers in
one of two unmistakable ways, and this trusts nothing else:

    public   HTTP 200 and the achievement list is in the markup
    private  HTTP 403 and the words "do not have permission"

A 403 without those words is Lodestone rate-limiting, not a private profile —
which matters, because the pipeline already meets those on a busy day. That case
records nothing at all rather than accusing somebody of hiding. Any other answer
is likewise left as no answer: the previous verdict stands until a page says
otherwise in so many words.

── And then Collect is asked to catch up ─────────────────────────────────

Knowing somebody is public does not fetch their achievements; only Collect can do
that. So a character whose page says public while Collect still thinks otherwise
gets a Refresh press, which is the button a person would press there. That is the
only thing this asks of Collect, and only for the few people it is actually true
of, rather than for the four hundred the stale flag pointed at.
"""
from __future__ import annotations

import argparse
import re
import sys
import time

import requests

import update_members as P

ACHV_PAGE = ("https://{host}.finalfantasyxiv.com/lodestone/character/{cid}"
             "/achievement/")
DENIED = "do not have permission"
LIST_MARK = "entry__achievement"

COLLECT = "https://ffxivcollect.com"
REFRESH = COLLECT + "/character/refresh/{cid}"
TOKEN_RE = re.compile(r'<meta name="csrf-token" content="([^"]+)"')
BROWSER = {"User-Agent": (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 cashfc-member-board "
    "(personal FC tool, refresh for characters that opened their achievements)")}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def lodestone_says(cid: int) -> bool | None:
    """True public, False private, None no usable answer.

    None covers a rate-limit, a timeout, a redirect and a character page that has
    gone missing. All of them mean "ask again tomorrow", and none of them means
    anything about what the player has chosen.
    """
    try:
        r = requests.get(
            ACHV_PAGE.format(host=P.CONFIG["lodestone_host"], cid=cid),
            headers=P.UA, timeout=30)
    except Exception:
        return None
    if r.status_code == 200:
        return True if LIST_MARK in r.text else None
    if r.status_code == 403 and DENIED in r.text:
        return False
    return None


def press_refresh(session: requests.Session, cid: int) -> bool:
    """Ask Collect to go and re-read somebody who has opened up."""
    try:
        page = session.get(f"{COLLECT}/characters/{cid}", headers=BROWSER, timeout=30)
        if page.status_code != 200:
            return False
        token = TOKEN_RE.search(page.text)
        if not token:
            return False
        r = session.post(REFRESH.format(cid=cid),
                         headers={**BROWSER, "X-CSRF-Token": token.group(1),
                                  "Referer": f"{COLLECT}/characters/{cid}"},
                         allow_redirects=False, timeout=120)
        return r.status_code != 429
    except Exception:
        return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--batch", type=int, default=0,
                    help="how many to read this run; 0 means everybody")
    ap.add_argument("--delay", type=float, default=None,
                    help="seconds between pages (default: the pipeline's own)")
    ap.add_argument("--refresh-cap", type=int, default=40,
                    help="most Collect refreshes to ask for in one run "
                         "(default 40)")
    ap.add_argument("--dry-run", action="store_true",
                    help="say who would be read and change nothing")
    a = ap.parse_args()

    delay = a.delay if a.delay is not None else P.CONFIG["delay_lodestone"]

    board = P.load_json("members.json", {})
    roster = board.get("members") or []
    if not roster:
        log("data/members.json has no roster — run update_members.py first.")
        return 1

    guest_file = P.load_json("guests.json", {})
    homes = guest_file.get("guests") or {}

    who = [{"id": m["id"], "name": m.get("name") or "?", "rank": m.get("rank"),
            "collect": m.get("ach_public"), "kind": "member"}
           for m in roster]
    who += [{"id": int(cid), "name": home.get("name") or "?", "rank": "Guest",
             "collect": home.get("ach_public"), "kind": "guest"}
            for cid, home in homes.items()]

    extra = P.load_json("extra.json", {})
    verdicts = extra.setdefault("lode_achv", {})

    # Everybody, in a rotation that starts with whoever was read longest ago.
    # A full sweep is a page each and about a quarter of an hour; --batch is
    # there for the day that stops being reasonable, and picks up the oldest
    # readings rather than the first names.
    who.sort(key=lambda p: float((verdicts.get(str(p["id"])) or {}).get("at") or 0))
    todo = who[: a.batch] if a.batch else who

    log(f"{len(todo)} character page(s) to read, {delay}s apart")
    if a.dry_run:
        for p in todo[:20]:
            seen = (verdicts.get(str(p["id"])) or {}).get("public")
            log(f"  {p['name']} — collect says {p['collect']}, last read {seen}")
        log(f"Dry run — nothing read, nothing written. ({len(todo)} in the queue)")
        return 0

    public = private = unclear = 0
    opened: list[dict] = []
    closed: list[str] = []

    for i, p in enumerate(todo, 1):
        verdict = lodestone_says(p["id"])
        if verdict is None:
            unclear += 1
        else:
            was = (verdicts.get(str(p["id"])) or {}).get("public")
            verdicts[str(p["id"])] = {"public": verdict, "at": time.time()}
            if verdict:
                public += 1
                # Public on The Lodestone but not according to Collect: this is
                # the whole bug. Collect has to be asked to look again before
                # any of it can reach the board.
                if p["collect"] is not True:
                    opened.append(p)
            else:
                private += 1
                if was is True or p["collect"] is True:
                    closed.append(p["name"])

        if i % 50 == 0:
            log(f"  {i}/{len(todo)} — {public} public, {private} private, "
                f"{unclear} no answer")
        if i < len(todo):
            time.sleep(delay)

    P.save_json("extra.json", extra)
    log(f"Read {len(todo)}: {public} public, {private} private, {unclear} no answer")
    if closed:
        log(f"Closed since we last looked: {', '.join(closed[:10])}")

    # ── Tell Collect about the ones who have opened up ───────────────────
    if opened:
        # Capped. The first full sweep after this bug is found could turn up
        # hundreds at once, and pressing Refresh hundreds of times in an hour on
        # somebody's hobby site is not a thing to do to them. Whoever is left
        # over is still public tomorrow and still owed a press, so nobody is
        # dropped — they queue.
        waiting = len(opened)
        opened = opened[: a.refresh_cap]
        log(f"{waiting} are public on The Lodestone but not on Collect — "
            f"asking Collect to re-read {len(opened)} of them"
            + (f" ({waiting - len(opened)} wait for tomorrow)"
               if waiting > len(opened) else ""))
        session = requests.Session()
        pressed = []
        for i, p in enumerate(opened, 1):
            if press_refresh(session, p["id"]):
                pressed.append(p)
                log(f"+ {p['name']} — Refresh pressed")
            else:
                log(f"? {p['name']} — could not press Refresh; tomorrow then")
            if i < len(opened):
                time.sleep(3.0)

        if pressed:
            # Collect re-reads in the background, so the whole batch is pressed
            # first and read back afterwards: fewer requests than waiting out
            # each one, and faster.
            log(f"Waiting 45s for Collect to work through {len(pressed)}")
            time.sleep(45)
            rarity = P.collect_rarity_map()
            cache = extra.setdefault("collect", {})
            achv = P.load_json("achv.json", {"catalog": {}, "members": {}})
            landed = []
            for p in pressed:
                one = {"id": p["id"], "name": p["name"], "rank": p["rank"]}
                P.run_collect([one], rarity, 1.0, cache)
                if one.get("ach_public"):
                    landed.append(p["name"])
                ids = one.pop("_rare_ids", None) or []
                if ids:
                    achv.setdefault("members", {})[str(p["id"])] = ids
                    catalog = achv.setdefault("catalog", {})
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
                if p["kind"] == "guest":
                    homes[str(p["id"])].update({
                        "mounts": one.get("mounts"), "minions": one.get("minions"),
                        "rare_achv": one.get("rare_achv"),
                        "ach_public": one.get("ach_public"),
                        "portrait": one.get("portrait"),
                        "collect_seen": time.strftime("%Y-%m-%d", time.gmtime()),
                    })
            P.save_json("extra.json", extra)
            P.save_json("achv.json", achv)
            if any(p["kind"] == "guest" for p in pressed):
                P.save_json("guests.json", guest_file)
            log(f"Collect caught up on {len(landed)} of {len(pressed)}"
                + (": " + ", ".join(landed[:10]) if landed else ""))
            if len(landed) < len(pressed):
                log("The rest were rate-limited by Collect; they keep their "
                    "verdict here and their turn tomorrow.")

    log("The tag follows the verdicts above from the pipeline's next render.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("Stopped. Verdicts already recorded are kept.")
        sys.exit(130)
