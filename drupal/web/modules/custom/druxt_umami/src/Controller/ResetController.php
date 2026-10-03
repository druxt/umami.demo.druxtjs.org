<?php

declare(strict_types=1);

namespace Drupal\druxt_umami\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Site\Settings;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Puts the demo back to its snapshot on request.
 *
 * The work is `.devtools/reset`, run in the background: the database and
 * the files return to what `.devtools/snapshot` kept after the install, and
 * the frontend is told to rebuild. One reset a minute, because visitors
 * are mid-click on the same site.
 */
final class ResetController extends ControllerBase {

  /** Seconds between resets. */
  private const QUIET = 60;

  /**
   * Starts a reset, or says why not.
   */
  public function reset(): JsonResponse {
    if (!Settings::get('druxt_umami.reset', TRUE)) {
      return new JsonResponse(['message' => 'Resetting is switched off here.'], 403);
    }

    $root = dirname(DRUPAL_ROOT);
    $script = $root . '/.devtools/reset';
    $dir = getenv('DRUXT_RESET_DIR') ?: DRUPAL_ROOT . '/sites/default/files/private/druxt-reset';
    // A dump on MariaDB, the file itself on SQLite.
    $snapshot = is_file($dir . '/database.sql') || is_file($dir . '/database.sqlite');
    if (!is_executable($script) || !$snapshot) {
      return new JsonResponse(['message' => 'There is no snapshot to reset to.'], 503);
    }

    // A file beside the snapshot, not State: the restore puts State back too.
    $marker = $dir . '/last-reset';
    $now = \Drupal::time()->getRequestTime();
    $wait = (is_file($marker) ? (int) filemtime($marker) : 0) + self::QUIET - $now;
    if ($wait > 0) {
      return new JsonResponse(['message' => "A reset just ran; try again in $wait seconds.", 'retryAfter' => $wait], 429);
    }
    touch($marker, $now);

    // Detached, so the response returns while the site restores itself.
    $log = escapeshellarg($dir . '/reset.log');
    exec('nohup ' . escapeshellarg($script) . " > $log 2>&1 &");

    return new JsonResponse([
      'message' => 'Resetting. Drupal is back to the fresh demo in a moment, the front end follows once it has rebuilt, and every editor is signed out.',
      'snapshot' => trim((string) @file_get_contents($dir . '/taken')) ?: NULL,
    ], 202);
  }

}
