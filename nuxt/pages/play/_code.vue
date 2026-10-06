<template>
  <div class="go-table" :class="`go-table--${phase}`">
    <!-- The game bar takes the masthead's place once a table is open. -->
    <header class="go-bar">
      <b-container class="go-bar__inner">
        <nuxt-link
          v-if="phase === 'lobby'"
          to="/play"
          class="go-bar__leave go-bar__leave--start"
          >{{ $t('play.leave') }}</nuxt-link
        >
        <span class="go-bar__word">Umami Go</span>
        <span class="go-bar__meta">
          <span
            v-if="phase === 'picking'"
            class="go-bar__turn"
            v-text="turnLine"
          />
          <span
            v-else-if="phase === 'over'"
            class="go-bar__turn"
            v-text="$t('play.gameOver')"
          />
          <span class="go-bar__code" v-text="codeLabel" />
          <nuxt-link to="/play" class="go-bar__leave">{{
            $t('play.leave')
          }}</nuxt-link>
        </span>
      </b-container>
    </header>

    <!-- No such table, or not one this browser can sit at. -->
    <b-container v-if="!game" class="go-missing">
      <p v-if="error" v-text="error" />
      <p v-else v-text="$t('play.finding')" />
      <nuxt-link to="/play" class="go-button go-button--outline">{{
        $t('play.backToPlay')
      }}</nuxt-link>
    </b-container>

    <!-- The lobby: the QR code is the biggest thing on the screen, so the
         host's phone can go in the middle of the table. -->
    <b-container v-else-if="phase === 'lobby'" class="go-lobby">
      <div class="go-lobby__join">
        <p class="go-lobby__scan d-lg-none" v-text="$t('play.scan')" />
        <AppGoQr
          class="go-lobby__qr"
          :url="tableUrl"
          :label="$t('play.qrLabel', { code })"
        />
        <div class="go-lobby__code-block">
          <p
            class="go-lobby__scan d-none d-lg-block"
            v-text="$t('play.scanOr', { host: playUrl })"
          />
          <p class="go-lobby__code" :aria-label="spelled" v-text="code" />
          <button
            type="button"
            class="go-button go-button--outline go-button--small"
            @click="copy"
            v-text="copied ? $t('play.copied') : $t('play.copyLink')"
          />
        </div>
      </div>

      <section class="go-lobby__seats">
        <h2 class="go-lobby__heading">
          {{ $t('play.atTheTable') }}
          <span
            class="go-lobby__count"
            v-text="
              $t('play.seatCount', {
                n: game.players.length,
                max: game.maxPlayers,
              })
            "
          />
        </h2>
        <ul class="go-lobby__list">
          <li
            v-for="(p, i) in game.players"
            :key="p.id"
            class="go-lobby__player"
          >
            <AppGoAvatar :name="p.name" :seat="i" />
            <span class="go-lobby__name" v-text="p.name" />
            <span class="go-lobby__tag" v-text="tagFor(p)" />
          </li>
          <li v-if="seatsLeft" class="go-lobby__player go-lobby__player--empty">
            <span class="go-avatar go-avatar--empty" aria-hidden="true" />
            <span
              class="go-lobby__name"
              v-text="$tc('play.seatsLeft', seatsLeft, { n: seatsLeft })"
            />
          </li>
        </ul>

        <div class="go-lobby__deal">
          <template v-if="isHost">
            <button
              type="button"
              class="go-button go-button--spice go-button--block"
              :disabled="game.players.length < 2"
              @click="send('start')"
              v-text="$t('play.deal', { n: game.players.length })"
            />
            <p
              v-if="game.players.length < 2"
              class="go-lobby__hint"
              v-text="$t('play.needTwo')"
            />
          </template>
          <p
            v-else
            class="go-lobby__waiting"
            v-text="$t('play.waitingToDeal', { name: hostName })"
          />
        </div>
      </section>
    </b-container>

    <!-- The table, mid-turn: everyone's seat, then your hand. -->
    <div v-else-if="phase === 'picking'" class="go-play">
      <section class="go-seats-band">
        <b-container>
          <p class="go-status">
            <span class="go-status__dot" aria-hidden="true" />
            <span v-text="statusLine" />
          </p>
          <ul class="go-seats">
            <li
              v-for="(p, i) in game.players"
              :key="p.id"
              class="go-seat"
              :class="{ 'is-you': p.id === game.you }"
            >
              <div class="go-seat__head">
                <AppGoAvatar :name="p.name" :seat="i" :size="32" />
                <span class="go-seat__who">
                  <span class="go-seat__name">{{
                    p.id === game.you
                      ? $t('play.youName', { name: p.name })
                      : p.name
                  }}</span>
                  <span
                    class="go-seat__state"
                    v-text="p.picked ? $t('play.picked') : $t('play.choosing')"
                  />
                </span>
                <span class="go-seat__score" v-text="p.score" />
              </div>
              <div class="go-seat__cards">
                <AppGoCard
                  v-for="(card, n) in p.played"
                  :key="card.id"
                  v-bind="cardProps(card)"
                  size="sm"
                  state="played"
                  :class="{
                    'is-revealed': revealed && n >= p.played.length - newCards,
                  }"
                  :style="{ '--seat': i }"
                />
                <AppGoCard v-if="p.picked" kind="dish" size="sm" state="back" />
              </div>
              <p
                v-if="hasSwap(p)"
                class="go-seat__swap"
                v-text="
                  p.id === game.you
                    ? $t('play.swapReadyYou')
                    : $t('play.swapReady')
                "
              />
            </li>
          </ul>
        </b-container>
      </section>

      <section class="go-hand-band">
        <b-container>
          <h2 class="go-hand__heading">
            {{ $t('play.yourHand') }}
            <span
              class="go-hand__meta"
              v-text="
                game.from && game.turn > 1
                  ? $tc('play.handFrom', game.hand.length, {
                      n: game.hand.length,
                      name: game.from,
                    })
                  : $tc('play.handCount', game.hand.length, {
                      n: game.hand.length,
                    })
              "
            />
          </h2>
          <p
            v-if="passedFrom"
            class="go-hand__passed"
            aria-live="polite"
            v-text="$t('play.passedFrom', { name: passedFrom })"
          />
          <ul class="go-hand" :class="{ 'is-passing': passing }">
            <li v-for="(card, i) in game.hand" :key="card.id">
              <button
                type="button"
                class="go-hand__card"
                :aria-pressed="chosen.includes(i) ? 'true' : 'false'"
                :aria-label="cardLabel(card)"
                @click="choose(i)"
              >
                <AppGoCard v-bind="cardProps(card)" :state="handState(i)" />
              </button>
            </li>
          </ul>

          <div class="go-hand__actions">
            <label v-if="canSwap" class="go-swap">
              <img
                src="/umami-go/icons-ink/swap.svg"
                alt=""
                class="go-swap__icon"
              />
              <span v-text="$t('play.useSwap')" />
              <input
                v-model="useSwap"
                type="checkbox"
                role="switch"
                class="go-swap__switch"
                @change="chosen = chosen.slice(0, 1)"
              />
            </label>
            <button
              type="button"
              class="go-button go-button--ink go-button--block go-lock"
              :disabled="!canLock"
              @click="lockIn"
              v-text="lockLabel"
            />
          </div>
        </b-container>
      </section>
    </div>

    <!-- Scores: after each round, and at the end with the winner. -->
    <div v-else class="go-scores">
      <section class="go-scores__winner">
        <AppGoAvatar
          :name="leader.name"
          :seat="seatOf(leader)"
          :size="84"
          class="go-scores__avatar"
        />
        <h2
          class="go-scores__line"
          v-text="
            phase === 'over'
              ? $t('play.wins', { name: leader.name })
              : $t('play.leads', { name: leader.name, round: game.round })
          "
        />
        <p class="go-scores__points" v-text="leadLine" />
        <div
          v-if="leader.played && leader.played.length"
          class="go-scores__last"
        >
          <div class="go-scores__last-cards">
            <AppGoCard
              v-for="card in leader.played"
              :key="card.id"
              v-bind="cardProps(card)"
              size="sm"
              state="played"
            />
          </div>
          <p v-text="$t('play.lastRound', { name: leader.name })" />
        </div>
      </section>

      <section class="go-scores__table">
        <table class="go-score-table">
          <thead>
            <tr>
              <th scope="col" v-text="$t('play.player')" />
              <th v-for="r in game.rounds" :key="r" scope="col" class="num">
                <span class="d-none d-lg-inline">{{
                  $t('play.roundN', { n: r })
                }}</span>
                <span class="d-lg-none">R{{ r }}</span>
              </th>
              <th scope="col" class="num">
                <span class="d-none d-lg-inline">{{
                  $t('play.desserts')
                }}</span>
                <img
                  src="/umami-go/icons-ink/dessert.svg"
                  :alt="$t('play.desserts')"
                  class="d-lg-none go-score-table__icon"
                />
              </th>
              <th scope="col" class="num total" v-text="$t('play.total')" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in ranked" :key="p.id">
              <th scope="row">
                <span class="go-score-table__who">
                  <AppGoAvatar
                    :name="p.name"
                    :seat="seatOf(p)"
                    :size="32"
                    class="d-none d-lg-inline-flex"
                  />
                  <span v-text="p.name" />
                </span>
              </th>
              <td v-for="r in game.rounds" :key="r" class="num">
                {{ p.rounds[r - 1] !== undefined ? p.rounds[r - 1] : '' }}
              </td>
              <td class="num" v-text="dessertCell(p)" />
              <td class="num total" v-text="p.score" />
            </tr>
          </tbody>
        </table>

        <div class="go-scores__actions">
          <template v-if="isHost">
            <button
              v-if="phase === 'scored'"
              type="button"
              class="go-button go-button--spice"
              @click="send('next')"
              v-text="$t('play.nextRound')"
            />
            <button
              v-else
              type="button"
              class="go-button go-button--spice"
              @click="send('again')"
              v-text="$t('play.playAgain')"
            />
          </template>
          <p
            v-else
            class="go-lobby__waiting"
            v-text="
              $t(
                phase === 'scored' ? 'play.waitingNext' : 'play.waitingAgain',
                {
                  name: hostName,
                }
              )
            "
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { seoHead } from '~/utils/seo'

