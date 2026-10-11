<template>
  <div class="band band--warm collections">
    <b-container>
      <b-row class="align-items-center">
        <b-col cols="12" md="4">
          <h2 class="mb-0">{{ $t('home.collections') }}</h2>
        </b-col>

        <b-col class="mt-3 mt-md-0" cols="12" md="8">
          <div class="collections__list">
            <b-link
              v-for="result of results"
              :key="result.id"
              class="collections__link"
              nuxt
              :to="`${prefix}${(result.attributes.path || {}).alias}`"
            >
              {{ result.attributes.name }}
            </b-link>
            <b-link class="collections__more" nuxt :to="`${prefix}/recipes`">{{
              $t('home.more')
            }}</b-link>
          </div>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
import { DruxtViewsViewMixin } from 'druxt-views'
import { langMixin } from '~/utils/lang'

export default {
  mixins: [langMixin, DruxtViewsViewMixin],

  druxt: {
    query: {
      fields: ['name', 'path'],
    },
  },
}
</script>
