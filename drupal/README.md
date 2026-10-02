# Druxt Umami demo: the Drupal backend

The Drupal 11 backend of the [Druxt Umami demo](https://umami.demo.druxtjs.org).
It installs Drupal's Umami demo profile, and the `druxt_umami` module sets up
Druxt: JSON:API access, the OAuth consumer, the search index and the demo's
menus.

## Run it

The quickest way is the whole demo in a dev container. The
[repository README](../README.md) links it for DevPod.

Without one, PHP 8.3 and Composer are enough. The site runs on SQLite and PHP's
built-in server:

```bash
composer install
.devtools/provision   # a fresh Umami, with the Druxt layer enabled
.devtools/start       # serves it on http://127.0.0.1:8888
.devtools/test        # the API contract the frontend depends on
```

Every provision installs Umami from scratch, so the demo always starts from
its known content.
