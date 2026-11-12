<template>
  <UmamiRecipePage>
    <UmamiRecipeHero ref="hero" :title="entity.attributes.title">
      <template #media>
        <slot name="field_media_image" />
        <AppDraftSwap
          :entity="draftEntity"
          :field="fieldDiff('field_media_image')"
          name="field_media_image"
        />
      </template>

      <template #breadcrumb>
        <DruxtBreadcrumb />
      </template>

      <template #summary>
        <slot name="field_summary" />
      </template>
    </UmamiRecipeHero>

    <UmamiStatGrid :stats="stats" />

    <UmamiRecipeBody
      :ingredients-heading="$t('recipe.ingredients')"
      :method-heading="$t('recipe.method')"
    >
      <template #ingredients>
        <slot name="field_ingredients" />
      </template>

      <template #method>
        <slot name="field_recipe_instruction" />
      </template>

      <template #tags>
        <slot name="field_recipe_category" />
        <slot name="field_tags" />
      </template>
    </UmamiRecipeBody>

    <!-- The learning layer follows the recipe: the view modes on one side,
         the request and the note on the other from lg. Editing is the
         page's Edit tab. -->
    <div class="learn-grid">
      <AppViewModeSwitcher
        :modes="['card', 'teaser']"
        :type="entity.type"
        :uuid="entity.id"
      />

      <div class="learn-grid__aside">
        <AppJsonApiDrawer :path="jsonApiPath" />

        <UmamiNote
          title="One component file renders every recipe on this site"
          cta="Read the Entity guide"
          href="https://druxtjs.org/modules/entity"
          :code="code"
        >
          Drupal's <em>full</em> display mode maps to this file. Change the
          layout here and all 24 recipes follow. The field templates, labels and
          formatters still come from Drupal's display config.
        </UmamiNote>
      </div>
    </div>
  </UmamiRecipePage>
</template>

<script>
import { diffable, diffDirective } from '@druxt-contrib/diff'
import { DruxtEntityMixin } from 'druxt-entity'
import { langMixin } from '~/utils/lang'

export default {
  mixins: [langMixin, DruxtEntityMixin, diffable],

  computed: {
    /** This entity as the draft helpers name it. */
    draftEntity() {
      return { type: this.entity.type, id: this.entity.id, langcode: this.lang }
    },

    /** What the hero's draft marks depend on. */
    heroDiff() {
      return {
        title: this.entity.attributes.title,
        titleDiff: this.fieldDiff('title'),
        imageDiff: this.fieldDiff('field_media_image'),
      }
    },

    stats() {
      const a = this.entity.attributes
      const level = a.field_difficulty || ''
      const minutes = (n) => (n || n === 0 ? this.$t('recipe.min', { n }) : '')
      // A recipe without a value shows no stat rather than "undefined min".
      return [
        {
          label: this.$t('recipe.prep'),
          value: minutes(a.field_preparation_time),
        },
        {
          label: this.$t('recipe.cook'),
          value: minutes(a.field_cooking_time),
        },
        { label: this.$t('recipe.serves'), value: a.field_number_of_servings },
        {
          label: this.$t('recipe.difficulty'),
          value: level && this.$t(`listing.${level}`),
        },
      ].filter(({ value }) => value || value === 0)
    },

    jsonApiPath: ({ entity, prefix }) =>
      `${prefix}/jsonapi/node/recipe/${entity.id}?include=field_media_image.field_media_image`,

    code: () =>
      [
        '<span class="t">&lt;DruxtEntity</span>',
        '  <span class="a">type</span>=<span class="v">"node--recipe"</span>',
        '  <span class="a">mode</span>=<span class="v">"full"</span>',
        '  <span class="a">:uuid</span>=<span class="v">"uuid"</span>',
        '<span class="t">/&gt;</span>',
      ].join('\n'),
  },

  watch: {
    heroDiff: 'markHero',
  },

  mounted() {
    this.markHero()
  },

  methods: {
    /**
     * Marks a draft's changes in the hero: the words of the title, and an
     * outline round a replaced photograph.
     *
     * UmamiRecipeHero renders its title from a prop and its photograph's box
     * with a fixed class, so neither element takes v-diff or a class from
     * here. Until it offers a title slot and a class for that box, this reaches
     * them by their theme classes once the hero has rendered. The title is
     * written from the entity before each marking, as v-diff would find it.
     */
    markHero() {
      this.$nextTick(() => {
        const hero = (this.$refs.hero || {}).$el
        if (!hero || !hero.querySelector) {
          return
        }
        const { title, titleDiff, imageDiff } = this.heroDiff

        const heading = hero.querySelector('.node-head__title')
        if (heading) {
          heading.__vdiffOriginal = null
          heading.textContent = title
          if (titleDiff) {
            diffDirective.bind(heading, { value: titleDiff })
          }
        }

        const media = hero.querySelector('.node-hero')
        if (media) {
          media.classList.toggle('v-diff-swapped', !!imageDiff)
        }
      })
    },
  },

  // The display carries no title: the page title block does, and this
  // template draws its own.
  druxt: {
    query: {
      fields: ['title'],
    },
  },
}
</script>
