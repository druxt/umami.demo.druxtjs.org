'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const path = require('path');

const CORE = "ckeditor5-dll";
const DEFAULT_PACKAGES = [
  "editor-classic",
  "essentials",
  "autoformat",
  "paste-from-office",
  "indent",
  "basic-styles",
  "remove-format",
  "block-quote",
  "heading",
  "link",
  "list",
  "table",
  "image",
  "code-block",
  "horizontal-line",
  "source-editing"
];
const PLUGINS = [
  "essentials.Essentials",
  "paragraph.Paragraph",
  "autoformat.Autoformat",
  "pasteFromOffice.PasteFromOffice",
  "indent.Indent",
  "basicStyles.Bold",
  "basicStyles.Italic",
  "basicStyles.Code",
  "basicStyles.Strikethrough",
  "basicStyles.Subscript",
  "basicStyles.Superscript",
  "removeFormat.RemoveFormat",
  "link.Link",
  "list.List",
  "blockQuote.BlockQuote",
  "table.Table",
  "table.TableToolbar",
  "horizontalLine.HorizontalLine",
  "heading.Heading",
  "codeBlock.CodeBlock",
  "sourceEditing.SourceEditing",
  "image.Image",
  "image.ImageToolbar",
  "image.ImageCaption",
  "image.ImageStyle",
  "image.ImageResize",
  "image.ImageUpload"
];
const BUTTON_PLUGINS = {
  bold: ["basicStyles.Bold"],
  italic: ["basicStyles.Italic"],
  strikethrough: ["basicStyles.Strikethrough"],
  subscript: ["basicStyles.Subscript"],
  superscript: ["basicStyles.Superscript"],
  code: ["basicStyles.Code"],
  removeFormat: ["removeFormat.RemoveFormat"],
  link: ["link.Link"],
  bulletedList: ["list.List"],
  numberedList: ["list.List"],
  blockQuote: ["blockQuote.BlockQuote"],
  insertTable: ["table.Table", "table.TableToolbar"],
  horizontalLine: ["horizontalLine.HorizontalLine"],
  heading: ["heading.Heading"],
  codeBlock: ["codeBlock.CodeBlock"],
  sourceEditing: ["sourceEditing.SourceEditing"],
  uploadImage: [
    "image.Image",
    "image.ImageToolbar",
    "image.ImageCaption",
    "image.ImageStyle",
    "image.ImageResize",
    "image.ImageUpload"
  ],
  indent: ["indent.Indent"],
  outdent: ["indent.Indent"],
  undo: ["essentials.Essentials"],
  redo: ["essentials.Essentials"]
};
const SUPPORTED_BUTTONS = Object.keys(BUTTON_PLUGINS);
function scriptUrl(base, name) {
  return `${String(base).replace(/\/+$/, "")}/${name}/${name}.js`;
}
const loaded = /* @__PURE__ */ new Map();
function resetLoader() {
  loaded.clear();
}
function loadScript(src, { document, timeout = 15e3 } = {}) {
  if (loaded.has(src)) return loaded.get(src);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let timer = null;
    const settle = (done) => () => {
      if (timer) clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      done();
    };
    script.src = src;
    script.async = false;
    script.onload = settle(resolve);
    script.onerror = settle(() => reject(new Error(`Could not load ${src}`)));
    if (timeout > 0) {
      timer = setTimeout(
        settle(() => reject(new Error(`Timed out loading ${src}`))),
        timeout
      );
    }
    document.head.appendChild(script);
  });
  promise.catch(() => loaded.delete(src));
  loaded.set(src, promise);
  return promise;
}
async function loadCkeditor({
  base,
  packages = DEFAULT_PACKAGES,
  document = globalThis.document,
  window = globalThis.window,
  timeout
} = {}) {
  if (!document) throw new Error("CKEditor needs a document to load into.");
  if (!base) throw new Error("No base URL to load CKEditor from.");
  await loadScript(scriptUrl(base, CORE), { document, timeout });
  await Promise.all(
    packages.map(
      (name) => loadScript(scriptUrl(base, name), { document, timeout })
    )
  );
  const namespace = (window || {}).CKEditor5;
  if (!namespace)
    throw new Error(
      `The scripts under ${base} loaded but defined no CKEditor5 namespace.`
    );
  return namespace;
}
function resolvePlugins(namespace, names) {
  const found = [];
  for (const name of names) {
    const [group, exported] = name.split(".");
    const plugin = ((namespace || {})[group] || {})[exported];
    if (plugin && !found.includes(plugin)) found.push(plugin);
  }
  return found;
}
function editorPlugins(namespace) {
  return resolvePlugins(namespace, PLUGINS);
}

