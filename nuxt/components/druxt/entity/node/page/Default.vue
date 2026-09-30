<template>
  <div class="page-node">
    <!-- The head band, as a term draws it: breadcrumb and title. -->
    <div class="term-head bleed">
      <b-container class="term-head__inner">
        <DruxtBreadcrumb />
        <h1 class="term-head__title">{{ entity.attributes.title }}</h1>
      </b-container>
    </div>

    <div class="page-node__measure">
      <div class="page-node__body">
        <slot name="field_body" />
      </div>

      <!-- The About page carries the frontend's own section: what Druxt is.
           Drupal's body above stays the editor's. -->
      <section v-if="isAbout" class="about-druxt">
        <div class="about-druxt__head">
          <AppDruxtMark class="about-druxt__mark" />
          <div>
            <span class="about-druxt__kicker">{{ $t('about.kicker') }}</span>
            <h2 class="about-druxt__title">{{ $t('about.title') }}</h2>
          </div>
        </div>
        <p>{{ $t('about.p1') }}</p>
        <p>{{ $t('about.p2') }}</p>
        <p>{{ $t('about.p3') }}</p>
      </section>
    </div>

    <div v-if="isAbout" class="about-resources bleed">
      <b-container>
        <span class="about-resources__kicker">{{ $t('about.resources') }}</span>
        <div class="about-resources__grid">
          <a
            v-for="item of resources"
            :key="item.key"
            class="about-resources__card"
            :href="item.href"
            rel="noopener"
            target="_blank"
          >
            <span class="about-resources__name">{{
              $t(`about.${item.key}`)
            }}</span>
            <span class="about-resources__blurb">{{
              $t(`about.${item.key}Blurb`)
            }}</span>
            <span class="about-resources__host">{{ item.host }}</span>
          </a>
        </div>
      </b-container>
    </div>
  </div>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

/** The About page's alias in each language. */
const ABOUT = ['/about-umami', '/acerca-de-umami']

const RESOURCES = [
  { key: 'docs', href: 'https://druxtjs.org', host: 'druxtjs.org' },
  {
    key: 'github',
    href: 'https://github.com/druxt/druxt.js',
    host: 'github.com/druxt/druxt.js',
  },
  {
    key: 'module',
    href: 'https://www.drupal.org/project/druxt',
    host: 'drupal.org/project/druxt',
  },
  {
    key: 'discord',
    href: 'https://discord.druxtjs.org',
    host: 'discord.druxtjs.org',
  },
  {
    key: 'source',
    href: 'https://github.com/druxt/umami.demo.druxtjs.org',
    host: 'github.com/druxt/umami.demo.druxtjs.org',
  },
]

export default {
  mixins: [DruxtEntityMixin],

  data: () => ({ resources: RESOURCES }),

  computed: {
    isAbout: ({ entity }) =>
      ABOUT.includes(((entity.attributes || {}).path || {}).alias),
  },

  druxt: {
    query: {
      fields: ['field_body', 'path', 'title'],
    },
  },
}
</script>
