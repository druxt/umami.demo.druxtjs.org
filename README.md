# DruxtJS demo Drupal JSON:API backend.

This is the Drupal 9 codebase for the JSON:API backend used by the DruxtJS demonstration site.

This codebase is derived from the [amazeeio/drupal-example-simple](https://github.com/amazeeio/drupal-example-simple/tree/9.x) template.


## Requirements

* [Lando](https://docs.lando.dev/basics/installation.html#system-requirements)


## Local environment setup - Lando

This repository is set up with a `.lando.yml` file, which allows you to use Lando for your local development environment.

1. Checkout the project repo and navigate into the cloned directory:

    ```bash
    git clone https://github.com/druxt/demo-api.druxtjs.org.git [DESTINATION]
    cd [DESTINATION]
    ```

2. Start Lando:

    ```bash
    lando start
    ```

3. Install and setup the demo:

    ```bash
    lando drush -y si demo_umami
    lando drush -y en druxt_umami
    lando drush rap anonymous 'access druxt resources'
    lando drush config:set jsonapi.settings read_only 0 -y
    lando drush search-api:index
    ```

### tl;dr
```bash
git clone https://github.com/druxt/demo-api.druxtjs.org.git demo-api.druxtjs.org && cd $_
```

```bash
lando start && lando drush -y si demo_umami && lando drush -y en druxt_umami && lando drush rap anonymous 'access druxt resources' && lando drush config:set jsonapi.settings read_only 0 -y && lando drush search-api:index
```
