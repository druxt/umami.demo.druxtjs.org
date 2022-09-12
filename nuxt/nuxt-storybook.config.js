export default {
  parameters: {
    viewport: {
      viewports: {
        xs: {
          name: 'XS',
          styles: {
            width: '480px',
            height: '100%'
          }
        },
        s: {
          name: 'S',
          styles: {
            width: '576px',
            height: '100%'
          }
        },
        m: {
          name: 'M',
          styles: {
            width: '768px',
            height: '100%'
          }
        },
        l: {
          name: 'L',
          styles: {
            width: '992px',
            height: '100%'
          }
        },
        xl: {
          name: 'XL',
          styles: {
            width: '1200px',
            height: '100%'
          }
        },
        xxl: {
          name: 'XXL',
          styles: {
            width: '1920px',
            height: '100%'
          }
        }
      }
    },
    layout: 'fullscreen'
  },
  stories: [
    '~/stories/**/*.stories.mdx',
    '~/components/**/*.stories.js',
    '~/layouts/**/*.stories.js',
    '~/pages/**/*.stories.js',
  ],
}
