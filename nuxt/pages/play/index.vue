<template>
  <div class="go-front">
    <section class="go-hero">
      <b-container class="go-hero__inner">
        <div class="go-hero__copy">
          <p class="go-kicker" v-text="$t('play.kicker')" />
          <h1 class="go-hero__title">Umami Go</h1>
          <p class="go-hero__lede" v-text="$t('play.lede')" />

          <div class="go-hero__actions">
            <button
              type="button"
              class="go-button go-button--spice"
              :disabled="!ready || busy"
              @click="create"
              v-text="$t('play.start')"
            />
            <form class="go-join" @submit.prevent="join">
              <label for="go-code" class="go-join__label">{{
                $t('play.joinLabel')
              }}</label>
              <div class="go-join__row">
                <input
                  id="go-code"
                  v-model="code"
                  class="go-join__input"
                  maxlength="4"
                  autocomplete="off"
                  autocapitalize="characters"
                  spellcheck="false"
                  :placeholder="$t('play.codePlaceholder')"
                />
                <button
                  type="submit"
                  class="go-button go-button--outline-paper"
                  :disabled="code.trim().length !== 4"
                  v-text="$t('play.join')"
                />
              </div>
            </form>
          </div>
        </div>

        <!-- A fan of the game's cards: decoration, the guide below says
             what each kind is. -->
        <div class="go-hero__fan" aria-hidden="true">
          <AppGoCard
            v-for="(card, i) in fan"
            :key="card.kind"
            v-bind="card"
            class="go-hero__fan-card"
            :style="{ '--i': i - (fan.length - 1) / 2 }"
          />
        </div>
      </b-container>
    </section>

    <section class="go-guide">
      <b-container class="go-guide__inner">
        <div class="go-guide__rules">
          <h2 class="go-guide__heading" v-text="$t('play.howTo')" />
          <p v-text="$t('play.rules1')" />
          <p v-text="$t('play.rules2')" />
          <AppDruxtNote
            class="go-guide__note"
            :kicker="$t('note.howThisPageWorks')"
            >{{ $t('play.note') }}</AppDruxtNote
          >
        </div>

        <div class="go-guide__kinds">
          <h2 class="go-guide__heading" v-text="$t('play.kindsHeading')" />
          <ul class="go-kinds">
            <li
              v-for="kind in kinds"
              :key="kind"
              class="go-kinds__item"
              :class="`go-kinds__item--${kind}`"
            >
              <span class="go-kinds__icon">
                <img :src="`/umami-go/icons/${kind}.svg`" alt="" />
              </span>
              <span class="go-kinds__text">
                <strong v-text="$t(`play.kinds.${kind}.name`)" />
                <span v-text="$t(`play.kinds.${kind}.guide`)" />
              </span>
            </li>
          </ul>
        </div>
      </b-container>
    </section>
  </div>
</template>

<script>
export default {
  layout: 'game',

  data: () => ({ busy: false, code: '' }),

  head() {
    return { title: 'Umami Go' }
  },

  computed: {
    // The socket is the browser's; the generated page renders without it.
    ready: ({ $sockets }) => !!$sockets && $sockets.state.connected,
    kinds: () => [
      'dish',
      'sauce',
      'starter',
      'feast',
      'snack',
      'side',
      'dessert',
      'swap',
    ],
    fan() {
      return [
        {
          kind: 'starter',
          title: this.$t('play.fan.starter'),
          img: '/umami-go/fan/starter.jpg',
        },
        { kind: 'sauce' },
        {
          kind: 'feast',
          title: this.$t('play.fan.feast'),
          img: '/umami-go/fan/feast.jpg',
        },
        { kind: 'swap' },
        {
          kind: 'dessert',
          title: this.$t('play.fan.dessert'),
          img: '/umami-go/fan/dessert.jpg',
        },
      ]
    },
  },

  beforeDestroy() {
    if (this.off) this.off.forEach((off) => off())
  },

  methods: {
    create() {
      this.busy = true
      const channel = 'game:new'
      this.off = [
        this.$sockets.on('created', ({ channel: c, payload }) => {
          if (c !== channel) return
          this.$sockets.leave(channel)
          this.$router.push(`/play/${payload.code}`)
        }),
        this.$sockets.on('error', ({ channel: c, payload }) => {
          if (c !== channel) return
          this.busy = false
          this.$bvToast.toast(payload.message, {
            variant: 'warning',
            solid: true,
          })
        }),
      ]
      this.$sockets.join(channel)
      this.$sockets.send('create', channel, { langcode: this.$i18n.locale })
    },

    join() {
      this.$router.push(`/play/${this.code.trim().toUpperCase()}`)
    },
  },
}
</script>
