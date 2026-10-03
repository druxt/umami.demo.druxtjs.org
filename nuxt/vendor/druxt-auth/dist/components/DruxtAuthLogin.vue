<script>

import DruxtModule from 'druxt/dist/components/DruxtModule.vue'

/**
 * Renders a sign-in form for a Druxt authentication strategy.
 *
 * What it offers depends on what the strategy can do. A strategy that takes
 * credentials gets a username and password form; one that cannot gets a
 * button that starts the redirect. The component asks the strategy rather
 * than assuming, so a site on plain `oauth2` is not shown fields that cannot
 * work.
 *
 * @example @lang vue
 * <DruxtAuthLogin />
 *
 * @example <caption>A different strategy, and where to land</caption> @lang vue
 * <DruxtAuthLogin strategy="drupal-password" redirect="/account" />
 *
 * @example <caption>Wrapper component boilerplate</caption> @lang vue
 * <template>
 *   <form @submit.prevent="submit">
 *     <input v-model="credentials.name">
 *     <input v-model="credentials.pass" type="password">
 *     <button :disabled="busy">Sign in</button>
 *   </form>
 * </template>
 * <script>
 * export default {
 *   props: ['credentials', 'busy', 'error', 'reset', 'capabilities', 'submit', 'resetPassword']
 * }
 */