const SCRIPTS_PATH = "/core/assets/vendor/ckeditor5";
const COPY_PATH = "/ckeditor5";
function createCkeditor(options, context = {}) {
  const client = () => context.app && context.app.$druxt || context.$druxt || null;
  const base = () => {
    const druxt = client();
    const url = druxt && druxt.options ? druxt.options.baseUrl : null;
    return url ? String(url).replace(/\/+$/, "") : null;
  };
  const plugin = {
    options,
    /** The backend's origin, or null with no client. */
    backendUrl: () => base(),
    /**
     * Where the scripts come from.
     *
     * The option wins. Then this site's own copy, if the module was asked to
     * make one: a site that copies the builds wants to serve them, and
     * pointing at the backend instead would be a second setting that has to
     * agree with the first. It also means the editor still loads with no
     * backend connected, which is the whole point of staging edits offline.
     *
     * The backend's copy last, which is right when nothing was copied: the
     * builds match the Drupal that will render the result.
     *
     * `resolveOptions` in index.js sets the same copy-to-scripts default when
     * the module merges its options; this chain answers for a plugin built
     * from options directly. Keep the two in step.
     */
    scripts: () => options.scripts || (options.copy ? COPY_PATH : null) || (base() ? `${base()}${SCRIPTS_PATH}` : null),
    /** Where the files are shown from: the option, or the backend's copy. */
    files: () => {
      const { from, to } = options.files;
      return { from, to: to || (base() ? `${base()}${from}` : null) };
    },
    /** The `CKEditor5` namespace, or null when it could not be loaded. */
    load: () => loadCkeditor({
      base: plugin.scripts(),
      packages: options.packages,
      timeout: options.timeout
    }).catch(() => null)
  };
  return plugin;
}

function packageFile(name) {
  if (name === CORE) return `ckeditor5/build/${CORE}.js`;
  return `@ckeditor/ckeditor5-${name}/build/${name}.js`;
}
function scriptSources(copy, packages, { rootDir, resolveModule } = {}) {
  const names = [CORE, ...packages];
  if (copy === true) {
    return names.map((name) => ({
      name,
      source: resolveModule(packageFile(name)) || null
    }));
  }
  const dir = path.resolve(rootDir || "", String(copy));
  return names.map((name) => ({ name, source: path.join(dir, name, `${name}.js`) }));
}
function presentSources(sources, { exists, warn = console.warn }) {
  return sources.filter(({ name, source }) => {
    const found = Boolean(source) && exists(source);
    if (!found)
      warn(
        `[druxt-ckeditor] No build found for "${name}"; the editor loads without it.`
      );
    return found;
  });
}
function copyScripts(sources, into, { copy, mkdir }) {
  for (const { name, source } of sources) {
    const dir = path.join(into, name);
    mkdir(dir, { recursive: true });
    copy(source, path.join(dir, `${name}.js`));
  }
}
function scriptMiddleware(sources, { read }) {
  const files = new Map(
    sources.map(({ name, source }) => [`/${name}/${name}.js`, source])
  );
  return (req, res, next) => {
    const source = files.get(String(req.url || "").split("?")[0]);
    if (!source) return next();
    res.setHeader("Content-Type", "text/javascript; charset=utf-8");
    read(source).on("error", next).pipe(res);
  };
}

