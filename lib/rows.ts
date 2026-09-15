/**
 * Every row, not the first thousand.
 *
 * PostgREST caps a response at a thousand rows and says nothing about it — the
 * request succeeds, the array arrives, and it is simply short. Anything that
 * reads a whole table to add it up is therefore correct only until that table
 * passes a thousand rows, and then it is quietly wrong for ever.
 *
 * Which is what happened: the popoto leaderboard counted kudos by fetching them
 * all, and the day the table reached 1,126 rows the board started showing
 * everybody a number a hundred and twenty-six potatoes short. Nobody's page
 * disagreed with itself — a member page counts one person's rows with a filter,
 * which is well under the cap — so the only symptom was two screens showing
 * different totals for the same person.
 *
 * This asks in pages until a page comes back short. One extra round trip per
 * thousand rows, which is the price of the answer being the answer.
 *
 * The page has to ask for an order that never ties: an id, or enough columns to
 * tell any two rows apart. Without one the database owes the rows in no order,
 * so the second page is an offset into a list that may have been shuffled since
 * the first — some rows twice, some never.
 */
export async function allRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  size = 1000,
): Promise<T[]> {
  return paged(page, size, false);
}

/**
 * Every row, or an error — never a short list.
 *
 * allRows stops at a page that failed and hands back what it had, which suits a
 * board: a leaderboard a page short is better than no leaderboard. A draw a page
 * short is somebody not in the hat and nobody told, so this throws instead, and
 * the caller says so.
 */
export async function allRowsOrThrow<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  size = 1000,
): Promise<T[]> {
  return paged(page, size, true);
}

async function paged<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  size: number,
  strict: boolean,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) {
      if (!strict) break;
      const why = (error as { message?: string }).message ?? String(error);
      throw new Error(`rows ${from} to ${from + size - 1}: ${why}`);
    }
    if (!data?.length) break;
    out.push(...data);
    // A short page is the last page. Asking again would cost a round trip to
    // be told the same thing.
    if (data.length < size) break;
    // A table that has grown past what any board should be adding up in the
    // browser. Stopping is wrong, but so is fetching for ever; whoever hits
    // this should be counting in the database instead.
    if (out.length >= 100_000) {
      if (!strict) break;
      throw new Error(`more than ${out.length} rows: count these in the database`);
    }
  }
  return out;
}
