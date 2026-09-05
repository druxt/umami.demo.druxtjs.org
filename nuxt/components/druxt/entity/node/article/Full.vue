<template>
  <article>
    <!-- Centred title block, full-bleed lead image. -->
    <b-row>
      <b-col cols="12" lg="8" offset-lg="2" class="text-center">
        <div class="d-flex justify-content-center mb-3">
          <slot name="field_tags" />
        </div>

        <h1>{{ entity.attributes.title }}</h1>

        <div class="field--field-summary mt-3">
          <slot name="field_summary" />
        </div>

        <p class="mt-3 mb-0" style="font-size: 0.8125rem; color: #8a7f70">
          By the Umami kitchen
          <slot name="field_display_submitted" />
        </p>
      </b-col>
    </b-row>

    <div class="mt-5">
      <slot name="field_media_image" />
    </div>

    <b-row class="mt-5">
      <b-col cols="12" lg="8">
        <div class="field--body">
          <slot name="body" />
        </div>
      </b-col>

      <b-col cols="12" lg="4" class="mt-5 mt-lg-0 pl-lg-5">
        <DevRegion
          label='DruxtView view-id="articles_aside"'
          source="components/druxt/entity/node/article/Full.vue"
        >
          <DruxtView
            :arguments="[entity.attributes.drupal_internal__nid]"
            display-id="block_1"
            view-id="articles_aside"
          >
            <template #default="{ display, results }">
              <h4
                class="pb-2 mb-3"
                style="
                  border-bottom: 1px solid #e6ddcd;
                  color: #a2988a;
                  font-family: Archivo, sans-serif;
                  font-size: 0.75rem;
                  font-weight: 700;
                  letter-spacing: 0.16em;
                  text-transform: uppercase;
                "
                v-text="display.display_options.title"
              />
              <DruxtEntity
                v-for="result of results"
                :key="result.id"
                class="mb-3 d-block"
                mode="teaser"
                :type="result.type"
                :uuid="result.id"
              />
            </template>
          </DruxtView>
        </DevRegion>

        <AppDruxtNote
          class="mt-4"
          title="That sidebar is a Drupal view"
          cta="Views guide"
          href="https://druxtjs.org/modules/views"
          :code="code"
        >
          Filtered by this article's node ID and rendered with two lines of
          markup. Editors change the filter or the sort in Drupal; the front end
          does not redeploy.
        </AppDruxtNote>
      </b-col>
    </b-row>
  </article>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],

  computed: {
    theme: () => 'umami',

    code: () =>
      [
        '<span class="t">&lt;DruxtView</span>',
        '  <span class="a">view-id</span>=<span class="v">"articles_aside"</span>',
        '  <span class="a">:arguments</span>=<span class="v">"[nid]"</span>',
        '<span class="t">/&gt;</span>',
      ].join('\n'),
  },

  druxt: {
    query: {
      fields: ['drupal_internal__nid'],
    },
  },
}
</script>
