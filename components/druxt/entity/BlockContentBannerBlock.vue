<template>
  <b-row
    v-if="!$fetchState.pending"
    :style="style"
    class="pb-3 pt-3 pb-md-5 pt-md-5"
  >
    <b-container>
      <b-row>
        <b-col cols="12" md="6">
          <b-card class="text-white" bg-variant="dark">
            <b-card-title>{{ fields.field_title.data }}</b-card-title>

            <b-card-text>
              {{ fields.field_summary.data }}
            </b-card-text>

            <b-button
              :to="fields.field_content_link.data.uri.replace('internal:', '')"
              variant="danger"
            >
              {{ fields.field_content_link.data.title }}
            </b-button>
          </b-card>
        </b-col>
      </b-row>
    </b-container>
  </b-row>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtEntityMixin } from 'druxt-entity'
import { mapActions } from 'vuex'

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
    this.img = (
      resource.included.find((o) => o.type === 'file--file') || {}
    ).attributes.uri.url
  },

  computed: {
    style() {
      if (!this.img) {
        return false
      }

      return {
        backgroundAttachment: 'fixed',
        backgroundImage: `url(${this.img})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        minHeight: '43vw',
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

<style scoped>
.card.bg-dark {
  background-color: rgba(52, 58, 64, 0.6) !important;
}
</style>
