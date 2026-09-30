/**
 * What the dev overlay knows about a Druxt component: its kind, the label it
 * shows, and the file in this repository that rendered it.
 */

const REPO = 'https://github.com/druxt/umami.demo.druxtjs.org/blob/main/nuxt/'
const DOCS = 'https://druxtjs.org/modules/'

/** Druxt module components, by the name each declares, and their docs page. */
export const KINDS = {
  DruxtRouter: { kind: 'router', docs: 'router' },
  DruxtBlockRegion: { kind: 'region', docs: 'blocks' },
  DruxtBlock: { kind: 'block', docs: 'blocks' },
  DruxtMenu: { kind: 'menu', docs: 'menu' },
  DruxtBreadcrumb: { kind: 'block', docs: 'breadcrumb' },
  DruxtView: { kind: 'view', docs: 'views' },
  DruxtEntity: { kind: 'entity', docs: 'entity' },
  DruxtEntityForm: { kind: 'form', docs: 'entity' },
  DruxtField: { kind: 'field', docs: 'entity' },
}

/** Files and media sit inside every image; like fields, they label on hover. */
const HOVER_TYPES = /^(file|media)--/

const pascal = (part) =>
  part
    .split(/[-_ ]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')

/**
 * Override files by the component name Nuxt gives them, so a resolved name
 * like `DruxtEntityNodeRecipeCard` links to its file. Built from the file
 * list alone; no component is loaded.
 */
const OVERRIDES = (() => {
  const map = {}
  try {
    const context = require.context(
      '~/components/druxt',
      true,
      /\.vue$/,
      'lazy'
    )
    for (const key of context.keys()) {
      const file = key.replace(/^\.\//, '')
      const parts = file.replace(/\.vue$/, '').split('/')
      map[['Druxt', ...parts].map(pascal).join('')] = `components/druxt/${file}`
    }
  } catch (e) {
    // Outside webpack there is no context; labels still work, links go to the docs.
  }
  return map
})()

/** The repository file behind a resolved component name, if it is an override. */
export const sourceOf = (name) => OVERRIDES[name] || ''

const attr = (name, value) => (value ? ` ${name}="${value}"` : '')

/** The distinguishing props, in the order a template would write them. */
const propsOf = (vm, kind) => {
  switch (kind) {
    case 'router':
      return attr('path', vm.path || (vm.$route || {}).path)
    case 'region':
      return attr('name', vm.name)
    case 'block': {
      const block = vm.block || {}
      const plugin = (block.attributes || {}).plugin
      return (
        attr('id', vm.id || (block.attributes || {}).drupal_internal__id) +
        attr('plugin', plugin)
      )
    }
    case 'menu':
      return attr('name', vm.name) + attr('parent-id', vm.parentId)
    case 'view':
      return attr('view-id', vm.viewId) + attr('display-id', vm.displayId)
    case 'entity':
    case 'form':
      return attr('type', vm.type) + attr('mode', vm.mode)
    case 'field': {
      const schema = vm.schema || {}
      return attr('name', schema.id) + attr('type', schema.type)
    }
    default:
      return ''
  }
}

/**
 * The label and link for one mounted Druxt component, or null when the
 * component is not a Druxt module.
 */
export const describe = (vm) => {
  const name = (vm.$options || {}).name
  const meta = KINDS[name]
  if (!meta) return null

  const resolved = ((vm.component || {}).is || '').replace(/^DruxtWrapper$/, '')
  const source = sourceOf(resolved)
  return {
    kind: meta.kind,
    // Fields are many, and every image is a media entity around a file:
    // these label on hover, the rest always.
    hover: meta.kind === 'field' || HOVER_TYPES.test(vm.type || ''),
    label: `${name}${propsOf(vm, meta.kind)}`,
    // What rendered it: the override file, or Druxt's own template.
    detail: source ? `→ ${resolved}` : resolved ? `→ ${resolved} (druxt)` : '',
    href: source ? REPO + source : DOCS + meta.docs,
  }
}