const DRUPAL_FILES = "/sites/default/files/";
function rewriteFileUrls(html, { from, to } = {}) {
  if (!html || !from || !to || from === to) return html;
  return String(html).split(`"${from}`).join(`"${to}`).split(`'${from}`).join(`'${to}`);
}
function isDrupalFile(url, from = DRUPAL_FILES) {
  return String(url || "").includes(from);
}
function origin(backendUrl) {
  return backendUrl ? String(backendUrl).replace(/\/+$/, "") : null;
}
function editorFileUrls(html, { from = DRUPAL_FILES, to = null, backendUrl = null } = {}) {
  const base = origin(backendUrl);
  const target = to || (base ? `${base}${from}` : null);
  return rewriteFileUrls(html, { from, to: target });
}
function storedFileUrls(html, { from = DRUPAL_FILES, to = null, backendUrl = null } = {}) {
  const base = origin(backendUrl);
  let out = html;
  if (base) out = rewriteFileUrls(out, { from: `${base}${from}`, to: from });
  if (to) out = rewriteFileUrls(out, { from: to, to: from });
  return out;
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
async function filtersFor(store, format) {
  if (!store) return null;
  try {
    const collection = await store.dispatch("druxt/getCollection", {
      type: "filter_format--filter_format"
    });
    return filtersFromResources((collection || {}).data, format);
  } catch (e) {
    return null;
  }
}

const CAPTIONED = /<(img|drupal-media)\b[^>]*\bdata-caption\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi;
const CAPTION_ATTRIBUTE = /\s*\bdata-caption\s*=\s*("[^"]*"|'[^']*')/i;
function decodeAttribute(value) {
  return String(value || "").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(
    /&#x([0-9a-f]+);/gi,
    (_, code) => String.fromCodePoint(parseInt(code, 16))
  ).split("&lt;").join("<").split("&gt;").join(">").split("&quot;").join('"').split("&amp;").join("&");
}
function toEditorCaptions(html) {
  if (!html || !String(html).includes("data-caption")) return html;
  return String(html).replace(
    CAPTIONED,
    (tag, _name, _quoted, double, single) => {
      const caption = double !== void 0 ? double : single || "";
      const stripped = tag.replace(CAPTION_ATTRIBUTE, "");
      return `<figure class="image">${stripped}<figcaption>${decodeAttribute(caption)}</figcaption></figure>`;
    }
  );
}
const EDITOR_FIGURE = /<figure\b[^>]*\bclass\s*=\s*["'][^"']*\bimage\b[^"']*["'][^>]*>\s*(?<img><img\b[^>]*>)\s*<figcaption[^>]*>(?<caption>[\s\S]*?)<\/figcaption>\s*<\/figure>/gi;
function fromEditorCaptions(html) {
  if (!html || !String(html).includes("<figcaption")) return html;
  return String(html).replace(EDITOR_FIGURE, (figure, ...args) => {
    const { img, caption } = args[args.length - 1];
    const text = String(caption).trim();
    if (!text) return figure;
    return img.replace(/\s*\/?>$/, ` data-caption="${encodeAttribute(text)}">`);
  });
}
function encodeAttribute(value) {
  return String(value || "").split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");
}
function captionsAreAttributes(filters, format) {
  const known = (filters || {})[format];
  if (!Array.isArray(known)) return true;
  return known.includes(CAPTION_FILTER);
}

function uploadUrl(resourceType, field) {
  const [entityType, bundle] = String(resourceType).split("--");
  const path = bundle ? `${entityType}/${bundle}` : entityType;
  return `/jsonapi/${path}/${field}`;
}
function safeFilename(name) {
  const cleaned = String(name || "upload").replace(/[\r\n]/g, "").replace(/["\\]/g, "").split(/[/\\]/).pop().trim();
  return cleaned || "upload";
}
function uploadHeaders(filename) {
  return {
    // Not the JSON:API media type: this request is the bytes themselves.
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `file; filename="${safeFilename(filename)}"`,
    Accept: "application/vnd.api+json"
  };
}

async function uploadImage(file, options) {
  const { backendUrl, resourceType, field, request, hold } = options || {};
  const held = async () => {
    const dataUrl = await readAsDataUrl(file);
    if (typeof hold === "function") hold(file, dataUrl);
    return { default: dataUrl, held: true };
  };
  if (!field || !request) return held();
  let response;
  try {
    response = await request.post(uploadUrl(resourceType, field), file, {
      headers: uploadHeaders(file.name)
    });
  } catch (error) {
    const status = ((error || {}).response || {}).status;
    if (status === 401 || status === 403) return held();
    throw new Error(uploadReason(error));
  }
  const data = (response.data || {}).data || {};
  const url = ((data.attributes || {}).uri || {}).url || (data.attributes || {}).url || "";
  return { default: absolute(url, backendUrl), uuid: data.id || "" };
}
function uploadReason(error) {
  const response = (error || {}).response || {};
  const first = (((response.data || {}).errors || [])[0] || {}).detail;
  if (first) return first;
  if (response.status) return `The image was refused with ${response.status}.`;
  return (error || {}).message || "The image upload failed.";
}
function absolute(url, backendUrl) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${String(backendUrl).replace(/\/+$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}
class DrupalImageCompatibility {
  constructor(editor) {
    this.editor = editor;
  }
  afterInit() {
    allowEntityAttributes(this.editor);
  }
}
function imageUploadAdapter(options) {
  const current = () => typeof options === "function" ? options() : options;
  return class DecoupledImageUpload {
    constructor(editor) {
      this.editor = editor;
    }
    init() {
      this.editor.plugins.get("FileRepository").createUploadAdapter = (loader) => ({
        async upload() {
          return uploadImage(await loader.file, current());
        },
        // Nothing to call off: the request is already in flight or it is not.
        abort() {
        }
      });
    }
    afterInit() {
      recordUploadedUuid(this.editor);
    }
  };
}
function allowEntityAttributes(editor) {
  const elements = ["imageBlock", "imageInline"].filter(
    (name) => editor.model.schema.isRegistered(name)
  );
  if (!elements.length) return;
  for (const element of elements) {
    editor.model.schema.extend(element, {
      allowAttributes: ["dataEntityType", "dataEntityUuid"]
    });
  }
  for (const [model, view] of [
    ["dataEntityType", "data-entity-type"],
    ["dataEntityUuid", "data-entity-uuid"]
  ]) {
    editor.conversion.for("upcast").attributeToAttribute({ view, model });
    editor.conversion.for("downcast").add(
      (dispatcher) => dispatcher.on(`attribute:${model}`, (event, data, api) => {
        if (!api.consumable.consume(data.item, event.name)) return;
        const figure = api.mapper.toViewElement(data.item);
        const image = figure && [...figure.getChildren()].find((c) => c.is("element", "img"));
        const target = image || figure;
        if (!target) return;
        if (data.attributeNewValue === null) {
          api.writer.removeAttribute(view, target);
        } else {
          api.writer.setAttribute(view, data.attributeNewValue, target);
        }
      })
    );
  }
}
function recordUploadedUuid(editor) {
  const uploads = editor.plugins.has("ImageUploadEditing") && editor.plugins.get("ImageUploadEditing");
  if (!uploads) return;
  uploads.on("uploadComplete", (event, { data, imageElement }) => {
    if (!data || !data.uuid) return;
    editor.model.change((writer) => {
      writer.setAttribute("dataEntityType", "file", imageElement);
      writer.setAttribute("dataEntityUuid", data.uuid, imageElement);
    });
  });
}
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

const SUPPORTED = /* @__PURE__ */ new Set([...SUPPORTED_BUTTONS, "|"]);
const ALIASES = {
  drupalInsertImage: "uploadImage"
};
const FALLBACK_TOOLBAR = [
  "heading",
  "|",
  "bold",
  "italic",
  "link",
  "|",
  "bulletedList",
  "numberedList",
  "|",
  "blockQuote",
  "|",
  "undo",
  "redo"
];
function editorForFormat(resources, format) {
  if (!Array.isArray(resources) || !format) return null;
  return resources.find(
    (r) => ((r || {}).attributes || {}).drupal_internal__format === format
  ) || null;
}
function usableToolbar(configured) {
  if (!Array.isArray(configured) || !configured.length) return [];
  const named = configured.map((item) => ALIASES[item] || item);
  const supported = named.filter((item) => SUPPORTED.has(item));
  const tidied = supported.filter(
    (item, i, all) => !(item === "|" && (i === 0 || all[i - 1] === "|"))
  );
  while (tidied.length && tidied[tidied.length - 1] === "|") tidied.pop();
  return tidied;
}
function toolbarFor(resources, format) {
  const editor = editorForFormat(resources, format);
  const items = (((editor || {}).attributes || {}).settings || {}).toolbar;
  const usable = usableToolbar((items || {}).items || null);
  return usable.length ? usable : [...FALLBACK_TOOLBAR];
}
async function configuredToolbar(store, format) {
  if (!store) return [];
  try {
    const collection = await store.dispatch("druxt/getCollection", {
      type: "editor--editor"
    });
    const editor = editorForFormat((collection || {}).data, format);
    const items = (((editor || {}).attributes || {}).settings || {}).toolbar;
    return usableToolbar((items || {}).items);
  } catch (e) {
    return [];
  }
}

const DEFAULTS = {
  scripts: null,
  copy: false,
  packages: DEFAULT_PACKAGES,
  files: { from: DRUPAL_FILES, to: null },
  toolbars: {},
  filters: {},
  image: {
    toolbar: [
      "imageTextAlternative",
      "toggleImageCaption",
      "|",
      "imageStyle:inline",
      "imageStyle:block",
      "imageStyle:side"
    ]
  },
  timeout: 15e3
};
function resolveOptions(moduleOptions = {}, nuxtOptions = {}) {
  const configured = {
    ...(nuxtOptions.druxt || {}).ckeditor || {},
    ...moduleOptions
  };
  const options = {
    ...DEFAULTS,
    ...configured,
    files: { ...DEFAULTS.files, ...configured.files || {} },
    image: { ...DEFAULTS.image, ...configured.image || {} }
  };
  if (options.copy && !options.scripts) options.scripts = COPY_PATH;
  return options;
}
const NuxtModule = function(moduleOptions = {}) {
  const options = resolveOptions(moduleOptions, this.options);
  this.extendBuild((config, { isClient }) => {
    if (isClient) config.node = { ...config.node || {}, fs: "empty" };
  });
  this.nuxt.hook("components:dirs", (dirs) => {
    dirs.push({ path: path.join(__dirname, "components") });
  });
  if (options.copy) {
    const fs = require("fs");
    const sources = presentSources(
      scriptSources(options.copy, options.packages, {
        rootDir: this.options.rootDir,
        resolveModule: (request) => this.nuxt.resolver.resolveModule(request)
      }),
      { exists: fs.existsSync }
    );
    this.addServerMiddleware({
      path: COPY_PATH,
      handler: scriptMiddleware(sources, { read: fs.createReadStream })
    });
    this.nuxt.hook("generate:distCopied", (generator) => {
      copyScripts(sources, path.join(generator.distPath, COPY_PATH), {
        copy: fs.copyFileSync,
        mkdir: fs.mkdirSync
      });
    });
  }
  this.addPlugin({
    src: path.resolve(__dirname, "../templates/plugin.js"),
    fileName: "druxt-ckeditor.js",
    options: { ...options, copy: Boolean(options.copy) }
  });
};

exports.ALIASES = ALIASES;
exports.BUTTON_PLUGINS = BUTTON_PLUGINS;
exports.CAPTION_FILTER = CAPTION_FILTER;
exports.COPY_PATH = COPY_PATH;
exports.CORE = CORE;
exports.DEFAULTS = DEFAULTS;
exports.DEFAULT_PACKAGES = DEFAULT_PACKAGES;
exports.DRUPAL_FILES = DRUPAL_FILES;
exports.DrupalImageCompatibility = DrupalImageCompatibility;
exports.FALLBACK_TOOLBAR = FALLBACK_TOOLBAR;
exports.SCRIPTS_PATH = SCRIPTS_PATH;
exports.SUPPORTED = SUPPORTED;
exports.SUPPORTED_BUTTONS = SUPPORTED_BUTTONS;
exports.absolute = absolute;
exports.captionsAreAttributes = captionsAreAttributes;
exports.configuredToolbar = configuredToolbar;
exports.createCkeditor = createCkeditor;
exports.decodeAttribute = decodeAttribute;
exports["default"] = NuxtModule;
exports.editorFileUrls = editorFileUrls;
exports.editorForFormat = editorForFormat;
exports.editorPlugins = editorPlugins;
exports.encodeAttribute = encodeAttribute;
exports.filtersFor = filtersFor;
exports.filtersFromResources = filtersFromResources;
exports.fromEditorCaptions = fromEditorCaptions;
exports.imageUploadAdapter = imageUploadAdapter;
exports.isDrupalFile = isDrupalFile;
exports.loadCkeditor = loadCkeditor;
exports.loadScript = loadScript;
exports.readAsDataUrl = readAsDataUrl;
exports.resetLoader = resetLoader;
exports.resolveOptions = resolveOptions;
exports.resolvePlugins = resolvePlugins;
exports.rewriteFileUrls = rewriteFileUrls;
exports.safeFilename = safeFilename;
exports.scriptUrl = scriptUrl;
exports.storedFileUrls = storedFileUrls;
exports.toEditorCaptions = toEditorCaptions;
exports.toolbarFor = toolbarFor;
exports.uploadHeaders = uploadHeaders;
exports.uploadImage = uploadImage;
exports.uploadUrl = uploadUrl;
exports.usableToolbar = usableToolbar;
