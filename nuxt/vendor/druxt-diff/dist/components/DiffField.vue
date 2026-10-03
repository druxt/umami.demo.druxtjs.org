<template>
  <div class="diff-field">
    <p class="text-xs font-medium text-base-content/60 mb-1">
      {{ field.label }}
    </p>
    <!-- A field whose value is a formatter's markup (a date's <time>) is not word-diffed: a word diff over tags highlights nonsense. -->
    <p v-if="markup" class="text-xs leading-relaxed">
      <span class="diff-del">{{ strip(field.left) }}</span>
      <span class="mx-1 text-base-content/40" aria-hidden="true">→</span>
      <span class="diff-add">{{ strip(field.right) }}</span>
    </p>
    <p v-else class="text-xs leading-relaxed whitespace-pre-wrap break-words">
      <span v-for="(run, i) of runs" :key="i" :class="runClass(run.type)">{{
        run.text
      }}</span>
    </p>
  </div>
</template>

<script>

// The engine by a relative path, which `exports` maps and mkdist copies to
// `dist/lib/`. Not the package index: that is the Nuxt module, so it carries
// Node's `path`, and importing it from a component puts a polyfill of it in
// every reader's bundle for code the browser never runs.
import { condenseRuns, groupRuns, looksLikeMarkup, wordDiff } from '../lib/diff'

export default {
  name: 'AppDiffField',
  props: {
    field: { type: Object, required: true },
    // Trim long unchanged context to a little either side of each change.
    condense: { type: Boolean, default: true },
    // Characters of context kept each side when condensing.
    context: { type: Number, default: 60 },
  },
  computed: {
    markup() {
      return (
        looksLikeMarkup(this.field.left) || looksLikeMarkup(this.field.right)
      )
    },
    runs() {
      const grouped = groupRuns(wordDiff(this.field.left, this.field.right))
      return this.condense ? condenseRuns(grouped, this.context) : grouped
    },
  },
  methods: {
    strip(v) {
      return String(v)
        .replace(/<[^>]+>/g, '')
        .trim()
    },
    runClass(type) {
      return { '+': 'diff-add', '-': 'diff-del' }[type] || 'diff-same'
    },
  },
}
</script>

<style scoped>
/* Okabe-Ito, with a non-colour channel so it survives High Contrast Mode. */
.diff-add {
  color: #0072b2;
  background: rgba(0, 114, 178, 0.14);
  text-decoration: underline;
  text-decoration-style: solid;
}
.diff-del {
  color: #d55e00;
  background: rgba(213, 94, 0, 0.14);
  text-decoration: line-through;
  text-decoration-style: solid;
}
.diff-same {
  color: inherit;
  opacity: 0.75;
}
</style>
