<?php

/**
 * @file
 * Router for PHP's built-in server.
 *
 * The built-in server has no rewrite rules, so a request for a path Drupal
 * owns arrives as a missing file. Serve real files directly and hand
 * everything else to index.php.
 */

declare(strict_types=1);

// Drupal stores extension namespaces as paths relative to the app root and
// never chdirs, so plugin and entity discovery silently finds nothing unless
// the working directory is the docroot. A real web server sets that; the
// built-in server keeps whatever directory it was launched from.
chdir(__DIR__ . '/../web');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$file = __DIR__ . '/../web' . $path;

if ($path !== '/' && file_exists($file) && !is_dir($file)) {
  return FALSE;
}

$_SERVER['SCRIPT_NAME'] = '/index.php';
// Symfony Runtime requires SCRIPT_FILENAME and expects index.php's closure
// back. For file-like URLs the built-in server points it at this router.
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/../web/index.php';
require __DIR__ . '/../web/index.php';
