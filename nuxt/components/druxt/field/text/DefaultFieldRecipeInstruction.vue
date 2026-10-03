<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <h3 v-if="$scopedSlots['label-above']">{{ schema.label.text }}</h3>

    <!-- Prose before the list, such as a note on preparation. -->
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-if="list && prose.before"
      class="method-prose"
      v-html="prose.before"
    />
    <!-- eslint-enable vue/no-v-html -->

    <!-- Each list item becomes a numbered step, marked against the step it
         replaced; a removed step stands unnumbered where it was. -->
    <ol v-if="list" class="method-steps">
      <li
        v-for="(row, key) of steps"
        :key="key"
        class="method-step"
        :class="{ 'method-step--removed': row.removed }"
      >
        <template v-if="row.removed">
          <span class="method-step__n" aria-hidden="true" />
          <del
            class="v-diff-del v-diff-del--block method-step__text"
            v-text="row.text"
          />
        </template>
        <template v-else>
          <span class="method-step__n">{{ row.n }}</span>
          <!-- eslint-disable vue/no-v-html -->
          <span v-diff="row.diff" class="method-step__text" v-html="row.item" />
          <!-- eslint-enable vue/no-v-html -->
        </template>
      </li>
    </ol>

    <!-- Prose after the list: Umami's recipes close with how to serve. -->
    <!-- eslint-disable vue/no-v-html -->
    <div v-if="list && prose.after" class="method-prose" v-html="prose.after" />
    <!-- eslint-enable vue/no-v-html -->

    <!-- eslint-disable vue/no-v-html -->
    <div
      v-else-if="!list"
      v-diff="textDiff(schema.id)"
      class="method-prose"
      v-html="items[0].processed"
    />
    <!-- eslint-enable vue/no-v-html -->
  </component>
</template>

<script>
import { DruxtFieldMixin } from 'druxt-entity'
import { draftDiffable, listRows, plain } from '~/utils/draft-diff'

export default {
  mixins: [draftDiffable, DruxtFieldMixin],

  computed: {
    list() {
      return this.items[0].processed.match(/(?<=<li>).*?(?=<\/li>)/g)
    },
    /** The HTML around the list, which the steps do not carry. */
    prose() {
      const html = this.items[0].processed
      const start = html.search(/<ol[\s>]/i)
      const end = html.search(/<\/ol>/i)
      if (start < 0 || end < 0) return { before: '', after: '' }
      return {
        before: html.slice(0, start).trim(),
        after: html.slice(end + '</ol>'.length).trim(),
      }
    },
    steps() {
      let n = 0
      const diff = this.textDiff(this.schema.id)
      // The prose around the list is not a step: its unchanged lines leave
      // the comparison, or each would read as a removed step.
      const around = new Set(
        plain(`${this.prose.before}\n${this.prose.after}`)
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      )
      const steps = diff
        ? {
            ...diff,
            left: String(diff.left || '')
              .split('\n')
              .filter((line) => !around.has(line.trim()))
              .join('\n'),
          }
        : null
      return listRows(steps, this.list, plain).map((row) =>
        row.removed ? row : { ...row, n: ++n }
      )
    },
  },
}
</script>
