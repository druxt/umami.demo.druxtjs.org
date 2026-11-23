<template>
  <UmamiRecipePage>
    <UmamiRecipeHero
      :title="entity.attributes.title"
      :media-class="{ 'v-diff-swapped': fieldDiff('field_media_image') }"
    >
      <template #title>
        <span v-diff="fieldDiff('title')" v-text="entity.attributes.title" />
      </template>

      <template #media>
        <EntityScope :entity="entity">
          <slot name="field_media_image" />
        </EntityScope>
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
        <EntityScope :entity="entity">
          <slot name="field_summary" />
        </EntityScope>
      </template>
    </UmamiRecipeHero>

    <UmamiStatGrid :stats="stats" />

    <UmamiRecipeBody
      :ingredients-heading="$t('recipe.ingredients')"
      :method-heading="$t('recipe.method')"
    >
      <template #ingredients>
        <EntityScope :entity="entity">
          <slot name="field_ingredients" />
        </EntityScope>
      </template>

      <template #method>
        <EntityScope :entity="entity">
          <slot name="field_recipe_instruction" />
        </EntityScope>
      </template>

      <template #tags>
        <EntityScope :entity="entity">
          <slot name="field_recipe_category" />
        </EntityScope>
        <EntityScope :entity="entity">
          <slot name="field_tags" />
        </EntityScope>
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
import { diffable } from '@druxt-contrib/diff'
import { DruxtEntityMixin } from 'druxt-entity'
import EntityScope from '~/utils/entity-scope'
import { langMixin } from '~/utils/lang'

export default {
  components: { EntityScope },

  mixins: [langMixin, DruxtEntityMixin, diffable],

  computed: {
    /** This entity as the draft helpers name it. */
    draftEntity() {
      return { type: this.entity.type, id: this.entity.id, langcode: this.lang }
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

  // The display carries no title: the page title block does, and this
  // template draws its own.
  druxt: {
    query: {
      fields: ['title'],
    },
  },
}
</script>
