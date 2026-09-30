<script>
import NodeCard from '../Card.vue'

/**
 * The most specific suggestion DruxtEntity looks for. Without it the lookup
 * lands on a broader name and renders a second, empty card inside the first.
 */
export default {
  extends: NodeCard,

  /** An article has no category to fetch; the kicker names the type. */
  data: () => ({
    kicker: null,
  }),

  fetch() {},

  created() {
    this.kicker = this.$t('bundle.article')
  },
}
</script>
