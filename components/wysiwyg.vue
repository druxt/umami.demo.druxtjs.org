<template>
  <ckeditor v-model="model" v-bind="props" />
</template>

<script>
let ClassicEditor
let CKEditor

if (process.client) {
  ClassicEditor = require('@ckeditor/ckeditor5-build-classic')
  CKEditor = require('@ckeditor/ckeditor5-vue2')
} else {
  CKEditor = { component: { template: '<div></div>' } }
}

export default {
  components: {
    ckeditor: CKEditor.component,
  },

  props: {
    value: {
      type: String,
      default: null,
    },
  },

  data: ({ value }) => ({
    editor: ClassicEditor,
    model: value,
  }),

  computed: {
    props: ({ editor }) => ({
      editor,
    }),
  },

  watch: {
    value(to, from) {
      if (to !== this.model) {
        this.model = to
      }
    },

    model(to, from) {
      if (to !== from) {
        this.$emit('input', to)
      }
    },
  },
}
</script>
