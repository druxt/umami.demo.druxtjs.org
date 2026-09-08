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
   * A tag reference carries everything needed to render a link to it.
   *
   * DruxtEntity filters its query by the schema DruxtSchema derives from the
   * view display. A taxonomy term display holds only `description`, since a
   * term's name is its label and its path is not a display component, so the
   * mere existence of one starves the query of `name` and `path`. The visible
   * result is an empty badge linking to `/en` plus undefined, and every tag
   * page stops being linked and so stops being generated: 48 routes instead
   * of 65. druxt_umami_install() deletes those displays; this asserts both
   * halves so the workaround cannot be quietly dropped.
   */
  public function testTagReferencesAreRenderable(): void {
    $displays = \Drupal::entityTypeManager()
      ->getStorage('entity_view_display')
      ->loadByProperties(['targetEntityType' => 'taxonomy_term']);
    $this->assertSame([], array_keys($displays), 'No taxonomy term view display exists.');

    $data = $this->getJson('/en/jsonapi/taxonomy_term/tags');
    $this->assertNotEmpty($data['data']);
    foreach ($data['data'] as $term) {
      $this->assertNotEmpty($term['attributes']['name'] ?? NULL);
      $this->assertNotEmpty($term['attributes']['path']['alias'] ?? NULL);
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
   * Resolves a view in a non-default language, with its translated title.
   *
   * This is the end-to-end proof for drupal.org #3273228. The router request
   * carries no language of its own, so the subscriber reads the language off
   * the requested path, strips the prefix before matching the route, and
   * points the config override language at it. Without the last part the view
   * loads with default-language config and reports the untranslated title.
   */
  public function testRouterResolvesViewInSpanish(): void {
    $data = $this->getJson('/router/translate-path?path=/es');

    $this->assertSame('frontpage', $data['view']['view_id']);
    $this->assertSame('page_1', $data['view']['display_id']);
    $this->assertSame('es', $data['view']['langcode']);
    $this->assertSame('Inicio', $data['label']);
    $this->assertStringEndsWith('/es/node', $data['resolved']);

    // The same view in the default language, to prove the langcode is read
    // from the path rather than being constant.
    $english = $this->getJson('/router/translate-path?path=/en/node');
    $this->assertSame('en', $english['view']['langcode']);
    $this->assertSame('Home', $english['label']);
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
   * The front page grid does not repeat the banner's recipes.
   *
   * Both views list promoted recipes newest first. Drupal 11 gives every demo
   * node its own created date (core #3399970), so without the offset
   * druxt_umami_install() sets, the grid opens with the two recipes the banner
   * attachment just showed.
   */
  public function testFrontPageGridSkipsTheBannerRecipes(): void {
    $banner = $this->getJson('/en/jsonapi/views/promoted_items/attachment_1');
    $grid = $this->getJson('/en/jsonapi/views/frontpage/page_1');
    $this->assertCount(2, $banner['data']);
    $this->assertCount(4, $grid['data']);

    $overlap = array_intersect(
      array_column($banner['data'], 'id'),
      array_column($grid['data'], 'id'),
    );
    $this->assertSame([], $overlap, 'No recipe appears in both the banner and the grid.');
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
   * The consumer the login flow uses is actually usable.
   *
   * Simple OAuth 6 changed three things that each fail closed and silently:
   * the client is resolved by the consumer's client_id field rather than its
   * uuid, every grant is gated on the grant_types field, and the endpoint
   * cannot sign without a generated key pair. Any of them missing answers
   * invalid_client, which is indistinguishable from a routing test passing.
   */
  public function testOauthConsumerIsUsable(): void {
    $consumers = \Drupal::entityTypeManager()
      ->getStorage('consumer')
      ->loadByProperties(['label' => 'Druxt']);
    $consumer = reset($consumers);
    $this->assertNotFalse($consumer, 'The Druxt consumer exists.');
    $this->assertNotEmpty($consumer->getClientId(), 'The consumer has a client_id.');

    $grants = array_column($consumer->get('grant_types')->getValue(), 'value');
    $this->assertContains('authorization_code', $grants);
    $this->assertContains('refresh_token', $grants);

    $settings = \Drupal::config('simple_oauth.settings');
    foreach (['public_key', 'private_key'] as $key) {
      $path = \Drupal::service('file_system')->realpath($settings->get($key))
        ?: DRUPAL_ROOT . '/' . $settings->get($key);
      $this->assertFileExists($path, "The $key exists.");
    }

    // A bogus code must be rejected as a bad grant, not as an unknown client:
    // invalid_client would mean none of the above is actually wired up.
    $response = $this->request('POST', '/oauth/token', [
      'form_params' => [
        'grant_type' => 'authorization_code',
        'client_id' => $consumer->getClientId(),
        'code' => 'not-a-real-code',
        'redirect_uri' => 'http://localhost:3000/callback',
      ],
    ]);
    $data = json_decode((string) $response->getBody(), TRUE, 512, JSON_THROW_ON_ERROR);
    $this->assertSame('invalid_grant', $data['error']);
    $this->assertSame(400, $response->getStatusCode());
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
