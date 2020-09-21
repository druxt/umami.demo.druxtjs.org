<template>
  <article>
    <b-row class="mb-4">
      <!-- Recipe category. -->
      <b-col sm="4">
        <slot name="field_recipe_category" />
      </b-col>

      <!-- Tags. -->
      <b-col>
        <slot name="field_tags" />
      </b-col>
    </b-row>

    <!-- Summary. -->
    <b-row class="mb-3">
      <b-col>
        <slot name="field_summary" />
      </b-col>
    </b-row>

    <b-row class="mb-3">
      <!-- Image. -->
      <b-col lg="6">
        <slot name="field_media_image" />
      </b-col>

      <b-col class="my-4">
        <b-row class="h-50 mb-3">
          <!-- Preperation time. -->
          <b-col cols="6" class="my-auto text-center">
            <slot name="field_preparation_time" />
          </b-col>

          <!-- Preperation time. -->
          <b-col cols="6" class="my-auto text-center">
            <slot name="field_cooking_time" />
          </b-col>
        </b-row>

        <b-row class="h-50 mb-3">
          <!-- Number of servings. -->
          <b-col cols="6" class="my-auto text-center">
            <slot name="field_number_of_servings" />
          </b-col>

          <!-- Difficulty. -->
          <b-col cols="6" class="my-auto text-center">
            <slot name="field_difficulty" :context="{ icon: true }" />
          </b-col>
        </b-row>
      </b-col>
    </b-row>

    <b-row class="my-3">
      <!-- Ingredients. -->
      <b-col md="4" class="mb-3">
        <slot name="field_ingredients" />
      </b-col>

      <!-- Recipe instruction. -->
      <b-col class="mb-3">
        <slot name="field_recipe_instruction" />
      </b-col>
    </b-row>
  </article>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],
}
</script>
