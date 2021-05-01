<template>
  <b-row>
    <b-col class="m-auto" cols="8" md="4">
      <slot name="field_media_image" />
    </b-col>

    <b-col cols="12" md="8">
      <h2>
        <slot name="field_title" />
      </h2>

      <slot
        name="field_summary"
        :wrapper="{ class: 'mb-3', component: 'div' }"
      />

      <slot name="field_content_link" />
    </b-col>
  </b-row>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],
}
</script>
