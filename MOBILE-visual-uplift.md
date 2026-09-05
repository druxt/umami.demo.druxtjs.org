# Mobile and tablet — corrections to PR #496

Spec: `Umami Demo Mobile.dc.html` (project root) — 2a phone 375px, 2b tablet
768px, 2c the four defects side by side, 2d the Entity Explorer.
Read against PR #496 at tree `11af4273cac8` and the Netlify deploy preview.

Turn 1's mockups were composed at 1280px only, so the media queries in #496
were written without a spec. Most of what follows is filling that gap rather
than correcting judgement — with three exceptions that are plain bugs.

## Fix these first

1. **`.recipe-card__body` shares a selector list with `.banner__body`** in the
   `max-width: 767.98px` block, so every card body reserves `min-height: 320px`
   and `2rem` of padding. Cards render ~500px tall with a large dead gap. Only
   the banner wanted the height. *(2c, panel 1)*
2. **`layouts/plain.vue` was never uplifted.** Its unscoped `<style>` block
   still sets the Source Sans Pro stack, `word-spacing: 1px` and
   `.sticky-top { margin: 0 -15px }`. Because it is global, not scoped, it
   overrides `theme.scss` for the whole application whenever the layout mounts
   — the Entity Explorer renders in the wrong typeface with the word-spacing
   the theme deliberately removed. Its footer also uses `bg-dark text-white`,
   which the theme re-skins to paper, giving white on near-white. *(2d)*
3. **The banner scrim is horizontal only.** `linear-gradient(90deg, …)` reaches
   zero at 72% of the width. At phone width the text is full-width, so its
   right half sits on an unscrimmed photograph and falls below 4.5:1. *(2c,
   panel 2)*

## Everything in this drop

`umami-demo/nuxt/` — same paths as the repo.

### `assets/scss/theme.scss`

The responsive section is rewritten. Structure now: base → components →
`@media (max-width: 991.98px)` (masthead only, because `b-navbar
toggleable="lg"` collapses there) → `(max-width: 767.98px)` → `(max-width:
575.98px)`. Breakpoints are `$bp-sm/md/lg` variables, and `$tap: 44px`.

Base changes:

- `h1/h2/h3` clamps re-cut. `clamp(2.25rem, 4vw, 3.25rem)` never exceeds its
  floor below 900px, so the fluid term was decorative and every phone got 36px.
  `6vw` makes it work.
- `.stat-grid` stays two columns at every width (four labelled numbers stacked
  is a 320px tower) and trims the borders that doubled on the grid's own edge.
- `.druxt-cta__command` wraps and its string is `overflow-wrap: anywhere`.
- `.demo-bar__short` / `__full` — two lengths of the identity label.
- `img, video, pre, table { max-width: 100% }` as a blanket overflow guard.
- `.form-control` goes to 16px below md so iOS does not zoom on focus.
- New `.recipe-filters` block, and a new `.explorer` block (see below).

Masthead, below lg:

- `.masthead__nav` gets `flex-basis: 100%` — without it the collapse flexes in
  beside the wordmark instead of dropping below it. *(2c, panel 3)*
- Menu items become full-width 44px rows with rules between them; the active
  underline becomes an inset left bar. `.masthead__menu` overrides the
  `align-items: center` that `MenuBlockMain.vue` sets for the desktop strip.
- `.masthead__search` loses its 170px floor; `.masthead__lang` gets 44px.

Below md: banner height and scrim (the component's competing scoped rule is
gone), 2.5rem section padding, left-aligned collection pills, tighter method
steps and prose, demo-bar wrap, 44px view-mode buttons, wrapping dev-overlay
labels, and the filter-bar stack.

Below sm: `#search` goes to `100vw`, and the code blocks tighten.

### Components

