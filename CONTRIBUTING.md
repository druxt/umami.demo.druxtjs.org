# Contributing

Thanks for helping. This repository is the Druxt Umami demo, Drupal's Umami
food magazine with a Druxt frontend.

## Repositories

| Change | Where it goes |
| --- | --- |
| A Druxt Nuxt module | [druxt/druxt.js](https://github.com/druxt/druxt.js) |
| The Druxt Drupal module | [drupal.org/project/druxt](https://www.drupal.org/project/druxt) |
| The demo's frontend, backend or hosting | This repository |

## Getting set up

```bash
mise install
npm install
npm run hooks:install
```

`npm install` installs the root tooling, and `hooks:install` turns on the
commit hooks. The [README](README.md) covers running the backend and the
frontend.

## Before you push

```bash
npm run lint              # root ESLint and markdownlint
(cd nuxt && yarn lint)    # the frontend's ESLint and stylelint
```

The pipeline also runs cspell, YAML and JSON lint, a secret scan and commit
message lint.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org), title only. The
commit-msg hook checks each message before the commit exists.
