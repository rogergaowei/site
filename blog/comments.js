(function () {
  const root = document.querySelector("[data-comments]");
  if (!root) return;

  const postSlug = root.getAttribute("data-post-slug");
  const list = root.querySelector("[data-comment-list]");
  const form = root.querySelector("[data-comment-form]");
  const status = root.querySelector("[data-comment-status]");
  const count = root.querySelector("[data-comment-count]");
  const apiUrl = `/api/comments?post=${encodeURIComponent(postSlug)}`;

  function setStatus(message, kind) {
    status.textContent = message || "";
    status.dataset.kind = kind || "";
  }

  function render(comments) {
    count.textContent = comments.length ? `${comments.length}` : "0";
    if (!comments.length) {
      list.innerHTML = '<p class="comment-empty">No comments yet.</p>';
      return;
    }

    list.innerHTML = comments
      .map((comment) => {
        const date = new Date(`${comment.created_at}Z`);
        const dateText = Number.isNaN(date.getTime())
          ? ""
          : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        return `
          <article class="comment-item">
            <header>
              <strong>${escapeHtml(comment.name)}</strong>
              <span>${escapeHtml(dateText)}</span>
            </header>
            <p>${escapeHtml(comment.comment).replace(/\n/g, "<br>")}</p>
          </article>
        `;
      })
      .join("");
  }

  async function loadComments() {
    try {
      const response = await fetch(apiUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Could not load comments.");
      const data = await response.json();
      render(data.comments || []);
    } catch {
      list.innerHTML = '<p class="comment-empty">Comments are unavailable right now.</p>';
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Submitting...", "");
    const formData = new FormData(form);
    const payload = {
      postSlug,
      name: formData.get("name"),
      comment: formData.get("comment"),
      familyCode: formData.get("familyCode"),
      website: formData.get("website"),
    };

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Comment was not submitted.");
      form.reset();
      setStatus("Posted. Thanks for commenting.", "success");
      await loadComments();
    } catch (error) {
      setStatus(error.message || "Comment was not submitted.", "error");
    }
  });

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  loadComments();
})();
