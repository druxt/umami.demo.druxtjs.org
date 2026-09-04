<template>
  <div class="druxt-cta">
    <b-container>
      <b-row>
        <b-col cols="12" lg="7">
          <span class="druxt-cta__kicker">Built with DruxtJS</span>
          <h2 class="mt-2">
            This whole magazine is one Drupal site and one Nuxt app
          </h2>
          <p class="mt-3 mb-3">
            Blocks, menus, views, breadcrumbs, entity forms and search all come
            straight from Drupal's JSON:API. You override a component only when
            you want to.
          </p>
          <div class="druxt-cta__links">
            <a href="https://github.com/druxt/umami.demo.druxtjs.org" rel="noopener" target="_blank">GitHub</a>
            <a href="https://discord.druxtjs.org" rel="noopener" target="_blank">Discord</a>
            <a href="https://storybook.umami.demo.druxtjs.org" rel="noopener" target="_blank">Storybook</a>
            <a href="https://druxtjs.org" rel="noopener" target="_blank">Docs</a>
          </div>
        </b-col>

        <b-col cols="12" lg="5" class="mt-4 mt-lg-0">
          <span class="druxt-cta__kicker">Start your own in one command</span>
          <div class="druxt-cta__command mt-2">
            <span><span class="prompt">$</span> {{ command }}</span>
            <button type="button" @click="copy">
              {{ copied ? 'copied' : 'copy' }}
            </button>
          </div>
          <p class="mt-2 mb-0" style="font-size: 0.78125rem">
            Or open this exact site in Gitpod — backend, frontend and demo
            content included.
          </p>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
export default {
  data: () => ({
    command: 'npx create-druxt-app@latest',
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
