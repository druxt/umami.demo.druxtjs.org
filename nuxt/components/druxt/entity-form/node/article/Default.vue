<template>
  <b-form class="form-page">
    <span class="form-page__kicker">Authenticated write</span>
    <h1 class="form-page__title">Submit an article</h1>
    <p class="form-page__blurb">
      Signed in, the same form machinery that renders content creates it.
    </p>

    <b-overlay :show="submitting">
      <b-alert v-if="errors.length" :show="true" variant="warning">
        <VueJsonPretty :data="errors" />
      </b-alert>
      <slot />
    </b-overlay>

    <AppDruxtNote
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
}
</script>
