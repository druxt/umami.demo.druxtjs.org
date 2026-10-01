<template>
  <div class="druxt-cta">
    <b-container>
      <b-row>
        <b-col cols="12" lg="7">
          <span class="druxt-cta__kicker">{{ $t('cta.kicker') }}</span>
          <h2 class="mt-2">{{ $t('cta.title') }}</h2>
          <p class="mt-3 mb-3">{{ $t('cta.body') }}</p>
          <div class="druxt-cta__links d-none d-md-flex">
            <a :href="demo.source.href" rel="noopener" target="_blank"
              >GitHub</a
            >
            <a :href="demo.discord.href" rel="noopener" target="_blank">{{
              $t('demoBar.discord')
            }}</a>
            <a :href="storybookOrigin" rel="noopener" target="_blank"
              >Storybook</a
            >
            <a :href="demo.docs.href" rel="noopener" target="_blank">{{
              $t('demoBar.docs')
            }}</a>
          </div>
        </b-col>

        <b-col cols="12" lg="5" class="mt-4 mt-lg-0">
          <span class="druxt-cta__kicker d-none d-md-inline">{{
            $t('cta.startKicker')
          }}</span>
          <div class="druxt-cta__command mt-2">
            <span><span class="prompt">$</span> {{ command }}</span>
            <button
              class="druxt-cta__copy-btn"
              :data-state="copied ? 'copied' : null"
              type="button"
              @click="copy"
            >
              <span>{{ copied ? $t('cta.copied') : $t('cta.copy') }}</span>
              <span class="druxt-cta__copy-reserve" aria-hidden="true">{{
                $t('cta.copied')
              }}</span>
            </button>
          </div>
          <p class="druxt-cta__devpod mt-2 mb-0">
            {{ $t('cta.devpodBefore') }}
            <a :href="demo.devpod.href" rel="noopener" target="_blank">{{
              $t('cta.devpodLink')
            }}</a
            >{{ $t('cta.devpodAfter') }}
          </p>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
import { demoMixin } from '~/utils/demo'
import { storybookMixin } from '~/utils/storybook'
export default {
  mixins: [demoMixin, storybookMixin],

  data: () => ({ copied: false }),

  computed: {
    /** The quickstart command, as Drupal's config page gives it. */
    command: ({ demo }) => demo.quickstart,
  },

  methods: {
    async copy() {
      try {
        await navigator.clipboard.writeText(this.command)
        this.copied = true
        setTimeout(() => {
          this.copied = false
        }, 2000)
      } catch (e) {
        // Clipboard unavailable (insecure context) — leave the label alone.
      }
    },
  },
}
</script>
