<script>
import DruxtRouter from 'druxt-router/dist/components/DruxtRouter.vue'
import { routeHead } from '~/utils/seo'

/**
 * Every Drupal path, rendered by Druxt's router page with this site's head.
 *
 * The router's own head sets a title and a canonical link, and the canonical
 * of the front page is Drupal's `/node`. This page keeps the router whole
 * and owns the head instead: title, canonical, share tags and structured
 * data, from the route and the entity the store holds for it.
 *
 * Not a file under pages/: a page there matches before the router's own
 * `/en*` and `/es*` routes, whose `meta.langcode` every block region reads.
 * modules/seo-files.js puts this component on those routes instead.
 */
export default {
  extends: DruxtRouter,

  head() {
    return routeHead(this)
  },
}
</script>
