// Primary Druxt component types.
const components = ['block', 'breadcrumb', 'entity', 'field', 'menu', 'router', 'view'].map(type => ({
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

// DruxtBlockSystem components.
components.push({
  path: '~/components/druxt/block/system',
  prefix: 'druxt-block-system',
  global: true
})

// Druxt components.
components.push({
  path: '~/components/druxt',
  prefix: 'druxt',
  global: true
})

export default components
