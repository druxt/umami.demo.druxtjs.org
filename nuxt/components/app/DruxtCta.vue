<template>
  <div class="druxt-cta">
    <b-container>
      <b-row>
        <b-col cols="12" lg="7">
          <span class="druxt-cta__kicker">{{ $t('cta.kicker') }}</span>
          <h2 class="mt-2">{{ $t('cta.title') }}</h2>
          <p class="mt-3 mb-3">{{ $t('cta.body') }}</p>
          <div class="druxt-cta__links d-none d-md-flex">
            <a
              href="https://github.com/druxt/umami.demo.druxtjs.org"
              rel="noopener"
              target="_blank"
              >GitHub</a
            >
            <a
              href="https://discord.druxtjs.org"
              rel="noopener"
              target="_blank"
              >{{ $t('demoBar.discord') }}</a
            >
            <a
              href="https://storybook.umami.demo.druxtjs.org"
              rel="noopener"
              target="_blank"
              >Storybook</a
            >
            <a href="https://druxtjs.org" rel="noopener" target="_blank">{{
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
            <button type="button" @click="copy">
              {{ copied ? $t('cta.copied') : $t('cta.copy') }}
            </button>
          </div>
          <p class="druxt-cta__devpod mt-2 mb-0">
            {{ $t('cta.devpodBefore') }}
            <a
              href="https://devpod.sh/open#https://github.com/druxt/umami.demo.druxtjs.org"
              rel="noopener"
              target="_blank"
              >{{ $t('cta.devpodLink') }}</a
            >{{ $t('cta.devpodAfter') }}
          </p>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
export default {
  data: () => ({
    // The command druxtjs.org's front page gives for the quickstart.
    command: 'npx giget@1 gh:druxt/quickstart#develop my-druxt-site --install',
    copied: false,
  }),

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
