<template>
  <!-- Shown while this tab follows an unsaved Manage display form in Drupal. -->
  <div
    v-if="$displayPreview && $displayPreview.state.key"
    class="display-preview"
    role="status"
  >
    <span class="display-preview__dot" aria-hidden="true" />
    <span class="display-preview__text">
      Previewing Drupal's unsaved display
      <template v-if="$displayPreview.state.draft">
        · <code v-text="$displayPreview.state.draft.schemaId" /> · updated
        {{ $displayPreview.state.at.toLocaleTimeString() }}
      </template>
      <template v-else> · waiting for a change in Drupal</template>
    </span>
    <button
      type="button"
      class="display-preview__stop"
      @click="$displayPreview.stop()"
    >
      Stop previewing
    </button>
  </div>
</template>
