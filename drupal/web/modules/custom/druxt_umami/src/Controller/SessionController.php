<?php

declare(strict_types=1);

namespace Drupal\druxt_umami\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ends the Drupal session of the browser that asks.
 *
 * A sign-in on the frontend opens its own session, and refuses to reuse one
 * it finds already open, such as one left by Drupal's own login form. Core's
 * JSON logout wants the token issued at that login, which the frontend never
 * had, so druxt-auth asks this route instead, with the session's CSRF token.
 */
final class SessionController extends ControllerBase {

  /**
   * Signs the current account out of this session.
   */
  public function end(): Response {
    user_logout();
    return new Response('', 204);
  }

}
