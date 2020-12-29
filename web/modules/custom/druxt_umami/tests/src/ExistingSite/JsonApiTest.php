<?php

namespace Drupal\Tests\druxt_umami\ExistingSite;

use weitzman\DrupalTestTraits\ExistingSiteBase;

class JsonApiTest extends ExistingSiteBase {
  protected function setUp(): void {
    parent::setUp();
  }

  public function testRouter() {
    $this->visit('/router/translate-path?path=/');
    $this->assertSession()->statusCodeEquals(200);

    $data = json_decode($this->getCurrentPageContent(), TRUE);
    $this->assertArrayHasKey('resolved', $data);
    $this->assertEquals($data['resolved'], 'http://nginx:8080/en/node');
  }
}
