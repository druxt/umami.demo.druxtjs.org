<template>
  <!-- A QR code of a link, drawn as SVG in the browser: the generated page
       has no table to point at. -->
  <div class="go-qr" role="img" :aria-label="label">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="svg" class="go-qr__code" v-html="svg" />
  </div>
</template>

<script>
export default {
  props: {
    url: { type: String, required: true },
    label: { type: String, default: '' },
  },

  data: () => ({ svg: '' }),

  watch: {
    url: 'draw',
  },

  mounted() {
    this.draw()
  },

  methods: {
    async draw() {
      const { toString } = await import('qrcode')
      this.svg = await toString(this.url, {
        type: 'svg',
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#241f1aff', light: '#fdfbf7ff' },
      })
    },
  },
}
</script>
