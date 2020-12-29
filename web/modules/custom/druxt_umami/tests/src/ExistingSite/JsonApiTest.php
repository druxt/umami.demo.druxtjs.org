<?php

namespace Drupal\Tests\druxt_umami\ExistingSite;

use weitzman\DrupalTestTraits\ExistingSiteBase;

class JsonApiTest extends ExistingSiteBase {
  protected function setUp(): void {
    parent::setUp();
  }

  public function testApi() {
    $this->visit('/jsonapi');
    $this->assertSession()->statusCodeEquals(200);
  }

  public function testRouter() {
    // Homepage.
    $this->visit('/router/translate-path?path=/');
    $this->assertSession()->statusCodeEquals(200);

    $data = json_decode($this->getCurrentPageContent(), TRUE);
    $this->assertArrayHasKey('resolved', $data);
    $this->assertEquals($data['resolved'], 'http://nginx:8080/en/node');

    // Node 1.
    $this->visit('/router/translate-path?path=/node/1');
    $this->assertSession()->statusCodeEquals(200);

    $data = json_decode($this->getCurrentPageContent(), TRUE);
    $this->assertArrayHasKey('resolved', $data);
    $this->assertEquals($data['resolved'], 'http://nginx:8080/en/recipes/deep-mediterranean-quiche');
  }

  public function testJsonApiViews() {
    // Router.
    $this->visit('/router/translate-path?path=/');
    $this->assertSession()->statusCodeEquals(200);

    $route = json_decode($this->getCurrentPageContent(), TRUE);
    $this->assertArrayHasKey('view', $route);
    $this->assertArrayHasKey('jsonapi_views', $route);
    $this->assertEquals($route['view']['view_id'], 'frontpage');
    $this->assertEquals($route['view']['display_id'], 'page_1');

    // View resource.
    $this->visit("/jsonapi/view/view/{$route['view']['uuid']}");
    $this->assertSession()->statusCodeEquals(200);

    $view = json_decode($this->getCurrentPageContent(), TRUE);
    $this->assertArrayHasKey('data', $view);
    $this->assertEquals($view['data']['type'], 'view--view');
    $this->assertEquals($view['data']['id'], $route['view']['uuid']);

    // JSON:API Views resource.
    $this->visit($route['jsonapi_views']);
    $this->assertSession()->statusCodeEquals(200);

    $results = json_decode($this->getCurrentPageContent(), TRUE);
    $this->assertArrayHasKey('data', $results);
    $this->assertCount(4, $results['data']);
  }
}
