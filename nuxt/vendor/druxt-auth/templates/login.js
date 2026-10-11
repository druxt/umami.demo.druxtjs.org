// The built path, not the `exports` map. Nuxt 2 is on webpack 4, which
// predates `exports` and resolves the literal path, and only `dist` and
// `templates` are published.
import DruxtAuthLogin from 'druxt-auth/dist/components/DruxtAuthLogin.vue'

export default {
  components: { DruxtAuthLogin },
  render(h) {
    return h(DruxtAuthLogin)
  },
}
