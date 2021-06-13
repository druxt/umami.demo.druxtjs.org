<script>
import { DruxtFieldLink } from 'druxt-entity'

export default {
  extends: DruxtFieldLink,

  computed: {
    links() {
      const links = []

      for (const key in this.items) {
        const link = this.items[key]

        links[key] = {
          component: false,
          title: this.items[key].title,
          props: {},
        }

        // Use <a> for absolute URLs.
        if (/^(?:[a-z]+:)?\/\//i.test(link.uri)) {
          links[key].component = 'a'
          links[key].props.href = link.uri
        }

        // Use <nuxt-link> for relative links.
        else {
          links[key].component = 'b-button'
          /* @todo - Implement proper multilingual support */
          links[key].props.to = link.uri.replace(/^internal:/, '/en')
        }
      }

      return links
    },
  },
}
</script>
