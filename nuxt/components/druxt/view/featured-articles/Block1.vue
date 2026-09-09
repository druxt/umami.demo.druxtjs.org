<template>
  <div class="band band--paper">
    <b-container>
      <AppSectionHead
        cta="All articles"
        lede="The Articles view, three at a time, in card view mode."
        title="From the magazine"
        to="/en/articles"
      />

      <b-row>
        <slot
          name="results"
          :wrapper="{
            class: 'mb-4',
            component: 'b-col',
            propsData: { cols: 12, md: 4 },
          }"
        />
      </b-row>
    </b-container>
  </div>
</template>

<script>
import { DruxtViewsViewMixin } from 'druxt-views'

export default {
  mixins: [DruxtViewsViewMixin],
}
</script>
