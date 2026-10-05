/**
 * The props every form widget receives from DruxtField, and the label,
 * description and error state the design draws around every control.
 */
/** Drupal's form display carries no label for a base field. */
const BASE_LABELS = {
  created: 'Authored on',
  langcode: 'Language',
  path: 'URL alias',
  status: 'Published',
  title: 'Title',
  uid: 'Author',
}

export default {
  props: {
    errors: { type: Array, default: () => [] },
    relationship: { type: Boolean, default: false },
    schema: { type: Object, default: () => ({}) },
    value: {
      type: [Array, Boolean, Number, Object, String],
      default: undefined,
    },
  },

  computed: {
    id: ({ schema }) => schema.id,

    /** Drupal's label, or the machine name made readable. */
    label: ({ schema }) =>
      ((schema || {}).label || {}).text ||
      BASE_LABELS[schema.id] ||
      (schema.id || '')
        .replace(/^field_/, '')
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase()),

    description: ({ schema }) => schema.description || '',
    required: ({ schema }) => !!schema.required,
    multiple: ({ schema }) => (schema.cardinality || 1) !== 1,

    /** The messages Drupal sent for this field, without its "field: " prefix. */
    feedback: ({ errors }) =>
      (errors || [])
        .map((error) => (error.detail || '').replace(/^[\w.]+: /, ''))
        .filter(Boolean),

    state: ({ feedback }) => (feedback.length ? false : null),
  },
}
