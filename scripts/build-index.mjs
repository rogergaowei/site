import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const SITE_ORIGIN = "https://rogergaowei.com";
const BLOG_TITLE = "Roger Gao Wei Blog";
const BLOG_DESCRIPTION = "Personal essays and trip notes by Roger Gao Wei.";

const posts = JSON.parse(await readFile("blog/content/posts.json", "utf8"))
  .toSorted((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

const archiveMonths = [...new Map(posts.map((post) => {
  const date = new Date(`${post.sortDate}T00:00:00`);
  const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = date.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });
  return [key, { key, label, count: 0 }];
})).values()];

for (const month of archiveMonths) {
  month.count = posts.filter((post) => archiveKey(post.sortDate) === month.key).length;
}

let previousArchiveKey = "";

const latestCards = posts
  .filter((post) => post.status !== "draft")
  .slice(0, 3)
  .map((post) => `          <article>
            <a href="/blog/posts/${post.slug}.html">
              <span>${escapeHtml(post.date)}</span>
              <h3>${escapeHtml(post.title)}</h3>
              <p>${escapeHtml(post.summary)}</p>
            </a>
          </article>`)
  .join("\n");

const cards = posts.map((post) => {
  const media = post.cover
    ? renderImage(post.cover, post.coverAlt)
    : `<div class="post-placeholder" aria-hidden="true">${escapeHtml(post.title.charAt(0))}</div>`;
  const status = post.status === "draft" ? `<span class="status-pill">Writing</span>` : "";

  const currentArchiveKey = archiveKey(post.sortDate);
  const monthHeading = currentArchiveKey !== previousArchiveKey
    ? `        <h2 id="${currentArchiveKey}" class="month-heading">${escapeHtml(archiveMonths.find((month) => month.key === currentArchiveKey).label)}</h2>\n`
    : "";
  previousArchiveKey = currentArchiveKey;

  return `${monthHeading}        <article class="post-card${post.status === "draft" ? " draft" : ""}">
          <a href="/blog/posts/${post.slug}.html" data-post-card data-search="${escapeHtml(`${post.title} ${post.date} ${post.summary} ${post.status || "published"}`.toLowerCase())}" data-status="${escapeHtml(post.status || "published")}">
            ${media}
            <div>
              <p class="date">${escapeHtml(post.date)}${status}</p>
              <h2>${escapeHtml(post.title)}</h2>
              <p>${escapeHtml(post.summary)}</p>
            </div>
          </a>
        </article>`;
}).join("\n");

const archiveLinks = archiveMonths.map((month) => `          <a href="#${month.key}">${escapeHtml(month.label)} <span>${month.count}</span></a>`).join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${BLOG_TITLE}</title>
    <meta name="description" content="${BLOG_DESCRIPTION}">
    <link rel="canonical" href="${SITE_ORIGIN}/blog/">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${BLOG_TITLE}">
    <meta property="og:description" content="${BLOG_DESCRIPTION}">
    <meta property="og:url" content="${SITE_ORIGIN}/blog/">
    <meta property="og:site_name" content="Roger Gao Wei">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${BLOG_TITLE}">
    <meta name="twitter:description" content="${BLOG_DESCRIPTION}">
    <link rel="stylesheet" href="/blog/styles.css">
  </head>
  <body id="top">
    <header class="site-header">
      <a class="brand" href="https://rogergaowei.com/">Roger Gao Wei</a>
      <nav>
        <a href="https://rogergaowei.com/">Home</a>
        <a href="https://rogergaowei.com/game/">Game</a>
      </nav>
    </header>

    <main class="page">
      <section class="intro">
        <p class="eyebrow">Personal Blog</p>
        <h1>Notes, trips, and things I am learning.</h1>
      </section>

      <section class="latest" aria-label="Latest blog posts">
        <div class="section-heading">
          <p class="eyebrow">Latest</p>
          <h2>Recent blog posts</h2>
        </div>
        <div class="latest-grid">
${latestCards}
        </div>
      </section>

      <section class="archive-nav" aria-label="Browse posts by month">
        <h2>Archive</h2>
        <div>
${archiveLinks}
        </div>
      </section>

      <section class="blog-tools" aria-label="Filter posts">
        <label>
          Search posts
          <input type="search" data-post-search placeholder="Search by title, month, or topic">
        </label>
        <div class="status-filter" aria-label="Post status">
          <button type="button" class="active" data-status-filter="all">All</button>
          <button type="button" data-status-filter="published">Published</button>
          <button type="button" data-status-filter="draft">Writing</button>
        </div>
        <p class="filter-count" data-filter-count></p>
      </section>

      <section class="post-list" aria-label="Posts">
${cards}
      </section>
      <nav class="page-bottom-nav" aria-label="Page bottom navigation">
        <a href="#top">Back to top</a>
      </nav>
    </main>
    <script src="/blog/index.js" defer></script>
  </body>
</html>
`;

await writeFile("blog/index.html", html);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function archiveKey(sortDate) {
  const date = new Date(`${sortDate}T00:00:00`);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function renderImage(src, alt) {
  const webp = webpPath(src);
  const img = `<img src="${src}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
  if (!webp || !existsSync(webp.local)) return img;
  return `<picture>
              <source srcset="${webp.public}" type="image/webp">
              ${img}
            </picture>`;
}

function webpPath(src) {
  if (!/\.(jpe?g|png)$/i.test(src)) return null;
  const publicPath = src.replace(/\.(jpe?g|png)$/i, ".webp");
  return {
    public: publicPath,
    local: publicPath.replace(/^\//, ""),
  };
}
