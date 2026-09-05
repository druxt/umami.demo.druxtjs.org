<?php

declare(strict_types=1);

namespace Drupal\Tests\druxt_umami\ExistingSite;

use PHPUnit\Framework\Attributes\Group;

/**
 * Asserts the decoupled site's HTML behaviour.
 *
 * Drupal here is a backend with an editor UI, not a public site, so anonymous
 * HTML requests belong to the Nuxt frontend and Drupal should hand them back.
 */
#[Group('druxt_umami')]
class BrowserTest extends DruxtUmamiTestBase {

  /**
   * Anonymous HTML requests are redirected to the login page.
   */
  public function testAnonymousHtmlRedirectsToLogin(): void {
    $response = $this->request('GET', '/');
    $this->assertSame(302, $response->getStatusCode());
    $this->assertStringEndsWith('/user/login', $response->getHeaderLine('Location'));
  }

  /**
   * The login page itself stays reachable.
   *
   * It is on anonymous_redirect's allowlist; without it the redirect above
   * would loop.
   */
  public function testLoginPageIsReachable(): void {
    $response = $this->request('GET', '/en/user/login');
    $this->assertSame(200, $response->getStatusCode());
    $this->assertStringContainsString('user_login_form', (string) $response->getBody());
  }

  /**
   * The API is not behind the anonymous redirect.
   */
  public function testApiIsNotRedirected(): void {
    $response = $this->request('GET', '/en/jsonapi');
    $this->assertSame(200, $response->getStatusCode());
  }

}
