# DruxtJS demo Drupal JSON:API backend.

This is the Drupal 9 codebase for the JSON:API backend used by the DruxtJS demonstration site.

This codebase is derived from the [amazeeio/drupal-example-simple](https://github.com/amazeeio/drupal-example-simple/tree/9.x) template.


## Requirements

* [docker](https://docs.docker.com/install/)

* [pygmy](https://pygmy.readthedocs.io/) `gem install pygmy` (you might need `sudo` for this depending on your Ruby configuration)

**OR**

* [Lando](https://docs.lando.dev/basics/installation.html#system-requirements)


## Local environment setup - pygmy

1. Checkout this project repo and confirm the path is in Docker's file sharing config - https://docs.docker.com/docker-for-mac/#file-sharing

    ```bash
    git clone https://github.com/druxt/demo-api.druxtjs.org.git demo-api.druxtjs.org && cd $_
    ```

2. Make sure you don't have anything running on port 80 on the host machine (like a web server) then run `pygmy up`

3. Build and start the build images:

    ```bash
    docker-compose up -d
    docker-compose exec cli composer install
    ```

4. Install and setup the demo:

    ```bash
    docker-compose exec cli drush -y si demo_umami
    docker-compose exec cli drush -y en druxt_umami
    docker-compose exec cli drush rap anonymous 'access druxt resources'
    docker-compose exec cli drush config:set jsonapi.settings read_only 0 -y
    docker-compose exec cli drush search-api:index
    ```

    or

    ```
    docker-compose exec cli sh -c "drush -y si demo_umami && drush -y en druxt_umami && drush rap anonymous 'access druxt resources' && drush config:set jsonapi.settings read_only 0 -y && drush search-api:index"
    ```

5. Visit the new site @ `http://demo-api-druxtjs-org.docker.amazee.io`


## Local environment setup - Lando

This repository is set up with a `.lando.yml` file, which allows you to use Lando instead of pygmy for your local development environment.

1. [Install Lando](https://docs.lando.dev/basics/installation.html#system-requirements).

2. Checkout the project repo and confirm the path is in Docker's file sharing config - https://docs.docker.com/docker-for-mac/#file-sharing

    ```bash
    git clone https://github.com/druxt/demo-api.druxtjs.org.git demo-api.druxtjs.org && cd $_
    ```

3. Make sure you have pygmy stopped. Run `pygmy stop` to be sure.

4. We already have a Lando file in this repository, so we just need to run the following command to get Lando up:

 ```bash
lando start
```

5. Install and setup the demo:

```bash
lando drush -y si demo_umami
lando drush -y en druxt_umami
lando drush rap anonymous 'access druxt resources'
lando drush config:set jsonapi.settings read_only 0 -y
lando drush search-api:index
```
