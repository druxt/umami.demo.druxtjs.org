<template>
  <div class="disclaimer">
    <slot name="field_disclaimer" />
    <slot name="field_copyright" />
  </div>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],
}
</script>
