export default {
  parameters: {
    viewport: {
      viewports: {
        xs: {
          name: 'XS',
          styles: {
            width: '480px',
            height: '100%',
          },
        },
        s: {
          name: 'S',
          styles: {
            width: '576px',
            height: '100%',
          },
        },
        m: {
          name: 'M',
          styles: {
            width: '768px',
            height: '100%',
          },
        },
        l: {
          name: 'L',
          styles: {
            width: '992px',
            height: '100%',
          },
        },
        xl: {
          name: 'XL',
          styles: {
            width: '1200px',
            height: '100%',
          },
        },
        xxl: {
          name: 'XXL',
          styles: {
            width: '1920px',
            height: '100%',
          },
        },
      },
    },
    layout: 'fullscreen',
  },
  stories: [
    '~/stories/**/*.stories.mdx',
    '~/components/**/*.stories.js',
    '~/layouts/**/*.stories.js',
    '~/pages/**/*.stories.js',
  ],

  /**
   * The vendored Druxt packages ship their Nuxt module beside their
   * components in one bundle, and the module reads the file system. Nuxt's
   * own build leaves that require alone; Storybook's webpack has to be told
   * the browser has no `fs`.
   */
  webpackFinal(config) {
    config.node = { ...(config.node || {}), fs: 'empty' }
    return config
  },
}