export default {
  name: 'DruxtAuthLogin',

  extends: DruxtModule,

  /** */
  props: {
    /**
     * Where to send the visitor after a successful sign in.
     *
     * Unset leaves the redirect to the auth module's own configuration.
     *
     * @type {string}
     */
    redirect: {
      type: String,
      default: undefined,
    },

    /**
     * The authentication strategy to sign in with.
     *
     * Unset uses the configured default. A site whose public Drupal URL
     * differs from the internal one has to register its own strategy under
     * its own name, so a hardcoded name here would break exactly those
     * sites.
     *
     * @type {string}
     */
    strategy: {
      type: String,
      default: undefined,
    },
  },

  /** */
  data: () => ({
    /** The visitor's input. Local state on purpose: a store module here would
     * fight a site that has its own. */
    credentials: { name: '', pass: '' },
    /** A submission is in flight. */
    busy: false,
    /** A message fit to show a reader, or null. */
    error: null,
    /** A password reset has been requested. */
    reset: false,
  }),

  /** */
  computed: {
    /**
     * The strategy in use: the prop, else whatever is configured as default.
     *
     * @return {string}
     */
    strategyName() {
      return this.strategy || ((this.$auth || {}).options || {}).defaultStrategy
    },

    /**
     * What this strategy can actually do.
     *
     * Credentials reach Drupal on the session cookie, so they only work
     * same-origin. Without the proxy the form would die at the authorize
     * step, and the redirect is the honest fallback.
     *
     * @return {object} `{ credentials, resetPassword }`.
     */
    capabilities() {
      const scheme =
        ((this.$auth || {}).strategies || {})[this.strategyName] || {}
      const endpoints = (scheme.options || {}).endpoints || {}
      return {
        credentials:
          (scheme.options || {}).credentials !== false &&
          typeof scheme.drupalLogin === 'function',
        resetPassword:
          typeof scheme.resetPassword === 'function' &&
          !!endpoints.passwordReset,
      }
    },
  },

  /** */
  methods: {
    /**
     * Signs in, and normalises whatever comes back.
     *
     * @fires submit
     * @fires success
     * @fires error
     */
    async submit() {
      if (this.busy) return
      this.busy = true
      this.error = null
      // The username only. A listener wiring this to analytics or a
      // breadcrumb must not receive the password, and devtools records every
      // emitted payload.
      this.$emit('submit', { name: this.credentials.name })

      try {
        const options = this.capabilities.credentials
          ? { credentials: { ...this.credentials } }
          : {}
        await this.$auth.loginWith(this.strategyName, options)
        this.credentials.pass = ''
        this.$emit('success')
        if (this.redirect) this.$router.push(this.redirect)
      } catch (error) {
        this.error = this.readError(error)
        if (this.error) this.$emit('error', this.error)
      } finally {
        this.busy = false
      }
    },

    /**
     * Turns a failure into something worth showing a reader.
     *
     * Drupal answers the same status for unrelated reasons, and one of them
     * is not a failure at all, so the status alone decides nothing.
     *
     * @param {Error} error - Whatever was thrown.
     * @return {string|null} The message, or null when there is nothing to say.
     */
    readError(error) {
      const response = (error || {}).response || {}
      const status = response.status
      const message = ((response.data || {}).message || '').toString()

      // A Drupal session is already open, so the scheme refused these
      // credentials rather than sign the reader in as whoever left it. That
      // is the one case where the reader has something to do about it.
      if (
        (error || {}).sessionInUse ||
        (status === 403 && /anonymous users/i.test(message))
      ) {
        return 'A Drupal session is already open in this browser. Sign out of it first.'
      }

      // The credentials were right and the authorisation was refused. Saying
      // "wrong password" here sends a reader in the wrong direction.
      if (
        /access_denied/i.test(message) ||
        /denied the request/i.test(message)
      ) {
        return 'This account is not permitted to sign in here.'
      }

      // Every other answer from the site gets the same message, whatever its
      // status. Drupal answers 400 for a username with no enabled account and
      // 429 once an existing one trips flood control, so a message per status
      // would tell an attacker which usernames are real. It also never
      // repeats Drupal's own text, which names the account.
      if (status) {
        return 'Check the username and password, then try again. Repeated attempts are blocked for a while.'
      }

      // No answer at all, so nothing is known about the account.
      return 'Sign in failed. Try again.'
    },

    /**
     * Asks Drupal to email a reset link.
     *
     * The answer is the same whether or not the account exists: Drupal's own
     * message says which, and that is an account enumeration oracle.
     *
     * @fires reset
     */
    async resetPassword() {
      if (this.busy) return
      this.busy = true
      this.error = null

      try {
        const scheme = this.$auth.strategies[this.strategyName]
        await scheme.resetPassword(this.credentials.name)
        this.reset = true
      } catch (error) {
        // A transport failure is worth reporting. A rejection from Drupal is
        // not, because it says whether the account exists.
        if (((error || {}).response || {}).status) {
          this.reset = true
        } else {
          this.error = 'Could not reach the site. Try again.'
        }
      } finally {
        this.busy = false
        this.$emit('reset')
      }
    },
  },

  /** */
  druxt: {
    /**
     * Component naming options, most specific first, so a site can theme one
     * strategy without taking on the rest.
     *
     * @return {ComponentOptions}
     */
    componentOptions: ({ strategyName }) => [[strategyName], ['default']],

    /**
     * Props for the wrapper component.
     *
     * @return {PropsData}
     */
    propsData: (vm) => ({
      busy: vm.busy,
      capabilities: vm.capabilities,
      credentials: vm.credentials,
      error: vm.error,
      reset: vm.reset,
      // Without these a wrapper can render the form and never submit it.
      submit: vm.submit,
      resetPassword: vm.resetPassword,
    }),

    /**
     * The default slot renders a form the strategy can actually satisfy.
     *
     * @return {ScopedSlots}
     */
    slots(h) {
      const field = (type, key, label) =>
        h('label', [
          label,
          h('input', {
            attrs: {
              type,
              name: key,
              autocomplete: key === 'pass' ? 'current-password' : 'username',
            },
            domProps: { value: this.credentials[key] },
            on: {
              input: (event) => {
                this.credentials[key] = event.target.value
              },
            },
          }),
        ])

      return {
        default: () => {
          const children = []

          if (this.error) {
            children.push(h('div', { attrs: { role: 'alert' } }, [this.error]))
          }

          if (this.capabilities.credentials) {
            children.push(field('text', 'name', 'Username'))
            children.push(field('password', 'pass', 'Password'))
          }

          children.push(
            h(
              'button',
              { attrs: { type: 'submit', disabled: this.busy || null } },
              [this.capabilities.credentials ? 'Sign in' : 'Continue to Drupal']
            )
          )

          if (this.capabilities.resetPassword) {
            children.push(
              this.reset
                ? h('p', [
                    'If that account exists, a reset link is on its way.',
                  ])
                : h(
                    'button',
                    {
                      attrs: { type: 'button', disabled: this.busy || null },
                      on: { click: this.resetPassword },
                    },
                    ['Reset password']
                  )
            )
          }

          return h(
            'form',
            {
              // A form with no method is a GET, and the submit listener below
              // does not exist until hydration. Without this, submitting
              // early puts the password in the URL, the history and the logs.
              attrs: { method: 'post' },
              on: {
                submit: (event) => {
                  event.preventDefault()
                  this.submit()
                },
              },
            },
            children
          )
        },
      }
    },
  },
}
</script>
