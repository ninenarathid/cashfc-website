# Members' privacy

The site brings together things that are each public somewhere
(Lodestone, FF Logs, FFXIV Collect, Discord) and things members told only
us. Putting them side by side can reveal more than any one source. The goal:
show a member's friends what the member chose to show, and show strangers
as little as the site's purpose needs.

## What we hold

| Data | Source | Who can see it today (check with db-audit.sql §5–6) |
|---|---|---|
| Character name, portrait, rank, raids, collections, achievements, nameday, last active | Pipeline, from public sites (privacy flags respected: FF Logs hidden, private achievements) | Everyone: `data/*.json` is in the **public repo, history included** |
| The link between a Discord (or Google) account and a character | Claim and verification | `profiles`, readable by anon per the repo's history (`using (true)`) |
| Discord username, avatar, id | OAuth | `profiles` (the id is set by a trigger) |
| Birthday (month and day), bio, nickname, accent colour, LFG, the 168-hour availability grid, language, notification settings | Member | `profiles` |
| Pictures (gallery, contest, party photos, feedback) | Member | Public buckets: anyone with the URL. Party photos keep the original file. |
| Private threads with admins | `feedback_*` | The member and the admins |
| Notifications | System and members | The recipient |
| Prizes and wallet balances in gil | System | The member and the admins (Aqua) |
| Emails | Auth | `auth.users` only, never exposed through the API |

## Rules

1. **Minimise.** Don't collect what the site doesn't show. Don't add a field
   "in case".
2. **Nothing account-linked goes into `data/*.json`.** It is public forever,
   because git history keeps every past version. That means no Discord ids,
   birthdays, availability or emails, and nothing from `profiles`. The
   pipeline reads public sources; keep it that way.
3. **Column-level access for personal fields.** Anon (the whole internet)
   should not read `discord_id`, `birth_month`/`birth_day`, `availability`,
   `language`, the notification settings, or anything else the page does not
   show strangers. The fix pattern (a migration via fc-migration) is
   `revoke select on public.profiles from anon, authenticated;` followed by
   `grant select (<public columns>) on public.profiles to anon,
   authenticated;`, with the private columns served to their owner through
   an RPC or a policy. First grep every `.from("profiles").select(...)` so
   nothing the site draws breaks. Consider a "members only" tier (signed in
   and in `fc_roster`) for the birthday list and availability.
4. **Hidden stays hidden in the database** (contest names, drafts, pending
   looks, the keeper). Never only on the page.
5. **Pictures:**
   - Strip metadata before upload (a canvas re-encode does it). A phone
     photo's EXIF can hold a home location.
   - Deleting a post or look deletes its files, because a public URL
     outlives its row.
   - An account deleted means its folder is deleted too.
6. **Leaving:**
   - A member who asks to disappear should be able to: hide from the board
     (`member_overrides`), clear their profile, delete their account.
   - Admins can do all of it today. A self-service "hide me" on `/profile`
     is still missing, although REQUIREMENTS.md lists it.
7. **Logs and errors never contain tokens, emails or other people's data.**
   Server logs on Vercel are readable by whoever has the project.
8. **Third parties see members' IPs:** the Discord widget iframe, YouTube
   (nocookie), Universalis (fetched from the browser), and any external
   image host. Keep that list short and known (the CSP enforces it).
9. **Search engines:** the whole site is `noindex, noarchive, noimageindex`
   (app/layout.tsx). Keep robots.txt allowing crawls, so crawlers can see the
   noindex (app/robots.ts explains). Add `X-Robots-Tag: noindex` to API and
   OG routes.
10. **Admin access is need-to-know.** The popoto keeper is secret even from
    other admins. Private threads are for the admins who answer them.

## When a change touches personal data

State in the commit message and to the user:
- what is newly collected or shown;
- to whom (anon, members, the FC, the owner);
- why;
- how a member turns it off or deletes it.

If you can't answer the last one, the change isn't finished.
