<template>
  <div class="druxt-note">
    <span class="druxt-note__kicker">Same node, other view modes</span>
    <p class="druxt-note__body mt-2">
      Drupal's display modes are components here. Switch one and the page
      re-renders from the entity already in the store — no second request.
    </p>

    <div class="view-modes mt-3">
      <button
        v-for="option of modes"
        :key="option"
        type="button"
        :class="{ 'is-active': option === mode }"
        @click="mode = option"
      >
        {{ option }}
      </button>
    </div>

    <div class="mt-3 p-2" style="background: #fdfbf7; border: 1px solid #d8e8f4; border-radius: 6px">
      <DruxtEntity :key="mode" :mode="mode" :type="type" :uuid="uuid" />
    </div>

    <a
      class="druxt-note__link d-inline-block mt-3"
      :href="`https://storybook.umami.demo.druxtjs.org/?path=/story/entity-${mode}`"
      rel="noopener"
      target="_blank"
    >
      Open {{ mode }} in Storybook →
    </a>
  </div>
</template>

<script>
export default {
  props: {
    type: {
      type: String,
      required: true,
    },

    uuid: {
      type: String,
      required: true,
    },

    modes: {
      type: Array,
      default: () => ['card', 'teaser', 'full'],
    },
  },

  data: ({ modes }) => ({
    mode: modes[0],
  }),
}
</script>
