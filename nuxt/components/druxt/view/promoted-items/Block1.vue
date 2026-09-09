<template>
  <div class="band band--warm">
    <b-container>
      <span class="band__label">This week</span>

      <!-- Image, kicker, headline. A snap scroller below md showing 1.15
           items, so the cut edge says swipe. -->
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
