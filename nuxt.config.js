const baseUrl = process.env.BASE_URL

export default {
  target: 'static',

  // Global page headers (https://go.nuxtjs.dev/config-head)
  head: {
    title: 'demo.druxtjs.org',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      {
        rel: 'stylesheet',
        href: 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css',
      },
    ],
  },

  // Global CSS (https://go.nuxtjs.dev/config-css)
  css: [],

  // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
  plugins: [],

  // Auto import components (https://go.nuxtjs.dev/config-components)
  components: true,

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
  ],

  publicRuntimeConfig: {
    baseUrl,
  },

  // Modules (https://go.nuxtjs.dev/config-modules)
  modules: [
    // '@nuxtjs/auth-next',
    '@nuxtjs/axios',
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
    // DruxtJS Site.
    'druxt-site',
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
    blocks: {
      query: { fields: [] },
    },
    entity: {
      components: { fields: false },
      query: { schema: true },
    },
    menu: {
      query: { requiredOnly: true },
    },
    proxy: {
      api: process.env.API_PROXY === '1',
    },
    views: {
      query: { bundleFilter: true },
    },
  },

  proxy: {
    '/en/jsonapi': baseUrl,
    '/es/jsonapi': baseUrl,
  },

  // Build Configuration (https://go.nuxtjs.dev/config-build)
  build: {
    extend(config) {
      config.resolve.alias.vue$ = 'vue/dist/vue.esm.js'
    },

    extractCSS: true,
  },

  storybook: {},

  telemetry: true,
}
