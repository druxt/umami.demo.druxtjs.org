import { join, resolve } from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { readFileSync, mkdirSync, writeFileSync, cpSync } from 'fs';
import axios from 'axios';
import bodyParser from 'body-parser';

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

const TOKEN_PATH$1 = "/_auth/drupal-password/token";
const ROUTES = [
  { path: TOKEN_PATH$1, methods: ["POST"] },
  { path: "/user/login", methods: ["POST"] },
  { path: "/user/logout", methods: ["POST"] },
  { path: "/user/password", methods: ["POST"] },
  { path: "/oauth/authorize" },
  { path: "/oauth/token" },
  { path: "/oauth/userinfo" },
  { path: "/session/token" }
];

function detectPlatform(env = process.env) {
  if (env.NETLIFY === "true")
    return "netlify";
  if (env.VERCEL)
    return "vercel";
  return null;
}
function entry(settings) {
  const value = (v) => JSON.stringify(v === void 0 ? null : v);
  return `
const druxtAuthHandle = createFetchHandler({
  baseUrl: process.env.DRUXT_AUTH_BASE_URL || ${value(settings.baseUrl)},
  clientId: ${value(settings.clientId)},
  passwordClientId: ${value(settings.passwordClientId)},
  clientSecret: process.env.DRUXT_AUTH_CLIENT_SECRET,
})
`;
}
function routeGroups() {
  const post = ROUTES.filter((r) => (r.methods || []).join() === "POST");
  const any = ROUTES.filter((r) => !r.methods);
  return { post, any };
}
function writeNetlify({ rootDir, source, settings }) {
  const dir = join(rootDir, ".netlify", "v1", "functions");
  mkdirSync(dir, { recursive: true });
  const { post, any } = routeGroups();
  const files = [];
  for (const [name, routes, method] of [
    ["druxt-auth-post", post, ["POST"]],
    ["druxt-auth", any, null]
  ]) {
    const config = {
      path: routes.map((r) => r.path),
      ...method ? { method } : {}
    };
    const file = join(dir, `${name}.mjs`);
    writeFileSync(file, `${source}
${entry(settings)}
export default (request) => druxtAuthHandle(request)

export const config = ${JSON.stringify(config, null, 2)}
`);
    files.push(file);
  }
  return files;
}
function writeVercel({ rootDir, staticDir, source, settings }) {
  const out = join(rootDir, ".vercel", "output");
  const func = join(out, "functions", "druxt-auth.func");
  mkdirSync(func, { recursive: true });
  cpSync(staticDir, join(out, "static"), { recursive: true });
  writeFileSync(join(func, "index.js"), `${source}
${entry(settings)}
export default (request) => druxtAuthHandle(request)
`);
  writeFileSync(join(func, ".vc-config.json"), JSON.stringify({ runtime: "edge", entrypoint: "index.js" }, null, 2));
  const escape = (path) => path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const config = {
    version: 3,
    routes: [
      ...ROUTES.map((r) => ({
        src: `^${escape(r.path)}$`,
        ...r.methods ? { methods: r.methods } : {},
        dest: "/druxt-auth"
      })),
      { handle: "filesystem" }
    ]
  };
  writeFileSync(join(out, "config.json"), JSON.stringify(config, null, 2));
  return [join(func, "index.js"), join(out, "config.json")];
}
function writePlatformFunctions(args) {
  const platform = args.platform === void 0 || args.platform === "auto" ? detectPlatform(args.env) : args.platform;
  if (!platform)
    return null;
  const source = readFileSync(args.handlerFile, "utf8");
  const write = { netlify: writeNetlify, vercel: writeVercel }[platform];
  if (!write)
    throw new Error(`druxt-auth: unknown platform "${platform}".`);
  return { platform, files: write({ ...args, source }) };
}

