<template>
  <b-form class="edit-form" novalidate @submit.prevent="$parent.onSubmit()">
    <AppEditFormErrors :errors="errors" :fields="fieldLabels" />

    <b-overlay :show="submitting" class="edit-form__content">
      <!-- Content, in reading order. -->
      <slot name="title" />
      <slot name="field_media_image" />
      <slot name="field_summary" />
      <slot name="field_ingredients" />
      <slot name="field_recipe_instruction" />
      <slot name="field_recipe_category" />
      <slot name="field_tags" />

      <div class="edit-form__numbers">
        <slot name="field_preparation_time" />
        <slot name="field_cooking_time" />
        <slot name="field_number_of_servings" />
        <slot name="field_difficulty" />
      </div>

      <!-- Everything that is not the recipe, closed by default. -->
      <details class="edit-form__settings">
        <summary>{{ $t('form.settings') }}</summary>
        <div class="edit-form__settings-body">
          <slot name="path" />
          <slot name="status" />
          <slot name="promote" />
          <slot name="sticky" />
          <slot name="uid" />
          <slot name="created" />
          <slot name="moderation_state" />
          <slot name="langcode" />
        </div>
      </details>
    </b-overlay>

    <div class="edit-form__actions">
      <slot name="buttons" />
    </div>
  </b-form>
</template>

<script>
import { BOverlay } from 'bootstrap-vue'
import editForm from '~/utils/edit-form'

export default {
  components: { BOverlay },

  mixins: [editForm],
}
</script>
