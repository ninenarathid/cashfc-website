#!/usr/bin/env python3
"""Give guests the same read the roster gets: FF Logs, then playstyle tags.

    python pipeline/update_guest_stats.py
    python pipeline/update_guest_stats.py --dry-run       # compute, write nothing
    python pipeline/update_guest_stats.py --skip-fflogs   # tags from what is on file

A guest is somebody who registered here and is not in the Free Company. The
pipeline works from the FC roster, so every stage of it has always walked past
them: their row had a name, a world and — since collect_missing.py — a mount
count, and nothing else. No parses, no clears, no tags. Not because any of it
was private, but because nobody had ever asked.

This asks. It is the roster's own stages run over a guest list: the same FF Logs
query, the same rollup, the same tagging function. Not a copy of them — the
functions themselves, imported, because a second implementation of "what counts
as a Progging tag" would disagree with the first inside a month and nobody would
notice which was right.

── Measured against the FC, never moving it ──────────────────────────────

A playstyle tag is graded on a curve: you are a Crafter here if you hold more
rare crafting achievements than 70% of the people who hold any. That cutoff is a
statement about this Free Company, so it is computed from the roster alone and
guests are measured against it without being counted into it. Ten guests joining
from a crafting FC should not make the FC's own crafters stop being crafters.

The same care applies to the pipeline's bookkeeping. FF Logs work is rationed by
a cursor in extra.json that decides which members and which zones the next run
covers, and a guest run that advanced it would quietly cost the roster a slot. So
that state is put back exactly as it was found: guests are fetched in full each
time instead of taking turns, which is affordable while there are a handful of
them and is the first thing to revisit if there are ever dozens.

── What it writes ────────────────────────────────────────────────────────

raids.json gains the guest's entry, keyed by character id like everybody else —
same shape, so the member page renders their raid section with no special case.
guests.json gains the rolled-up numbers and the tags, because a guest has no row
in members.json for them to live in.
"""
from __future__ import annotations

import argparse
import copy
import sys
import time

import update_members as P

# Past this many, fetching every zone for every guest stops being free and the
# roster's rotation is the pattern to copy. Until then, one full read a day
# costs a few hundred of an hourly budget of 3,600.
FULL_HISTORY_UP_TO = 12

# What is worth carrying from a computed row into guests.json: everything the
# member page reads that a guest can actually have. Level, race and title come
# from a Lodestone page this does not fetch; the raid tier board reads raids.json
# directly.
KEEP = (
    "tags", "achv_tiers", "parse", "savage_kills", "ult_clears", "ult_cleared",
    "ult_achv", "ult_achv_only", "legacy_clears", "ex_cleared", "ex_kills",
    "current_clears", "current_seen", "progress", "progress_all",
    "job_top", "job_scores", "fflogs",
)


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true",
                    help="work it all out and write nothing")
    ap.add_argument("--skip-fflogs", action="store_true",
                    help="tag from the raids.json already on file")
    a = ap.parse_args()

    board = P.load_json("members.json", {})
    roster = board.get("members") or []
    if not roster:
        log("data/members.json has no roster — run update_members.py first.")
        return 1

    guest_file = P.load_json("guests.json", {})
    homes = guest_file.get("guests") or {}
    if not homes:
        log("No guests on file. Nothing to do.")
        return 0

    guests = [{"id": int(cid), "name": home.get("name") or "?", "rank": "Guest"}
              for cid, home in homes.items()]
    log(f"{len(guests)} guest(s): " + ", ".join(g["name"] for g in guests))

    # Their collection, from the cache collect_missing.py fills. No Collect calls
    # here: this stage is about FF Logs and tags, and the counts do not move by
    # the hour.
    extra = P.load_json("extra.json", {})
    hit = P.hydrate_collect(guests, extra.get("collect") or {})
    log(f"Collection — {hit}/{len(guests)} from cache")

    raids = P.load_json("raids.json", {})

    # run_fflogs checkpoints raids.json and extra.json as it goes, so there is no
    # honest way to call it and write nothing. A dry run therefore does not call
    # it at all and tags from the file as it stands, which is what --skip-fflogs
    # does — said out loud rather than left for somebody to discover.
    if a.dry_run and not a.skip_fflogs:
        log("Dry run — not fetching FF Logs (it writes as it goes); "
            "tagging from raids.json as it stands.")

    if not a.skip_fflogs and not a.dry_run:
        # The roster's rationing state, put back untouched afterwards. A guest run
        # is extra work the FC did not ask for and must not pay for.
        before = copy.deepcopy(extra.get("pipeline") or {})
        # Emptied rather than left alone: the cycle set decides who is still
        # owed a fetch, and a guest already in it would send run_fflogs down
        # its "covered everyone, start again" path — which rewrites the set
        # from scratch and would have thrown away the roster's progress had it
        # not been restored below. Starting empty makes both guests queue every
        # time and keeps that branch out of reach.
        extra.setdefault("pipeline", {})["fflogs_cycle"] = []
        P.save_json("extra.json", extra)
        full = len(guests) <= FULL_HISTORY_UP_TO
        if not full:
            log(f"More than {FULL_HISTORY_UP_TO} guests — current zones only; "
                "give this the roster's rotation if it stays this way.")
        try:
            P.run_fflogs(guests, raids, full_history=full)
        finally:
            # run_fflogs saves extra.json itself as it checkpoints, so this is
            # restored on disk as well as in memory.
            extra = P.load_json("extra.json", {})
            extra["pipeline"] = before
            P.save_json("extra.json", extra)
    else:
        for g in guests:
            g["fflogs"] = (raids.get(str(g["id"])) or {}).get("_status", "skipped")

    for g in guests:
        P.summarize_raids(g, raids)
    # Ultimates the achievements know about and FF Logs does not — the same
    # correction the roster gets, and the one that matters most for somebody
    # whose logs are private.
    P.merge_ultimates(guests)

    # Graded against the FC's curve, computed from the FC alone.
    rarity = P.collect_rarity_map()
    P.assign_tags(guests, P.bucket_maxima(rarity), cut_from=roster)

    for g in guests:
        tags = ", ".join(g.get("tags") or []) or "—"
        log(f"= {g['name']}: {tags}"
            f" | parse {g.get('parse')}"
            f" | savage {g.get('savage_kills')}"
            f" | ultimates {g.get('ult_clears')}"
            f" | fflogs {g.get('fflogs')}")

    if a.dry_run:
        log("Dry run — nothing written.")
        return 0

    for g in guests:
        home = homes[str(g["id"])]
        for k in KEEP:
            if k in g:
                home[k] = g[k]
        home["stats_seen"] = time.strftime("%Y-%m-%d", time.gmtime())

    P.save_json("guests.json", guest_file)
    P.save_json("raids.json", raids)
    log("guests.json, raids.json — written")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("Stopped.")
        sys.exit(130)
