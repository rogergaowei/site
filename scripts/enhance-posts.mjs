import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const SITE_ORIGIN = "https://rogergaowei.com";
const BLOG_NAME = "Roger Gao Wei Blog";

const posts = JSON.parse(await readFile("blog/content/posts.json", "utf8"));
const postsBySlug = new Map(posts.map((post) => [post.slug, post]));

for (const post of postsBySlug.values()) {
  const file = `blog/posts/${post.slug}.html`;
  let html = await readFile(file, "utf8");
  html = ensureHeadMetadata(html, post);
  html = ensureLazyImages(html);
  html = ensureThemeControls(html);
  html = ensureThemeScript(html);
  await writeFile(file, html);
}

function ensureHeadMetadata(html, post) {
  const title = `${post.title} | ${BLOG_NAME}`;
  const description = post.summary || `${post.title} by Roger Gao Wei.`;
  const url = `${SITE_ORIGIN}/blog/posts/${post.slug}.html`;
  const image = post.cover ? `${SITE_ORIGIN}${post.cover}` : "";
  const metadataPattern = /\s*<title>[\s\S]*?<\/title>\s*<meta name="description" content="[\s\S]*?">\s*(?:<link rel="canonical" href="[^"]*">\s*|<meta property="(?:og:[^"]+|article:[^"]+)" content="[\s\S]*?">\s*|<meta name="twitter:[^"]+" content="[\s\S]*?">\s*)*/;
  if (!metadataPattern.test(html)) return html;

  const extra = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${escapeHtml(post.title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:site_name" content="Roger Gao Wei">`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}">` : "",
    post.coverAlt ? `<meta property="og:image:alt" content="${escapeHtml(post.coverAlt)}">` : "",
    post.sortDate ? `<meta property="article:published_time" content="${escapeHtml(post.sortDate)}">` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escapeHtml(post.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : "",
  ].filter(Boolean).map((line) => `    ${line}`).join("\n");

  return html.replace(metadataPattern, `\n${extra}\n    `);
}

function ensureLazyImages(html) {
  let output = html.replace(/<picture>\s*<source srcset="[^"]+\.webp" type="image\/webp">\s*(<img\b[^>]*?>)\s*<\/picture>/g, "$1");
  output = output.replace(/<img\b([^>]*?)>/g, (match, attrs) => {
    let next = attrs;
    if (!/\sloading=/.test(next)) next += ' loading="lazy"';
    if (!/\sdecoding=/.test(next)) next += ' decoding="async"';
    const img = `<img${next}>`;
    const src = next.match(/\ssrc="([^"]+)"/)?.[1] || "";
    const webp = webpPath(src);
    if (!webp || !existsSync(webp.local)) return img;
    return `<picture>
          <source srcset="${webp.public}" type="image/webp">
          ${img}
        </picture>`;
  });
  return output;
}

function ensureThemeControls(html) {
  const headerPattern = /<header class="site-header">\s*<a class="brand" href="[^"]+">[^<]+<\/a>\s*<nav>/;
  if (headerPattern.test(html)) {
    const wrapped = html.replace(headerPattern, `<header class="site-header">
      <a class="brand" href="https://rogergaowei.com/">Roger Gao Wei</a>
      <div class="header-controls">
        <span class="theme-control">
          <button type="button" class="theme-button" data-theme-button aria-label="Cycle theme">Theme</button>
        </span>
        <nav>`);
    return wrapped.replace(/<\/nav>\n(\s*)<\/header>/, `</nav>\n      </div>\n$1</header>`);
  }

  return html;
}

function ensureThemeScript(html) {
  if (html.includes("theme-switch.js")) return html;
  return html.replace(/\n\s*<script src=\/blog\/comments\.js defer><\/script>/, '$&\n      <script src="/theme-switch.js?v=theme-switch-1" defer></script>');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function webpPath(src) {
  if (!/\.(jpe?g|png)$/i.test(src)) return null;
  const publicPath = src.replace(/\.(jpe?g|png)$/i, ".webp");
  return {
    public: publicPath,
    local: publicPath.replace(/^\//, ""),
  };
}
