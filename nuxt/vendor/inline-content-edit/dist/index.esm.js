import { resolve, join } from 'path';
import Vue from 'vue';

function normaliseUrl(url) {
  return (url || "").trim().replace(/\/+$/, "");
}
function isExpired(expiresAt, now = Date.now()) {
  if (!expiresAt) return false;
  const at = new Date(expiresAt).getTime();
  return Number.isNaN(at) ? true : at <= now;
}
const CONFORMANCE_UNREACHABLE = "Could not reach it, or it does not allow a site's origin.";
async function checkConformance(url, { fetch: fetchImpl, origin } = {}) {
  const base = normaliseUrl(url);
  if (!base) return { ok: false, reason: "Enter a backend URL." };
  if (!/^https?:\/\//.test(base)) {
    return { ok: false, reason: "That is not an http or https URL." };
  }
  let response;
  try {
    response = await fetchImpl(`${base}/jsonapi`, {
      headers: { Accept: "application/vnd.api+json" }
    });
  } catch (e) {
    const suffix = origin ? ` Check it is running, and that its CORS configuration lists ${origin}.` : "";
    return { ok: false, reason: CONFORMANCE_UNREACHABLE + suffix };
  }
  if (!response.ok) {
    return { ok: false, reason: `JSON:API answered ${response.status}.` };
  }
  let body;
  try {
    body = await response.json();
  } catch (e) {
    body = null;
  }
  if (!body || !body.jsonapi) {
    return {
      ok: false,
      reason: "That URL answered, but it is not a JSON:API endpoint."
    };
  }
  return { ok: true, version: body.jsonapi.version };
}
async function readSessionRecord(recordUrl, { fetch: fetchImpl, now = Date.now(), token, destination } = {}) {
  if (!recordUrl) return null;
  const { url, headers } = destinationRequest(destination, recordUrl, token);
  let record;
  try {
    const response = await fetchImpl(url, { cache: "no-store", headers });
    if (!response.ok) return null;
    record = await response.json();
  } catch (e) {
    return null;
  }
  if (!record || typeof record.url !== "string" || !record.url) return null;
  if (isExpired(record.expiresAt, now)) return null;
  return { ...record, url: normaliseUrl(record.url) };
}
function destinationRequest(destination, recordUrl, token) {
  if (destination && typeof destination.recordRequest === "function") {
    const request = destination.recordRequest(recordUrl, { token });
    if (request && request.url) return request;
  }
  const separator = String(recordUrl).includes("?") ? "&" : "?";
  return { url: `${recordUrl}${separator}t=${Date.now()}`, headers: void 0 };
}
function base64Url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function callbackUrl(origin, base = "/") {
  const path = base.endsWith("/") ? base : `${base}/`;
  return `${origin}${path}callback`;
}
function resolveSource({ query, stored, published }) {
  if (query) return { url: normaliseUrl(query), source: "query" };
  if (stored && stored.url)
    return { ...stored, url: normaliseUrl(stored.url), source: "stored" };
  if (published && published.url) return { ...published, source: "published" };
  return null;
}

