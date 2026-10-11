<template>
  <article class="recipe-page">
    <!-- The photograph leads at every width. At lg the title sits on it. -->
    <div class="recipe-hero bleed">
      <div
        class="node-hero node-hero--recipe"
        :class="{ 'v-diff-swapped': fieldDiff('field_media_image') }"
      >
        <slot name="field_media_image" />
        <AppDraftSwap
          :entity="draftEntity"
          :field="fieldDiff('field_media_image')"
          name="field_media_image"
        />
      </div>
      <div class="recipe-hero__scrim" />
      <b-container class="node-head recipe-hero__head">
        <DruxtBreadcrumb />
        <h1
          v-diff="fieldDiff('title')"
          class="node-head__title"
          v-text="entity.attributes.title"
        />
        <div class="node-head__summary field--field-summary">
          <slot name="field_summary" />
        </div>
      </b-container>
    </div>

    <dl class="stat-grid bleed">
      <!-- data-field: a live save washes the cell whose field it changed. -->
      <div
        v-for="stat of stats"
        :key="stat.label"
        class="stat-grid__cell"
        :data-field="stat.field"
      >
        <dt class="stat-grid__label">{{ stat.label }}</dt>
        <dd class="stat-grid__value">{{ stat.value }}</dd>
      </div>
    </dl>

    <!-- Ingredients and the method, side by side from md, in the order
         Drupal's display gives them: reorder or hide one in Manage display
         and the page follows, with no rebuild. -->
    <div
      class="recipe-body"
      :class="{
        'recipe-body--method-first':
          (sections[0] || {}).field === 'field_recipe_instruction',
      }"
    >
      <section
        v-for="section of sections"
        :key="section.field"
        :class="section.class"
      >
        <h2 class="recipe-body__heading">{{ $t(section.heading) }}</h2>
        <slot :name="section.field" />

        <div
          v-if="section.field === 'field_recipe_instruction'"
          class="recipe-tags"
        >
          <slot name="field_recipe_category" />
          <slot name="field_tags" />
        </div>
      </section>

      <div v-if="!hasMethod" class="recipe-tags">
        <slot name="field_recipe_category" />
        <slot name="field_tags" />
      </div>
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
import { diffable } from '@druxt-contrib/diff'
import { DruxtEntityMixin } from 'druxt-entity'
import { langMixin } from '~/utils/lang'

export default {
  mixins: [langMixin, DruxtEntityMixin, diffable],

  computed: {
    /** This entity as the draft helpers name it. */
    draftEntity() {
      return { type: this.entity.type, id: this.entity.id, langcode: this.lang }
    },

    /** The display's fields in Drupal's order, from the schema. */
    displayOrder: ({ schema }) =>
      ((schema || {}).fields || []).map((field) => field.id),

    sections() {
      return this.inDisplayOrder([
        {
          field: 'field_ingredients',
          heading: 'recipe.ingredients',
          class: 'recipe-ingredients',
        },
        {
          field: 'field_recipe_instruction',
          heading: 'recipe.method',
          class: 'recipe-method',
        },
      ])
    },

    hasMethod() {
      return this.sections.some((s) => s.field === 'field_recipe_instruction')
    },

    stats() {
      const a = this.entity.attributes
      const level = a.field_difficulty || ''
      const minutes = (n) => (n || n === 0 ? this.$t('recipe.min', { n }) : '')
      // A recipe without a value shows no stat rather than "undefined min".
      return this.inDisplayOrder([
        {
          field: 'field_preparation_time',
          label: this.$t('recipe.prep'),
          value: minutes(a.field_preparation_time),
        },
        {
          field: 'field_cooking_time',
          label: this.$t('recipe.cook'),
          value: minutes(a.field_cooking_time),
        },
        {
          field: 'field_number_of_servings',
          label: this.$t('recipe.serves'),
          value: a.field_number_of_servings,
        },
        {
          field: 'field_difficulty',
          label: this.$t('recipe.difficulty'),
          value: level && this.$t(`listing.${level}`),
        },
      ]).filter(({ value }) => value || value === 0)
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

  methods: {
    /**
     * Items keyed by field, ordered as the display orders those fields, and
     * without any the display hides. Without a schema, as they come.
     */
    inDisplayOrder(items) {
      const order = this.displayOrder
      if (!order.length) return items
      return items
        .filter((item) => order.includes(item.field))
        .sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field))
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
