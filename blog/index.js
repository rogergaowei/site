(function () {
  const recentPosts = Array.from(document.querySelectorAll("[data-recent-post]"));
  const recentSection = document.querySelector("[data-recents-section]");
  const recentCutoff = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const post of recentPosts) {
    const published = Date.parse(`${post.dataset.publishedDate}T00:00:00Z`);
    post.hidden = !Number.isFinite(published) || now - published > recentCutoff;
  }
  if (recentSection) recentSection.hidden = !recentPosts.some((post) => !post.hidden);

  const search = document.querySelector("[data-unified-search]");
  const cards = Array.from(document.querySelectorAll("[data-search-card]"));
  const results = document.querySelector("[data-search-results]");
  const browseSections = Array.from(document.querySelectorAll("[data-browse-section]"));
  const count = document.querySelector("[data-search-count]");
  const empty = document.querySelector("[data-search-empty]");
  if (!search || !cards.length) return;

  function applySearch() {
    const query = search.value.trim().toLowerCase();
    const searching = query.length > 0;
    let visible = 0;

    for (const card of cards) {
      const show = searching && (card.dataset.search || "").includes(query);
      card.hidden = !show;
      if (show) visible += 1;
    }

    if (results) results.hidden = !searching;
    browseSections.forEach((section) => { section.hidden = searching; });
    if (empty) empty.hidden = !searching || visible > 0;
    if (count) count.textContent = searching ? `${visible} ${visible === 1 ? "post" : "posts"} found` : `${cards.length} posts available`;
  }

  search.addEventListener("input", applySearch);
  applySearch();
})();
