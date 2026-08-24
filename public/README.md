# public/

Static assets served from the site root: a file here at `public/logo.png` is
reachable as `/logo.png`.

Expected:

- `logo.png` — the FC wordmark, shown in the nav (falls back to a text wordmark
  while the file is missing). Transparent PNG, roughly 4:3, any size from about
  400px wide up; it renders at 32px tall so detail beyond ~600px is wasted bytes.
