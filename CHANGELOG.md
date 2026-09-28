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

### Changed

- The backend moves to Drupal 11, and runs without Docker for development
  and CI.
- Drupal 11.4.8 and `drupal/druxt` 1.3.1.
- The druxt.js 0.25.0 dev snapshot.
- Drupal's responses may be cached for five minutes, and content changes
  rebuild the site through Purge.
