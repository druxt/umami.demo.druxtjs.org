# Agent instructions

The [Umami demo](https://umami.demo.druxtjs.org) is Drupal's Umami food
magazine with a Druxt frontend. It follows the Druxt repository standard for a
Nuxt application.

## Layout

| Path | What it is |
| --- | --- |
| `drupal/` | The Drupal 11 backend, a Composer project with the `druxt_umami` module |
| `nuxt/` | The Nuxt 2 frontend, with its own Yarn 1 manifest and lint setup |
| `.docker/`, `docker-compose.yml`, `.lagoon.yml` | The Lagoon stack: one `main` environment for Drupal, the site and Storybook |
| The root `package.json` | Repository tooling only: commit and markdown lint, the root ESLint config |

## Rules

- **This repository is public.** Nothing that resolves only on a private
  network may reach a tracked file: no internal URLs, hostnames, repository
  names or issue links, in any file, including comments, patch descriptions and
  lock files.
- **Conventional Commits**, and the same for merge request and pull request
  titles. A squash merge makes the title the commit subject, so a prose title
  breaks the next push to the target branch.
- **No AI tool is credited.** No co-author trailer naming an assistant, no
  generated-with footer and no session link, in commits, merge request
  descriptions or tracked files. The commit-msg hook rejects it locally.
- **Every deploy installs a fresh Umami.** `drupal/.devtools/provision` runs
  after each Lagoon rollout, so the demo resets to its known content. Site
  configuration belongs in `druxt_umami`'s install hook, not in exported
  configuration.
- **The site builds when its container starts.** `nuxt/server/start.js` waits
  for Drupal, runs `nuxt generate` and serves the result. Drupal's
  post-rollout task asks it to rebuild.
- **Patches are public upstream diffs where possible.** A file in
  `drupal/patches/` exists only when no upstream URL applies, and
  `drupal/patches/README.md` says why. Commit `drupal/patches.lock.json` with
  any change to a patch.
- **Node 16 for everything.** The frontend is Nuxt 2, and the root tooling is
  held to versions that still run on Node 16.
