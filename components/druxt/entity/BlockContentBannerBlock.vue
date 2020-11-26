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
import { DruxtEntityMixin } from 'druxt-entity'
import { mapActions } from 'vuex'

export default {
  mixins: [DruxtEntityMixin],

  data: () => ({
    image: false,
    img: false,
    media: false,
  }),

  async fetch() {
    if (!this.fields.field_media_image) {
      return
    }

    this.media = await this.getResource(this.fields.field_media_image.data.data)
    this.image = await this.getResource(
      this.media.relationships.field_media_image.data
    )
    this.img = this.image.attributes.uri.url
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
      getResource: 'druxtRouter/getEntity',
    }),
  },
}
</script>

<style scoped>
.card.bg-dark {
  background-color: rgba(52, 58, 64, 0.6) !important;
}
</style>