function readJson(storage, key) {
  try {
    return JSON.parse(storage.getItem(key)) || null;
  } catch (e) {
    return null;
  }
}
function writeJson(storage, key, value) {
  try {
    if (value) storage.setItem(key, JSON.stringify(value));
    else storage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

const AUTH_STRATEGY = "drupal-authorization_code";
const BACKEND_KEY = "authoring.backend";
function backendFor(context, storage) {
  const ice = context && (context.app && context.app.$druxtIce || context.$druxtIce) || null;
  if (ice && ice.state && ice.state.url) {
    return { url: ice.state.url, clientId: ice.state.clientId || null };
  }
  const stored = storage ? readJson(storage, BACKEND_KEY) : null;
  if (stored && stored.url) {
    return { url: stored.url, clientId: stored.clientId || null };
  }
  return null;
}
function pointStrategyAt(options, backend) {
  if (!options || !backend || !backend.url) return false;
  const url = normaliseUrl(backend.url);
  const endpoints = options.endpoints || (options.endpoints = {});
  endpoints.authorization = `${url}/oauth/authorize`;
  endpoints.authorizationBackend = `${url}/oauth/authorize`;
  endpoints.token = `${url}/oauth/token`;
  endpoints.userInfo = `${url}/oauth/userinfo`;
  if (backend.clientId) options.clientId = backend.clientId;
  return true;
}
function bareToken(value) {
  if (!value || typeof value !== "string") return null;
  return value.replace(/^Bearer\s+/i, "") || null;
}

const ADAPTER_METHODS = [
  "editableFields",
  "fieldValue",
  "stageFieldValue",
  "blockTypes",
  "addBlock",
  "moveBlock",
  "deleteBlock",
  "disabledFeatures"
];
function isAdapterMethod(name) {
  return ADAPTER_METHODS.includes(name);
}
function adapterSupports(adapter, methods) {
  if (!methods.length) return true;
  if (!adapter) return false;
  return methods.every((method) => typeof adapter[method] === "function");
}
function createPlainFieldsAdapter({ editable = {} } = {}) {
  return {
    id: "plain-fields",
    label: "Plain fields",
    /**
     * The configured field names for the context's type, filtered against
     * the resource's own attributes. A configured field the bundle does not
     * carry is dropped, so a stale configuration degrades quietly rather
     * than offering an editor for nothing.
     */
    editableFields(context) {
      if (!context) return [];
      const names = editable[context.type] || [];
      const attributes = context.resource && context.resource.attributes || {};
      return names.filter((name) => name in attributes);
    },
    fieldValue(context, field) {
      if (!context || !context.resource) return void 0;
      return context.resource.attributes[field];
    },
    /** Stages a field value by dispatching the store's existing action. */
    stageFieldValue(context, field, value) {
      if (!context || !context.store) return Promise.resolve();
      return context.store.dispatch("druxtIce/saveDraft", {
        type: context.type,
        id: context.id,
        attributes: { [field]: value }
      });
    }
  };
}

const ENTITY_ATTRIBUTE = "data-druxt-entity";
const TYPE_ATTRIBUTE = "data-druxt-type";
const FIELD_ATTRIBUTE = "data-druxt-field";
const DELTA_ATTRIBUTE = "data-druxt-delta";
function escapeValue(value) {
  return `"${String(value).replace(/[\\"]/g, "\\$&")}"`;
}
function entityAnchors(type, id) {
  if (id === void 0 || id === null) return {};
  const attributes = { [ENTITY_ATTRIBUTE]: id };
  if (type !== void 0 && type !== null) attributes[TYPE_ATTRIBUTE] = type;
  return attributes;
}
function fieldAnchors(name, delta) {
  if (name === void 0 || name === null) return {};
  const attributes = { [FIELD_ATTRIBUTE]: name };
  if (typeof delta === "number") attributes[DELTA_ATTRIBUTE] = delta;
  return attributes;
}
function findAnchor(root, { entity, type, field, delta } = {}) {
  if (!root || typeof root.querySelector !== "function") return null;
  const parts = [];
  if (entity !== void 0 && entity !== null) {
    parts.push(`[${ENTITY_ATTRIBUTE}=${escapeValue(entity)}]`);
  }
  if (type !== void 0 && type !== null) {
    parts.push(`[${TYPE_ATTRIBUTE}=${escapeValue(type)}]`);
  }
  if (field !== void 0 && field !== null) {
    parts.push(`[${FIELD_ATTRIBUTE}=${escapeValue(field)}]`);
  }
  if (typeof delta === "number") {
    parts.push(`[${DELTA_ATTRIBUTE}=${escapeValue(delta)}]`);
  }
  if (!parts.length) return null;
  return root.querySelector(parts.join(""));
}

const CAPTIONED = /<(img|drupal-media)\b[^>]*\bdata-caption\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi;
const CAPTION_ATTRIBUTE = /\s*\bdata-caption\s*=\s*("[^"]*"|'[^']*')/i;
function applyCaptionFilter(html) {
  if (!html || !String(html).includes("data-caption")) return html;
  return String(html).replace(
    CAPTIONED,
    (tag, _name, _quoted, double, single) => {
      const caption = double !== void 0 ? double : single || "";
      const stripped = tag.replace(CAPTION_ATTRIBUTE, "");
      return `<figure role="group" class="caption">${stripped}<figcaption>${decodeAttribute(caption)}</figcaption></figure>`;
    }
  );
}
function decodeAttribute(value) {
  return String(value || "").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(
    /&#x([0-9a-f]+);/gi,
    (_, code) => String.fromCodePoint(parseInt(code, 16))
  ).split("&lt;").join("<").split("&gt;").join(">").split("&quot;").join('"').split("&amp;").join("&");
}
function hasUnfilteredCaption(html) {
  return new RegExp(CAPTIONED.source, "i").test(String(html || ""));
}

function cartKey(type, id) {
  return `${type}:${id}`;
}
function newResourceId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function changedFields(original = {}, edited = {}) {
  const changed = {};
  for (const [field, value] of Object.entries(edited)) {
    const next = withoutComputed(value);
    if (!deepEqual(withoutComputed(original[field]), next)) {
      changed[field] = next;
    }
  }
  return changed;
}
const COMPUTED_PROPERTIES = ["processed"];
function withoutComputed(value) {
  if (Array.isArray(value)) return value.map(withoutComputed);
  if (!value || typeof value !== "object") return value;
  const kept = {};
  for (const [key, item] of Object.entries(value)) {
    if (!COMPUTED_PROPERTIES.includes(key)) kept[key] = item;
  }
  return kept;
}
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null || a === void 0 || b === void 0)
    return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(a[key], b[key]));
}
function mergeEntry(existing, incoming, considered = {}) {
  if (!existing) return incoming;
  return {
    ...existing,
    // Carried through: without it a second edit to unsaved content would be
    // sent as a PATCH against an entity the backend has never seen.
    isNew: Boolean(existing.isNew || incoming.isNew),
    files: { ...existing.files || {}, ...incoming.files || {} },
    // What the backend had, kept from the first edit onwards so the drawer can
    // show a change rather than only its result. Existing wins: the first one
    // recorded is the one the backend actually holds.
    before: { ...incoming.before || {}, ...existing.before || {} },
    attributes: {
      ...withoutReverted(
        existing.attributes,
        incoming.attributes,
        considered.attributes
      ),
      ...incoming.attributes || {}
    },
    relationships: {
      ...withoutReverted(
        existing.relationships,
        incoming.relationships,
        considered.relationships
      ),
      ...incoming.relationships || {}
    }
  };
}
function withoutReverted(staged, incoming, considered) {
  if (!staged) return {};
  if (!Array.isArray(considered)) return { ...staged };
  const kept = {};
  for (const [field, value] of Object.entries(staged)) {
    const reverted = considered.includes(field) && !(field in (incoming || {}));
    if (!reverted) kept[field] = value;
  }
  return kept;
}
function tidyResource(resource) {
  const out = { type: resource.type, id: resource.id };
  if (resource.attributes && Object.keys(resource.attributes).length) {
    out.attributes = resource.attributes;
  }
  if (resource.relationships && Object.keys(resource.relationships).length) {
    out.relationships = resource.relationships;
  }
  return out;
}
function isEmptyResource(resource) {
  if (isDeletion(resource)) return false;
  if (isNew(resource)) return false;
  if (Object.keys((resource || {}).files || {}).length) return false;
  const tidy = tidyResource(resource);
  return !tidy.attributes && !tidy.relationships;
}
function isNew(resource) {
  return Boolean(resource && resource.isNew);
}
function requestMethod(resource) {
  if (isDeletion(resource)) return "DELETE";
  return isNew(resource) ? "POST" : "PATCH";
}
function isDeletion(resource) {
  return Boolean((resource || {}).deleted);
}
function patchBody(resource) {
  if (isDeletion(resource)) return null;
  return { data: tidyResource(resource) };
}
function patchUrl(backendUrl, type, id) {
  return `${collectionUrl$1(backendUrl, type)}/${id}`;
}
function collectionUrl$1(backendUrl, type) {
  const [entityType, bundle] = type.split("--");
  const path = bundle ? `${entityType}/${bundle}` : entityType;
  return `${backendUrl.replace(/\/+$/, "")}/jsonapi/${path}`;
}
function requestUrl(backendUrl, resource) {
  return isNew(resource) && !isDeletion(resource) ? collectionUrl$1(backendUrl, resource.type) : patchUrl(backendUrl, resource.type, resource.id);
}
function exportCart(entries, { generatedAt } = {}) {
  const keys = Object.keys(entries).sort();
  const resources = commitOrder(keys.map((key) => entries[key])).map(
    tidyResource
  );
  return {
    // Versioned from the start: whatever consumes this on the Drupal side has
    // to be able to tell which shape it is reading.
    version: 1,
    generatedAt: generatedAt || (/* @__PURE__ */ new Date()).toISOString(),
    resources,
    // Deletions carry no fields, so without this they are indistinguishable
    // from an edit that changed nothing.
    deletions: keys.filter((key) => isDeletion(entries[key])).map((key) => ({ type: entries[key].type, id: entries[key].id })),
    // The bytes, so the document stands on its own. A change request naming a
    // file id with the file nowhere in it cannot be applied by anything.
    files: keys.flatMap(
      (key) => Object.entries(entries[key].files || {}).map(([field, file]) => ({
        resource: { type: entries[key].type, id: entries[key].id },
        field,
        id: file.id,
        name: file.name,
        contentType: file.type,
        data: file.dataUrl
      }))
    )
  };
}
function exportSummary(entries) {
  const resources = Object.values(entries);
  if (!resources.length) return "chore(content): no changes";
  const types = [...new Set(resources.map((r) => r.type.split("--")[0]))].sort();
  const count = resources.length;
  const noun = count === 1 ? "entity" : "entities";
  return `chore(content): edit ${count} ${noun} (${types.join(", ")})`;
}
function commitOrder(resources = []) {
  const byId = new Map(resources.map((resource) => [resource.id, resource]));
  const referencedBy = (resource) => Object.values(resource.relationships || {}).flatMap((relationship) => {
    const data = (relationship || {}).data;
    if (!data) return [];
    return (Array.isArray(data) ? data : [data]).map((item) => item.id);
  });
  const ordered = [];
  const done = /* @__PURE__ */ new Set();
  const visiting = /* @__PURE__ */ new Set();
  const visit = (resource) => {
    if (done.has(resource.id) || visiting.has(resource.id)) return;
    visiting.add(resource.id);
    for (const id of referencedBy(resource)) {
      const dependency = byId.get(id);
      if (dependency) visit(dependency);
    }
    visiting.delete(resource.id);
    done.add(resource.id);
    ordered.push(resource);
  };
  resources.forEach(visit);
  return ordered;
}
function dependencyMap(resources = []) {
  const staged = new Set(resources.map((resource) => resource.id));
  const map = /* @__PURE__ */ new Map();
  for (const resource of resources) {
    const needs = /* @__PURE__ */ new Set();
    for (const relationship of Object.values(resource.relationships || {})) {
      const data = (relationship || {}).data;
      if (!data) continue;
      for (const item of Array.isArray(data) ? data : [data]) {
        if (item && item.id !== resource.id && staged.has(item.id))
          needs.add(item.id);
      }
    }
    map.set(resource.id, [...needs]);
  }
  return map;
}
function withDependencies(selected = [], resources = []) {
  const map = dependencyMap(resources);
  const out = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (out.has(id)) return;
    out.add(id);
    for (const needed of map.get(id) || []) visit(needed);
  };
  selected.forEach(visit);
  return [...out];
}
function requiredBy(id, selected = [], resources = []) {
  const map = dependencyMap(resources);
  return selected.filter(
    (other) => other !== id && (map.get(other) || []).includes(id)
  );
}
function valuesBefore(original = {}, changed = {}) {
  const before = {};
  for (const field of Object.keys(changed)) {
    before[field] = withoutComputed(original[field]);
  }
  return before;
}

