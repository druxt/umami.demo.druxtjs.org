// Primary Druxt component types.
const components = ['block', 'entity', 'field', 'view'].map(type => ({
  path: `~/components/druxt/${type}`,
  prefix: `druxt-${type}`,
  global: true
}))

// DruxtBlockRegion components.
components.push({
  path: '~/components/druxt/region',
  prefix: 'druxt-block-region',
  global: true
})

export default components
