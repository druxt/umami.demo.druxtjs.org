<template>
  <article class="article-page">
    <div class="node-hero node-hero--article bleed">
      <slot name="field_media_image" />
    </div>

    <!-- One measure at every width. At lg the meta moves into the left rail
         and the column holds at 680px. -->
    <div class="article-page__grid">
      <aside class="article-page__rail">
        {{ $t('bundle.article') }}<br />{{
          $t('article.readTime', { n: readTime })
        }}<br />{{ shortDate }}
      </aside>

      <div class="article-page__column">
        <span class="article-page__kicker">
          {{ $t('bundle.article') }} ·
          {{ $t('article.readTime', { n: readTime }) }}
        </span>

        <h1
          v-draft-diff="'title'"
          class="article-page__title"
          v-text="entity.attributes.title"
        />

        <p class="article-page__byline">
          {{ $t('article.byline')
          }}<span class="article-page__date"> · {{ longDate }}</span>
        </p>

        <div class="field--body article-page__body">
          <slot name="field_body" />
        </div>

        <div class="recipe-tags">
          <slot name="field_tags" />
        </div>

        <div class="article-page__more">
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
        </div>

        <AppDruxtNote
          class="mt-4"
          :title="$t('note.articleTitle')"
          :cta="$t('note.articleCta')"
          href="https://druxtjs.org/modules/views"
          :code="code"
          >{{ $t('note.articleBody') }}</AppDruxtNote
        >
      </div>
    </div>
  </article>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'
import { langMixin } from '~/utils/lang'

export default {
  mixins: [langMixin, DruxtEntityMixin],

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
      return this.formatDate(this.created, 'long')
    },
    shortDate() {
      return this.formatDate(this.created, 'short')
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
      fields: ['created', 'drupal_internal__nid', 'field_body', 'title'],
    },
  },
}
</script>
