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
        <h1 class="node-head__title">{{ entity.attributes.title }}</h1>
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
        <h2 class="recipe-body__heading">Ingredients</h2>
        <slot name="field_ingredients" />
      </section>

      <section class="recipe-method">
        <h2 class="recipe-body__heading">Method</h2>
        <slot name="field_recipe_instruction" />

        <div class="recipe-tags">
          <slot name="field_recipe_category" />
          <slot name="field_tags" />
        </div>
      </section>
    </div>

    <!-- The learning layer follows the recipe. Editing is the page's Edit
         tab. -->
    <AppViewModeSwitcher
      class="mt-5"
      :modes="['card', 'teaser']"
      :type="entity.type"
      :uuid="entity.id"
    />

    <AppJsonApiDrawer class="mt-3" :path="jsonApiPath" />

    <AppDruxtNote
      class="mt-5"
      title="One component file renders every recipe on this site"
      cta="Read the Entity guide"
      href="https://druxtjs.org/modules/entity"
      :code="code"
    >
      Drupal's <em>full</em> display mode maps to this file. Change the layout
      here and all 24 recipes follow. The field templates, labels and formatters
      still come from Drupal's display config.
    </AppDruxtNote>
  </article>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],

  computed: {
    stats: ({ entity }) => {
      const a = entity.attributes
      const level = a.field_difficulty || ''
      return [
        { label: 'Prep', value: `${a.field_preparation_time} min` },
        { label: 'Cook', value: `${a.field_cooking_time} min` },
        { label: 'Serves', value: a.field_number_of_servings },
        {
          label: 'Difficulty',
          value: level.charAt(0).toUpperCase() + level.slice(1),
        },
      ]
    },

    jsonApiPath: ({ entity }) =>
      `/en/jsonapi/node/recipe/${entity.id}?include=field_media_image.field_media_image`,

    code: () =>
      [
        '<span class="t">&lt;DruxtEntity</span>',
        '  <span class="a">type</span>=<span class="v">"node--recipe"</span>',
        '  <span class="a">mode</span>=<span class="v">"full"</span>',
        '  <span class="a">:uuid</span>=<span class="v">"uuid"</span>',
        '<span class="t">/&gt;</span>',
      ].join('\n'),
  },
}
</script>
