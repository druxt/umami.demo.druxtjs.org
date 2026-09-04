<template>
  <div class="d-flex flex-column" style="height: 100%">
    <div class="p-4" style="border-bottom: 1px solid #e6ddcd">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h2 class="mb-0">Search</h2>
        <b-button v-b-toggle.search variant="link" style="color: #a2988a">×</b-button>
      </div>

      <b-input-group>
        <b-form-input
          v-model="searchText"
          autofocus
          debounce="60"
          placeholder="Try “brownie”, “quiche”, “mushroom”"
          type="search"
        />
      </b-input-group>

      <div class="d-flex align-items-center justify-content-between mt-3">
        <span style="font-size: 0.8125rem; color: #6b625a">
          {{ resultsVisible ? `${searchResults.length} results as you type` : 'Results appear as you type' }}
        </span>
        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 0.71875rem; color: #0678be">
          lunr · no request
        </span>
      </div>
    </div>

    <div style="flex: 1; overflow-y: auto">
      <nuxt-link
        v-for="(item, key) of searchResults"
        :key="key"
        class="d-flex align-items-center p-3"
        style="border-bottom: 1px solid #f0e7d8; color: inherit; gap: 1rem"
        :to="searchMeta[item.ref].href"
      >
        <Druxt
          module="entity"
          mode="teaser"
          :type="searchMeta[item.ref].type"
          :uuid="searchMeta[item.ref].uuid"
        />
      </nuxt-link>
    </div>

    <div
      class="p-3"
      style="background: #eff7fc; border-top: 1px solid #bfdff2"
    >
      <span class="druxt-note__kicker">How this works</span>
      <p class="druxt-note__body mt-1 mb-0">
        Drupal's Search API index is compiled to a Lunr index at build time and
        shipped with the app, so every keystroke searches locally and the site
        stays fully static.
      </p>
    </div>
  </div>
</template>

<script>
import LunrSearch from 'lunr-module/search'

export default {
  extends: LunrSearch,
}
</script>
