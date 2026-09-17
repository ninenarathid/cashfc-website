/*
 * What the board was carrying last time it was drawn.
 *
 * The board is one message that edits itself, and an edit makes no sound:
 * Discord turns a channel name white when a message arrives, never when one
 * changes. So the channel where parties are arranged was the one channel that
 * never asked for anybody's attention — somebody opens a party at eight and
 * the only people who hear about it are the ones who thought to go and look.
 *
 * Remembering the ids is what lets the site tell the two cases apart. A seat
 * filling, a note changed, a countdown running down: still an edit, silently,
 * because announcing every seat is how a channel gets muted. A party id that
 * was not here before: a new message, and the old board deleted behind it, so
 * there is still exactly one board in the channel and the name goes white for
 * the one thing worth interrupting anybody for.
 *
 * Null rather than an empty array to start with, and the difference matters.
 * Empty means the board was drawn and had nothing on it; null means nobody has
 * ever written the list down. The first tick after this runs finds null,
 * records what is open and says nothing — otherwise shipping this would
 * announce every party the FC has already seen.
 *
 * It also doubles as the lock. Opening a party is two statements, the party
 * and the lead's own seat, each with its own trigger, so two ticks arrive at
 * once both holding the same new id. Whoever writes this row first — matched
 * on the updated_at they read — is the one that posts, and the other stands
 * down rather than putting a second board in the channel.
 */
alter table public.discord_board
  add column if not exists party_ids text[];
