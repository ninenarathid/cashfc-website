# Duty artwork

One picture per fight, shown behind its row on a member's page. Optional
throughout: a fight with no file renders the plain card it always did, so
adding them one at a time is fine and nothing breaks while a folder is half
full.

    public/duty/extreme/    the current tier's extreme trials
    public/duty/savage/     the current savage tier
    public/duty/ultimate/   every Ultimate, current and legacy
    public/duty/alliance/   the alliance raids
    public/duty/criterion/  Variant and Criterion dungeons
    public/duty/dungeon/    every dungeon in the game
    public/duty/legacy/     every older raid and trial
    public/duty/field/      Eureka, Bozja, the Occult Crescent

## Naming

The file name is the fight's name as FF Logs gives it, lowercased, with
everything that is not a letter or a number turned into a hyphen. `lib/duty.ts`
does that conversion and is the only place it is defined.

    Doomtrain                     ->  doomtrain
    Red Hot and Deep Blue         ->  red-hot-and-deep-blue
    Dragonsong's Reprise          ->  dragonsongs-reprise
    The Unending Coil of Bahamut  ->  the-unending-coil-of-bahamut

Any of `.webp`, `.jpg`, `.png` or `.avif` — the folders are read at build time,
so the extension does not have to be agreed with anybody. WebP is the smallest
of them for a screenshot.

## Shape

Wide and short — around 1000x319, which is what doomtrain.webp is. A 16:9 shot
works but loses two thirds of its height to the crop, so frame it knowing that
only the top slice survives: the card anchors the picture to its top edge, which
is where a screenshot usually keeps its subject — and dark, or
with something dark under the left third where the fight's name sits. The card
draws a gradient over it, heavy on the left, opening across the middle and
closing again at the right edge where the parse number goes. A picture that is
bright the whole way across will still fight the text.

## Where these came from

The first twenty were screenshots somebody framed by hand. The other three
hundred and forty-five are the game's own — every duty in the finder has a
banner, and XIVAPI serves them:

    https://v2.xivapi.com/api/asset?format=png&path=ui/icon/112000/112549_hr1.tex

The id is `ContentFinderCondition.Image`, matched to a fight by name. They
arrive 1128x360, which is the shape below almost exactly, so they are converted
to WebP and otherwise left alone.

Three had to be named by hand, because a field operation is a zone rather than
a duty and the catalogue calls it by the zone's name: Eureka is Anemos, Bozja
is the Southern Front, and the Occult Crescent is South Horn — in each case the
one everybody means when they say the word.

Some of them are bright the whole way across, which the shape note below warns
about. They are left as the game drew them; darkening one is a decision to make
about that picture, looking at it, rather than a rule to apply to all of them.

## What the current patch needs

    extreme/   valigarmanda  zoraal-ja  doomtrain*  zelenia
               queen-eternal  necron  enuo  guardian-arkveld

    savage/    vamp-fatale  red-hot-and-deep-blue  the-tyrant
               lindwurm  lindwurm-ii

    ultimate/  the-weapons-refrain  the-epic-of-alexander
               dragonsongs-reprise  the-unending-coil-of-bahamut
               the-omega-protocol  futures-rewritten  dancing-mad

    * has a picture
