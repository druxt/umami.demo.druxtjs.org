<template>
  <div class="druxt-note">
    <span class="druxt-note__kicker">{{ $t('note.sameNode') }}</span>
    <p class="druxt-note__body mt-2">{{ $t('note.viewModes') }}</p>

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

    <div
      class="view-modes__stage mt-3 p-2"
      style="background: #fdfbf7; border: 1px solid #d8e8f4; border-radius: 6px"
    >
      <AppSteadyBox :swap="mode">
        <DruxtEntity :key="mode" :mode="mode" :type="type" :uuid="uuid" />
      </AppSteadyBox>
    </div>

    <a
      class="druxt-note__link d-inline-block mt-3"
      :href="`${storybookOrigin}/?path=/story/${entityStoryId(type, mode)}`"
      rel="noopener"
      target="_blank"
    >
      {{ $t('note.openInStorybook', { mode }) }}
    </a>
  </div>
</template>

<script>
import { entityStoryId, storybookMixin } from '~/utils/storybook'

export default {
  mixins: [storybookMixin],

  props: {
    type: {
      type: String,
      required: true,
    },

    uuid: {
      type: String,
      required: true,
    },

    /**
     * `full` is deliberately absent: this switcher renders a DruxtEntity, so
     * offering `full` from inside a full renderer nests another copy of it.
     * Pass it explicitly only where that cannot happen.
     */
    modes: {
      type: Array,
      default: () => ['card', 'teaser'],
    },
  },

  data: ({ modes }) => ({
    mode: modes[0],
  }),
  methods: { entityStoryId },
}
</script>