const TOKEN_PATH = "/_auth/drupal-password/token";
const GRANT_FIELDS = new Map([
  ["password", ["username", "password", "scope"]],
  ["refresh_token", ["refresh_token", "scope"]]
]);
function passwordTokenHandler(options = {}) {
  const parse = bodyParser.json();
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
        const response = await axios.post(options.tokenEndpoint, postData, {
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

const isPlainObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const extend = (base, over) => {
  if (!isPlainObject(base) || !isPlainObject(over))
    return over;
  const out = { ...base };
  for (const [key, value] of Object.entries(over))
    out[key] = extend(base[key], value);
  return out;
};
const extendStrategies = (builtIn, site) => {
  const strategies = { ...builtIn };
  for (const [name, options] of Object.entries(site || {})) {
    strategies[name] = extend(builtIn[name], options);
  }
  return strategies;
};
const NuxtModule = function(moduleOptions = {}) {
  const options = {
    ...this.options.druxt || {},
    auth: {
      clientId: void 0,
      clientSecret: void 0,
      passwordClientId: void 0,
      passwordSession: void 0,
      scope: void 0,
      ...(this.options.druxt || {}).auth || {},
      ...moduleOptions
    }
  };
  const loginOption = (options.auth || {}).login;
  const loginPath = loginOption === false ? false : typeof loginOption === "string" ? loginOption : "/user/login";
  if (!options.auth.clientId) {
    throw new Error("DruxtAuth requires a clientId to be provided.");
  }
  let { baseUrl } = options;
  const proxy = (options.proxy || {}).api;
  if (proxy) {
    for (const [context, entry] of proxyEntries(baseUrl)) {
      this.options.serverMiddleware.push({
        prefix: false,
        handler: createProxyMiddleware(context, {
          changeOrigin: true,
          ws: true,
          ...entry
        })
      });
    }
  }
  const siteStrategies = (this.options.auth || {}).strategies;
  this.options.auth = {
    ...this.options.auth,
    redirect: {
      callback: "/callback",
      logout: "/",
      ...loginPath ? { login: loginPath } : {},
      ...(this.options.auth || {}).redirect
    },
    strategies: {
      "drupal-authorization_code": {
        scheme: resolve(__dirname, "../templates/drupal-scheme.js"),
        credentials: !!proxy,
        endpoints: {
          authorization: baseUrl + "/oauth/authorize",
          authorizationBackend: baseUrl + "/oauth/authorize",
          ...proxy ? { authorizationSameOrigin: "/oauth/authorize" } : {},
          token: (!proxy ? baseUrl : "") + "/oauth/token",
          userInfo: (!proxy ? baseUrl : "") + "/oauth/userinfo"
        },
        clientId: (options.auth || {}).clientId || process.env.DRUXT_AUTH_CLIENT_ID,
        responseType: "code",
        scope: (options.auth || {}).scope,
        grantType: "authorization_code",
        codeChallengeMethod: "S256"
      },
      "drupal-password": {
        scheme: resolve(__dirname, "../templates/drupal-password-scheme.js"),
        session: !!(options.auth || {}).passwordSession,
        token: {
          property: "access_token",
          type: "Bearer",
          name: "Authorization",
          maxAge: 60 * 60 * 24 * 365
        },
        refreshToken: {
          property: "refresh_token",
          data: "refresh_token",
          maxAge: 60 * 60 * 24 * 30
        },
        endpoints: {
          token: baseUrl + "/oauth/token",
          login: {
            baseURL: "",
            url: "/_auth/drupal-password/token"
          },
          logout: false,
          refresh: {
            baseURL: "",
            url: "/_auth/drupal-password/token"
          },
          user: {
            url: (!proxy ? baseUrl : "") + "/oauth/userinfo",
            method: "post"
          }
        },
        user: {
          property: false
        },
        grantType: "password"
      }
    }
  };
  this.options.auth.strategies = extendStrategies(this.options.auth.strategies, siteStrategies);
  this.options.serverMiddleware.unshift({
    path: TOKEN_PATH,
    handler: passwordTokenHandler({
      tokenEndpoint: this.options.auth.strategies["drupal-password"].endpoints.token,
      clientId: (options.auth || {}).clientId,
      passwordClientId: (options.auth || {}).passwordClientId,
      clientSecret: (options.auth || {}).clientSecret
    })
  });
  this.options.store = true;
  this.addModule("@nuxtjs/auth-next");
  this.addPlugin({
    src: resolve(__dirname, "../templates/auth-refresh.js"),
    fileName: "druxt-auth-refresh.js",
    mode: "all",
    options
  });
  this.addPlugin({
    src: resolve(__dirname, "../templates/csrf.js"),
    fileName: "druxt-auth-csrf.js",
    mode: "client",
    options: {
      csrfToken: ((options.auth || {}).csrfToken || "/session/token").replace(/'/g, "\\'")
    }
  });
  this.nuxt.hook("generate:done", () => {
    const written = writePlatformFunctions({
      platform: (options.auth || {}).platform,
      rootDir: this.options.rootDir,
      staticDir: this.options.generate.dir,
      handlerFile: resolve(__dirname, "fetch.mjs"),
      settings: {
        baseUrl,
        clientId: (options.auth || {}).clientId,
        passwordClientId: (options.auth || {}).passwordClientId
      }
    });
    const log = this.nuxt.options.consola || console;
    if (written) {
      log.info(`druxt-auth: wrote ${written.platform} functions for the token route and the Drupal proxy.`);
      return;
    }
    log.warn("druxt-auth: the password grant's token route and the Drupal proxy are server middleware, which a static build does not run. Mount createServerMiddleware() from 'druxt-auth/server' in the server that serves the generated files, or createFetchHandler() from 'druxt-auth/fetch' in a function.");
  });
  this.nuxt.hook("components:dirs", (dirs) => {
    dirs.push({ path: resolve(__dirname, "components") });
  });
  this.extendRoutes((routes, resolve2) => {
    if (!routes.find((o) => o.path === "/callback")) {
      this.addTemplate({
        src: resolve2(__dirname, "../templates/callback.js"),
        fileName: "components/druxt-auth-callback.js",
        options
      });
      routes.push({
        name: "druxt-auth-callback",
        path: "/callback",
        component: resolve2(this.options.buildDir, "components/druxt-auth-callback.js"),
        chunkName: "druxt-auth-callback"
      });
    }
  });
  if (loginPath) {
    this.extendRoutes((routes, resolve2) => {
      const tail = loginPath.replace(/^\//, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const claimed = new RegExp(`^(/:[A-Za-z0-9_]+\\??)?/${tail}/?$`, (this.options.router || {}).caseSensitive ? "" : "i");
      if (routes.find((o) => claimed.test(o.path))) {
        return;
      }
      this.addTemplate({
        src: resolve2(__dirname, "../templates/login.js"),
        fileName: "components/druxt-auth-login.js",
        options
      });
      routes.unshift({
        name: "druxt-auth-login",
        path: loginPath,
        component: resolve2(this.options.buildDir, "components/druxt-auth-login.js"),
        chunkName: "druxt-auth-login"
      });
    });
  }
};

export { NuxtModule as default };
