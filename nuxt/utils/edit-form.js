/** What every node form shares: the form it belongs to and its errors. */
export default {
  computed: {
    errors: ({ $parent }) => $parent.errors || [],
    submitting: ({ $parent }) => $parent.submitting,
    fieldLabels: ({ $parent }) =>
      Object.fromEntries(
        (($parent.schema || {}).fields || []).map((f) => [
          f.id,
          (f.label || {}).text || f.id,
        ])
      ),
  },
}
