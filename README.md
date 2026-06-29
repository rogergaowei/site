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

Blog posts include a small family-code comment system.

- Public readers can submit a name and comment.
- Submitting a comment requires the shared family code.
- Comments with the correct family code are published immediately.
- Readers can reply to a top-level comment with the same family code.
- Admin tools live at `/admin/comments.html` for hiding or deleting comments later.
- New comments and replies can send email notifications through Resend.

Cloudflare runtime configuration:

- D1 binding: `COMMENTS_DB`
- D1 database: `roger_comments`
- Required secret: `COMMENTS_ADMIN_TOKEN`
- Required secret: `COMMENT_FAMILY_CODE`
- Optional secret: `RESEND_API_KEY`
- Optional variable: `COMMENT_NOTIFY_TO` defaults to `rogergaowei@gmail.com`
- Required for email notifications: `COMMENT_NOTIFY_FROM`, using a Resend-verified sender address

Do not commit secrets to this repository. Set them as Cloudflare Worker secrets or runtime variables.

## Add a Google Doc post

Add the Google Doc URL to `blog/content/google-docs.json`, then ask Codex to sync the blog. Codex will export the document, copy images into `blog/assets/`, create the article page, update `blog/content/posts.json`, run `node scripts/prepare-site.mjs`, and push the result.

If a document shows `needs_access`, open the Google Doc sharing settings and allow the Codex-connected Google account to read it, or set link access to viewer.

## Prepare generated files

After adding or editing blog content, run:

```sh
node scripts/prepare-site.mjs
```

This rebuilds the blog index, adds article metadata and lazy image attributes, and regenerates `sitemap.xml` and `robots.txt`.

## Deploy on Cloudflare Workers

- Deploy command: `npx wrangler deploy`
- Worker entry: `worker.js`
- Static assets directory: `/`
- Blog comments database binding is defined in `wrangler.toml`.

`blog.rogergaowei.com` is handled by the Worker so that its root path serves the blog index.
