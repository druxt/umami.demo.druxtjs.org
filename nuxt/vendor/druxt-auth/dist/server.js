'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const axios = require('axios');
const bodyParser = require('body-parser');
const httpProxyMiddleware = require('http-proxy-middleware');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

const axios__default = /*#__PURE__*/_interopDefaultLegacy(axios);
const bodyParser__default = /*#__PURE__*/_interopDefaultLegacy(bodyParser);

const proxyEntries = (baseUrl) => [
  ["/oauth/userinfo", { target: baseUrl }],
  ...["/user/login", "/user/logout", "/user/password"].map((path) => [
    (candidate, req) => candidate === path && req.method === "POST",
    { target: baseUrl }
  ]),
  ["/oauth/authorize", { target: baseUrl }],
  ["/oauth/token", { target: baseUrl }],
  ["/session/token", { target: baseUrl }]
];

const TOKEN_PATH = "/_auth/drupal-password/token";
const GRANT_FIELDS = new Map([
  ["password", ["username", "password", "scope"]],
  ["refresh_token", ["refresh_token", "scope"]]
]);
function passwordTokenHandler(options = {}) {
  const parse = bodyParser__default["default"].json();
  return (req, res, next) => {
    if (req.method !== "POST")
      return next();
    return parse(req, res, async () => {
      const data = req.body || {};
      const fields = GRANT_FIELDS.get(data.grant_type);
      if (!fields)
        return next(new Error("Unsupported grant type"));
      if (data.grant_type === "password" && (!data.username || !data.password)) {
        return next(new Error("Invalid username or password"));
      }
      try {
        const secret = options.clientSecret || process.env.DRUXT_AUTH_CLIENT_SECRET;
        const postData = new URLSearchParams({
          ...Object.fromEntries(fields.filter((field) => data[field] !== void 0).map((field) => [field, data[field]])),
          grant_type: data.grant_type,
          client_id: options.passwordClientId || options.clientId || process.env.DRUXT_AUTH_CLIENT_ID,
          ...secret ? { client_secret: secret } : {}
        }).toString();
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        const response = await axios__default["default"].post(options.tokenEndpoint, postData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        res.end(JSON.stringify(response.data));
      } catch (err) {
        console.error(err);
        res.statusCode = (err.response || {}).status || 500;
        res.end(JSON.stringify({ ...(err.response || {}).data || {} }));
      }
    });
  };
}
function createServerMiddleware(options = {}) {
  const baseUrl = String(options.baseUrl || "").replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("druxt-auth: createServerMiddleware needs a baseUrl.");
  }
  const token = passwordTokenHandler({
    ...options,
    tokenEndpoint: options.tokenEndpoint || `${baseUrl}/oauth/token`
  });
  const proxies = options.proxy === false ? [] : proxyEntries(baseUrl).map(([context, entry]) => httpProxyMiddleware.createProxyMiddleware(context, {
    changeOrigin: false,
    ws: false,
    logLevel: "warn",
    ...entry
  }));
  return (req, res, next) => {
    const path = String(req.url || "").split("?")[0];
    if (path === TOKEN_PATH)
      return token(req, res, next);
    const run = (index) => index < proxies.length ? proxies[index](req, res, () => run(index + 1)) : next();
    return run(0);
  };
}

exports.TOKEN_PATH = TOKEN_PATH;
exports.createServerMiddleware = createServerMiddleware;
exports.passwordTokenHandler = passwordTokenHandler;