| File | Change |
| --- | --- |
| `layouts/plain.vue` | Rewritten. Global `<style>` deleted; gains the demo bar, masthead, CTA and disclaimer so the explorer stops reading as a different site. |
| `layouts/default.vue` | `b-sidebar width="min(520px, 100vw)"` — a hard 520px put a 375px viewport into horizontal scroll behind the backdrop. |
| `pages/entity-explorer.vue` | `b-row` → CSS grid. DOM order is now the phone order (controls, preview, snippet, note) and `.explorer` places the preview into a full-height second column at md+. Request path moved to a computed and allowed to wrap. |
| `app/DemoBar.vue` | Long and short labels for the identity string and the overlay toggle. |
| `entity/block-content/BannerBlock.vue` | Scoped media query removed — it set a competing height 0.98px away from the theme's, and 767.5px matched neither. |
| `view/recipes/Page1.vue` | Filter bar restructured into `.recipe-filters` (field, a sideways scroller for difficulty, then sort + count on one row). Grid gains `md="4"` — `sm=6 lg=3` showed two 340px cards across the tablet band. |
| `entity/node/recipe/Full.vue` | Column split `lg` → `md`. |
| `entity/node/article/Full.vue` | Body/aside split `lg` → `md`; title block `md="10" offset-md="1"`. |

Unchanged and deliberately so: `MenuBlockMain.vue` (the theme overrides its
desktop `align-items`), `DruxtCta.vue`, `ViewModeSwitcher.vue`,
`JsonApiDrawer.vue`, `Card.vue`, `Teaser.vue` — all handled in SCSS.

## Palette corrections in this drop

Three tokens were below 4.5:1 on their own grounds and are raised at the
definitions in `theme.scss`. The mockups carry the new hexes too.

| Token | Was | Now | On |
| --- | --- | --- | --- |
| `$ink-ghost` | `#a2988a` 2.75:1 | `#6f6454` 4.97:1 | `$paper-warm` |
| `$ink-ghost-dark` (new) | — | `#b3a894` 6.9:1 | `$ink` |
| `$ink-faint` | `#8a7f70` 3.80:1 | `#776c5e` 4.97:1 | `$paper` |
| `$druxt-blue-ink` (new) | `#0678be` 4.37:1 | `#05619a` 6.09:1 | `$druxt-tint` |
| `.demo-bar__toggle span` | `#8fa9bd` 3.84:1 | `#a8c2d6` 5.1:1 | `$druxt-navy` |

`$ink-ghost` is measured against `$paper-warm`, not `$paper`: `.stat-grid`
paints the warm ground behind its own labels, and `.recipe-filters` sits on it
too, so the paper figure would have left the labels at 4.30:1. The same token
also carried `.disclaimer`, where the ground is near-black and darkening moves
the wrong way — that now uses `$ink-ghost-dark`. Check the ground before
reusing either.

`$ink-ghost` carries `.stat-grid__label`, which this pass reused for the new
`.recipe-filters` and `.explorer__controls` labels, so it was the most exposed
of the three. `$druxt-blue` stays as-is for solid fills behind white
(`.view-modes button.is-active`, `.demo-bar__toggle.is-on`) and for
`.view-modes button` type on white, which is 4.72:1; the new
`$druxt-blue-ink` is only for type sitting on the pale tint —
`.druxt-note__kicker`, `.druxt-note__link`, `.recipe-filters__count`,
`.dev-summary`. Body text `#3c5566` on tint was already 7.22:1.

## Worth checking on device

- The masthead collapse at 992–1100px: the desktop row has brand, four menu
  items, a 170px search pill and the language switch. It fits at 1280 but is
  tight just above the toggle breakpoint. If it wraps, raise
  `toggleable` to `xl` in `layouts/default.vue` rather than shrinking the type.
- `vue-live`'s editor in the explorer. The `.explorer__code` rules target
  `prism-editor__*` classes with `!important`; if the vendored markup differs,
  the wrap and the 45vh cap are the two things that must hold.
- iOS Safari sticky masthead plus `b-sidebar backdrop`: confirm the body does
  not scroll behind the open search panel.
- Dev overlay on, at 375px: labels wrap now, but a region nested three deep can
  still stack three labels in the same 40px. Acceptable — it is a developer
  tool — but worth a look before you decide.
