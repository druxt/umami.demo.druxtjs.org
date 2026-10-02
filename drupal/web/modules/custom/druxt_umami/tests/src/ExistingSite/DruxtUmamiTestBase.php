<?php

declare(strict_types=1);

namespace Drupal\Tests\druxt_umami\ExistingSite;

use Psr\Http\Message\ResponseInterface;
use weitzman\DrupalTestTraits\ExistingSiteBase;

/**
 * Base class for tests that assert what the Druxt frontend consumes.
 *
 * The frontend talks to this site over HTTP, so the tests do too, rather than
 * through Mink: they need unfollowed redirects, POST bodies and raw status
 * codes.
 */
abstract class DruxtUmamiTestBase extends ExistingSiteBase {

  /**
   * The site under test, without a trailing slash.
   */
  protected string $siteUrl;

  /**
   * {@inheritdoc}
   */
  protected function setUp(): void {
    parent::setUp();
    $this->siteUrl = rtrim(getenv('DTT_BASE_URL') ?: 'http://127.0.0.1:8888', '/');
  }

  /**
   * Requests a path, without following redirects or throwing on 4xx and 5xx.
   *
   * @param string $method
   *   The HTTP method.
   * @param string $path
   *   A root-relative path, query string included.
   * @param array $options
   *   Extra Guzzle request options.
   *
   * @return \Psr\Http\Message\ResponseInterface
   *   The response.
   */
  protected function request(string $method, string $path, array $options = []): ResponseInterface {
    return \Drupal::httpClient()->request($method, $this->siteUrl . $path, $options + [
      'http_errors' => FALSE,
      'allow_redirects' => FALSE,
    ]);
  }

  /**
   * Asserts a path returns 200 and decodes its JSON body.
   *
   * @param string $path
   *   A root-relative path, query string included.
   *
   * @return array
   *   The decoded response.
   */
  protected function getJson(string $path): array {
    $response = $this->request('GET', $path);
    $this->assertSame(200, $response->getStatusCode(), "GET $path");
    return json_decode((string) $response->getBody(), TRUE, 512, JSON_THROW_ON_ERROR);
  }

  /**
   * Reduces an absolute URL to the path and query this site is served on.
   *
   * Responses embed absolute URLs built from the request host, which is not
   * the host the test suite was pointed at in every environment.
   *
   * @param string $url
   *   An absolute URL.
   *
   * @return string
   *   The root-relative path, query string included.
   */
  protected function toPath(string $url): string {
    $parts = parse_url($url);
    return ($parts['path'] ?? '/') . (isset($parts['query']) ? '?' . $parts['query'] : '');
  }

}
