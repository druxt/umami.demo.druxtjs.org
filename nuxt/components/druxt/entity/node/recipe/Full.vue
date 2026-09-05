<template>
  <article>
    <b-row>
      <b-col cols="12" lg="7">
        <div
          class="d-flex flex-wrap align-items-center mb-3"
          style="gap: 0.5rem"
        >
          <slot name="field_recipe_category" />
          <slot name="field_tags" />
        </div>

        <h1>{{ entity.attributes.title }}</h1>

        <div class="field--field-summary mt-3">
          <slot name="field_summary" />
        </div>

        <div class="mt-4">
          <slot name="field_media_image" />
        </div>
      </b-col>

      <b-col cols="12" lg="5" class="mt-4 mt-lg-0 pl-lg-5">
        <!-- Prep / cook / servings / difficulty, as a single quiet block. -->
        <div class="stat-grid">
          <div class="stat-grid__cell">
            <span class="stat-grid__label">Preparation</span>
            <span class="stat-grid__value">
              <slot name="field_preparation_time" />
            </span>
          </div>
          <div class="stat-grid__cell">
            <span class="stat-grid__label">Cooking</span>
            <span class="stat-grid__value">
              <slot name="field_cooking_time" />
            </span>
          </div>
          <div class="stat-grid__cell">
            <span class="stat-grid__label">Serves</span>
            <span class="stat-grid__value">
              <slot name="field_number_of_servings" />
            </span>
          </div>
          <div class="stat-grid__cell">
            <span class="stat-grid__label">Difficulty</span>
            <span class="stat-grid__value">
              <slot name="field_difficulty" />
            </span>
          </div>
        </div>

        <!-- No `full`: this component is the full renderer, so selecting it
             would nest another one, with its own switcher, form and drawer. -->
        <AppViewModeSwitcher
          class="mt-4"
          :modes="['card', 'teaser']"
          :type="entity.type"
          :uuid="entity.id"
        />

        <AppDevRegion
          class="mt-4"
          entity
          label="DruxtEntityForm"
          source="components/druxt/entity-form/node/Default.vue"
        >
          <div
            style="
              border: 1px solid #e6ddcd;
              border-radius: 8px;
              overflow: hidden;
            "
          >
            <button
              v-b-toggle.recipe-edit
              class="d-flex align-items-center justify-content-between w-100 text-left"
              style="
                background: #faf4ea;
                border: 0;
                padding: 0.875rem 1.125rem;
                font-size: 0.8438rem;
                font-weight: 600;
                color: #55504a;
              "
              type="button"
            >
              Edit this recipe
              <span
                style="
                  font-family: 'IBM Plex Mono', monospace;
                  font-size: 0.6875rem;
                  color: #0678be;
                "
              >
                DruxtEntityForm
              </span>
            </button>
            <b-collapse id="recipe-edit">
              <div class="p-3">
                <DruxtEntityForm :type="entity.type" :uuid="entity.id" />
                <p class="mb-0 mt-2" style="font-size: 0.75rem; color: #8a7f70">
                  Saving writes back to Drupal over JSON:API. The demo backend
                  resets nightly.
                </p>
              </div>
            </b-collapse>
          </div>
        </AppDevRegion>

        <AppJsonApiDrawer class="mt-3" :path="jsonApiPath" />
      </b-col>
    </b-row>

    <b-row class="mt-5">
      <b-col cols="12" md="4">
        <h2>Ingredients</h2>
        <slot name="field_ingredients" />
      </b-col>

      <b-col cols="12" md="8" class="mt-4 mt-md-0 pl-md-5">
        <h2>Method</h2>
        <slot name="field_recipe_instruction" />
      </b-col>
    </b-row>

    <AppDruxtNote
      class="mt-5"
      title="One component file renders every recipe on this site"
      cta="Read the Entity guide"
      href="https://druxtjs.org/modules/entity"
      :code="code"
    >
      Drupal's <em>full</em> display mode maps to this file. Change the layout
      here and all 24 recipes follow — the field templates, labels and
      formatters still come from Drupal's display config.
    </AppDruxtNote>
  </article>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],

  computed: {
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
