import storybook from './nuxt-storybook.config'

const baseUrl = process.env.BASE_URL || 'http://druxt-js-demo-umami.ddev.site'

export default {
  target: 'static',

  generate: {
    routes: [
      // Not linked from any crawlable page, so the generator cannot discover
      // it and the route 404s in the static build unless it is listed here.
      '/entity-explorer',
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
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: true,
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
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
  plugins: [{ src: '~/plugins/vuex-persistedstate.client.js' }],

  // Auto import components (https://go.nuxtjs.dev/config-components)
  // Every component in `~/components/app` takes the `App` prefix, so they are
  // used as <AppDemoBar />, <AppDevRegion />, <AppDruxtNote /> and so on.
  // pathPrefix is off so the directory name is not repeated in the tag.
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
  ],

  publicRuntimeConfig: {
    baseUrl,
  },

  // Modules (https://go.nuxtjs.dev/config-modules)
  modules: [
    // Nuxt.js Lunr.
    [
      '@nuxtjs/lunr-module',
      {
        fields: [
          'title',
          'body',
          'field_ingredients',
          'field_recipe_instruction',
        ],
      },
    ],
    // https://go.nuxtjs.dev/bootstrap
    'bootstrap-vue/nuxt',
    '~/modules/storybook-proxy',
  ],

  auth: {
    redirect: {
      callback: '/callback',
      logout: '/',
    },
    strategies: {
      drupal: {
        scheme: 'oauth2',
        endpoints: {
          authorization: baseUrl + '/oauth/authorize',
          token: baseUrl + '/oauth/token',
          userInfo: baseUrl + '/oauth/userinfo',
        },
        clientId: process.env.OAUTH_CLIENT_ID,
      },
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
    ],
  },

  // Druxt Configuration
  druxt: {
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
  },

  // Serve from a subdirectory when previewing. GitLab Pages publishes each
  // branch under /<project>/<branch-slug>/, and without this every /_nuxt/
  // asset resolves to the domain root and 404s. Unset in production.
  router: {
    base: process.env.ROUTER_BASE || '/',
  },

  // Build Configuration (https://go.nuxtjs.dev/config-build)
  build: {
    extend(config) {
      config.resolve.alias.vue$ = 'vue/dist/vue.esm.js'
    },

    extractCSS: true,

    // vue-live ships modern syntax (nullish coalescing, optional chaining).
    // Nuxt 2's webpack 4 build excludes node_modules from babel, so it has to
    // be transpiled explicitly or the entity explorer fails to compile.
    transpile: ['vue-live'],
  },

  storybook,

  telemetry: true,
}
