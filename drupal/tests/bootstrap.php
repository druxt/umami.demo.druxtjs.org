<?php

/**
 * @file
 * PHPUnit bootstrap: DTT's fast bootstrap plus this repository's namespaces.
 */

declare(strict_types=1);

use weitzman\DrupalTestTraits\AddPsr4;

[$finder, $class_loader] = AddPsr4::add();
$root = $finder->getDrupalRoot();

// AddPsr4 registers only core's test namespaces, so custom modules register
// their own.
foreach (glob("$root/modules/custom/*/tests/src", GLOB_ONLYDIR) ?: [] as $dir) {
  $module = basename(dirname($dir, 2));
  $class_loader->addPsr4("Drupal\\Tests\\$module\\", $dir);
}
