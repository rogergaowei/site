const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const MAX_NAME_LENGTH = 80;
const MAX_COMMENT_LENGTH = 2000;
const MAX_POST_LENGTH = 160;
const MAX_POST_TITLE_LENGTH = 180;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const db = getDb(env);
  if (!db) return missingDb();
  await ensureSchema(db);

  if (url.searchParams.get("moderate") === "1") {
    const auth = requireAdmin(request, env);
    if (auth) return auth;

    const status = normalizeStatus(url.searchParams.get("status")) || "pending";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 200);
    const rows = await db
      .prepare(
        `SELECT id, parent_id, post_slug, name, comment, status, ip_hash, user_agent, created_at, updated_at
         FROM comments
         WHERE status = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(status, limit)
      .all();

    return json({ comments: rows.results || [] });
  }

  const post = normalizePostSlug(url.searchParams.get("post") || "");
  if (!post) return json({ error: "Missing post slug." }, 400);

  const rows = await db
    .prepare(
      `SELECT id, parent_id, name, comment, created_at
       FROM comments
       WHERE post_slug = ? AND status = 'approved'
       ORDER BY created_at ASC`
    )
    .bind(post)
    .all();

  return json({ comments: rows.results || [] });
}

export async function onRequestPost({ request, env, ctx }) {
  const db = getDb(env);
  if (!db) return missingDb();
  await ensureSchema(db);

  const payload = await readJson(request);
  if (!payload) return json({ error: "Invalid JSON." }, 400);

  const honeypot = String(payload.website || "").trim();
  if (honeypot) return json({ ok: true, status: "approved" });

  const post = normalizePostSlug(payload.postSlug || payload.post || "");
  const name = cleanText(payload.name || "", MAX_NAME_LENGTH);
  const comment = cleanText(payload.comment || "", MAX_COMMENT_LENGTH);
  const postTitle = cleanText(payload.postTitle || post, MAX_POST_TITLE_LENGTH);
  const familyCode = String(payload.familyCode || "").trim();
  const parentId = parseParentId(payload.parentId);

  if (!post) return json({ error: "Missing post slug." }, 400);
  if (!name) return json({ error: "Please enter a name." }, 400);
  if (!comment) return json({ error: "Please enter a comment." }, 400);

  if (parentId) {
    const parent = await db
      .prepare(
        `SELECT id
         FROM comments
         WHERE id = ? AND post_slug = ? AND status = 'approved' AND parent_id IS NULL`
      )
      .bind(parentId, post)
      .first();
    if (!parent) return json({ error: "The comment you are replying to was not found." }, 400);
  }

  if (env.COMMENT_FAMILY_CODE && familyCode !== env.COMMENT_FAMILY_CODE) {
    return json({ error: "The family code is not correct." }, 403);
  }

  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET, payload.turnstileToken, request);
    if (!ok) return json({ error: "Verification failed. Please try again." }, 403);
  }

  const ip = getClientIp(request);
  const ipHash = await sha256(ip || "unknown");
  const recent = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM comments
       WHERE ip_hash = ? AND created_at > datetime('now', '-5 minutes')`
    )
    .bind(ipHash)
    .first();
  if ((recent?.count || 0) >= 5) {
    return json({ error: "Too many comments. Please wait a few minutes." }, 429);
  }

  const userAgent = cleanText(request.headers.get("user-agent") || "", 300);
  const result = await db
    .prepare(
      `INSERT INTO comments (parent_id, post_slug, name, comment, status, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, 'approved', ?, ?)`
    )
    .bind(parentId || null, post, name, comment, ipHash, userAgent)
    .run();

  const notification = sendCommentNotification({
    request,
    env,
    post,
    postTitle,
    name,
    comment,
    parentId,
    commentId: result?.meta?.last_row_id,
  });
  if (ctx?.waitUntil) {
    ctx.waitUntil(notification);
  } else {
    await notification;
  }

  return json({ ok: true, status: "approved" }, 201);
}

