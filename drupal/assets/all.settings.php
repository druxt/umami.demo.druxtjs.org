<?php
/**
 * @file
 * amazee.io Drupal all environment configuration file.
 *
 * This file should contain all settings.php configurations that are needed by all environments.
 *
 * It contains some defaults that the amazee.io team suggests, please edit them as required.
 */

// Defines where the sync folder of your configuration lives. In this case it's inside
// the Drupal root, which is protected by amazee.io Nginx configs, so it cannot be read
// via the browser. If your Drupal root is inside a subfolder (like 'web') you can put the config
// folder outside this subfolder for an advanced security measure: '../config/sync'.
$settings['config_sync_directory'] = '../config/sync';

if (getenv('LAGOON_ENVIRONMENT_TYPE') !== 'production') {
    /**
     * Skip file system permissions hardening.
     *
     * The system module will periodically check the permissions of your site's
     * site directory to ensure that it is not writable by the website user. For
     * sites that are managed with a version control system, this can cause problems
     * when files in that directory such as settings.php are updated, because the
     * user pulling in the changes won't have permissions to modify files in the
     * directory.
     */
    $settings['skip_permissions_hardening'] = TRUE;
}

// While .devtools/provision runs, web requests stop here, before Drupal loads
// a container or writes a cache from a half-installed site.
if (PHP_SAPI !== 'cli' && file_exists(__DIR__ . '/files/.provisioning')) {
  http_response_code(503);
  header('Retry-After: 30');
  exit;
}

// Where the reset snapshot lives, and where uploads that must not be served
// go. Lagoon keeps this directory on the shared files volume.
$settings['file_private_path'] = __DIR__ . '/files/private';

// The demo resets itself on request (druxt_umami's reset route, admins only,
// one a minute). DRUXT_UMAMI_RESET=0 switches that off for an environment.
$settings['druxt_umami.reset'] = getenv('DRUXT_UMAMI_RESET') !== '0';

// The frontend's Druxt cache clear endpoint, which Purge calls when content
// changes: the app service on Lagoon, overridden for local runs and CI. The
// secret is the one the frontend holds as DRUXT_CACHE_SECRET.
$purger = 'purge_purger_http.settings.druxt_frontend';
$config[$purger]['hostname'] = getenv('DRUXT_CACHE_CLEAR_HOST') ?: 'app';
$config[$purger]['port'] = (int) (getenv('DRUXT_CACHE_CLEAR_PORT') ?: 3000);
$config[$purger]['headers'][0]['field'] = 'X-Druxt-Secret';
$config[$purger]['headers'][0]['value'] = getenv('DRUXT_CACHE_SECRET') ?: '';
