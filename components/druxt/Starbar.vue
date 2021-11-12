<template>
  <b-sidebar
    id="starbar"
    title="Starred"
    backdrop
    shadow
    no-close-on-route-change
    right
  >
    <b-container>
      <b-row>
        <Draggable v-model="model">
          <b-col
            v-for="item of model"
            :key="item"
            class="mb-3"
            cols="12"
          >
            <DruxtEntity
              mode="card"
              :type="item.split(':')[0]"
              :uuid="item.split(':')[1]"
            />
          </b-col>
        </Draggable>
      </b-row>
    </b-container>
  </b-sidebar>
</template>

<script>
import Draggable from 'vuedraggable'

export default {
  components: { Draggable },

  computed: {
    model: {
      get() {
        return this.$store.state.starred.items
      },
      set(value) {
        this.$store.commit('starred/set', value)
      }
    }
  }

  // data: ({ $store }) => ({
  //   model: [...($store.state.starred.items || [])]
  // }),

  // methods: {
  //   onEnd() {
  //     this.$store.commit('starred/set', this.model)
  //   }
  // },

  // watch: {
  //   '$store.state.starred.items'() {
  //     this.model = this.$store.state.starred.items
  //   }
  // }
}
</script>
