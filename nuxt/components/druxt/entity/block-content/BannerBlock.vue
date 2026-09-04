<template>
  <div v-if="!$fetchState.pending" class="banner">
    <img v-if="img" class="banner__media" :src="img" alt="" />
    <div class="banner__scrim" />

    <b-container>
      <div class="banner__body">
        <span class="banner__kicker">{{ kicker }}</span>

        <h2 class="banner__title">{{ fields.field_title.data }}</h2>

        <p class="banner__summary">{{ fields.field_summary.data }}</p>

        <div class="d-flex align-items-center flex-wrap" style="gap: 1.25rem">
          <b-button
            :to="fields.field_content_link.data.uri.replace('internal:', '')"
            variant="primary"
          >
            {{ fields.field_content_link.data.title }}
          </b-button>
        </div>
      </div>
    </b-container>
  </div>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtEntityMixin } from 'druxt-entity'
import { mapActions } from 'vuex'

export default {
  mixins: [DruxtEntityMixin],

  props: {
    /** Editorial eyebrow above the banner title. */
    kicker: {
      type: String,
      default: 'Recipe of the week',
    },
  },

  data: () => ({
    img: false,
  }),

  async fetch() {
    if (!this.model.relationships.field_media_image) {
      return
    }

    const resource = await this.getResource({
      ...this.model.relationships.field_media_image.data,
      query: new DrupalJsonApiParams()
        .addInclude(['field_media_image'])
        .addFields('media--image', [])
        .addFields('file--file', ['uri']),
    })

    this.img =
      this.$config.baseUrl +
      (resource.included.find((o) => o.type === 'file--file') || {}).attributes
        .uri.url
  },

  methods: {
    ...mapActions({
      getResource: 'druxt/getResource',
    }),
  },
}
</script>

<style scoped>
/* The old banner used background-attachment: fixed, which janks badly on
   iOS and fought the overlay card. It is a real <img> with a gradient scrim
   now, so the photograph can be object-fit cropped per breakpoint. */
@media (max-width: 767px) {
  .banner,
  .banner__body {
    min-height: 380px;
  }
}
</style>
