<template>
  <!-- One Umami Go card: art, kind, name and how it scores, on its kind's
       ground and pattern, so a hand sorts at a glance without color. -->
  <div
    class="go-card"
    :class="[`go-card--${known}`, `go-card--${size}`, `is-${state}`]"
  >
    <span v-if="state === 'picked'" class="go-card__tab">{{
      $t('play.yourPick')
    }}</span>

    <div v-if="state === 'back'" class="go-card__back">
      <span class="go-card__back-mark" aria-hidden="true" />
      <span v-if="size === 'full'" class="go-card__back-word">Umami Go</span>
    </div>

    <div v-else-if="size === 'sm'" class="go-card__face">
      <div class="go-card__art">
        <img :src="art" alt="" loading="lazy" />
      </div>
      <div class="go-card__sm-foot">
        <img :src="icon" alt="" class="go-card__icon" />
        <span v-if="smNumber" class="go-card__sm-number" v-text="smNumber" />
      </div>
    </div>

    <div v-else class="go-card__face">
      <div class="go-card__art">
        <img :src="art" alt="" loading="lazy" />
        <span
          v-if="known === 'dish'"
          class="go-card__badge go-card__badge--points"
          v-text="dishPoints"
        />
        <span v-if="known === 'side'" class="go-card__badge">
          <img
            v-for="n in sideIcons"
            :key="n"
            :src="icon"
            alt=""
            class="go-card__badge-icon"
          />
        </span>
      </div>
      <div class="go-card__kind">
        <img :src="icon" alt="" class="go-card__icon" />
        <span v-text="$t(`play.kinds.${known}.name`)" />
      </div>
      <span class="go-card__name" v-text="name" />
      <span class="go-card__score" v-text="score" />
    </div>
  </div>
</template>

<script>
/** The eight kinds; anything else draws as a dish. */
const KINDS = [
  'dish',
  'sauce',
  'starter',
  'feast',
  'snack',
  'side',
  'dessert',
  'swap',
]

export default {
  props: {
    kind: { type: String, default: 'dish' },
    title: { type: String, default: '' },
    img: { type: String, default: '' },
    /** A dish's points, 1 to 3. */
    points: { type: Number, default: 1 },
    /** A side's icons, 1 to 3. */
    icons: { type: Number, default: 1 },
    /** `hand`, `picked`, `played`, `dim` or `back`. */
    state: { type: String, default: 'hand' },
    /** `full`, or `sm` for the table. */
    size: { type: String, default: 'full' },
  },

  computed: {
    known() {
      return KINDS.includes(this.kind) ? this.kind : 'dish'
    },
    icon() {
      return `/umami-go/icons/${this.known}.svg`
    },
    /** The recipe's photograph; the game's own cards have their own art. */
    art() {
      if (this.img) return this.img
      if (['sauce', 'swap'].includes(this.known))
        return `/umami-go/${this.known}.svg`
      return '/umami-go/sauce.svg'
    },
    name() {
      return this.title || this.$t(`play.kinds.${this.known}.name`)
    },
    dishPoints() {
      return Math.max(1, Math.min(3, this.points))
    },
    sideIcons() {
      return Math.max(1, Math.min(3, this.icons))
    },
    score() {
      if (this.known === 'dish') {
        const level = ['', 'easy', 'medium', 'hard'][this.dishPoints]
        return this.$tc('play.kinds.dish.card', this.dishPoints, {
          n: this.dishPoints,
          level: this.$t(`listing.${level}`),
        })
      }
      return this.$t(`play.kinds.${this.known}.score`)
    },
    /** The number that matters at the small size. */
    smNumber() {
      if (this.known === 'dish') return String(this.dishPoints)
      if (this.known === 'side' && this.sideIcons > 1)
        return `×${this.sideIcons}`
      return ''
    },
  },
}
</script>
