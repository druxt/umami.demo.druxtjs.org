import { diffable } from '@druxt-contrib/diff'

/**
 * A field's value as words: the text of its HTML, a list joined by lines.
 * The marks compare words, and Drupal's copy of a text is plain where the
 * editor's carries paragraph tags.
 */
export function plain(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(plain).join('\n')
  if (typeof value === 'object') {
    return plain('value' in value ? value.value : value.title)
  }
  const text = String(value)
  if (typeof document === 'undefined' || !/<[a-z!/]/i.test(text)) return text
  const template = document.createElement('template')
  template.innerHTML = text.replace(/<\/(p|li|h[1-6]|div|br)>/gi, '$&\n')
  return template.content.textContent
}

/** What a relationship points at, as ids. */
const pointsAt = (value) => {
  const data = (value || {}).data
  return (Array.isArray(data) ? data : data ? [data] : [])
    .map((o) => o.id)
    .join(', ')
}

/** The first store copy of a resource, whichever language prefix holds it. */
const stored = (store, type, id) => {
  const byPrefix = (((store || {}).state || {}).druxt || {}).resources || {}
  const doc = Object.values((byPrefix[type] || {})[id] || {}).find(
    (o) => o && o.data
  )
  return (doc || {}).data
}

/** The file a media reference points at, as the frontend serves it. */
export function fileOfMedia(store, value, baseUrl = '') {
  const media = ((value || {}).data || {}).id
    ? value.data
    : ((value || {}).data || [])[0]
  const image = media && media.id && stored(store, media.type, media.id)
  const ref = ((image || {}).relationships || {}).field_media_image || {}
  const file = (ref.data || {}).id && stored(store, ref.data.type, ref.data.id)
  const url = (((file || {}).attributes || {}).uri || {}).url
  return url ? baseUrl + url : null
}

/** The entity a field wrapper renders: the nearest DruxtEntity above it. */
export const entityOf = (vm) => {
  for (let p = vm.$parent; p; p = p.$parent) {
    if (p.$options.name === 'DruxtEntity' && p.uuid && p.type) {
      return { type: p.type, id: p.uuid, langcode: p.lang || 'en' }
    }
  }
  return null
}

/**
 * The diff package's `diffable` for this site's field wrappers, which get
 * no entity of their own: the entity is the DruxtEntity rendering them.
 */
export const draftDiffable = {
  mixins: [diffable],
  computed: {
    diffUuid() {
      const entity = entityOf(this)
      return entity ? entity.id : null
    },
  },
  methods: {
    /**
     * A field's diff for `v-diff`, on an element whose text Vue sets whole
     * (`v-text`, `v-html`): the directive rewrites the element's text nodes,
     * and anything Vue patches piecemeal inside it would go stale. A
     * reference has ids, not words, so it gets no inline mark.
     */
    textDiff(name) {
      const type = ((this.schema || {}).type || '').toLowerCase()
      if (/reference|image|media|file/.test(type)) return null
      return this.fieldDiff(name)
    },
  },
}

/** What a relationship held before the draft, for a chip that shows it. */
export function previousOf(drafts, entity, name) {
  if (!drafts || !entity) return null
  const draft = drafts.draftFor(entity.type, entity.id, entity.langcode || 'en')
  return (((draft || {}).before || {}).relationships || {})[name] || null
}

/**
 * A draft as the diff host reads it: one block for the entity, with every
 * field the draft changed as Drupal's words against the draft's. A
 * relationship has no words, so its sides are the ids it points at. Null
 * while the page shows Drupal's version, or the editor has not asked for
 * the marks, so the same value covers "nothing to show".
 */
export function draftDocument(drafts, entity, labelOf = (name) => name) {
  if (!drafts || !entity || !entity.type || !entity.id) return null
  const { type, id } = entity
  const langcode = entity.langcode || 'en'
  if (
    !drafts.isMarking(type, id, langcode) ||
    drafts.isReal(type, id, langcode)
  ) {
    return null
  }
  const draft = drafts.draftFor(type, id, langcode)
  if (!draft) return null
  const before = draft.before || {}
  const fields = {}
  for (const [name, value] of Object.entries(draft.attributes || {})) {
    const left = plain((before.attributes || {})[name])
    const right = plain(value)
    if (left !== right) {
      fields[name] = { label: labelOf(name), status: 'changed', left, right }
    }
  }
  for (const [name, value] of Object.entries(draft.relationships || {})) {
    const left = pointsAt((before.relationships || {})[name])
    const right = pointsAt(value)
    if (left !== right) {
      fields[name] = { label: labelOf(name), status: 'changed', left, right }
    }
  }
  if (!Object.keys(fields).length) return null
  const side = { type, id }
  const block = `${id}:${id}:${id}`
  const diff = 'jsonapi_diff--diff'
  return {
    data: {
      type: diff,
      id: 'draft:draft:draft',
      attributes: { fields: {} },
      relationships: {
        left: { data: { ...side, meta: {} } },
        right: { data: { ...side, meta: { staged: true } } },
        children: {
          data: [
            {
              type: diff,
              id: block,
              meta: {
                field: null,
                left_delta: 0,
                right_delta: 0,
                status: 'same',
              },
            },
          ],
        },
      },
    },
    included: [
      {
        type: diff,
        id: block,
        attributes: { fields },
        relationships: { left: { data: side }, right: { data: side } },
      },
    ],
  }
}
