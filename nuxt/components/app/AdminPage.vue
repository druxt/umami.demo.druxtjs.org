<template>
  <div class="admin-page">
    <!-- Without a known backend the module would link to this site's own
         Druxt client, which is the site itself: say so instead. -->
    <DruxtAdmin
      v-if="$config.drupalOrigin"
      v-slot="{ href, path }"
      :base-url="$config.drupalOrigin"
    >
      <div class="druxt-cta">
        <b-container>
          <span class="druxt-cta__kicker">{{ $t('admin.kicker') }}</span>
          <h1 class="mt-2">{{ $t('admin.title') }}</h1>
          <p class="mt-3" style="max-width: 62ch">
            {{ href ? $t('admin.text') : $t('admin.none') }}
          </p>
          <code class="admin-page__path">{{ path }}</code>
          <div v-if="href" class="mt-4">
            <b-button class="admin-page__open" :href="href" variant="primary">
              {{ $t('admin.open') }}
            </b-button>
          </div>
        </b-container>
      </div>
    </DruxtAdmin>
    <div v-else class="druxt-cta">
      <b-container>
        <span class="druxt-cta__kicker">{{ $t('admin.kicker') }}</span>
        <h1 class="mt-2">{{ $t('admin.title') }}</h1>
        <p class="mt-3" style="max-width: 62ch">{{ $t('admin.none') }}</p>
      </b-container>
    </div>
  </div>
</template>

<script>
/**
 * A Drupal admin path: content, media, users and settings live in the
 * backend, and this page hands the visitor through to the same path there.
 * modules/admin-routes.js puts it on Drupal's admin paths.
 */
export default {
  head() {
    return { title: this.$t('admin.title') }
  },
}
</script>
