# Changelog

Every change to the Druxt Umami demo is documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The demo is a site without releases, so changes are grouped by date.

## Unreleased

### Added

- Repository tooling at the root: commit message lint, commit hooks, prose
  lint, and the documents the Druxt repository standard asks for.
- The whole demo runs in one Lagoon environment, `main`, which does not idle.
- The site builds when its container starts, against its own Drupal.
- An editorial theme, and demo tools that show how each page is built.
- Open pages refresh what a content change touches as soon as Drupal purges,
  over a WebSocket through `@druxt-contrib/sockets`, vendored, ahead of the
  rebuild.
- Editing in place: a signed-in editor's changes are kept as a draft in the
  browser, shown on the page with their differences marked, and can be
  thrown away from the banner. Saving says when Drupal has the change and
  when the pages catch up, and the tabs link to Drupal's own screens for the
  node.
- Sign in from any page, in a dialog, with `/login` as the page behind it.
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
- Drupal's responses may be cached for five minutes, and content changes
  rebuild the site through Purge.
- The site's text is compressed, its images cached and its fonts load beside
  the first paint.

### Fixed

- Switching language fetches views and blocks again in the new language,
  even while the first fetch is still running.
- A Spanish front page is the home page, with its banner and in Spanish.
