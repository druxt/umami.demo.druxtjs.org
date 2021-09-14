<script>
import DruxtModule from 'druxt/dist/components/DruxtModule.vue'
import { DruxtRouterEntityMixin } from 'druxt-router'

export default {
  name: 'DruxtContact',

  extends: DruxtModule,

  mixins: [DruxtRouterEntityMixin],

  async fetch() {
    await DruxtRouterEntityMixin.fetch.call(this)
    await DruxtModule.fetch.call(this)
  },

  computed: {
    resourceType: ({ entity }) =>
      [
        'contact_message',
        ((entity || {}).attributes || {}).drupal_internal__id,
      ].join('--'),
  },

  methods: {
    getScopedSlots() {
      return {
        default: () => [
          this.$createElement('h2', [this.entity.attributes.label]),
          this.$createElement('DruxtEntityForm', {
            props: { type: this.resourceType },
          }),
        ],
      }
    },
  },

  druxt: {
    componentOptions: ({ entity }) => [
      [entity.attributes.drupal_internal__id],
      ['default'],
    ],

    propsData: ({ entity }) => ({ entity }),
  },
}
</script>