function toDateInput(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function fromDateInput(local) {
  if (!local) return null;
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const DESTINATION_METHODS = ["token", "recordRequest", "export"];
function bustCache(recordUrl, now = Date.now()) {
  const separator = String(recordUrl).includes("?") ? "&" : "?";
  return `${recordUrl}${separator}t=${now}`;
}
function defaultDestination(options = {}) {
  return {
    id: "default",
    token(storage) {
      const key = (options.sessionRecord || {}).tokenKey;
      if (!key || !storage) return void 0;
      try {
        const stored = JSON.parse(storage.getItem(key));
        return stored && stored.token || void 0;
      } catch (e) {
        return void 0;
      }
    },
    recordRequest(recordUrl) {
      return { url: bustCache(recordUrl), headers: void 0 };
    }
  };
}
function defineDestination(destination = {}) {
  const { id } = destination;
  if (!id || typeof id !== "string") {
    throw new TypeError("A destination needs an id.");
  }
  for (const key of Object.keys(destination)) {
    if (key === "id") continue;
    if (!DESTINATION_METHODS.includes(key)) {
      throw new TypeError(
        `Destination "${id}" has no method "${key}". Known methods: ${DESTINATION_METHODS.join(", ")}.`
      );
    }
    if (typeof destination[key] !== "function") {
      throw new TypeError(
        `Destination "${id}" method "${key}" is not a function.`
      );
    }
  }
  return Object.freeze({ ...destination });
}
function destinationSupports(destination, method) {
  return Boolean(destination && typeof destination[method] === "function");
}
function resolveDestination(destination, options = {}) {
  const fallback = defaultDestination(options);
  if (!destination) return fallback;
  return {
    ...fallback,
    ...destination,
    id: destination.id || fallback.id
  };
}

function words(value) {
  return String(value == null ? "" : value).split(/(\s+)/).filter((part) => part !== "");
}
function changedRegion(before, after) {
  const from = words(before);
  const to = words(after);
  let head = 0;
  while (head < from.length && head < to.length && from[head] === to[head])
    head += 1;
  let tail = 0;
  while (tail < from.length - head && tail < to.length - head && from[from.length - 1 - tail] === to[to.length - 1 - tail]) {
    tail += 1;
  }
  return {
    head: from.slice(0, head),
    removed: from.slice(head, from.length - tail),
    added: to.slice(head, to.length - tail),
    tail: tail ? from.slice(from.length - tail) : []
  };
}
function diffLines(before, after, { context = 6 } = {}) {
  const region = changedRegion(before, after);
  if (!region.removed.length && !region.added.length) return null;
  const lead = region.head.slice(-context * 2);
  const trail = region.tail.slice(0, context * 2);
  const elidedStart = region.head.length > lead.length;
  const elidedEnd = region.tail.length > trail.length;
  const join = (parts) => parts.join("");
  const wrap = (middle) => {
    if (!middle.length) return null;
    return `${elidedStart ? "..." : ""}${join(lead)}${join(middle)}${join(trail)}${elidedEnd ? "..." : ""}`;
  };
  return {
    removed: wrap(region.removed),
    added: wrap(region.added),
    // The words either side, so a caller can show them dimmed if it wants to.
    lead: join(lead),
    trail: join(trail)
  };
}
function isLong(value, limit = 120) {
  return String(value == null ? "" : value).length > limit;
}

const DIFF_TYPE = "jsonapi_diff--diff";
const BUILT = "built";
const STAGED = "staged";
const COMPUTED = ["processed"];
function asText(value) {
  if (value === null || value === void 0) return "";
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const inner = value.value !== void 0 ? value.value : value.target_id;
    return inner === void 0 ? JSON.stringify(value) : asText(inner);
  }
  return String(value);
}
function stripComputed(value) {
  if (Array.isArray(value)) return value.map(stripComputed);
  if (value && typeof value === "object") {
    const out = { ...value };
    for (const key of COMPUTED) delete out[key];
    return out;
  }
  return value;
}
function fieldChanged(left, right) {
  return JSON.stringify(stripComputed(left)) !== JSON.stringify(stripComputed(right));
}
function fieldOps(left, right) {
  const before = asText(left);
  const after = asText(right);
  if (before === after) return before ? [{ type: "=", lines: [before] }] : [];
  const ops = [];
  if (before) ops.push({ type: "-", lines: before.split("\n") });
  if (after) ops.push({ type: "+", lines: after.split("\n") });
  return ops;
}
function fieldStatus(left, right, touched = true) {
  if (!touched) return "same";
  const had = asText(left) !== "";
  const has = asText(right) !== "";
  if (!fieldChanged(left, right)) return "same";
  if (!had && has) return "added";
  if (had && !has) return "removed";
  return "changed";
}
function stagedDiff(built, staged, { all = false } = {}) {
  const left = (built || {}).attributes || {};
  const right = (staged || {}).attributes || {};
  const id = (staged || {}).id || (built || {}).id || "";
  const type = (staged || {}).type || (built || {}).type || "";
  const names = all ? [.../* @__PURE__ */ new Set([...Object.keys(left), ...Object.keys(right)])] : Object.keys(right);
  const fields = {};
  const summary = { added: 0, removed: 0, changed: 0, same: 0 };
  for (const name of names.sort()) {
    const touched = Object.prototype.hasOwnProperty.call(right, name);
    const status = fieldStatus(left[name], right[name], touched);
    summary[status] += 1;
    if (status === "same" && !all) continue;
    const after = touched ? right[name] : left[name];
    fields[name] = {
      label: name,
      status,
      left: asText(left[name]),
      right: asText(after),
      ops: fieldOps(left[name], after)
    };
  }
  return {
    data: {
      type: DIFF_TYPE,
      // The same three-part shape a revision diff uses, with names where it
      // would have revision ids.
      id: `${id}:${BUILT}:${STAGED}`,
      attributes: { summary, tree_summary: { ...summary }, fields },
      relationships: {
        left: { data: id ? { type, id } : null },
        right: { data: id ? { type, id } : null },
        children: { data: [] }
      },
      meta: {
        // So a renderer can say "not yet sent" rather than naming a revision,
        // and so a caller can tell the two kinds of document apart.
        staged: true
      }
    }
  };
}

function defineFeature({
  id,
  label,
  requires = [],
  weight = 0,
  component = null
} = {}) {
  if (!id) throw new TypeError("A feature must have an id.");
  const unknown = requires.find((method) => !isAdapterMethod(method));
  if (unknown) {
    throw new TypeError(`"${unknown}" is not a known adapter method.`);
  }
  return Object.freeze({ id, label, requires, weight, component });
}
function resolveFeatures(features, adapter, context = {}) {
  const runtimeDisabled = readDisabledFeatures(adapter, context);
  const disabled = context.disabled || [];
  return features.map((feature, index) => ({ feature, index })).filter(({ feature }) => {
    if (!adapterSupports(adapter, feature.requires)) return false;
    if (runtimeDisabled.includes(feature.id)) return false;
    if (disabled.includes(feature.id)) return false;
    return true;
  }).sort((a, b) => a.feature.weight - b.feature.weight || a.index - b.index).map(({ feature }) => feature);
}
function readDisabledFeatures(adapter, context) {
  if (!adapter || typeof adapter.disabledFeatures !== "function") return [];
  try {
    return adapter.disabledFeatures(context) || [];
  } catch (e) {
    return [];
  }
}

const DRUPAL_FILES = "/sites/default/files/";
const STATIC_FILES = "/files/";
function rewriteFileUrls(html, { from = DRUPAL_FILES, to = STATIC_FILES } = {}) {
  if (!html) return html;
  return String(html).split(`"${from}`).join(`"${to}`).split(`'${from}`).join(`'${to}`);
}
function isDrupalFile(url) {
  return String(url || "").includes(DRUPAL_FILES);
}
function absoluteFileUrls(html, backendUrl) {
  if (!html || !backendUrl) return html;
  const origin = String(backendUrl).replace(/\/+$/, "");
  return rewriteFileUrls(html, {
    from: DRUPAL_FILES,
    to: `${origin}${DRUPAL_FILES}`
  });
}
function relativeFileUrls(html, backendUrl) {
  if (!html || !backendUrl) return html;
  const origin = String(backendUrl).replace(/\/+$/, "");
  return rewriteFileUrls(html, {
    from: `${origin}${DRUPAL_FILES}`,
    to: DRUPAL_FILES
  });
}
function editorFileUrls(html, backendUrl) {
  return backendUrl ? absoluteFileUrls(html, backendUrl) : rewriteFileUrls(html);
}
function storedFileUrls(html, backendUrl) {
  const relative = relativeFileUrls(html, backendUrl);
  return rewriteFileUrls(relative, { from: STATIC_FILES, to: DRUPAL_FILES });
}
function replaceHeldImage(html, dataUrl, { url, uuid }) {
  if (!html || !dataUrl || !url) return html;
  const source = String(html);
  const quoted = [`"${dataUrl}"`, `'${dataUrl}'`];
  let out = source;
  for (const needle of quoted) {
    const quote = needle[0];
    out = out.split(needle).join(`${quote}${url}${quote}`);
  }
  if (out === source) return source;
  return out.replace(
    new RegExp(`<img\\b[^>]*?${escapeForRegExp(url)}[^>]*?>`, "g"),
    (tag) => tag.includes("data-entity-uuid") ? tag : withEntityAttributes(tag, uuid)
  );
}
function withEntityAttributes(tag, uuid) {
  if (!uuid) return tag;
  return tag.replace(
    /\s*\/?>$/,
    ` data-entity-type="file" data-entity-uuid="${uuid}">`
  );
}
function escapeForRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function hasHeldImage(html) {
  return String(html || "").includes('src="data:');
}

const ADVANCED_FIELDS = [
  "comment",
  "created",
  "langcode",
  "menu",
  "path",
  "promote",
  "revision_log",
  "status",
  "sticky",
  "uid"
];
function groupFields(ids = []) {
  const content = [];
  const advanced = [];
  for (const id of ids) {
    (ADVANCED_FIELDS.includes(id) ? advanced : content).push(id);
  }
  return { content, advanced };
}

const CAPTION_FILTER = "filter_caption";
function filtersFromResources(resources, format) {
  if (!Array.isArray(resources) || !format) return null;
  const found = resources.find(
    (resource) => ((resource || {}).attributes || {}).drupal_internal__format === format
  );
  if (!found) return null;
  return Object.keys((found.attributes || {}).filters || {});
}

function listingAccepts(accepted, resource) {
  if (!resource || !resource.type) return false;
  const { types = [], entityTypes = [] } = Array.isArray(accepted) ? { types: accepted } : accepted || {};
  if (types.length) return types.includes(resource.type);
  const entityType = String(resource.type).split("--")[0];
  return entityTypes.includes(entityType);
}
function listingTypes(display) {
  const filters = Object.values(
    ((display || {}).display_options || {}).filters || {}
  );
  const entityTypes = [
    ...new Set(filters.map((filter) => filter.entity_type).filter(Boolean))
  ];
  const types = [];
  for (const filter of filters) {
    if (filter.plugin_id === "bundle" && filter.value) {
      for (const bundle of Object.keys(filter.value))
        types.push(`${filter.entity_type}--${bundle}`);
    }
  }
  return { types, entityTypes };
}
function failsFilters(display, resource) {
  const attributes = (resource || {}).attributes || {};
  const filters = Object.values(
    ((display || {}).display_options || {}).filters || {}
  );
  return filters.some((filter) => {
    if (filter.plugin_id !== "boolean" || !filter.field) return false;
    const value = attributes[filter.field];
    if (value === void 0) return false;
    return Boolean(Number(filter.value)) !== Boolean(value);
  });
}
function previewsFor(results = [], staged = [], display) {
  const fromResults = [
    ...new Set(results.filter((r) => !r.__staged).map((r) => r.type))
  ];
  const accepted = fromResults.length ? { types: fromResults } : listingTypes(display);
  const present = new Set(results.map((result) => result.id));
  return staged.filter((resource) => resource.isNew && !resource.deleted).filter((resource) => !present.has(resource.id)).filter((resource) => listingAccepts(accepted, resource)).filter((resource) => !failsFilters(display, resource)).reverse();
}
function asResource(resource) {
  return {
    // Druxt only trusts a cached resource that is marked complete. Without
    // this it fetches anyway, and the backend has never heard of this uuid, so
    // the row renders as a 404 instead of as the content just written.
    _druxt_full: true,
    data: {
      type: resource.type,
      id: resource.id,
      attributes: { ...resource.attributes || {} },
      relationships: { ...resource.relationships || {} }
    }
  };
}

function readyGate(win) {
  let ready = false;
  let registered = false;
  const waiting = [];
  const flush = () => {
    ready = true;
    waiting.splice(0).forEach((fn) => fn());
  };
  return function whenReady(fn) {
    if (ready) return fn();
    waiting.push(fn);
    if (registered) return void 0;
    registered = true;
    if (win && typeof win.onNuxtReady === "function") win.onNuxtReady(flush);
    else flush();
    return void 0;
  };
}

function sessionRecordToken(options, storage) {
  const destination = resolveDestination(options.destination, options);
  return destination.token ? destination.token(storage) : void 0;
}
function defer(fn, win = typeof window === "undefined" ? null : window) {
  if (win && typeof win.setTimeout === "function") win.setTimeout(fn, 0);
  else fn();
}
function druxtClients(context) {
  const app = context.app || context || {};
  const found = [app.$druxt || context.$druxt];
  const router = app.$druxtRouter || context.$druxtRouter;
  const instance = typeof router === "function" ? router() : router;
  if (instance) found.push(instance.druxt || instance);
  return found.filter(Boolean);
}
function pointClientAt(context, url) {
  for (const client of druxtClients(context)) {
    if (client.options) client.options.baseUrl = url;
    if (client.axios) client.axios.defaults.baseURL = url;
    client.index = {};
  }
}
function holdClientUntilConnected(context, state) {
  const client = context.app && context.app.$druxt || context.$druxt;
  if (!client || !client.axios || client.axios.__druxtIceHold) return false;
  client.axios.__druxtIceHold = true;
  client.axios.interceptors.request.use((config) => {
    if (state.status !== "connected") {
      const error = new Error("No backend connected; request not sent.");
      error.isAuthoringHold = true;
      return Promise.reject(error);
    }
    return config;
  });
  return true;
}
function previewStagedContent(store, app) {
  if (!app || !store) return;
  const staged = store.getters["druxtIce/stagedNew"] || [];
  if (store.state.druxt) {
    for (const resource of staged) {
      store.commit("druxt/addResource", { resource: asResource(resource) });
    }
  }
  const byId = new Map(staged.map((resource) => [resource.id, resource]));
  const refreshRows = (vm) => {
    if (vm.$options.name === "DruxtEntity" && byId.has(vm.uuid)) {
      const model = asResource(byId.get(vm.uuid)).data;
      if (JSON.stringify(vm.model) !== JSON.stringify(model)) vm.model = model;
    }
    vm.$children.forEach(refreshRows);
  };
  refreshRows(app);
  const visit = (vm) => {
    if (vm.$options.name === "DruxtView" && vm.resource && Array.isArray(vm.resource.data)) {
      const rows = vm.resource.data;
      const previews = previewsFor(rows, staged, vm.display);
      const already = new Set(rows.map((row) => row.id));
      const missing = previews.filter((resource) => !already.has(resource.id));
      const kept = rows.filter(
        (row) => !row.__staged || staged.some((s) => s.id === row.id)
      );
      if (missing.length || kept.length !== rows.length) {
        vm.resource = {
          ...vm.resource,
          data: [
            ...missing.map((resource) => ({
              type: resource.type,
              id: resource.id,
              __staged: true
            })),
            ...kept
          ]
        };
      }
    }
    vm.$children.forEach(visit);
  };
  visit(app);
}
function refreshFromBackend(app) {
  if (!app) return;
  const store = app.$store;
  const state = store && store.state;
  if (state && state.druxtRouter) {
    store.replaceState({
      ...state,
      druxtRouter: {
        ...state.druxtRouter,
        routes: {},
        entities: {},
        route: {},
        redirect: null
      }
    });
  }
  if (store && store.state && store.state.druxt) {
    store.commit("druxt/flushCollection", {});
    store.commit("druxt/flushResource", {});
  }
  if (app.$druxt) app.$druxt.index = {};
  const pending = [];
  const refetch = (vm) => {
    if (typeof vm.$fetch === "function" && vm.$options.fetch) {
      pending.push(Promise.resolve(vm.$fetch()).catch(() => void 0));
    }
    vm.$children.forEach(refetch);
  };
  refetch(app);
  return Promise.all(pending).then(() => void 0);
}
function createAuth(ice, context, whenReady = (fn) => fn()) {
  const $auth = () => context.app && context.app.$auth || context.$auth || null;
  const auth = Vue.observable({
    get token() {
      const a = $auth();
      return a && a.strategy && a.strategy.token ? bareToken(a.strategy.token.get()) : null;
    },
    get account() {
      const a = $auth();
      return a && a.user || null;
    },
    get authenticated() {
      const a = $auth();
      return Boolean(a && a.loggedIn);
    },
    async login() {
      if (!ice.state.url) throw new Error("No backend connected.");
      if (!ice.state.clientId) {
        throw new Error("No OAuth client ID for this backend.");
      }
      const a = $auth();
      if (!a) throw new Error("No sign-in module: druxt-auth is not installed.");
      a.$storage.setUniversal(
        "redirect",
        window.location.pathname + window.location.search
      );
      return a.loginWith(AUTH_STRATEGY);
    },
    async logout() {
      const a = $auth();
      if (a) await a.logout();
      applyToken();
    }
  });
  function applyToken() {
    const client = context.app && context.app.$druxt || context.$druxt;
    if (!client || !client.axios) return;
    const token = auth.token;
    if (token) {
      client.axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete client.axios.defaults.headers.common.Authorization;
    }
  }
  auth.applyToken = applyToken;
  whenReady(() => {
    applyToken();
    const a = $auth();
    if (a && a.$storage && typeof a.$storage.watchState === "function") {
      a.$storage.watchState("loggedIn", applyToken);
    }
  });
  return auth;
}
function createIce(options, context) {
  const fetchImpl = (...args) => window.fetch(...args);
  const whenReady = readyGate(window);
  const state = Vue.observable({
    url: null,
    clientId: options.clientId || null,
    expiresAt: null,
    source: null,
    status: "idle",
    error: null,
    // Shared, not local to a component: the control that opens the sign-in
    // dialog and the dialog itself are rarely in the same place.
    loginDialog: false
  });
  const ice = {
    options,
    state,
    openLogin() {
      state.loginDialog = true;
    },
    closeLogin() {
      state.loginDialog = false;
    },
    get connected() {
      return state.status === "connected";
    },
    async connect(url, source = "manual") {
      state.status = "checking";
      state.error = null;
      const result = await checkConformance(url, {
        fetch: fetchImpl,
        origin: window.location.origin
      });
      if (!result.ok) {
        state.status = "error";
        state.error = result.reason;
        return false;
      }
      state.url = normaliseUrl(url);
      state.source = source;
      state.status = "connected";
      pointClientAt(context, state.url);
      writeJson(window.localStorage, BACKEND_KEY, {
        url: state.url,
        clientId: state.clientId,
        expiresAt: state.expiresAt
      });
      whenReady(async () => {
        await refreshFromBackend(window.$nuxt);
        if (context.store) previewStagedContent(context.store, window.$nuxt);
      });
      return true;
    },
    async discover({ connect = true } = {}) {
      const recordUrl = (options.sessionRecord || {}).url;
      if (!recordUrl) return null;
      const published = await readSessionRecord(recordUrl, {
        fetch: fetchImpl,
        token: sessionRecordToken(options, window.sessionStorage),
        destination: resolveDestination(options.destination, options)
      });
      if (!published || !published.url) return null;
      if (state.status === "connected" && state.url === normaliseUrl(published.url)) {
        return { ...published, connected: true };
      }
      if (!connect || state.status === "connected") {
        return { ...published, connected: false };
      }
      if (published.expiresAt) state.expiresAt = published.expiresAt;
      if (published.clientId) state.clientId = published.clientId;
      const ok = await ice.connect(published.url, "published");
      return { ...published, connected: ok };
    },
    async connectPublished(published) {
      if (!published || !published.url) return false;
      if (published.expiresAt) state.expiresAt = published.expiresAt;
      if (published.clientId) state.clientId = published.clientId;
      return ice.connect(published.url, "published");
    },
    disconnect() {
      Object.assign(state, {
        clientId: options.clientId || null,
        url: null,
        expiresAt: null,
        source: null,
        status: "idle",
        error: null
      });
      writeJson(window.localStorage, BACKEND_KEY, null);
    },
    /**
     * Hold requests, bring the cart back, and connect to whichever backend
     * the query, storage or the session record names.
     */
    async start() {
      holdClientUntilConnected(context, state);
      const store = context.store;
      if (store) {
        whenReady(() => defer(() => store.dispatch("druxtIce/restore")));
        store.subscribe((mutation) => {
          if (String(mutation.type).startsWith("druxtIce/")) {
            whenReady(() => previewStagedContent(store, window.$nuxt));
          }
        });
        whenReady(() => previewStagedContent(store, window.$nuxt));
      }
      const chosen = resolveSource({
        query: new URLSearchParams(window.location.search).get("backend"),
        stored: readJson(window.localStorage, BACKEND_KEY),
        published: await readSessionRecord((options.sessionRecord || {}).url, {
          fetch: fetchImpl,
          token: sessionRecordToken(options, window.sessionStorage),
          destination: resolveDestination(options.destination, options)
        })
      });
      if (!chosen) return null;
      if (chosen.expiresAt) state.expiresAt = chosen.expiresAt;
      if (chosen.clientId) state.clientId = chosen.clientId;
      return ice.connect(chosen.url, chosen.source);
    }
  };
  ice.auth = createAuth(ice, context, whenReady);
  return ice;
}
async function installIce(options, context, inject) {
  const ice = createIce(options, context);
  inject("druxtIce", ice);
  await ice.start();
  return ice;
}

const LABEL_FIELDS = {
  node: "title",
  taxonomy_term: "name",
  user: "display_name",
  media: "name",
  block_content: "info"
};
const FILTER_FIELDS = {
  user: "name"
};
const BASE_FIELD_TARGETS = {
  uid: "user--user",
  revision_uid: "user--user"
};
function labelFieldFor(entityType) {
  return LABEL_FIELDS[entityType] || "name";
}
function filterFieldFor(entityType) {
  return FILTER_FIELDS[entityType] || labelFieldFor(entityType);
}
function labelOf(resource) {
  const attributes = (resource || {}).attributes || {};
  const type = String((resource || {}).type || "").split("--")[0];
  return attributes[labelFieldFor(type)] || attributes.title || attributes.name || attributes.display_name || (resource || {}).id || "";
}
function targetEntityType(schema) {
  const settings = (schema || {}).settings || {};
  const stored = (settings.storage || {}).target_type;
  if (stored) return stored;
  const handler = (settings.config || {}).handler;
  return handler ? String(handler).split(":").slice(1).join(":") || null : null;
}
function targetResourceTypes(schema, existing, index) {
  const fromExisting = (Array.isArray(existing) ? existing : [existing]).filter(Boolean).map((item) => item.type).filter(Boolean);
  if (fromExisting.length) return [...new Set(fromExisting)];
  const settings = (schema || {}).settings || {};
  const entityType = targetEntityType(schema);
  if (entityType) {
    const bundles = ((settings.config || {}).handler_settings || {}).target_bundles;
    if (bundles && Object.keys(bundles).length) {
      return Object.keys(bundles).map((bundle) => `${entityType}--${bundle}`);
    }
    const available = Object.keys(index || {}).filter(
      (type) => type.startsWith(`${entityType}--`)
    );
    return available.length ? available : [`${entityType}--${entityType}`];
  }
  const base = BASE_FIELD_TARGETS[(schema || {}).id];
  return base ? [base] : [];
}
function collectionUrl(backendUrl, resourceType) {
  const [entityType, bundle] = String(resourceType).split("--");
  const path = bundle ? `${entityType}/${bundle}` : entityType;
  return `${String(backendUrl).replace(/\/+$/, "")}/jsonapi/${path}`;
}
function autocompleteUrl(backendUrl, resourceType, query, schema = {}) {
  const display = (schema.settings || {}).display || {};
  const operator = display.match_operator || "CONTAINS";
  const limit = display.match_limit || 10;
  const field = filterFieldFor(String(resourceType).split("--")[0]);
  const params = new URLSearchParams();
  params.set("filter[q][condition][path]", field);
  params.set("filter[q][condition][operator]", operator);
  params.set("filter[q][condition][value]", query);
  params.set("page[limit]", String(limit));
  return `${collectionUrl(backendUrl, resourceType)}?${params}`;
}
function labelsUrl(backendUrl, resourceType, ids) {
  const params = new URLSearchParams();
  params.set("filter[ids][condition][path]", "id");
  params.set("filter[ids][condition][operator]", "IN");
  for (const [index, id] of (ids || []).entries()) {
    params.append(`filter[ids][condition][value][${index}]`, id);
  }
  return `${collectionUrl(backendUrl, resourceType)}?${params}`;
}
function toRelationship(items, multiple) {
  const data = (items || []).map(({ type, id }) => ({ type, id }));
  return { data: multiple ? data : data[0] || null };
}
function autoCreateTarget(schema, index) {
  const handlerSettings = (((schema || {}).settings || {}).config || {}).handler_settings || {};
  if (!handlerSettings.auto_create) return null;
  const targets = targetResourceTypes(schema, [], index);
  const bundle = handlerSettings.auto_create_bundle;
  if (bundle) {
    const match = targets.find((type) => type.endsWith(`--${bundle}`));
    if (match) return match;
  }
  return targets.length === 1 ? targets[0] : null;
}

function uploadUrl(backendUrl, resourceType, field) {
  const [entityType, bundle] = String(resourceType).split("--");
  const path = bundle ? `${entityType}/${bundle}` : entityType;
  return `${String(backendUrl).replace(/\/+$/, "")}/jsonapi/${path}/${field}`;
}
function safeFilename(name) {
  const cleaned = String(name || "upload").replace(/[\r\n]/g, "").replace(/["\\]/g, "").split(/[/\\]/).pop().trim();
  return cleaned || "upload";
}
function uploadHeaders(filename, token) {
  return {
    // Not the JSON:API media type: this request is the bytes themselves.
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `file; filename="${safeFilename(filename)}"`,
    Accept: "application/vnd.api+json",
    ...token ? { Authorization: `Bearer ${token}` } : {}
  };
}
function imageRelationship(fileId, alt, existing = {}) {
  if (!fileId) return { data: null };
  return {
    data: {
      type: "file--file",
      id: fileId,
      meta: { ...existing, alt: alt || "" }
    }
  };
}
function fileIsAllowed(file, schema) {
  const settings = ((schema || {}).settings || {}).config || {};
  const extensions = String(settings.file_extensions || "").split(/\s+/).filter(Boolean).map((extension2) => extension2.toLowerCase());
  const name = String((file || {}).name || "");
  const extension = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  if (extensions.length && !extensions.includes(extension)) {
    return { ok: false, reason: `Only ${extensions.join(", ")} files here.` };
  }
  const max = parseSize(settings.max_filesize);
  if (max && (file || {}).size > max) {
    return {
      ok: false,
      reason: `Larger than the ${settings.max_filesize} this field allows.`
    };
  }
  return { ok: true };
}
function parseSize(value) {
  if (!value) return 0;
  const match = String(value).trim().match(/^([\d.]+)\s*([kmg]?b?)$/i);
  if (!match) return 0;
  const units = { "": 1, b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  return Number(match[1]) * (units[match[2].toLowerCase()] || 1);
}

function modesFromDisplays(displays, type) {
  const [entityType, bundle] = String(type || "").split("--");
  const found = (displays || []).map((display) => display.attributes || {}).filter((attributes) => attributes.bundle === bundle).filter((attributes) => attributes.targetEntityType === entityType).map((attributes) => attributes.mode).filter(Boolean);
  return [.../* @__PURE__ */ new Set(["default", ...found])];
}
async function viewModesFor(druxt, type) {
  try {
    const displays = await druxt.getCollection(
      "entity_view_display--entity_view_display"
    );
    return modesFromDisplays(displays.data, type);
  } catch (e) {
    return ["default"];
  }
}

const editModeFeature = defineFeature({
  id: "edit-mode",
  label: "Edit mode",
  requires: ["editableFields", "stageFieldValue"],
  weight: -100
});
function toggleEditMode(store) {
  if (!store) return;
  store.dispatch("druxtIce/setEditing", !store.getters["druxtIce/editing"]);
}

const STORAGE_KEY = "authoring.cart";
function without(map, key) {
  const copy = { ...map };
  delete copy[key];
  return copy;
}
function readStored() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function writeStored(entries) {
  try {
    if (Object.keys(entries).length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    return true;
  } catch (e) {
    return false;
  }
}
const state = () => ({
  /**
   * Whether the site is in edit mode.
   *
   * Deliberately separate from being connected or signed in: an author can turn
   * editing on with no backend at all and stage changes, which is the point of
   * the cart. It only decides whether the interface offers editing.
   */
  editing: false,
  /** Whether the staged-changes drawer is open. */
  drawerOpen: false,
  /** Staged resources, keyed `type:id`. */
  entries: {},
  // Edits an author has made but not staged. Kept apart from `entries` on
  // purpose: these are not going to be committed, they are just not lost.
  drafts: {},
  /** False once a write to storage has failed, so the UI can stop promising. */
  persistent: true,
  /** Per-entry failure reasons from the last commit. */
  errors: {},
  committing: false
});
const getters = {
  editing: (state2) => state2.editing,
  drawerOpen: (state2) => state2.drawerOpen,
  count: (state2) => Object.keys(state2.entries).length,
  isEmpty: (state2) => !Object.keys(state2.entries).length,
  /** Everything staged, as JSON:API resource objects, ready for the wire. */
  resources: (state2) => Object.values(state2.entries).map(tidyResource),
  /**
   * Everything staged, as the cart holds it.
   *
   * `resources` strips the cart's own bookkeeping, which is right for sending
   * and wrong for showing: a deletion tidied for the wire is indistinguishable
   * from an edit that changed nothing.
   */
  staged: (state2) => Object.values(state2.entries),
  entryFor: (state2) => (type, id) => state2.entries[cartKey(type, id)] || null,
  /**
   * Content that does not exist on the backend yet, staged or not.
   *
   * A listing should show something the moment it is begun, not only once it
   * is staged: staging is a decision about sending, not about existing.
   */
  stagedNew: (state2) => [
    ...Object.values(state2.entries).filter((resource) => resource.isNew),
    ...Object.entries(state2.drafts).filter(([, draft]) => draft.isNew).map(([key, draft]) => {
      const [type, id] = key.split(":");
      return { type, id, isNew: true, ...draft };
    })
  ],
  draftFor: (state2) => (type, id) => state2.drafts[cartKey(type, id)] || null,
  errorFor: (state2) => (type, id) => state2.errors[cartKey(type, id)] || null
};
const mutations = {
  setEditing(state2, editing) {
    state2.editing = editing;
  },
  setDrawerOpen(state2, open) {
    state2.drawerOpen = open;
  },
  setDraft(state2, { key, draft }) {
    state2.drafts = { ...state2.drafts, [key]: draft };
  },
  clearDraft(state2, key) {
    state2.drafts = without(state2.drafts, key);
  },
  stage(state2, { key, resource }) {
    state2.entries = { ...state2.entries, [key]: resource };
    state2.errors = without(state2.errors, key);
  },
  discardOne(state2, key) {
    state2.entries = without(state2.entries, key);
    state2.errors = without(state2.errors, key);
  },
  discardAll(state2) {
    state2.entries = {};
    state2.errors = {};
  },
  restore(state2, entries) {
    state2.entries = entries;
  },
  setPersistent(state2, persistent) {
    state2.persistent = persistent;
  },
  setError(state2, { key, message }) {
    state2.errors = { ...state2.errors, [key]: message };
  },
  setCommitting(state2, committing) {
    state2.committing = committing;
  }
};
async function sendFiles(resource, { backendUrl, token, request }) {
  const files = resource.files || {};
  if (!Object.keys(files).length) return { resource };
  const relationships = { ...resource.relationships || {} };
  for (const [field, file] of Object.entries(files)) {
    try {
      const response = await request(
        uploadUrl(backendUrl, resource.type, field),
        {
          method: "POST",
          headers: uploadHeaders(file.name, token),
          body: dataUrlToBlob(file.dataUrl, file.type)
        }
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        return {
          error: detail && detail.errors && detail.errors[0] && detail.errors[0].detail || `The image was refused with ${response.status}.`
        };
      }
      const body = await response.json();
      const existing = ((relationships[field] || {}).data || {}).meta || {};
      relationships[field] = imageRelationship(
        body.data.id,
        existing.alt,
        existing
      );
    } catch (error) {
      return { error: `The image could not be sent: ${error.message}` };
    }
  }
  return { resource: { ...resource, relationships } };
}
async function sendBodyImages(resource, { backendUrl, token, request }) {
  const held = resource.bodyImages || {};
  const dataUrls = Object.keys(held);
  if (!dataUrls.length) return { resource };
  const field = firstUploadField(resource);
  if (!field) {
    return {
      error: "There is no file field on this content to send an image through."
    };
  }
  let attributes = { ...resource.attributes || {} };
  for (const dataUrl of dataUrls) {
    const file = held[dataUrl];
    try {
      const response = await request(
        uploadUrl(backendUrl, resource.type, field),
        {
          method: "POST",
          headers: uploadHeaders(file.name, token),
          body: dataUrlToBlob(file.dataUrl, file.type)
        }
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        return {
          error: detail && detail.errors && detail.errors[0] && detail.errors[0].detail || `An image in the text was refused with ${response.status}.`
        };
      }
      const body = await response.json();
      const url = ((body.data.attributes || {}).uri || {}).url;
      attributes = rewriteTextFields(attributes, dataUrl, {
        url,
        uuid: body.data.id
      });
    } catch (error) {
      return {
        error: `An image in the text could not be sent: ${error.message}`
      };
    }
  }
  return { resource: { ...resource, attributes, bodyImages: {} } };
}
function rewriteTextFields(attributes, dataUrl, file) {
  const out = { ...attributes };
  for (const [name, value] of Object.entries(out)) {
    if (value && typeof value === "object" && typeof value.value === "string") {
      out[name] = {
        ...value,
        value: replaceHeldImage(value.value, dataUrl, file)
      };
    } else if (typeof value === "string") {
      out[name] = replaceHeldImage(value, dataUrl, file);
    }
  }
  return out;
}
function firstUploadField(resource) {
  const fields = resource.uploadFields || [];
  return fields[0] || Object.keys(resource.files || {})[0] || null;
}
function dataUrlToBlob(dataUrl, type) {
  const base64 = String(dataUrl).split(",")[1] || "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: type || "application/octet-stream" });
}
const actions = {
  /** Bring back whatever the last visit staged, and whether editing was on. */
  restore({ commit }) {
    commit("restore", readStored());
    try {
      commit(
        "setEditing",
        window.localStorage.getItem("authoring.editing") === "1"
      );
    } catch (e) {
    }
  },
  setDrawerOpen({ commit }, open) {
    commit("setDrawerOpen", Boolean(open));
  },
  /** Turn editing on or off, and remember which. */
  setEditing({ commit }, editing) {
    commit("setEditing", Boolean(editing));
    commit("setDrawerOpen", Boolean(editing));
    try {
      if (editing) window.localStorage.setItem("authoring.editing", "1");
      else window.localStorage.removeItem("authoring.editing");
    } catch (e) {
    }
  },
  /**
   * Begin a new piece of content, without staging it.
   *
   * Pressing Add is not a decision to commit anything: it is opening a form.
   * The resource is held unstaged, the same as any other edit that has not been
   * staged, so the page shows it and the drawer does not claim it is going to
   * be sent.
   */
  draftNew({ commit }, { type, attributes, relationships }) {
    const id = newResourceId();
    commit("setDraft", {
      key: cartKey(type, id),
      draft: {
        isNew: true,
        attributes: attributes || {},
        relationships: relationships || {},
        files: {}
      }
    });
    return id;
  },
  /**
   * Stage a new entity, which does not exist in the backend yet.
   *
   * Given a client-generated id up front, because the cart is keyed by id and
   * the interface has to be able to name the thing being written before Drupal
   * has seen it. JSON:API accepts a client-supplied id on create, so the
   * placeholder becomes the real id rather than being swapped for one.
   */
  stageNew({ state: state2, commit }, { type, attributes, relationships, onlyIfReferenced }) {
    const id = newResourceId();
    const resource = {
      type,
      id,
      isNew: true,
      // A tag invented inside a reference field is only worth creating while
      // something still points at it. A new article is not: it stands alone.
      // `tidyResource` keeps this off the wire, like `isNew`.
      onlyIfReferenced: Boolean(onlyIfReferenced),
      attributes: attributes || {},
      relationships: relationships || {}
    };
    commit("stage", { key: cartKey(type, id), resource });
    commit("setPersistent", writeStored(state2.entries));
    if (Object.keys(state2.entries).length === 1) commit("setDrawerOpen", true);
    return id;
  },
  /**
   * Stage what changed about one entity.
   *
   * Takes the entity as it was and as the form has it, and keeps the
   * difference. Staging an edit that changes nothing is a no-op rather than an
   * empty resource, so the count means what it says.
   */
  stage({ state: state2, commit }, {
    type,
    id,
    original,
    edited,
    relationships,
    allRelationships,
    files,
    bodyImages
  }) {
    const key = cartKey(type, id);
    const existing = state2.entries[key];
    const wasNew = isNew(existing) || Boolean((state2.drafts[key] || {}).isNew);
    const attributes = wasNew ? withoutComputed({ ...edited }) : changedFields(original, edited);
    const resource = mergeEntry(
      existing,
      {
        type,
        id,
        isNew: wasNew,
        attributes,
        relationships: relationships || {},
        // Bytes chosen in the browser, kept off the wire by `tidyResource` and
        // uploaded when this is committed.
        files: { ...(existing || {}).files || {}, ...files || {} },
        // Images put into a text field before there was anywhere to send them.
        // Keyed by the data URL standing in for each one in the markup.
        bodyImages: {
          ...(existing || {}).bodyImages || {},
          ...bodyImages || {}
        },
        before: {
          ...valuesBefore(original || {}, attributes),
          ...valuesBefore(allRelationships || {}, relationships || {})
        }
      },
      // What this form had in front of it, so a previously staged field the
      // author has since put back can be dropped rather than kept forever.
      {
        attributes: Object.keys(edited || {}),
        relationships: Object.keys(allRelationships || relationships || {})
      }
    );
    if (isEmptyResource(resource)) return false;
    commit("clearDraft", cartKey(type, id));
    commit("stage", { key: cartKey(type, id), resource });
    commit("setPersistent", writeStored(state2.entries));
    if (Object.keys(state2.entries).length === 1) commit("setDrawerOpen", true);
    return true;
  },
  /**
   * Keep an edit that has not been staged.
   *
   * Closing a form is not a decision to throw the work away. The author gets
   * the page rendered as they left it, marked unstaged, and stages it when they
   * are ready. Deliberately not part of the cart: a draft is never committed,
   * and counting it would make the drawer claim work it is not going to send.
   */
  saveDraft({ state: state2, commit }, { type, id, attributes, relationships, files }) {
    const key = cartKey(type, id);
    const existing = state2.drafts[key] || {};
    const deleted = Boolean(existing.deleted);
    const draft = {
      deleted,
      isNew: Boolean(existing.isNew),
      attributes: attributes || {},
      relationships: relationships || {},
      // Bytes for a picture chosen and not staged. Without these the file is
      // gone the moment the form closes, and the field points at an id nothing
      // can resolve.
      files: files || {}
    };
    const empty = !deleted && !draft.isNew && !Object.keys(draft.attributes).length && !Object.keys(draft.relationships).length && !Object.keys(draft.files).length;
    if (empty) return commit("clearDraft", key);
    commit("setDraft", { key, draft });
  },
  clearDraft({ commit }, { type, id }) {
    commit("clearDraft", cartKey(type, id));
  },
  /**
   * Stage the removal of something.
   *
   * Staged like any other change so it can be reviewed and reversed. Content
   * the author created and never committed is simply dropped instead: there is
   * nothing on the backend to delete, and asking it to remove something it has
   * never heard of is a 404 the author cannot act on.
   */
  stageDeletion({ state: state2, commit }, { type, id }) {
    const key = cartKey(type, id);
    const existing = state2.entries[key];
    if (isNew(existing)) {
      commit("discardOne", key);
      commit("clearDraft", key);
      commit("setPersistent", writeStored(state2.entries));
      return "dropped";
    }
    commit("stage", { key, resource: { type, id, deleted: true } });
    commit("clearDraft", key);
    commit("setPersistent", writeStored(state2.entries));
    if (Object.keys(state2.entries).length === 1) commit("setDrawerOpen", true);
    return "staged";
  },
  /**
   * Move a staged change back to being merely unsaved.
   *
   * The two states already exist, so unstaging is moving between them rather
   * than a third thing. The edit is not lost and the page still shows it; it
   * simply stops being part of what the next commit sends.
   */
  unstage({ state: state2, commit }, { type, id }) {
    const key = cartKey(type, id);
    const entry = state2.entries[key];
    if (!entry) return false;
    if (isDeletion(entry)) {
      commit("setDraft", {
        key,
        draft: { deleted: true, attributes: {}, relationships: {}, files: {} }
      });
      commit("discardOne", key);
      commit("setPersistent", writeStored(state2.entries));
      return true;
    }
    const existing = state2.drafts[key] || {};
    commit("setDraft", {
      key,
      draft: {
        attributes: {
          ...entry.attributes || {},
          ...existing.attributes || {}
        },
        relationships: {
          ...entry.relationships || {},
          ...existing.relationships || {}
        },
        files: { ...entry.files || {}, ...existing.files || {} }
      }
    });
    commit("discardOne", key);
    commit("setPersistent", writeStored(state2.entries));
    return true;
  },
  /**
   * Move an unstaged edit into the cart.
   *
   * The mirror of `unstage`. A draft already holds the difference from what the
   * backend has, so staging it is moving it between the two maps rather than
   * working anything out again.
   */
  stageDraft({ state: state2, commit }, { type, id }) {
    const key = cartKey(type, id);
    const draft = state2.drafts[key];
    if (!draft) return false;
    if (draft.deleted) {
      commit("clearDraft", key);
      commit("stage", { key, resource: { type, id, deleted: true } });
      commit("setPersistent", writeStored(state2.entries));
      return true;
    }
    const existing = state2.entries[key];
    const resource = mergeEntry(existing, {
      type,
      id,
      // From the draft as well: content begun and not yet staged is new, and
      // forgetting that turns its create into a PATCH against nothing.
      isNew: isNew(existing) || Boolean(draft.isNew),
      attributes: draft.attributes || {},
      relationships: draft.relationships || {},
      files: draft.files || {}
    });
    commit("clearDraft", key);
    commit("stage", { key, resource });
    commit("setPersistent", writeStored(state2.entries));
    return true;
  },
  /**
   * Drop a staged resource that only existed to be referenced.
   *
   * A tag typed into a field and then taken out again should leave nothing
   * behind. Doing it here rather than in the field means the check can see the
   * whole cart: another entity may still reference the same new term, and
   * deleting it would break that one instead.
   */
  discardIfUnreferenced({ state: state2, commit, getters: getters2 }, { type, id }) {
    const entry = state2.entries[cartKey(type, id)];
    if (!entry || !entry.onlyIfReferenced) return false;
    const referenced = getters2.resources.some(
      (resource) => Object.values(resource.relationships || {}).some((relationship) => {
        const data = (relationship || {}).data;
        if (!data) return false;
        return (Array.isArray(data) ? data : [data]).some(
          (item) => item.id === id
        );
      })
    );
    if (referenced) return false;
    commit("discardOne", cartKey(type, id));
    commit("setPersistent", writeStored(state2.entries));
    return true;
  },
  discardOne({ state: state2, commit }, { type, id }) {
    commit("discardOne", cartKey(type, id));
    commit("clearDraft", cartKey(type, id));
    commit("setPersistent", writeStored(state2.entries));
  },
  discardAll({ state: state2, commit }) {
    commit("discardAll");
    for (const key of Object.keys(state2.drafts)) commit("clearDraft", key);
    commit("setPersistent", writeStored(state2.entries));
  },
  /**
   * Send the cart to a backend.
   *
   * One PATCH per resource, and each is dropped from the cart only once the
   * backend has accepted it. A rejected resource stays put with its reason, so
   * a partial failure leaves the author with exactly the work still to do
   * rather than an all-or-nothing retry.
   */
  async commit({ state: state2, commit, getters: getters2 }, { backendUrl, token, fetch: fetchImpl, ids } = {}) {
    if (!backendUrl) return { ok: false, reason: "No backend connected." };
    if (!token) return { ok: false, reason: "Not signed in to that backend." };
    if (getters2.isEmpty) return { ok: false, reason: "Nothing staged." };
    const request = fetchImpl || window.fetch.bind(window);
    const all = Object.values(state2.entries);
    const chosen = ids ? new Set(withDependencies(ids, all)) : null;
    const sending = chosen ? all.filter((resource) => chosen.has(resource.id)) : all;
    if (!sending.length) return { ok: false, reason: "Nothing selected." };
    commit("setCommitting", true);
    const results = { sent: 0, failed: 0 };
    for (const resource of commitOrder(sending)) {
      const key = cartKey(resource.type, resource.id);
      try {
        const withImages = await sendBodyImages(resource, {
          backendUrl,
          token,
          request
        });
        if (withImages.error) {
          commit("setError", { key, message: withImages.error });
          results.failed += 1;
          continue;
        }
        const uploaded = await sendFiles(withImages.resource, {
          backendUrl,
          token,
          request
        });
        if (uploaded.error) {
          commit("setError", { key, message: uploaded.error });
          results.failed += 1;
          continue;
        }
        const ready = uploaded.resource;
        const body = patchBody(ready);
        const response = await request(requestUrl(backendUrl, ready), {
          method: requestMethod(ready),
          headers: {
            // JSON:API's own media type, not application/json. Drupal answers
            // 415 for anything else.
            "Content-Type": "application/vnd.api+json",
            Accept: "application/vnd.api+json",
            Authorization: `Bearer ${token}`
          },
          ...body ? { body: JSON.stringify(body) } : {}
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => null);
          const message = detail && detail.errors && detail.errors[0] && detail.errors[0].detail || `Rejected with ${response.status}.`;
          commit("setError", { key, message });
          results.failed += 1;
          continue;
        }
        commit("discardOne", key);
        results.sent += 1;
      } catch (error) {
        commit("setError", { key, message: error.message });
        results.failed += 1;
      }
    }
    commit("setPersistent", writeStored(state2.entries));
    commit("setCommitting", false);
    return { ok: results.failed === 0, ...results };
  }
};
const iceStoreModule = {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
function registerIceStore(store) {
  if (!store) return false;
  if (typeof store.hasModule === "function" && store.hasModule("druxtIce"))
    return false;
  store.registerModule("druxtIce", iceStoreModule, {
    preserveState: Boolean(store.state && store.state.druxtIce)
  });
  return true;
}

const DEFAULTS = {
  clientId: null,
  sessionRecord: { url: "", tokenKey: null },
  // The module path of a destination: where the session record is read from
  // and where an export goes. A path rather than an object, because these
  // options reach the plugin through JSON.stringify and functions do not
  // survive it. Null means the default destination: the record's plain URL,
  // and a token wherever `sessionRecord.tokenKey` says one is.
  destination: null,
  // Passed on to druxt-auth, which signs the author in. `false` leaves
  // druxt-auth out, for a site that brings its own sign-in.
  auth: {}
};
function resolveOptions(moduleOptions = {}, nuxtOptions = {}) {
  const configured = {
    ...(nuxtOptions.druxt || {}).ice || {},
    ...moduleOptions
  };
  return {
    ...DEFAULTS,
    ...configured,
    sessionRecord: {
      ...DEFAULTS.sessionRecord,
      ...configured.sessionRecord || {}
    }
  };
}
async function requireAuth(container, options) {
  if (options.auth === false) return false;
  const required = Object.keys(container.requiredModules || {});
  if (required.some((key) => key.includes("druxt-auth"))) {
    console.warn(
      "[druxt-ice] druxt-auth is already required; list it after this module, or leave it to this module, so signing in follows the connected backend."
    );
    return false;
  }
  const auth = container.options.auth || {};
  const strategies = auth.strategies || {};
  container.options.auth = {
    ...auth,
    strategies: {
      ...strategies,
      [AUTH_STRATEGY]: {
        scheme: resolve(__dirname, "../templates/auth-scheme.js"),
        ...strategies[AUTH_STRATEGY] || {}
      }
    }
  };
  const build = container.options.build || (container.options.build = {});
  const transpile = build.transpile || (build.transpile = []);
  if (!transpile.includes("druxt-auth/templates")) {
    transpile.push("druxt-auth/templates");
  }
  const configured = ((container.options.druxt || {}).auth || {}).clientId;
  await container.requireModule([
    "druxt-auth",
    {
      // The site's dialog is the way in; druxt-auth's login page is not asked
      // for unless the site asks for it.
      login: false,
      ...options.clientId || !configured ? { clientId: options.clientId || "druxt-ice" } : {},
      ...options.auth || {}
    }
  ]);
  return true;
}
const NuxtModule = async function(moduleOptions = {}) {
  const options = resolveOptions(moduleOptions, this.options);
  this.options.store = true;
  this.nuxt.hook("components:dirs", (dirs) => {
    dirs.push({ path: join(__dirname, "components") });
  });
  await requireAuth(this, options);
  this.addPlugin({
    src: resolve(__dirname, "../templates/plugin.js"),
    fileName: "druxt-ice.js",
    options
  });
};

export { ADAPTER_METHODS, ADVANCED_FIELDS, AUTH_STRATEGY, BACKEND_KEY, BUILT, CAPTION_FILTER, CONFORMANCE_UNREACHABLE, DEFAULTS, DELTA_ATTRIBUTE, DESTINATION_METHODS, DIFF_TYPE, DRUPAL_FILES, ENTITY_ATTRIBUTE, FIELD_ATTRIBUTE, STAGED, STATIC_FILES, TYPE_ATTRIBUTE, absoluteFileUrls, adapterSupports, applyCaptionFilter, asResource, asText, autoCreateTarget, autocompleteUrl, backendFor, bareToken, base64Url, bustCache, callbackUrl, cartKey, changedFields, changedRegion, checkConformance, collectionUrl$1 as collectionUrl, commitOrder, createAuth, createIce, createPlainFieldsAdapter, decodeAttribute, deepEqual, NuxtModule as default, defaultDestination, defer, defineDestination, defineFeature, dependencyMap, destinationRequest, destinationSupports, diffLines, druxtClients, editModeFeature, editorFileUrls, entityAnchors, exportCart, exportSummary, failsFilters, fieldAnchors, fieldChanged, fieldOps, fieldStatus, fileIsAllowed, filterFieldFor, filtersFromResources, findAnchor, fromDateInput, groupFields, hasHeldImage, hasUnfilteredCaption, holdClientUntilConnected, iceStoreModule, imageRelationship, installIce, isAdapterMethod, isDeletion, isDrupalFile, isEmptyResource, isExpired, isLong, isNew, labelFieldFor, labelOf, labelsUrl, listingAccepts, listingTypes, mergeEntry, modesFromDisplays, newResourceId, normaliseUrl, parseSize, patchBody, patchUrl, pointClientAt, pointStrategyAt, previewStagedContent, previewsFor, readJson, readSessionRecord, readyGate, refreshFromBackend, registerIceStore, relativeFileUrls, replaceHeldImage, requestMethod, requestUrl, requireAuth, requiredBy, resolveDestination, resolveFeatures, resolveOptions, resolveSource, rewriteFileUrls, safeFilename, sessionRecordToken, stagedDiff, storedFileUrls, targetResourceTypes, tidyResource, toDateInput, toRelationship, toggleEditMode, uploadHeaders, uploadUrl, valuesBefore, viewModesFor, withDependencies, withoutComputed, words, writeJson };