export async function onRequestPatch({ request, env }) {
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  const db = getDb(env);
  if (!db) return missingDb();
  await ensureSchema(db);

  const payload = await readJson(request);
  if (!payload) return json({ error: "Invalid JSON." }, 400);

  const id = Number(payload.id);
  const status = normalizeStatus(payload.status);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid comment id." }, 400);
  if (!status) return json({ error: "Invalid status." }, 400);

  await db
    .prepare("UPDATE comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(status, id)
    .run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  const db = getDb(env);
  if (!db) return missingDb();
  await ensureSchema(db);

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid comment id." }, 400);

  await db.prepare("DELETE FROM comments WHERE id = ? OR parent_id = ?").bind(id, id).run();
  return json({ ok: true });
}

async function ensureSchema(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER,
        post_slug TEXT NOT NULL,
        name TEXT NOT NULL,
        comment TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'hidden')),
        ip_hash TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run();

  await addColumnIfMissing(db, "comments", "parent_id", "INTEGER");

  await db
    .prepare("CREATE INDEX IF NOT EXISTS idx_comments_post_status ON comments(post_slug, status, created_at)")
    .run();
  await db
    .prepare("CREATE INDEX IF NOT EXISTS idx_comments_status_created ON comments(status, created_at)")
    .run();
  await db
    .prepare("CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id, created_at)")
    .run();
}

async function addColumnIfMissing(db, table, column, definition) {
  const info = await db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = (info.results || []).some((row) => row.name === column);
  if (!exists) {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

function getDb(env) {
  return env.COMMENTS_DB || null;
}

function missingDb() {
  return json({ error: "COMMENTS_DB D1 binding is not configured." }, 500);
}

function requireAdmin(request, env) {
  if (!env.COMMENTS_ADMIN_TOKEN) {
    return json({ error: "COMMENTS_ADMIN_TOKEN is not configured." }, 500);
  }

  const expected = `Bearer ${env.COMMENTS_ADMIN_TOKEN}`;
  if (request.headers.get("authorization") !== expected) {
    return json({ error: "Unauthorized." }, 401);
  }
  return null;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function cleanText(value, maxLength) {
  return String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizePostSlug(value) {
  const slug = String(value).trim().slice(0, MAX_POST_LENGTH);
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) ? slug : "";
}

function normalizeStatus(value) {
  return ["pending", "approved", "hidden"].includes(value) ? value : "";
}

function parseParentId(value) {
  if (value === undefined || value === null || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyTurnstile(secret, token, request) {
  if (!token) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  const ip = getClientIp(request);
  if (ip) body.append("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const result = await response.json();
  return Boolean(result.success);
}

async function sendCommentNotification({ request, env, post, postTitle, name, comment, parentId, commentId }) {
  if (!env.RESEND_API_KEY) return;

  const to = env.COMMENT_NOTIFY_TO || "rogergaowei@gmail.com";
  const from = env.COMMENT_NOTIFY_FROM;
  if (!from) {
    console.warn("COMMENT_NOTIFY_FROM is not configured; skipping comment email notification.");
    return;
  }

  const postUrl = buildPostUrl(request, post);
  const kind = parentId ? "reply" : "comment";
  const subject = parentId
    ? `New reply on Roger's blog: ${postTitle || post}`
    : `New comment on Roger's blog: ${postTitle || post}`;
  const text = [
    `New ${kind} on Roger's blog`,
    `Post: ${postTitle || post}`,
    `Slug: ${post}`,
    parentId ? `Reply to comment: #${parentId}` : "",
    commentId ? `Comment: #${commentId}` : "",
    `Name: ${name}`,
    "",
    comment,
    "",
    `Post URL: ${postUrl}`,
    `Admin: ${new URL("/admin/comments.html", request.url).toString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <h2>New ${escapeHtml(kind)} on Roger's blog</h2>
    <p><strong>Post:</strong> ${escapeHtml(postTitle || post)}</p>
    <p><strong>Slug:</strong> ${escapeHtml(post)}</p>
    ${parentId ? `<p><strong>Reply to:</strong> #${parentId}</p>` : ""}
    ${commentId ? `<p><strong>Comment:</strong> #${commentId}</p>` : ""}
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <blockquote>${escapeHtml(comment).replace(/\n/g, "<br>")}</blockquote>
    <p><a href="${escapeHtml(postUrl)}">Open post</a></p>
    <p><a href="${escapeHtml(new URL("/admin/comments.html", request.url).toString())}">Open admin</a></p>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      console.warn("Comment email notification failed.", await response.text());
    }
  } catch (error) {
    console.warn("Comment email notification failed.", error);
  }
}

function buildPostUrl(request, post) {
  const url = new URL(request.url);
  const path = url.hostname === "blog.rogergaowei.com"
    ? `/posts/${post}.html`
    : `/blog/posts/${post}.html`;
  return new URL(path, url.origin).toString();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
