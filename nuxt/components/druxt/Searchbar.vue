<template>
  <b-container>
    <b-row class="mb-4">
      <b-col>
        <b-input-group>
          <b-form-input
            v-model="searchText"
            placeholder="Enter your query here"
            type="search"
          />
          <b-input-group-append>
            <b-button><BIconSearch /></b-button>
          </b-input-group-append>
        </b-input-group>
      </b-col>
    </b-row>

    <b-row v-if="resultsVisible">
      <b-col cols="12"><h4>Results</h4></b-col>

      <b-col
        v-for="(item, key) of searchResults"
        :key="key"
        class="mb-3"
        cols="12"
      >
        <Druxt
          module="entity"
          mode="card"
          :type="searchMeta[item.ref].type"
          :uuid="searchMeta[item.ref].uuid"
        />
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import { BIconSearch } from 'bootstrap-vue'
import LunrSearch from 'lunr-module/search'

export default {
  components: {
    BIconSearch,
  },

  extends: LunrSearch,
}
</script>
