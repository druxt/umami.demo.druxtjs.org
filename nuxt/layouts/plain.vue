<template>
  <div>
    <AppDemoBar />

    <!-- Same masthead as the default layout, so the explorer does not read as
         a different site. -->
    <DruxtBlockRegion
      name="header"
      theme="umami"
      :wrapper="{
        component: 'b-navbar',
        propsData: { sticky: true, toggleable: 'lg' },
      }"
    />

    <slot v-if="$slots.default" />
    <Nuxt v-else />

    <AppDruxtCta />

    <div class="disclaimer">
      <b-container>
        <DruxtBlockRegion name="bottom" theme="umami" />
      </b-container>
    </div>

    <b-sidebar
      id="search"
      backdrop
      no-close-on-route-change
      no-header
      right
      shadow
      width="min(520px, 100vw)"
    >
      <DruxtSearchbar />
    </b-sidebar>
  </div>
</template>

<script>
/**
 * Chrome-light layout for the playground pages (currently the Entity
 * Explorer). It keeps the demo bar, masthead, CTA and disclaimer, and drops
 * the banner, breadcrumb, content and footer regions — the page owns its own
 * full-width header instead.
 *
 * This layout previously carried an UNSCOPED <style> block left over from
 * before the uplift: the Source Sans Pro stack, `word-spacing: 1px` and
 * `.sticky-top { margin: 0 -15px }`. Because it was global rather than
 * scoped, it overrode assets/scss/theme.scss for the whole application
 * whenever this layout mounted — the explorer lost Archivo and Newsreader
 * entirely. It also wrapped everything in `b-container fluid` and used
 * `bg-dark text-white` on the footer, which the theme re-skins to paper and
 * ink, giving near-white text on near-white. All of it is gone; the theme is
 * the only stylesheet.
 */
export default {}
</script>
