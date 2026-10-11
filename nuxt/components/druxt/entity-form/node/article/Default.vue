<template>
  <b-form class="edit-form" novalidate @submit.prevent="$parent.onSubmit()">
    <!-- A new article gets the page's head; an existing one is the Edit tab. -->
    <template v-if="creating">
      <span class="form-page__kicker">Authenticated write</span>
      <h1 class="form-page__title">Submit an article</h1>
      <p class="form-page__blurb">
        Signed in, the same form machinery that renders content creates it.
      </p>
    </template>

    <AppEditFormErrors :errors="errors" :fields="fieldLabels" />

    <b-overlay :show="submitting" class="edit-form__layout">
      <div class="edit-form__content">
        <slot name="title" />
        <slot name="field_media_image" />
        <slot name="field_body" />
        <slot name="field_tags" />

        <div class="edit-form__actions">
          <slot name="buttons" />
        </div>
      </div>

      <aside class="edit-form__aside">
        <details class="edit-form__settings" :open="wide">
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
      </aside>
    </b-overlay>

    <AppDruxtNote
      v-if="creating"
      file="entity-form/node/article/Default.vue"
      kicker="How this works"
    >
      The article is saved unpublished, then previewed through
      <code>node/preview</code> in the same view modes the site already renders.
    </AppDruxtNote>
  </b-form>
</template>

<script>
import NodeEditForm from '../Default.vue'

export default {
  extends: NodeEditForm,

  computed: {
    creating: ({ $parent }) => !($parent.entity || {}).id,
  },
}
</script>
