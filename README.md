# Roger Gao Wei Site

Static personal site for `rogergaowei.com`.

## Structure

- `/` is the personal home page.
- `/blog/` is the blog.
- `/blog/posts/` contains generated blog post pages.
- `/blog/assets/` contains blog images.
- `/game/` is the archived current game page from `game.rogergaowei.com`.

Future sections such as `/projects/` and `/photos/` can live in this same repository.

## Add a Google Doc post

Add the Google Doc URL to `blog/content/google-docs.json`, then ask Codex to sync the blog. Codex will export the document, copy images into `blog/assets/`, create the article page, update `blog/content/posts.json`, run `node scripts/build-index.mjs`, and push the result.

If a document shows `needs_access`, open the Google Doc sharing settings and allow the Codex-connected Google account to read it, or set link access to viewer.

## Deploy on Cloudflare Pages

- Framework preset: `None`
- Build command: leave empty, or run `node scripts/build-index.mjs`
- Build output directory: `/`
- Custom domain: `rogergaowei.com`

`blog.rogergaowei.com` can remain as a redirect or alias for `/blog/`.
