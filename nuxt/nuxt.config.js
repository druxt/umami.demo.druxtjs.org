import storybook from './nuxt-storybook.config'
import { drupalOrigin, siteOrigin } from './lib/site'

const baseUrl = process.env.BASE_URL || 'http://druxt-js-demo-umami.ddev.site'

export default {
  target: 'static',

  generate: {
    // The start script builds beside the served copy, then swaps it in.
    dir: process.env.GENERATE_DIR || 'dist',
    routes: [
      // Drupal names each language's front page /node; a visit there is a
      // page, not a client-side render.
      '/en/node',
      '/es/node',
      '/node/preview/card',
      '/node/preview/card_common',
      '/node/preview/card_common_alt',
      '/node/preview/default',
      '/node/preview/full',
      '/node/preview/rss',
      '/node/preview/teaser',
    ],
  },

  // Global page headers (https://go.nuxtjs.dev/config-head)
  head: {
    __dangerouslyDisableSanitizersByTagID: {
      fonts: ['onload'],
      'fonts-noscript': ['innerHTML'],
    },
    title: 'Umami — a decoupled food magazine, built with DruxtJS',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description',
        name: 'description',
        content:
          'A demonstration food magazine: Drupal Umami content rendered by Nuxt with DruxtJS.',
      },
    ],
    noscript: [
      {
        hid: 'fonts-noscript',
        innerHTML:
          '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">',
      },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      // llms.txt discovery (https://llmstxt.org): every page points at the
      // index that covers it. The server sends the same as a Link header.
      { rel: 'describedby', type: 'text/markdown', href: '/llms.txt' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: true,
      },
      // The fonts load beside the first paint, not before it: preloaded, then
      // switched to a stylesheet once fetched. Without scripts the plain
      // link below applies.
      {
        hid: 'fonts',
        rel: 'preload',
        as: 'style',
        href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
        onload: "this.onload=null;this.rel='stylesheet'",
        // Once its rel has changed the tag no longer matches its definition,
        // and vue-meta would swap in a fresh preload on every navigation,
        // dropping the fonts until it loads again.
        once: true,
      },
      {
        rel: 'stylesheet',
        href: 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css',
      },
    ],
  },

  // Global CSS (https://go.nuxtjs.dev/config-css)
  // The editorial theme layer. Requires `sass` + `sass-loader` as devDeps.
  css: ['~/assets/scss/theme.scss'],

  // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
  plugins: [
    // First, so it sees every error that follows.
    { src: '~/plugins/error-log.client.js' },
    // The frontend's own words, in the page's language.
    { src: '~/plugins/i18n.js' },
    { src: '~/plugins/vuex-persistedstate.client.js' },
    // Tags every Druxt component for the dev overlay.
    { src: '~/plugins/druxt-inspector.client.js' },
    // Keeps and previews an editor's unsaved changes.
    { src: '~/plugins/edit-drafts.client.js' },
    // An entity with an unsaved draft is not refetched on a live update.
    { src: '~/plugins/live-drafts.client.js' },
    // Marks a draft's changes in the page, word by word.
  ],

  // Auto import components (https://go.nuxtjs.dev/config-components)
  // `~/components/app` is flattened so the promo components are usable as
  // <AppDemoBar />, <AppDruxtNote />, <AppDruxtInspector /> and so on.
  components: [
    '~/components',
    { path: '~/components/app', prefix: 'App', pathPrefix: false },
  ],

  // Modules for dev and build (recommended) (https://go.nuxtjs.dev/config-modules)
  buildModules: [
    // https://go.nuxtjs.dev/eslint
    '@nuxtjs/eslint-module',
    ['@nuxtjs/google-analytics', { id: 'UA-172677199-2' }],
    // https://go.nuxtjs.dev/stylelint
    '@nuxtjs/stylelint-module',
    // The demo's share links and commands, from Drupal's config page. The
    // wrapper lets a build outlive a page that is not there yet.
    '~/modules/config-pages',
    // Custom Search API Lunr module.
    [
      '~/modules/search-api-lunr',
      {
        server: 'druxt',
        index: 'default',
      },
    ],
    // DruxtJS Site.
    'druxt-site',
    // Drupal's own CKEditor 5, mounted on the edit form's text fields.
    '@druxt-contrib/ckeditor',
    // Drupal's admin paths hand through to the backend.
    '@druxt-contrib/admin',
  ],

  publicRuntimeConfig: {
    // The browser builds file and logo URLs from this. A preview generated
    // against a throwaway backend sets PUBLIC_BASE_URL to a host that outlives
    // the build. Empty makes them same-origin, through the frontend's proxy.
    baseUrl: process.env.PUBLIC_BASE_URL ?? baseUrl,
    // The origin the head names in canonical links and share tags.
    siteOrigin: siteOrigin(),
    // Drupal's public origin: where the admin paths hand through to.
    drupalOrigin: drupalOrigin(),
  },

  // Modules (https://go.nuxtjs.dev/config-modules)
  modules: [
    // Nuxt.js Lunr.
    [
      '@nuxtjs/lunr-module',
      {
        // A path of its own per build: the index carries no hash, and a
        // browser that once cached a page in its place keeps it for a year.
        path: `search-index-${Date.now().toString(36)}`,
        // An index per language, stemmed for it.
        languages: ['en', 'es'],
        // Drupal's field names, as the Search API export sends them; the tag
        // and category names let "drinks" find what is tagged Drinks.
        fields: [
          'title',
          'field_body',
          'field_ingredients',
          'field_recipe_instruction',
          'field_tags',
          'field_recipe_category',
        ],
      },
    ],
    // https://go.nuxtjs.dev/bootstrap
    'bootstrap-vue/nuxt',
    // The word diff behind the marks on a drafted page.
    '@druxt-contrib/diff',
    '~/modules/storybook-proxy',
    // Live updates on /_live: open pages refresh when Drupal purges. It
    // attaches under `nuxt dev`; start.js attaches it in production.
    '@druxt-contrib/sockets',
    // Editors sign in on the site: the password grant through the Druxt
    // consumer, with the authorization code flow kept for a browser sent to
    // Drupal. The token route the grant posts to is the module's own under
    // `nuxt dev`, and server/start.js's on the generated site.
    // The password grant also opens a Drupal session, through the proxied
    // /user/login on this origin, so Drupal's own screens open signed in.
    [
      'druxt-auth',
      {
        clientId: process.env.OAUTH_CLIENT_ID || 'umami_druxt',
        passwordSession: true,
      },
    ],
    // Last: it puts the site's page on the router's routes, which exist
    // once the modules above have added them. It also writes robots.txt,
    // sitemap.xml, llms.txt and llms-full.txt into the export.
    '~/modules/admin-routes',
    '~/modules/seo-files',
  ],

  sockets: {
    path: '/_live',
  },

  auth: {
    redirect: {
      callback: '/callback',
      // Signing in leaves the reader where they are: the dialog stays on the
      // page, and /login sends them on itself.
      home: false,
      logout: '/',
    },
    strategies: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        scope: false,
      },
    },
  },

  bootstrapVue: {
    bootstrapCSS: false,
    components: ['BBadge', 'BButton', 'BCollapse', 'BImg', 'BLink'],
    componentPlugins: [
      'BreadcrumbPlugin',
      'CardPlugin',
      'FormPlugin',
      'FormGroupPlugin',
      'FormInputPlugin',
      'FormSelectPlugin',
      'FormTextareaPlugin',
      'InputGroupPlugin',
      'LayoutPlugin',
      'ListGroupPlugin',
      'ModalPlugin',
      'NavbarPlugin',
      'SidebarPlugin',
      'SpinnerPlugin',
      // The save confirmation.
      'ToastPlugin',
    ],
  },

  // Druxt Configuration
  druxt: {
    // Drupal's admin is served on this origin, by server/start.js through
    // druxt-admin's proxy, so its links stay here.
    admin: { mode: 'proxy' },

    // The config page the share links come from: $druxtConfigPages.get('druxt_demo').
    configPages: { pages: ['druxt_demo'] },
    baseUrl,

    // Druxt Blocks module settings.
    blocks: {
      // Filter out all fields by default.
      query: { fields: [] },
    },

    // Druxty Entity module settings.
    entity: {
      // Disable deprecated fields.
      components: { fields: false },
      // Enable schema filter by default.
      query: { schema: true },
    },

    // Druxt Menu module settings.
    menu: {
      // Filter DruxtMenu required fields only.
      query: { requiredOnly: true },
    },

    // Druxt proxy settings.
    proxy: {
      // Enable API proxy based on environment variable.
      api: process.env.API_PROXY === '1',
    },

    // The editor's scripts and the pictures in a body come through the
    // site's own origin, which proxies Drupal's core and files paths.
    ckeditor: {
      scripts: '/core/assets/vendor/ckeditor5',
      files: { from: '/sites/default/files/', to: '/sites/default/files/' },
    },

    // Druxt Router module settings.
    router: {
      // Disable middleware/redirect support.
      // middleware: false
    },

    // Druxt Views module settings.
    views: {
      // Filter fields based on query bundle information if available.
      query: { bundleFilter: true },
    },
  },

  proxy: {
    '/en/jsonapi': baseUrl,
    '/es/jsonapi': baseUrl,
    '/core/assets': baseUrl,
    // The demo's reset route, druxt_umami's, called with the editor's token.
    '/druxt-umami': baseUrl,
  },

  // Build Configuration (https://go.nuxtjs.dev/config-build)
  build: {
    // druxt-admin's operations helper is an ES module, which the server
    // bundle would otherwise hand to Node's require().
    transpile: ['defu', '@druxt-contrib/admin'],

    extend(config) {
      config.resolve.alias.vue$ = 'vue/dist/vue.esm.js'
      // The server bundle leaves node_modules to Node, so auth-next's
      // runtime, an ES module the bundle does carry, was handed Nuxt's own
      // defu 6 as a CommonJS external, which has no default export. Bundled
      // (see `transpile`) and pointed at the ES build, both the default and
      // the named import every importer here uses are there.
      config.resolve.alias.defu$ = require('path').join(
        require('path').dirname(require.resolve('defu')),
        'defu.mjs'
      )
    },

    extractCSS: true,
  },

  storybook,

  telemetry: true,
}
