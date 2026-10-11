'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const path = require('path');
const httpProxyMiddleware = require('http-proxy-middleware');

const ADMIN_PATHS = [
  "/admin",
  "/node/add",
  "/media/add",
  "/user/login",
  "/user/logout",
  "/user/password",
  "/user/register"
];
function normalise(path) {
  const trimmed = String(path || "").split("?")[0].split("#")[0];
  return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}
function isAdminPath(path, paths = ADMIN_PATHS) {
  const subject = normalise(path);
  if (!subject) return false;
  return paths.some((prefix) => {
    const p = normalise(prefix);
    return subject === p || subject.startsWith(`${p}/`);
  });
}
function backendPath(baseUrl, path) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  if (!base) return "";
  const subject = String(path || "/");
  return `${base}${subject.startsWith("/") ? subject : `/${subject}`}`;
}
const MODES = ["link", "proxy"];
function resolveMode(mode) {
  return MODES.includes(mode) ? mode : "link";
}

const BACKEND_PATHS = [
  // Assets: core's own, contributed, themes, and the public files directory.
  "/core",
  "/libraries",
  "/modules",
  "/profiles",
  "/themes",
  // The endpoints an administration screen talks to while it is open.
  "/batch",
  "/system",
  "/session",
  "/file",
  "/views/ajax",
  "/contextual",
  "/editor",
  "/toolbar",
  "/entity_reference_autocomplete",
  "/update.php",
  // The whole of /user, because a login form that posts to the backend on
  // another origin sets its cookie there, which is the problem the proxy
  // exists to solve.
  "/user"
];
const FILES_PATH = /^\/sites\/[^/]+\/files(\/|$)/;
const EDIT_PATH = /^\/(node|media|taxonomy\/term|comment|user)\/[^/]+\/(edit|delete|revisions|translations|devel|layout)(\/|$)/;
function shouldProxy(path, options = {}) {
  const subject = String(path || "").split("?")[0];
  if (!subject) return false;
  if (isAdminPath(subject, options.paths || ADMIN_PATHS)) return true;
  if (EDIT_PATH.test(subject)) return true;
  if (FILES_PATH.test(subject)) return true;
  const prefixes = options.backendPaths || BACKEND_PATHS;
  return prefixes.some(
    (prefix) => subject === prefix || subject.startsWith(`${prefix}/`)
  );
}

