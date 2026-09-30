<template>
  <AppFormField
    :description="description || $t('form.stepsHint')"
    :feedback="feedback"
    :label="label"
    :required="required"
  >
    <!-- The method is stored as an ordered list; here it is one row a step,
         and the number is the grip that drags a step to its place. -->
    <draggable
      :animation="150"
      :fallback-tolerance="3"
      :force-fallback="true"
      class="edit-steps"
      handle=".edit-steps__n"
      tag="ol"
      :value="steps"
      @input="write"
    >
      <li v-for="(step, index) of steps" :key="index" class="edit-steps__row">
        <span class="edit-steps__n" :title="$t('form.dragStep')">{{
          index + 1
        }}</span>
        <textarea
          :ref="`step-${index}`"
          class="edit-steps__input"
          rows="2"
          :value="step"
          @input="setStep(index, $event.target.value)"
        />
        <button
          class="edit-list__remove"
          type="button"
          :aria-label="`Remove step ${index + 1}`"
          @click="remove(index)"
        >
          ×
        </button>
      </li>
    </draggable>
    <button class="edit-list__add" type="button" @click="add()">
      {{ $t('form.addStep') }}
    </button>
    <span v-if="item.format" class="edit-field__format">{{ item.format }}</span>
  </AppFormField>
</template>

<script>
import draggable from 'vuedraggable'
import formField from '~/utils/form-field'
import { single } from '~/utils/form-widgets'

const decode = (html) =>
  html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
const encode = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default {
  components: { draggable },

  mixins: [formField],

  computed: {
    item: ({ value }) => {
      const v = single(value)
      return v && typeof v === 'object' ? v : { value: v || '' }
    },

    /** The list items in the stored markup, as plain text. */
    steps: ({ item }) =>
      (item.value.match(/<li>[\s\S]*?<\/li>/g) || []).map((li) =>
        decode(li.replace(/<\/?li>/g, '').replace(/<[^>]+>/g, '')).trim()
      ),
  },

  methods: {
    write(steps) {
      const value = steps.length
        ? `<ol>\n${steps
            .map((s) => `  <li>${encode(s)}</li>`)
            .join('\n')}\n</ol>`
        : ''
      this.$emit('input', { ...this.item, value })
    },
    setStep(index, text) {
      const steps = [...this.steps]
      steps[index] = text
      this.write(steps)
    },
    add() {
      this.write([...this.steps, ''])
      this.$nextTick(() => {
        const [input] = this.$refs[`step-${this.steps.length - 1}`] || []
        if (input) input.focus()
      })
    },
    remove(index) {
      this.write(this.steps.filter((_, i) => i !== index))
    },
  },
}
</script>
