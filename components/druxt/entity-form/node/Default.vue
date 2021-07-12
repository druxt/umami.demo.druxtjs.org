<template>
  <b-form>
    <b-overlay :show="submitting">
      <b-alert v-if="errors.length" :show="true" variant="warning">
        <VueJsonPretty :data="errors" />
      </b-alert>
      <slot />
    </b-overlay>
  </b-form>
</template>

<script>
import { BAlert, BOverlay } from 'bootstrap-vue'
import { DruxtEntityMixin } from 'druxt-entity'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

export default {
  components: { BAlert, BOverlay, VueJsonPretty },

  mixins: [DruxtEntityMixin],

  computed: {
    errors: ({ $parent }) => ($parent.errors || []).filter((o) => !o.source),
    submitting: ({ $parent }) => $parent.submitting,
  },
}
</script>
