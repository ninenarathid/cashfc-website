/**
 * Today, as the kudos table reckons it.
 *
 * A popoto is one per person per day and the database enforces that on a `day`
 * column defaulting to current_date, which on this server is UTC. toISOString
 * is UTC too, so these are the same day boundary rather than two that agree
 * most of the time and disagree for seven hours every night.
 *
 * Shared by the bell and the member list, which both ask "who have I already
 * given one to today" before offering the button.
 */
export const todayUtc = () => new Date().toISOString().slice(0, 10);
