<template>
  <div v-if="open" class="debug-panel">
    <p class="debug-panel__row"><b>UA</b> {{ ua }}</p>
    <p class="debug-panel__row">
      <b>Hydrated</b> {{ hydrated ? 'yes' : 'no' }} · <b>build</b> {{ build }}
    </p>
    <p class="debug-panel__row">
      <b>Chunks</b> {{ chunks.ok }} loaded, {{ chunks.failed }} failed
    </p>
    <p v-if="!errors.length" class="debug-panel__row">No errors recorded.</p>
    <p
      v-for="(e, i) of errors"
      :key="i"
      class="debug-panel__row debug-panel__row--error"
    >
      <b>{{ e.kind }}</b> {{ e.detail }}
    </p>
    <button class="debug-panel__close" type="button" @click="open = false">
      close
    </button>
  </div>
</template>

<script>
/** What a phone cannot show in a console: opened by `#debug` on the URL. */
export default {
  data: () => ({
    open: false,
    hydrated: false,
    errors: [],
    chunks: { ok: 0, failed: 0 },
    ua: '',
    build: '',
  }),

  mounted() {
    this.hydrated = true
    this.ua = navigator.userAgent
    this.build = (window.__NUXT__ || {}).staticAssetsBase || ''
    const check = () => {
      this.open = window.location.hash === '#debug'
      this.errors = [...(window.__umamiErrors || [])]
      const entries = performance
        .getEntriesByType('resource')
        .filter((r) => r.name.includes('/_nuxt/'))
      this.chunks = {
        ok: entries.filter((r) =>
          r.responseStatus
            ? r.responseStatus < 400
            : r.transferSize !== 0 || r.decodedBodySize > 0
        ).length,
        failed: entries.filter((r) =>
          r.responseStatus ? r.responseStatus >= 400 : false
        ).length,
      }
    }
    check()
    this.check = check
    window.addEventListener('hashchange', check)
    this.timer = setInterval(check, 2000)
  },

  beforeDestroy() {
    clearInterval(this.timer)
    window.removeEventListener('hashchange', this.check)
  },
}
</script>
