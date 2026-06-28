import {
  onRequestDelete,
  onRequestGet,
  onRequestPatch,
  onRequestPost,
} from "./functions/api/comments.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/comments") {
      const context = { request, env, ctx };
      if (request.method === "GET") return onRequestGet(context);
      if (request.method === "POST") return onRequestPost(context);
      if (request.method === "PATCH") return onRequestPatch(context);
      if (request.method === "DELETE") return onRequestDelete(context);
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, POST, PATCH, DELETE" },
      });
    }

    return env.ASSETS.fetch(rewriteStaticRequest(request));
  },
};

function rewriteStaticRequest(request) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  if (host === "blog.rogergaowei.com") {
    if (url.pathname === "/") {
      url.pathname = "/blog/";
    } else if (url.pathname.startsWith("/posts/")) {
      url.pathname = `/blog${url.pathname}`;
    } else if (url.pathname.startsWith("/assets/")) {
      url.pathname = `/blog${url.pathname}`;
    } else if (url.pathname.startsWith("/content/")) {
      url.pathname = `/blog${url.pathname}`;
    }
  }

  return new Request(url, request);
}
