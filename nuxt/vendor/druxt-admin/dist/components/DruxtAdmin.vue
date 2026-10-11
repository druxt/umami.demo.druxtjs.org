<template>
  <!--
    Nothing at all off an admin route.

    Not an empty wrapper, not a hidden element: nothing. A site that installs
    this should be unable to tell it is there while reading a page, and a
    wrapper with no content still takes part in layout, which is how a module
    nobody asked for ends up adding a gap to every page on a site.
  -->
  <div v-if="isAdmin" class="druxt-admin" data-testid="druxt-admin">
    <!--
      Whatever replaced this, or the default.

      The slot is the seam a richer frontend admin fills. It is a slot rather
      than a component name so that replacing the default is a matter of
      passing content in, and so this module never has to know the name of the
      thing that replaced it.
    -->
    <slot :path="currentPath" :href="href" :mode="mode">
      <p v-if="href" class="druxt-admin__link">
        <a :href="href" rel="noopener" data-testid="druxt-admin-link">{{
          linkText
        }}</a>
      </p>
      <!--
        A static build that has never connected a backend has nowhere to send
        anybody, and says so rather than rendering a link to nothing.
      -->
      <p v-else class="druxt-admin__unavailable" data-testid="druxt-admin-none">
        {{ unavailableText }}
      </p>
    </slot>
  </div>
</template>

<script>

// The package by name, the way this resolves from dist/components/ once
// published: siroc bundles src/index.js into dist/index.*, while mkdist only
// transpiles the components, so a relative path out of this directory does not
// exist in the published package.
import {
  ADMIN_PATHS,
  backendPath,
  isAdminPath,
  resolveMode,
} from '@druxt-contrib/admin'

/**
 * The admin slot, resolved inside `DruxtSite`.
 *
 * Inside rather than around, because admin is route aware rather than global:
 * on an admin path it is a surface you have gone to, and everywhere else it is
 * nothing at all. `DruxtSite` already owns the router, so the decision belongs
 * where the routing is, and a wrapper outside would have to duplicate that
 * knowledge to know when to get out of the way.
 *
 * The default is a link out to the same path on the backend. It is the only
 * mode that works on every deployment with no configuration, which is why it
 * is the default rather than the proxy: a site that wants Drupal's admin in
 * place takes on the deployment cost knowingly.
 */
export default {
  name: 'DruxtAdmin',

  props: {
    /**
     * The path to judge, if not the current route's.
     *
     * Passed in by a test, or by a site that renders this somewhere other than
     * the route it belongs to.
     */
    path: {
      type: String,
      default: null,
    },

    /** Prefixes that count as admin, if the site has moved Drupal's. */
    paths: {
      type: Array,
      default: () => ADMIN_PATHS,
    },

    /** `link`, or `proxy` where the deployment has been set up for it. */
    mode: {
      type: String,
      default: 'link',
    },

    /** The backend, if not the Druxt client's own. */
    baseUrl: {
      type: String,
      default: null,
    },

    linkText: {
      type: String,
      default: 'Open in Drupal',
    },

    unavailableText: {
      type: String,
      default: 'Connect a backend to reach the administration pages.',
    },
  },

  computed: {
    /** The path this is judging: the prop, then the route, then nothing. */
    currentPath() {
      if (this.path) return this.path
      return (this.$route || {}).path || ''
    },

    isAdmin() {
      return isAdminPath(this.currentPath, this.paths)
    },

    /**
     * The backend this site is talking to.
     *
     * Read from the Druxt client rather than from build-time configuration, so
     * a site that connects a backend at runtime gets a working link without
     * being rebuilt. That is the whole point on a statically generated site.
     */
    backend() {
      if (this.baseUrl) return this.baseUrl
      return ((this.$druxt || {}).options || {}).baseUrl || ''
    },

    href() {
      if (resolveMode(this.mode) !== 'link') return ''
      return backendPath(this.backend, this.currentPath)
    },
  },
}
</script>
