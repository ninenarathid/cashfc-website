/**
 * What two of the fountain's blessings (lib/town/fountain) do in the forest and with a net (the owner, 2026-10-05:
 * "อยากให้ช่วยเพิ่ม บัฟที่เกี่ยวของกับ การหาของป่า การจับแมลงที่เพิ่มเข้ามาใหม่"). Both spare skill and never give more of
 * anything: the fountain is there to take coins out of the village, and every thing more is coins.
 *
 * - **Forest eye** (`forage`): each of the forest's games is a little kinder. Among what is chosen there is one
 *   look-alike fewer; a digging has a stroke more to spare; a tree shaken drops one more than is wanted.
 * - **Soft step** (`net`): an insect lets whoever has it come nearer before it minds them: what it sees and hears
 *   of them reaches so much less far.
 *
 * The games are the page's, so these are too: the database is told only that the wishes exist (v125's
 * `town.wishes`), and holds who has which as it does every blessing.
 */
/** How many look-alikes fewer, strokes more and fruit more the forest eye is worth. */
export const FOREST_EYE = 1;
/**
 * What the forest eye is worth to somebody: so many (look-alikes fewer, strokes more, fruit more). A yes is the
 * fountain's blessing, one; a number is what a meal's buff does at its level (items' byOf: the forest's dishes leave
 * it since 2026-10-06, and a level adds to it). Nothing, with none.
 */
export const eyes = (eye: boolean | number | undefined): number => (eye === true ? FOREST_EYE : Math.max(0, Math.floor(eye || 0)));
/** The share of an insect's senses that reaches somebody with a soft step: half as near again is two thirds as far. */
export const softStep = (by: number) => 1 / (1 + Math.max(0, by));
/** The wishes, by the names the fountain knows them by. */
export const WILD_WISHES = { forest: "forage", net: "net" } as const;
