import { readFile, writeFile, mkdir } from "node:fs/promises";

const operation = getArg("--operation", "rebuild-index");

if (operation === "add-doc") {
  await addDoc();
} else if (operation === "rebuild-index") {
  await import("./build-index.mjs");
} else {
  throw new Error(`Unknown operation: ${operation}`);
}

async function addDoc() {
  const url = getArg("--url", "").trim();
  const title = getArg("--title", "").trim();
  const status = getArg("--status", "draft").trim();
  const sortDate = getArg("--sort-date", "").trim() || new Date().toISOString().slice(0, 10);
  const summary = getArg("--summary", "").trim() || "Draft imported from Google Docs.";
  const slug = slugify(getArg("--slug", title || extractDocId(url)).trim());

  if (!url || !extractDocId(url)) {
    throw new Error("A valid Google Doc URL is required.");
  }

  if (!title) {
    throw new Error("A title is required for the MVP admin workflow.");
  }

  const docs = JSON.parse(await readFile("blog/content/google-docs.json", "utf8"));
  const posts = JSON.parse(await readFile("blog/content/posts.json", "utf8"));

  const existingDoc = docs.find((doc) => extractDocId(doc.url) === extractDocId(url) || doc.slug === slug);
  if (existingDoc) {
    existingDoc.title = title;
    existingDoc.url = normalizeGoogleDocUrl(url);
    existingDoc.status = status;
  } else {
    docs.unshift({
      slug,
      title,
      url: normalizeGoogleDocUrl(url),
      status,
      sourceModifiedTime: new Date().toISOString()
    });
  }

  const dateLabel = formatDateLabel(sortDate);
  const existingPost = posts.find((post) => post.slug === slug);
  const post = {
    title,
    slug,
    date: dateLabel,
    sortDate,
    summary,
    cover: "",
    coverAlt: "",
    status
  };

  if (existingPost) {
    Object.assign(existingPost, post);
  } else {
    posts.unshift(post);
  }

  await writeJson("blog/content/google-docs.json", docs);
  await writeJson("blog/content/posts.json", posts);
  await writePlaceholderPost({ title, slug, summary, sortDate, status, url: normalizeGoogleDocUrl(url) });
  await import("./build-index.mjs");
}

async function writePlaceholderPost(post) {
  await mkdir("blog/posts", { recursive: true });
  const note = post.status === "draft"
    ? `<div class="draft-note"><p>This draft is linked to Google Docs. Full content import is not automated yet.</p></div>`
    : "";
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(post.title)} | Roger Gao Wei Blog</title>
    <meta name="description" content="${escapeHtml(post.summary)}">
    <link rel="stylesheet" href="/blog/styles.css">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">Roger Gao Wei</a>
      <nav>
        <a href="/">Home</a>
        <a href="/blog/">Blog</a>
        <a href="/game/">Game</a>
      </nav>
    </header>

    <main class="article">
      <article>
        <header class="article-header">
          <p class="date">${escapeHtml(formatDateLabel(post.sortDate))}</p>
          <h1>${escapeHtml(post.title)}</h1>
          <p class="dek">${escapeHtml(post.summary)}</p>
        </header>
        ${note}
        <p><a href="${escapeHtml(post.url)}">Open the source Google Doc</a></p>
      </article>
    </main>
  </body>
</html>
`;
  await writeFile(`blog/posts/${post.slug}.html`, html);
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function getArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function extractDocId(url) {
  const match = String(url).match(/\/document\/d\/([^/]+)/);
  return match?.[1] ?? "";
}

function normalizeGoogleDocUrl(url) {
  const id = extractDocId(url);
  return `https://docs.google.com/document/d/${id}/edit`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDateLabel(sortDate) {
  const date = new Date(`${sortDate}T00:00:00Z`);
  return date.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
