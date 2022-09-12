<script>
import Default from '../Default.vue'

export default {
  extends: Default,

  data: () => ({
    entityTypes: ['node--article', 'node--recipe'],
    field: 'field_tags',
  }),
}
</script>
