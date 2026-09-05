<?php

declare(strict_types=1);

namespace Drupal\Tests\druxt_umami\ExistingSite;

use PHPUnit\Framework\Attributes\Group;

/**
 * Asserts the API contract the Druxt frontend is built against.
 *
 * Every endpoint here is one the Nuxt site calls at build or run time. A
 * failure means the frontend cannot generate.
 */
#[Group('druxt_umami')]
class JsonApiTest extends DruxtUmamiTestBase {

  /**
   * The JSON:API entry point is served.
   */
  public function testEntryPoint(): void {
    $data = $this->getJson('/jsonapi');
    $this->assertSame('1.1', $data['jsonapi']['version']);
  }

  /**
   * Both site languages expose a prefixed entry point.
   *
   * DruxtJS addresses the API per language, so a missing prefix breaks every
   * request the frontend makes, not just the translated ones.
   */
  public function testLanguagePrefixedEntryPoints(): void {
    foreach (['en', 'es'] as $langcode) {
      $data = $this->getJson("/$langcode/jsonapi");
      $this->assertArrayHasKey('links', $data, "/$langcode/jsonapi");
    }
  }

  /**
   * Umami's recipes are exposed as a JSON:API collection.
   */
  public function testRecipeCollection(): void {
    $data = $this->getJson('/en/jsonapi/node/recipe');
    $this->assertNotEmpty($data['data']);
    foreach ($data['data'] as $item) {
      $this->assertSame('node--recipe', $item['type']);
    }
  }

  /**
   * DruxtMenu reads the main menu through jsonapi_menu_items.
   */
  public function testMenuItems(): void {
    $data = $this->getJson('/en/jsonapi/menu_items/main');
    $this->assertNotEmpty($data['data']);
    $this->assertSame('menu_link_content--menu_link_content', $data['data'][0]['type']);
  }

  /**
   * Resolves the front page to the frontpage view.
   */
  public function testRouterResolvesTheFrontPage(): void {
    $data = $this->getJson('/router/translate-path?path=/');
    $this->assertTrue($data['isHomePath']);
    $this->assertSame('frontpage', $data['view']['view_id']);
    $this->assertSame('page_1', $data['view']['display_id']);
    $this->assertSame('view--view', $data['jsonapi']['resourceName']);
  }

  /**
   * Resolves a language-prefixed alias.
   *
   * This is the path the multilingual frontend actually requests, and the one
   * that needs the langcode patches applied to the druxt module.
   */
  public function testRouterResolvesLocalisedAlias(): void {
    $path = '/en/recipes/deep-mediterranean-quiche';
    $data = $this->getJson('/router/translate-path?path=' . $path);
    $this->assertFalse($data['isHomePath']);
    $this->assertStringEndsWith($path, $data['resolved']);
  }

  /**
   * DruxtView reads a view's results through jsonapi_views.
   */
  public function testJsonApiViewsResource(): void {
    $route = $this->getJson('/router/translate-path?path=/');

    $view = $this->getJson($this->toPath($route['jsonapi']['individual']));
    $this->assertSame('view--view', $view['data']['type']);
    $this->assertSame($route['view']['uuid'], $view['data']['id']);

    $results = $this->getJson($this->toPath($route['jsonapi_views']));
    $this->assertNotEmpty($results['data']);
  }

  /**
   * Publishes a Lunr index for the frontend search bar.
   */
  public function testSearchIndexIsPublished(): void {
    $data = $this->getJson('/js-search/settings');
    $files = $data['servers']['druxt']['indexes']['default']['fileList'];
    $this->assertNotEmpty($files);
    foreach ($files as $url) {
      $this->assertStringContainsString('/search-api-js/druxt/default/', $url);
    }
  }

  /**
   * The OAuth token endpoint is routed and validates its input.
   *
   * A bare POST must be rejected by simple_oauth rather than by the router, so
   * this proves the endpoint the login flow posts to exists.
   */
  public function testOauthTokenEndpointRejectsAnEmptyGrant(): void {
    $response = $this->request('POST', '/oauth/token');
    $this->assertSame(400, $response->getStatusCode());

    $data = json_decode((string) $response->getBody(), TRUE, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('invalid_request', $data['error']);
  }

}
