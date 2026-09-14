/**
 * What the Free Company has announced, and where one lives.
 *
 * Split out of the slider so that a page rendered on the server — which is what
 * Discord actually reads when somebody pastes a link — can describe a notice
 * without pulling a client component in behind it.
 */

export interface Notice {
  id: number;
  title: string;
  body: string | null;
  created_at: string;
  image_url: string | null;
  images?: string[] | null;
  title_en: string | null;
  body_en: string | null;
  comment_count?: number | null;
}

/**
 * A notice has an address of its own.
 *
 * It did not, and the front page's window was the only way to see one: there
 * was nothing to send somebody and nothing for Discord to unfurl, so an event
 * was announced twice — once here and once as a screenshot pasted into a
 * channel, which is the version that then went out of date.
 */
export const eventPath = (id: number) => `/events/${id}`;

/**
 * The pictures on an announcement.
 *
 * An announcement held exactly one, in image_url, because the first one was a
 * poster and a poster is one picture. v71 gave it a list, and image_url stays
 * as the first of them — the admin list draws its thumbnail from it and
 * anything reading this table from outside the app already expects it there.
 *
 * So both columns are asked, and the older one is the first picture rather than
 * a separate idea. Written down once because the front page, the window it
 * opens, the page it links to and the admin form all have to agree about how
 * many pictures a notice has, and a rule written four times will eventually be
 * four different rules.
 *
 * The parameter is the two columns rather than a whole Notice: the admin panel
 * keeps its own narrower row type, and there is no reason this should care.
 */
export interface WithPics {
  image_url: string | null;
  images?: string[] | null;
}

export const picsOf = (n: WithPics): string[] =>
  (n.images?.length ? n.images : n.image_url ? [n.image_url] : []).filter(Boolean);
