<template>
  <div class="band band--warm">
    <b-container>
      <!-- The block and its attachment are one strip: three teasers across,
           a snap scroller below md. See REPASS.md 3b. -->
      <div class="featured-strip">
        <slot name="results" :wrapper="{ component: 'div' }" />
        <slot
          name="attachments_after"
          :wrapper="{ class: 'contents', component: 'div' }"
        />
      </div>
    </b-container>
  </div>
</template>

<script>
import { DruxtViewsViewMixin } from 'druxt-views'

export default {
  mixins: [DruxtViewsViewMixin],
}
</script>
