const TOKEN_PATH = "/_auth/drupal-password/token";
const ROUTES = [
  { path: TOKEN_PATH, methods: ["POST"] },
  { path: "/user/login", methods: ["POST"] },
  { path: "/user/logout", methods: ["POST"] },
  { path: "/user/password", methods: ["POST"] },
  { path: "/oauth/authorize" },
  { path: "/oauth/token" },
  { path: "/oauth/userinfo" },
  { path: "/session/token" }
];
const GRANT_FIELDS = new Map([
  ["password", ["username", "password", "scope"]],
  ["refresh_token", ["refresh_token", "scope"]]
]);
const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host"
];
function routeFor(method, path) {
  return ROUTES.find((route) => route.path === path && (!route.methods || route.methods.includes(String(method).toUpperCase())));
}
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" }
});
function rewriteCookie(value, { secure = true } = {}) {
  return String(value).split(";").map((part) => part.trim()).filter((part) => !/^domain=/i.test(part)).filter((part) => secure || !/^secure$/i.test(part)).join("; ");
}
async function token(request, options) {
  let data;
  try {
    data = await request.json();
  } catch (e) {
    return json({ error: "invalid_request" }, 400);
  }
  const fields = GRANT_FIELDS.get((data || {}).grant_type);
  if (!fields)
    return json({ error: "unsupported_grant_type" }, 400);
  if (data.grant_type === "password" && (!data.username || !data.password)) {
    return json({ error: "invalid_request" }, 400);
  }
  const secret = options.clientSecret;
  const body = new URLSearchParams({
    ...Object.fromEntries(fields.filter((field) => data[field] !== void 0).map((field) => [field, data[field]])),
    grant_type: data.grant_type,
    client_id: options.passwordClientId || options.clientId,
    ...secret ? { client_secret: secret } : {}
  });
  const response = await options.fetch(`${options.baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}
async function proxy(request, url, options) {
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    if (!HOP_BY_HOP.includes(name.toLowerCase()))
      headers.set(name, value);
  }
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  const method = request.method.toUpperCase();
  const answer = await options.fetch(`${options.baseUrl}${url.pathname}${url.search}`, {
    method,
    headers,
    body: ["GET", "HEAD"].includes(method) ? void 0 : await request.arrayBuffer(),
    redirect: "manual"
  });
  const out = new Headers();
  for (const [name, value] of answer.headers) {
    const key = name.toLowerCase();
    if (HOP_BY_HOP.includes(key) || ["set-cookie", "content-encoding", "content-length"].includes(key)) {
      continue;
    }
    out.set(name, value);
  }
  const secure = url.protocol === "https:";
  const cookies = typeof answer.headers.getSetCookie === "function" ? answer.headers.getSetCookie() : [answer.headers.get("set-cookie")].filter(Boolean);
  for (const cookie of cookies) {
    out.append("set-cookie", rewriteCookie(cookie, { secure }));
  }
  const location = out.get("location");
  if (location && location.startsWith(options.baseUrl)) {
    out.set("location", location.slice(options.baseUrl.length) || "/");
  }
  return new Response(answer.body, { status: answer.status, headers: out });
}
function createFetchHandler(options = {}) {
  const baseUrl = String(options.baseUrl || "").replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("druxt-auth: createFetchHandler needs a baseUrl.");
  }
  const settings = {
    ...options,
    baseUrl,
    fetch: options.fetch || ((...args) => fetch(...args))
  };
  return async (request) => {
    const url = new URL(request.url);
    const route = routeFor(request.method, url.pathname);
    if (!route)
      return new Response("Not found", { status: 404 });
    if (route.path === TOKEN_PATH)
      return token(request, settings);
    if (settings.proxy === false) {
      return new Response("Not found", { status: 404 });
    }
    return proxy(request, url, settings);
  };
}

export { ROUTES, TOKEN_PATH, createFetchHandler, rewriteCookie, routeFor };
