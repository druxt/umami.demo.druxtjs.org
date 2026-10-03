<template>
  <article class="recipe-page">
    <!-- The photograph leads at every width. At lg the title sits on it. -->
    <div class="recipe-hero bleed">
      <div class="node-hero node-hero--recipe">
        <slot name="field_media_image" />
      </div>
      <div class="recipe-hero__scrim" />
      <b-container class="node-head recipe-hero__head">
        <DruxtBreadcrumb />
        <h1
          v-draft-diff="'title'"
          class="node-head__title"
          v-text="entity.attributes.title"
        />
        <div class="node-head__summary field--field-summary">
          <slot name="field_summary" />
        </div>
      </b-container>
    </div>

    <dl class="stat-grid bleed">
      <div v-for="stat of stats" :key="stat.label" class="stat-grid__cell">
        <dt class="stat-grid__label">{{ stat.label }}</dt>
        <dd class="stat-grid__value">{{ stat.value }}</dd>
      </div>
    </dl>

    <!-- Ingredients first, then the method; side by side from md. -->
    <div class="recipe-body">
      <section class="recipe-ingredients">
        <h2 class="recipe-body__heading">{{ $t('recipe.ingredients') }}</h2>
        <slot name="field_ingredients" />
      </section>

      <section class="recipe-method">
        <h2 class="recipe-body__heading">{{ $t('recipe.method') }}</h2>
        <slot name="field_recipe_instruction" />

        <div class="recipe-tags">
          <slot name="field_recipe_category" />
          <slot name="field_tags" />
        </div>
      </section>
    </div>

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

        <AppDruxtNote
          title="One component file renders every recipe on this site"
          cta="Read the Entity guide"
          href="https://druxtjs.org/modules/entity"
          :code="code"
        >
          Drupal's <em>full</em> display mode maps to this file. Change the
          layout here and all 24 recipes follow. The field templates, labels and
          formatters still come from Drupal's display config.
        </AppDruxtNote>
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
    stats() {
      const a = this.entity.attributes
      const level = a.field_difficulty || ''
      return [
        {
          label: this.$t('recipe.prep'),
          value: this.$t('recipe.min', { n: a.field_preparation_time }),
        },
        {
          label: this.$t('recipe.cook'),
          value: this.$t('recipe.min', { n: a.field_cooking_time }),
        },
        { label: this.$t('recipe.serves'), value: a.field_number_of_servings },
        {
          label: this.$t('recipe.difficulty'),
          value: level && this.$t(`listing.${level}`),
        },
      ]
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

  // The display carries no title: the page title block does, and this
  // template draws its own.
  druxt: {
    query: {
      fields: ['title'],
    },
  },
}
</script>
