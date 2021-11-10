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
        <b-col
          v-for="item of $store.state.starred.items"
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
      </b-row>
    </b-container>
  </b-sidebar>
</template>

<script>
export default {

}
</script>
