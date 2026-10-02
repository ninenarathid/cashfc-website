# Cash Town: where the idea comes from, and what it could be

Status on 2026-10-01: **an admin-only prototype is at `/town`.** It has
walking and proximity voice; see SKILL.md. Everything else here is still to
be planned.

## Where it comes from

**A member's proposal** (feedback thread #12, 2026-09-23). Read the thread
in the admin inbox for their words and pictures. The proposal was a "CASH
Town" web app in the spirit of **Zheza**, the Thai Flash-era virtual world:

- an isometric camera, and a town with buildings and roads;
- avatars of everyone currently on the page, walking around the town;
- buildings you can press, which lead to a page of the site (a signboard
  leads to the popoto rankings);
- **housing:** walk into an apartment block and choose your own home or
  someone else's. A home leads to that member's profile. Home templates
  could be decorated inside.
- **pets,** perhaps the rare popoto members already own;
- a pet shop;
- a fashion mall, where things are bought (they suggested with popoto; see
  the economy rule below);
- a mini-game zone that rewards playing;
- pet fights.

Their observation, which is the real reason it fits: many members use the
site all day (sending popoto) even when they can't be in the game or in a
Discord voice channel, for example during working hours. An avatar hangout
with light chat gives them a place to *be together* at those times. They
said a little lag would be understandable. The admin's reply raised
performance as the open worry.

**The owner's direction** (2026-10-01):
- make the whole site feel like a game, with every member a player;
- Cash Town like **Gather**, an online office where walking close to someone
  lets you talk by microphone, in the browser;
- small mini-games, such as **planting popoto**.

## What the references do well

**Zheza** (from the screenshots in the thread):
- Districts with names: Siam Square, Harajuku Square, Zheza Mall, Music Dunk
  Street. A row of tabs at the top warps between them.
- A name under every avatar, and chat as bubbles over heads.
- Clicking an avatar opens a radial menu: add friend, private message, block,
  view their page.
- Branded buildings and props make each district recognisable.
- A side game: pets with HP and MP battling in a street (Zheza Pet).
- **Why it worked:** being seen by others in a shared place, dressing up,
  and a city to explore with friends.

**Gather:**
- Proximity audio and video: walk near, and you hear each other. Volume
  depends on distance.
- **Private areas:** inside one, everyone hears everyone, and nobody outside
  does.
- Objects you interact with (a whiteboard, a game, a link).
- A tile-based map editor, statuses, "follow" and "locate".
- **Why it works:** spontaneous conversation without scheduling a call.

## Proposed pillars (to confirm with the owner)

1. **Hang out together.** See who is around, walk over, say hello by text,
   or by voice when you choose to.
2. **The site is the town.** Every building is a page that already exists:
   the board, the gallery, the party finder, the contest hall, the popoto
   rankings. The town is a friendlier front door, not a second website.
3. **My place, my style.** Your avatar and your home: cosmetic,
   expressive, visited by friends.
4. **Small daily joys.** A popoto farm to tend for a minute a day, a pet, a
   mini-game. Never a chore, never a loss.

## Rules carried over from the site

- **Popoto can be spent** (the owner's call, 2026-10-02). The mall and
  seeds may cost popoto, taken from a balance; the lifetime count received
  stays as the record and never goes down. Rare popoto can become pets, and
  are never consumed. See fc-game-design economy.md.
- **Only a verified character** may enter, talk or build (v85). Guests may
  be allowed to visit; decide that.
- **Cooperative first; competition opt-in and friendly.** A pet fight never
  costs anyone their pet.
- **Light by default.** The town is its own route and its own lazy-loaded
  bundle, and the rest of the site stays as fast as it is (fc-perf).

## Open questions for the planning session

1. **Who comes in:** FC members only, verified guests, or anyone watching?
2. **How many at once:** the expected peak (20? 50?). This sets the
   architecture and the cost (`scripts/town-cost.mjs`).
3. **Is voice in the first version,** or text and presence first, with voice
   in phase 2?
4. **Avatar style:**
   - a chibi popoto-like body with the member's colour and hats (cheap and
     on-brand);
   - FFXIV-like chibis (more art);
   - or a portrait in a bubble (cheapest).
5. **The art pipeline:** generated sprite sheets, the way the popoto flavours
   are made (popoto-flavour-art memory), commissioned art, or a pack.
6. **Phone or desktop first.** Members use phones a lot; tap-to-walk works
   on both.
7. **Moderation:** who can mute or kick, block lists, reporting, rules for
   voice.
8. **The currency's name,** and the first things worth spending it on.
9. **Pets and pet fights:** yes or no, and how friendly.
10. **Budget:** an acceptable monthly cost in baht, given the move to
    Cloudflare.
