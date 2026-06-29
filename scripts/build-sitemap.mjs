import { readFile, writeFile } from "node:fs/promises";

const SITE_ORIGIN = "https://rogergaowei.com";
const posts = JSON.parse(await readFile("blog/content/posts.json", "utf8"));

const staticPages = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/blog/", priority: "0.9", changefreq: "weekly" },
  { loc: "/game/", priority: "0.8", changefreq: "monthly" },
];

const postPages = posts
  .filter((post) => post.status !== "draft")
  .toSorted((a, b) => new Date(b.sortDate) - new Date(a.sortDate))
  .map((post) => ({
    loc: `/blog/posts/${post.slug}.html`,
    lastmod: post.sortDate,
    priority: "0.7",
    changefreq: "monthly",
  }));

const urls = [...staticPages, ...postPages];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(renderUrl).join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;

await writeFile("sitemap.xml", sitemap);
await writeFile("robots.txt", robots);

function renderUrl(entry) {
  return `  <url>
    <loc>${SITE_ORIGIN}${entry.loc}</loc>
${entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>\n` : ""}    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
}
