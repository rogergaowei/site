(function () {
  const search = document.querySelector("[data-post-search]");
  const cards = Array.from(document.querySelectorAll("[data-post-card]"));
  const filters = Array.from(document.querySelectorAll("[data-status-filter]"));
  const count = document.querySelector("[data-filter-count]");
  if (!search || !cards.length) return;

  let status = "all";

  function applyFilters() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;

    for (const card of cards) {
      const article = card.closest(".post-card");
      const matchesQuery = !query || (card.dataset.search || "").includes(query);
      const matchesStatus = status === "all" || card.dataset.status === status;
      const show = matchesQuery && matchesStatus;
      article.hidden = !show;
      if (show) visible += 1;
    }

    updateMonthHeadings();
    updateCount(visible);
  }

  function updateMonthHeadings() {
    const headings = Array.from(document.querySelectorAll(".month-heading"));
    for (const heading of headings) {
      let node = heading.nextElementSibling;
      let hasVisiblePost = false;
      while (node && !node.classList.contains("month-heading")) {
        if (node.classList.contains("post-card") && !node.hidden) {
          hasVisiblePost = true;
          break;
        }
        node = node.nextElementSibling;
      }
      heading.hidden = !hasVisiblePost;
    }
  }

  function updateCount(visible) {
    if (!count) return;
    const total = cards.length;
    count.textContent = visible === total ? `${total} posts` : `${visible} of ${total} posts`;
  }

  search.addEventListener("input", applyFilters);
  for (const button of filters) {
    button.addEventListener("click", () => {
      status = button.dataset.statusFilter;
      filters.forEach((filter) => filter.classList.toggle("active", filter === button));
      applyFilters();
    });
  }

  applyFilters();
})();
