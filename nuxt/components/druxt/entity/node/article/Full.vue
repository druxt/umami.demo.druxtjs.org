<template>
  <article class="article-page">
    <div class="node-hero node-hero--article bleed">
      <slot name="field_media_image" />
    </div>

    <!-- One measure at every width. At lg the meta moves into the left rail
         and the column holds at 680px. -->
    <div class="article-page__grid">
      <aside class="article-page__rail">
        Article<br />{{ readTime }} min read<br />{{ shortDate }}
      </aside>

      <div class="article-page__column">
        <span class="article-page__kicker">
          Article · {{ readTime }} min read
        </span>

        <h1 class="article-page__title">{{ entity.attributes.title }}</h1>

        <p class="article-page__byline">
          By the Umami kitchen<span class="article-page__date">
            · {{ longDate }}</span
          >
        </p>

        <div class="field--body article-page__body">
          <slot name="field_body" />
        </div>

        <div class="recipe-tags">
          <slot name="field_tags" />
        </div>

        <AppDevRegion
          class="article-page__more"
          label='DruxtView view-id="articles_aside"'
          source="components/druxt/entity/node/article/Full.vue"
        >
          <DruxtView
            :arguments="[entity.attributes.drupal_internal__nid]"
            display-id="block_1"
            view-id="articles_aside"
          >
            <template #default="{ display, results }">
              <h2
                class="recipe-body__heading"
                v-text="display.display_options.title"
              />
              <div class="article-grid article-grid--aside">
                <DruxtEntity
                  v-for="result of results"
                  :key="result.id"
                  mode="card"
                  :type="result.type"
                  :uuid="result.id"
                />
              </div>
            </template>
          </DruxtView>
        </AppDevRegion>

        <AppDruxtNote
          class="mt-4"
          title="Those related articles are a Drupal view"
          cta="Views guide"
          href="https://druxtjs.org/modules/views"
          :code="code"
        >
          Filtered by this article's node ID and rendered with two lines of
          markup. Editors change the filter or the sort in Drupal; the front end
          does not redeploy.
        </AppDruxtNote>
      </div>
    </div>
  </article>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],

  computed: {
    theme: () => 'umami',

    /** Words in the body at 200 a minute, never under one. */
    readTime: ({ entity }) => {
      const html = ((entity.attributes || {}).field_body || {}).processed || ''
      const words = html
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
      return Math.max(1, Math.round(words.length / 200))
    },

    created: ({ entity }) => new Date((entity.attributes || {}).created),

    longDate() {
      return this.created.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    },

    shortDate() {
      return this.created.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    },

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
      fields: ['created', 'drupal_internal__nid', 'field_body'],
    },
  },
}
</script>
