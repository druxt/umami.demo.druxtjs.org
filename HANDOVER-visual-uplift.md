# Umami demo — visual uplift

Design mockups: `Umami Demo Uplift.dc.html` (project root).
Source in this folder mirrors `nuxt/` in `druxt/umami.demo.druxtjs.org@main`.
Nothing has been committed or pushed.

## What changed and why

The demo was rendering unstyled Bootstrap defaults, which made a decoupled
Drupal site look worse than a stock Drupal theme — the opposite of the point.
The uplift gives Umami a warm editorial identity of its own and quarantines
Druxt blue to a promotional layer that sits *around* the content.

Frameworks are unchanged: Nuxt 2, bootstrap-vue 2.22, druxt-site 0.13, the
Lunr search module, Storybook.

### Design system

| | |
| --- | --- |
| Display / editorial | Newsreader 400–600, plus italic |
| UI / labels | Archivo 400–700 |
| Code | IBM Plex Mono |
| Paper | `#fdfbf7` · warm band `#faf4ea` · deep `#f6efe4` |
| Rules | `#e6ddcd` / `#e0d6c6` |
| Ink | `#241f1a` → `#8a7f70` |
| Editorial accent | `#7d4a1a` spice (one accent, used for CTAs, kickers, active nav) |
| Dark band | `#3a2f24` collections · `#241f1a` disclaimer |
| Druxt (promo only) | navy `#2f495e` · blue `#0678be` · teal `#108775` · tint `#eff7fc` |

Rule of thumb: if it is blue, it is about Druxt. Nothing in the magazine's own
content uses blue.

### Files

New:

- `assets/scss/theme.scss` — tokens, base type, bootstrap-vue re-skin, all
  promo-layer classes.
- `store/ui.js` — `devOverlay` flag and a request log stub.
- `components/app/DemoBar.vue` — the navy strip above the masthead.
- `components/app/DevRegion.vue` — dashed outline + mono label naming the
  component that rendered a region (blue) or entity (teal); the label links to
  the file on GitHub. Renders its slot untouched when the overlay is off.
- `components/app/DruxtNote.vue` — the inline "How this page works" card.
  One per page, maximum.
- `components/app/DruxtCta.vue` — footer CTA with a copyable quickstart command.
- `components/app/ViewModeSwitcher.vue` — re-renders the same entity as card /
  teaser / full from the store.
- `components/app/JsonApiDrawer.vue` — collapsed per-page request drawer.

Rewritten:

- `layouts/default.vue` — demo bar, full-bleed home content, `DevRegion`
  wrappers, CTA above the disclaimer. Dropped the nested `b-row`/`b-container`
  stack and the `.sticky-top { margin: 0 -15px }` hack.
- `block-region/Header.vue` + `block/system/{BrandingBlock,MenuBlockMain}.vue` —
  editorial masthead, type wordmark instead of `logo.svg`, search trigger,
  EN/ES switch that swaps the route prefix client-side.
- `entity/Card.vue`, `entity/Teaser.vue` — the whole card is a `nuxt-link`
  (prefetched), so the click handler and `* { cursor: pointer }` are gone.
- `entity/node/recipe/Full.vue` — editorial two-column layout, stat block,
  view-mode switcher, collapsible `DruxtEntityForm`, JSON:API drawer.
- `entity/node/article/Full.vue` — centred title, full-bleed lead image,
  measure-limited prose, aside view.
- `entity/block-content/BannerBlock.vue` — real `<img>` + gradient scrim
  instead of `background-attachment: fixed` (which janked on iOS).
- `view/recipes/Page1.vue` — client-side ingredient search, difficulty filter
  and sort over one fetched result set.
- `view/recipe-collections/Block.vue` — pill list on the dark band.
- `Searchbar.vue` — instant-search panel with result count and timing.
- `pages/entity-explorer.vue` — navy playground header, controls left, live
  preview right, Storybook links.

### nuxt.config.js

Two edits:

```js
css: ['~/assets/scss/theme.scss'],

head: {
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css',
    },
  ],
},
```

Also add to `bootstrapVue.componentPlugins`: nothing new is required, but
`b-form-select` and `b-collapse` are now used outside forms — `FormSelectPlugin`
and the `BCollapse` component are already listed.

## Open decisions

1. **SCSS depth.** `theme.scss` re-skins the Bootstrap 4 classes bootstrap-vue
   emits, on top of the CDN stylesheet. Proper variable-level theming means
   adding `bootstrap@4.6.2` + `sass` + `sass-loader`, dropping the CDN link and
   importing Bootstrap under the variable overrides. Cleaner output, one more
   build dependency. `sass` is needed either way to compile this file.
   Note `package.json` currently pins `bootstrap@5.2.1`, which bootstrap-vue 2
   does not support — worth resolving in the same pass.
2. **Recipes view fields.** The client-side filters need
   `field_ingredients`, `field_difficulty` and `field_cooking_time` in the
   view's JSON:API response. The `druxt.query.fields` block in
   `view/recipes/Page1.vue` requests them; confirm against
   `druxt.views.query.bundleFilter`.
3. **Language switch.** `Header.vue` rewrites the route prefix, which assumes a
   translated alias exists. Umami ships Spanish translations for most nodes but
   not all — decide whether to hide the switch when
   `entity.attributes.langcode` has no `es` translation.
4. **Dev overlay persistence.** `store/ui.js` is persisted by the existing
   `vuex-persistedstate` plugin, so the overlay stays on across reloads. Add
   `ui` to that plugin's `paths` if it is configured with an allowlist.
5. **Request log.** `store/ui.js` has a `requestLog` mutation but nothing calls
   it. Wiring it to the Druxt axios instance would let the overlay show the
   real request count and timings shown in the mockup.
