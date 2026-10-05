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
      // The form component carries the page's heading, so the contact form's
      // own label would be a third title under the page title.
      return {
        default: () => [
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
