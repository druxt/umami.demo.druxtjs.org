# Changelog

Every change to the Druxt Umami demo is documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The demo is a site without releases, so changes are grouped by date.

## Unreleased

### Added

- The demo resets itself to its fresh content every day at 16:00 UTC, and
  the same reset can be run on demand as a Lagoon task. One reset runs at a
  time, whether the route, the cron or the task starts it.
- The front page's recipe-of-the-week banner is a carousel of Drupal's
  banner blocks, from a `front_carousel` view block, with Umami Go first. Each
  slide names itself in its kicker, and it moves by its bars, its arrows, the
  keyboard or a swipe.
- The Umami Go page's hero takes its title and words from the same Drupal
  banner block, in the page's language, on the banner's night lattice, with
  its cards fanned on an arc.
- Repository tooling at the root: commit message lint, commit hooks, prose
  lint, and the documents the Druxt repository standard asks for.
- The whole demo runs in one Lagoon environment, `main`, which does not idle.
- The site builds when its container starts, against its own Drupal.
- An editorial theme, and demo tools that show how each page is built.
- Umami Go at `/play`, a card game for two to five dealt from the magazine's
  recipes over the live WebSocket: a table to start or join by code or QR
  code, simultaneous picks with a swap, three scored rounds, and a Play link
  in the main menu. It shares with a card of its own, and a table's link
  previews as an invitation to that table. Recipe cards render through
  DruxtEntity, so a recipe edited in Drupal changes in every hand, and the
  server deals the deck with the Druxt client.
- Open pages refresh what a content change touches as soon as Drupal purges,
  over a WebSocket through `@druxt-contrib/sockets`, vendored, ahead of the
  rebuild.
- Editing in place: a signed-in editor's changes are kept as a draft in the
  browser, shown on the page with their differences marked, and can be
  thrown away from the banner. Saving says when Drupal has the change and
  when the pages catch up, and the tabs link to Drupal's own screens for the
  node.
- Sign in from any page, in a dialog, with `/login` as the page behind it.
  Signing in also opens a Drupal session, so the tabs' Drupal screens, served
  on this origin, open signed in.
- Search matches tags, categories, the start of a word and near misses, keeps
  its query and scroll position, and narrows results by type, category and
  tag.
- `robots.txt`, `sitemap.xml`, `llms.txt` and `llms-full.txt`, with every page
  pointing at `llms.txt`.
- An accessibility audit and a Lighthouse run with score floors in CI.

### Changed

- The backend moves to Drupal 11, and runs without Docker for development
  and CI.
- Drupal 11.4.8 and `drupal/druxt` 1.3.1.
- The druxt.js 0.25.0 dev snapshot.
- Druxt 0.25.0 from the npm `dev` channel, in place of the older dev
  snapshot, with axios 0.34. The language prefix and block content patches
  are upstream.
- druxt-auth 0.5.0 from npm, with a patch adding its unreleased static-server
  middleware, in place of the vendored copy.
- Every axios in the site is 0.34, including the copies `@nuxtjs/axios` and
  `@nuxtjs/auth-next` bring, which were 0.21 and 0.26 and open to axios's
  SSRF and credential leak advisory.
- Drupal's responses may be cached for five minutes, and content changes
  rebuild the site through Purge.
- The site's text is compressed, its images cached and its fonts load beside
  the first paint.
- A path with no page answers 404, with the site's not-found page, so a dead
  link or stale redirect shows up as one.

### Fixed

- On the live domain, Umami Go, live updates and presence connect again. The
  domain's CDN does not pass WebSockets, so production opens its socket on its
  own Lagoon route, named in the runtime config as `socketsOrigin`.
- A Lagoon preview shares and links its own site address, not Drupal's, so
  its share cards show their images.
- On a wide screen, or zoomed out, a banner image narrower than the screen
  keeps its own size beside the words, fading into the night lattice, rather
  than being stretched and cropped. The masthead and the bar above it keep
  their contents within 1600px.
- The Umami Go share card shows the hero's fan of cards on its arc, over the
  banner's night lattice, rendered from the live page by
  `nuxt/scripts/render-og-umami-go.js`.
- The sitemap lists content only, leaving out tag listings, Drupal's `/node`
  and the JSON:API documents the build crawled, and tag pages are `noindex`.
- Every page points at `llms-full.txt` as well as `llms.txt`, and `llms.txt`
  links DruxtJS, the source, the Entity Explorer and Umami Go.
- Analytics is the demo sites' GA4 property, loaded only on the live site, in
  place of a Universal Analytics tag that every preview reported to.
- Switching language fetches views and blocks again in the new language,
  even while the first fetch is still running.
- A Spanish front page is the home page, with its banner and in Spanish.

### Security

- Drupal core is 11.4.11, for the remote code execution in
  [SA-CORE-2026-014](https://www.drupal.org/sa-core-2026-014) and the
  cross-site scripting in
  [SA-CORE-2026-015](https://www.drupal.org/sa-core-2026-015) and
  [SA-CORE-2026-016](https://www.drupal.org/sa-core-2026-016).
- The Gin admin theme is 5.0.16, for the cross-site scripting in
  [SA-CONTRIB-2026-219](https://www.drupal.org/sa-contrib-2026-219). The 4.x
  fix does not support Drupal 11.4, so Gin moves a major version, with Gin
  Toolbar 3.0.3, which Gin 5 requires.
- Simple OAuth is 6.1.3, for the access bypass in SA-CONTRIB-2026-242. Its
  token endpoint now answers 415 to anything but a form-encoded body. The
  frontend's sign-in already posts forms, and a test now pins the 415.
