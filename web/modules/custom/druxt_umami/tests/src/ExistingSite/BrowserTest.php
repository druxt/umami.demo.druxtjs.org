<?php

namespace Drupal\Tests\druxt_umami\ExistingSite;

use weitzman\DrupalTestTraits\ExistingSiteBase;

class BrowserTest extends ExistingSiteBase {
  protected function setUp(): void {
    parent::setUp();
  }

  public function testHomepage() {
    $this->visit('/');
    $this->assertSession()->statusCodeEquals(200);
    $this->assertSession()->titleEquals('Home | Drush Site-Install');
  }
}
