<template>
  <div v-if="!$fetchState.pending" class="promo">
    <!-- v-if, so a missing image collapses instead of reserving two thirds
         of the band for an <img> with no src. -->
    <img v-if="img" alt="" class="promo__cover" :src="img" />

    <div class="promo__body">
      <span class="promo__kicker">In print</span>

      <h2 class="promo__title">
        <slot name="field_title" />
      </h2>

      <slot
        name="field_summary"
        :wrapper="{ class: 'promo__summary', component: 'div' }"
      />

      <b-button v-if="link" :to="link.to" variant="secondary">
        {{ link.title }}
      </b-button>
    </div>
  </div>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtEntityMixin } from 'druxt-entity'
import { mapActions } from 'vuex'

/**
 * The image used to render through <slot name="field_media_image" />, whose
 * file URL was not resolving — the block shipped an <img> with an empty src.
 * Resolve the file the same way BannerBlock.vue does.
 */
export default {
  mixins: [DruxtEntityMixin],

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

    const file = resource.included.find((o) => o.type === 'file--file')
    if (file) {
      this.img = this.$config.baseUrl + file.attributes.uri.url
    }
  },

  computed: {
    /**
     * The link field holds an unprefixed internal URI, so the button used to
     * send a Spanish reader to the English page.
     */
    link() {
      const field = (this.fields || {}).field_content_link
      if (!field || !field.data) {
        return null
      }
      const langcode =
        (this.$route.path.match(/^\/(en|es)(\/|$)/) || [])[1] || 'en'
      const path = field.data.uri.replace('internal:', '')
      return {
        title: field.data.title,
        to: `/${langcode}${path}`,
      }
    },
  },

  methods: {
    ...mapActions({
      getResource: 'druxt/getResource',
    }),
  },
}
</script>
