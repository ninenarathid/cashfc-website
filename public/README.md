# public/

Static assets served from the site root: a file here at `public/logo.png` is
reachable as `/logo.png`.

Expected:

- `logo-header.png` — the mark in the top navigation bar. Rendered 48px tall on
  mobile and 56px on desktop, so roughly 200-600px wide is plenty. Transparent
  PNG. Falls back to `logo.png`, then to a text wordmark, if absent.
- `logo.png` — the large wordmark on the home page, up to 448px wide. Transparent
  PNG; around 1000px wide keeps it sharp on high-density screens without being
  wasteful. Also used by the nav if no header logo is supplied.

Keep both well under a megabyte — every visitor downloads them.