const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
];
function upstreamHeaders(headers = {}, { protocol = "http", remoteAddress = "" } = {}) {
  const out = {};
  for (const [name, value] of Object.entries(headers)) {
    if (HOP_BY_HOP.includes(name.toLowerCase())) continue;
    out[name] = value;
  }
  out["x-forwarded-host"] = headers["x-forwarded-host"] || headers.host || "";
  out["x-forwarded-proto"] = protocol;
  const chain = [headers["x-forwarded-for"], remoteAddress].filter(Boolean);
  if (chain.length) out["x-forwarded-for"] = chain.join(", ");
  return out;
}
function readerProtocol(req = {}) {
  const forwarded = String((req.headers || {})["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  if (forwarded === "https" || forwarded === "http") return forwarded;
  return (req.socket || {}).encrypted ? "https" : "http";
}
function rewriteCookie(value, { secure = false } = {}) {
  return String(value).split(";").map((part) => part.trim()).filter((part) => {
    const name = part.split("=")[0].toLowerCase();
    if (name === "domain") return false;
    if (name === "secure" && !secure) return false;
    return true;
  }).join("; ");
}
function rewriteLocation(value, baseUrl, host) {
  const location = String(value || "");
  const bases = [String(baseUrl || "").replace(/\/+$/, "")];
  if (host) bases.push(`http://${host}`, `https://${host}`);
  for (const base of bases) {
    if (!base) continue;
    if (location === base) return "/";
    if (location.startsWith(`${base}/`) || location.startsWith(`${base}?`)) {
      return location.slice(base.length);
    }
  }
  return location;
}
function downstreamHeaders(headers = {}, { baseUrl, secure, host } = {}) {
  const out = {};
  for (const [name, value] of Object.entries(headers)) {
    const key = name.toLowerCase();
    if (HOP_BY_HOP.includes(key)) continue;
    if (key === "set-cookie") {
      const cookies = Array.isArray(value) ? value : [value];
      out[name] = cookies.map((cookie) => rewriteCookie(cookie, { secure }));
      continue;
    }
    if (key === "location") {
      out[name] = rewriteLocation(value, baseUrl, host);
      continue;
    }
    out[name] = value;
  }
  return out;
}
function backendUnreachable(error, req, res) {
  res.statusCode = 502;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end(`The backend could not be reached: ${error.message}
`);
}
function proxyEntry(options = {}) {
  const baseUrl = String(options.baseUrl || "").replace(/\/+$/, "");
  if (!baseUrl) return null;
  return [
    (pathname) => shouldProxy(pathname, options),
    {
      target: baseUrl,
      // The Host goes upstream as the reader sent it. @nuxtjs/proxy defaults
      // this to true, which would make Drupal build its links for itself.
      changeOrigin: false,
      // Set by hand in onProxyReq. http-proxy's own appends this hop's scheme,
      // turning a tunnel's `https` into `https,http`.
      xfwd: false,
      ws: false,
      logLevel: "warn",
      onProxyReq(proxyReq, req) {
        const forwarded = upstreamHeaders(req.headers, {
          protocol: readerProtocol(req),
          remoteAddress: req.socket.remoteAddress
        });
        for (const name of [
          "x-forwarded-host",
          "x-forwarded-proto",
          "x-forwarded-for"
        ]) {
          if (forwarded[name]) proxyReq.setHeader(name, forwarded[name]);
        }
      },
      onProxyRes(proxyRes, req) {
        const secure = typeof options.secure === "boolean" ? options.secure : readerProtocol(req) === "https";
        proxyRes.headers = downstreamHeaders(proxyRes.headers, {
          baseUrl,
          secure,
          host: req.headers.host
        });
      },
      onError: options.onError || backendUnreachable
    }
  ];
}
function createProxy(options = {}) {
  const entry = proxyEntry(options);
  if (!entry) return (req, res, next) => next();
  return httpProxyMiddleware.createProxyMiddleware(...entry);
}

const OPERATIONS = [
  "edit-form",
  "version-history",
  "drupal:content-translation-overview",
  "delete-form"
];
const DESTRUCTIVE = ["delete-form"];
const KEYS = {
  next: ["ArrowDown"],
  previous: ["ArrowUp"],
  into: ["ArrowLeft"],
  out: ["ArrowRight"],
  close: ["Escape"]
};
function resolveKeys(keyboard = true) {
  if (!keyboard) return null;
  if (keyboard === true) return { ...KEYS };
  const asList = (value) => (Array.isArray(value) ? value : [value]).filter(Boolean);
  return Object.fromEntries(
    Object.keys(KEYS).map((movement) => [
      movement,
      keyboard[movement] === void 0 ? KEYS[movement] : asList(keyboard[movement])
    ])
  );
}
function movementFor(keys, key) {
  if (!keys) return null;
  return Object.keys(keys).find((movement) => keys[movement].includes(key)) || null;
}
function moveTo(from, step, length) {
  if (!length) return -1;
  if (from < 0) return step > 0 ? 0 : length - 1;
  return (from + step + length) % length;
}
function isDestructive(operation, destructive = DESTRUCTIVE) {
  return destructive.includes((operation || {}).key);
}
function operationsFromLinks(resource, options = {}) {
  const links = (resource || {}).links || {};
  const wanted = options.operations || OPERATIONS;
  return wanted.filter((key) => (links[key] || {}).href).map((key) => {
    const link = links[key];
    const title = ((link.meta || {}).linkParams || {}).title || key;
    const [path, query] = String(link.href).split("?");
    const href = path.replace(/^[a-z]+:\/\/[^/]+/i, "") + (query ? `?${query}` : "");
    return {
      key,
      title,
      href,
      destructive: isDestructive({ key }, options.destructive)
    };
  });
}

const DEFAULTS = {
  /**
   * `link`, or `proxy` where the deployment has been set up for it.
   *
   * `link` by default because it works on every deployment with no
   * configuration. A proxy means serving Drupal's admin from this site's
   * origin, which erases the cross-origin problems an iframe cannot and costs
   * a running server in exchange.
   */
  mode: "link",
  /** Prefixes that count as admin, if the site has moved Drupal's. */
  paths: null,
  /** The backend, if not the one `druxt.baseUrl` names. */
  baseUrl: null,
  /**
   * Whether a `Secure` flag survives on a proxied session cookie.
   *
   * Left null, it is decided per request from the scheme the reader used:
   * kept over HTTPS, dropped over plain HTTP, where the browser would discard
   * the cookie and the login form would loop back to itself.
   */
  secure: null
};
function resolveOptions(moduleOptions = {}, nuxtOptions = {}) {
  const druxt = nuxtOptions.druxt || {};
  const options = {
    ...DEFAULTS,
    ...druxt.admin || {},
    ...moduleOptions
  };
  if (!options.baseUrl) options.baseUrl = druxt.baseUrl || null;
  return options;
}
const NuxtModule = function(moduleOptions = {}) {
  const options = resolveOptions(moduleOptions, this.options);
  this.options.publicRuntimeConfig = this.options.publicRuntimeConfig || {};
  this.options.publicRuntimeConfig.druxtAdmin = options;
  this.nuxt.hook("components:dirs", (dirs) => {
    dirs.push({ path: path.join(__dirname, "components") });
  });
  if (resolveMode(options.mode) !== "proxy") return;
  this.nuxt.hook("generate:before", () => {
    const warn = (this.nuxt.options.consola || console).warn;
    warn(
      "druxt-admin: proxy mode is server middleware, and neither the generated files nor `nuxt start` on them run it. Build with `target: 'server'` to run it, or proxy the admin paths in the deployment."
    );
  });
  this.addServerMiddleware(createProxy(options));
};

exports.ADMIN_PATHS = ADMIN_PATHS;
exports.BACKEND_PATHS = BACKEND_PATHS;
exports.DEFAULTS = DEFAULTS;
exports.DESTRUCTIVE = DESTRUCTIVE;
exports.EDIT_PATH = EDIT_PATH;
exports.FILES_PATH = FILES_PATH;
exports.KEYS = KEYS;
exports.MODES = MODES;
exports.OPERATIONS = OPERATIONS;
exports.backendPath = backendPath;
exports.createProxy = createProxy;
exports["default"] = NuxtModule;
exports.downstreamHeaders = downstreamHeaders;
exports.isAdminPath = isAdminPath;
exports.isDestructive = isDestructive;
exports.moveTo = moveTo;
exports.movementFor = movementFor;
exports.operationsFromLinks = operationsFromLinks;
exports.proxyEntry = proxyEntry;
exports.readerProtocol = readerProtocol;
exports.resolveKeys = resolveKeys;
exports.resolveMode = resolveMode;
exports.resolveOptions = resolveOptions;
exports.rewriteCookie = rewriteCookie;
exports.rewriteLocation = rewriteLocation;
exports.shouldProxy = shouldProxy;
exports.upstreamHeaders = upstreamHeaders;
