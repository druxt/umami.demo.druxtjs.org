<template>
  <b-button
    size="sm"
    variant="light"
    @click.stop="onToggleStar"
    v-bind="{ ...$attrs }"
  >
    <component :is="starComponent" />
  </b-button>
</template>

<script>
import { BIconStar, BIconStarFill } from 'bootstrap-vue'

export default {
  components: { BIconStar, BIconStarFill },
  props: {
    type: {
      type: String,
      required: true,
    },
    uuid: {
      type: String,
      required: true,
    }
  },
  computed: {
    starComponent: ({ starred }) => starred ? 'b-icon-star-fill' : 'b-icon-star',
    starred: ({ $store, type, uuid }) => $store.state.starred.items.includes(`${type}:${uuid}`)
  },
  methods: {
    onToggleStar(e) {
      const mutation = this.starred ? 'starred/remove' : 'starred/add'
      this.$store.commit(mutation, {
        type: this.type,
        uuid: this.uuid
      })
    }
  }
}
</script>