/** How long a reveal and a pass take to settle, in milliseconds. */
const SETTLE = 900

export default {
  layout: 'table',

  data: () => ({
    game: null,
    error: '',
    chosen: [],
    useSwap: false,
    copied: false,
    revealed: false,
    newCards: 0,
    passing: false,
    passedFrom: '',
  }),

  // The server writes the same invitation for a link preview; this keeps
  // the head right once the app has the page.
  head() {
    return seoHead({
      origin: this.$config.siteOrigin,
      path: this.$route.path,
      title: `Umami Go: join table ${this.code}`,
      description:
        "You're invited to a game of Umami Go: draft the magazine's recipes into the best meal at the table.",
      card: '/og/umami-go.png',
      robots: 'noindex',
    })
  },

  computed: {
    code: ({ $route }) => String($route.params.code || '').toUpperCase(),
    channel: ({ code }) => `game:${code}`,
    phase: ({ game }) => (game ? game.phase : 'missing'),
    isHost: ({ game, $sockets }) =>
      !!game && !!$sockets && game.host === $sockets.state.id,
    me: ({ game }) =>
      game ? game.players.find((p) => p.id === game.you) : null,
    hostName: ({ game }) =>
      ((game && game.players.find((p) => p.id === game.host)) || {}).name || '',
    seatsLeft: ({ game }) =>
      game ? Math.max(0, game.maxPlayers - game.players.length) : 0,
    canSwap: ({ me }) => !!me && me.played.some((c) => c.kind === 'swap'),
    ranked: ({ game }) =>
      game ? [...game.players].sort((a, b) => b.score - a.score) : [],
    leader: ({ ranked }) => ranked[0] || { name: '', score: 0 },
    codeLabel() {
      return this.phase === 'lobby'
        ? this.code
        : this.$t('play.tableCode', { code: this.code })
    },
    turnLine() {
      return this.$t('play.turnLine', {
        round: this.game.round,
        rounds: this.game.rounds,
        turn: this.game.turn,
      })
    },
    /** The code read out one character at a time, for a screen reader. */
    spelled: ({ code }) => code.split('').join(' '),
    tableUrl() {
      return `${this.origin}/play/${this.code}`
    },
    playUrl() {
      return `${this.origin.replace(/^https?:\/\//, '')}/play`
    },
    origin() {
      return process.client ? window.location.origin : ''
    },
    /** Who is still choosing, in the page's language. */
    statusLine() {
      const waiting = this.game.players.filter((p) => !p.picked)
      if (!waiting.length) return this.$t('play.revealing')
      if (waiting.length === 1 && waiting[0].id === this.game.you)
        return this.$t('play.youChoosing')
      const names = waiting.map((p) =>
        p.id === this.game.you ? this.$t('play.you') : p.name
      )
      const list = new Intl.ListFormat(this.$i18n.locale, {
        type: 'conjunction',
      }).format(names)
      return this.$tc('play.stillChoosing', names.length, { names: list })
    },
    canLock() {
      if (!this.me || this.me.picked) return false
      return this.chosen.length === (this.useSwap ? 2 : 1)
    },
    lockLabel() {
      if (this.me && this.me.picked) return this.$t('play.lockedIn')
      const titles = this.chosen.map((i) => this.titleOf(this.game.hand[i]))
      if (!titles.length) return this.$t('play.pickACard')
      if (this.useSwap && titles.length < 2)
        return this.$t('play.pickSecond', { name: titles[0] })
      return this.$t('play.lockIn', {
        names: new Intl.ListFormat(this.$i18n.locale, {
          type: 'conjunction',
        }).format(titles),
      })
    },
    leadLine() {
      const [first, second] = this.ranked
      const points = this.$tc('play.points', first.score, { n: first.score })
      if (!second || first.score === second.score) return points
      return this.$t('play.ahead', {
        points,
        n: first.score - second.score,
        name: second.name,
      })
    },
  },

  watch: {
    code() {
      this.game = null
      this.error = ''
    },
  },

  mounted() {
    this.off = [
      this.$sockets.on('game', ({ channel, payload }) =>
        this.receive(channel, payload)
      ),
      this.$sockets.on('error', ({ channel, payload }) => {
        if (channel !== this.channel) return
        this.error = payload.message
        if (this.game)
          this.$bvToast.toast(payload.message, {
            variant: 'warning',
            solid: true,
          })
      }),
    ]
    this.$sockets.join(this.channel)
  },

  beforeDestroy() {
    this.off.forEach((off) => off())
    clearTimeout(this.settleTimer)
    clearTimeout(this.passTimer)
    this.$sockets.leave(this.channel)
  },

  methods: {
    send(type, payload = {}) {
      this.$sockets.send(type, this.channel, payload)
    },

    /** A new view of the game: animate what changed, then show it. */
    receive(channel, next) {
      if (channel !== this.channel) return
      const prev = this.game
      const turned =
        !prev ||
        prev.phase !== next.phase ||
        prev.round !== next.round ||
        prev.turn !== next.turn
      if (prev && turned && prev.phase === 'picking') {
        // The picks just went down: flip them over, then pass the hands.
        const before = (prev.players.find((p) => p.id === prev.you) || {})
          .played
        const after = (next.players.find((p) => p.id === next.you) || {}).played
        this.newCards = Math.max(
          1,
          (after || []).length - (before || []).length
        )
        this.revealed = true
        clearTimeout(this.settleTimer)
        this.settleTimer = setTimeout(() => {
          this.revealed = false
        }, SETTLE)
        if (next.phase === 'picking' && next.from) {
          this.passing = true
          this.passedFrom = next.from
          clearTimeout(this.passTimer)
          this.passTimer = setTimeout(() => {
            this.passing = false
            this.passedFrom = ''
          }, 2000)
        }
      }
      this.game = next
      if (turned) {
        this.chosen = []
        this.useSwap = false
      }
    },

    choose(index) {
      if (this.me && this.me.picked) {
        // Changing a locked pick: start the choice again.
        this.chosen = []
      }
      if (this.chosen.includes(index)) {
        this.chosen = this.chosen.filter((i) => i !== index)
        return
      }
      this.chosen = this.useSwap ? [...this.chosen, index].slice(-2) : [index]
    },

    lockIn() {
      const [index, second] = this.chosen
      this.send('pick', this.useSwap ? { index, second } : { index })
    },

    handState(i) {
      if (this.chosen.includes(i)) return 'picked'
      if (this.me && this.me.picked) return 'dim'
      return 'hand'
    },

    titleOf(card) {
      return card.title || this.$t(`play.kinds.${card.kind}.name`)
    },

    cardLabel(card) {
      return `${this.$t(`play.kinds.${card.kind}.name`)}: ${this.titleOf(card)}`
    },

    cardProps(card) {
      return {
        kind: card.kind,
        title: card.title || '',
        // Drupal's files come through this origin's proxy.
        img: card.image || '',
        points: card.points || 1,
        icons: card.sides || 1,
      }
    },

    hasSwap: (p) => p.played.some((c) => c.kind === 'swap'),

    seatOf(player) {
      return Math.max(
        0,
        this.game.players.findIndex((p) => p.id === player.id)
      )
    },

    tagFor(p) {
      const you = p.id === this.game.you
      const host = p.id === this.game.host
      if (host && you) return this.$t('play.hostYou')
      if (host) return this.$t('play.host')
      if (you) return this.$t('play.you')
      return ''
    },

    dessertCell(p) {
      if (p.dessertScore === undefined) return ''
      return p.dessertScore > 0 ? `+${p.dessertScore}` : String(p.dessertScore)
    },

    async copy() {
      try {
        await navigator.clipboard.writeText(this.tableUrl)
        this.copied = true
        setTimeout(() => {
          this.copied = false
        }, 2000)
      } catch (e) {
        this.$bvToast.toast(this.tableUrl, { solid: true })
      }
    },
  },
}
</script>
