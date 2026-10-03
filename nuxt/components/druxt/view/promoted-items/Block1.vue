<template>
  <div class="band band--warm">
    <b-container>
      <span class="band__label">This week</span>

      <!-- Image, kicker, headline. A snap scroller below md, with the next
           card cut at the edge so it says swipe. Both wrappers are
           display: contents, so every teaser is a direct item of the strip. -->
      <div class="featured-strip">
        <slot
          name="results"
          :wrapper="{ class: 'contents', component: 'div' }"
        />
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
