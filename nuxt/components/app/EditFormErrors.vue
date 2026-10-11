<template>
  <div v-if="errors.length" class="edit-form__alert" role="alert">
    <strong>
      {{
        pointed.length
          ? $tc('form.needsAttention', pointed.length, { n: pointed.length })
          : $t('form.saveFailed')
      }}
    </strong>
    <template v-for="(id, i) of pointed">
      <a :key="id" :href="`#${id}`">{{ fields[id] || id }}</a
      ><span v-if="i < pointed.length - 1" :key="`${id}-sep`"> · </span>
    </template>
    <p v-for="(detail, i) of general" :key="`g-${i}`" class="mb-0">
      {{ detail }}
    </p>
  </div>
</template>

<script>
/**
 * The summary at the top of a form: one line naming the fields Drupal
 * rejected, linked down to them, and any message that names no field.
 */
export default {
  props: {
    errors: { type: Array, default: () => [] },
    fields: { type: Object, default: () => ({}) },
  },

  computed: {
    pointed: ({ errors }) => [
      ...new Set(
        errors
          .map((e) => ((e.source || {}).pointer || '').split('/')[3])
          .filter(Boolean)
      ),
    ],
    general: ({ errors }) =>
      errors
        .filter((e) => !((e.source || {}).pointer || '').split('/')[3])
        .map((e) => e.detail || e.title)
        .filter(Boolean),
  },
}
</script>
