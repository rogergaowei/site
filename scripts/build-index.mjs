import { readFile, writeFile } from "node:fs/promises";

const posts = JSON.parse(await readFile("content/posts.json", "utf8"))
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

const cards = posts.map((post) => {
  const media = post.cover
    ? `<img src="${post.cover}" alt="${escapeHtml(post.coverAlt)}">`
    : `<div class="post-placeholder" aria-hidden="true">${escapeHtml(post.title.charAt(0))}</div>`;
  const status = post.status === "draft" ? `<span class="status-pill">Writing</span>` : "";

  const currentArchiveKey = archiveKey(post.sortDate);
  const monthHeading = currentArchiveKey !== previousArchiveKey
    ? `        <h2 id="${currentArchiveKey}" class="month-heading">${escapeHtml(archiveMonths.find((month) => month.key === currentArchiveKey).label)}</h2>\n`
    : "";
  previousArchiveKey = currentArchiveKey;

  return `${monthHeading}        <article class="post-card${post.status === "draft" ? " draft" : ""}">
          <a href="/posts/${post.slug}.html">
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
    <title>Roger Gao Wei Blog</title>
    <meta name="description" content="Personal essays and trip notes by Roger Gao Wei.">
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">Roger Gao Wei</a>
      <nav>
        <a href="https://rogergaowei.com">Home</a>
      </nav>
    </header>

    <main class="page">
      <section class="intro">
        <p class="eyebrow">Personal Blog</p>
        <h1>Notes, trips, and things I am learning.</h1>
      </section>

      <section class="archive-nav" aria-label="Browse posts by month">
        <h2>Archive</h2>
        <div>
${archiveLinks}
        </div>
      </section>

      <section class="post-list" aria-label="Posts">
${cards}
      </section>
    </main>
  </body>
</html>
`;

await writeFile("index.html", html);

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
