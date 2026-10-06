import { join } from 'path';

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

const DEFAULTS = {
  /**
   * `link`, or `proxy` where the deployment has been set up for it.
   *
   * `link` by default because it works on every deployment with no
   * configuration. A proxy means serving Drupal's admin from this site's
   * origin, which erases the cross-origin problems an iframe cannot and costs
   * real deployment work in exchange.
   */
  mode: "link",
  /** Prefixes that count as admin, if the site has moved Drupal's. */
  paths: null
};
function resolveOptions(moduleOptions = {}, nuxtOptions = {}) {
  return {
    ...DEFAULTS,
    ...(nuxtOptions.druxt || {}).admin || {},
    ...moduleOptions
  };
}
const NuxtModule = function(moduleOptions = {}) {
  const options = resolveOptions(moduleOptions, this.options);
  this.options.publicRuntimeConfig = this.options.publicRuntimeConfig || {};
  this.options.publicRuntimeConfig.druxtAdmin = options;
  this.nuxt.hook("components:dirs", (dirs) => {
    dirs.push({ path: join(__dirname, "components") });
  });
};

export { ADMIN_PATHS, DEFAULTS, MODES, backendPath, NuxtModule as default, isAdminPath, resolveMode, resolveOptions };
