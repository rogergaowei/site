# Roger Gao Wei Site

Personal site for `rogergaowei.com`, deployed on Cloudflare Workers with static assets.

## Structure

- `/` is the personal home page.
- `/blog/` is the blog.
- `/blog/posts/` contains generated blog post pages.
- `/blog/assets/` contains blog images.
- `/game/` is the archived current game page from `game.rogergaowei.com`.

Future sections such as `/projects/` and `/photos/` can live in this same repository.

## Blog comments

Blog posts include a small moderated comment system.

- Public readers can submit a name and comment.
- New comments are stored as `pending`.
- Approved comments are shown publicly below the post.
- Moderation lives at `/admin/comments.html`.

Cloudflare runtime configuration:

- D1 binding: `COMMENTS_DB`
- D1 database: `roger_comments`
- Required secret: `COMMENTS_ADMIN_TOKEN`

Do not commit the admin token to this repository. Set it as a Cloudflare Worker secret or runtime variable.

## Add a Google Doc post

Add the Google Doc URL to `blog/content/google-docs.json`, then ask Codex to sync the blog. Codex will export the document, copy images into `blog/assets/`, create the article page, update `blog/content/posts.json`, run `node scripts/build-index.mjs`, and push the result.

If a document shows `needs_access`, open the Google Doc sharing settings and allow the Codex-connected Google account to read it, or set link access to viewer.

## Deploy on Cloudflare Workers

- Deploy command: `npx wrangler deploy`
- Worker entry: `worker.js`
- Static assets directory: `/`
- Blog comments database binding is defined in `wrangler.toml`.

`blog.rogergaowei.com` is handled by the Worker so that its root path serves the blog index.
