<?php

declare(strict_types=1);

namespace Drupal\druxt_umami\Plugin\Derivative;

use Drupal\Component\Plugin\Derivative\DeriverBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Plugin\Discovery\ContainerDeriverInterface;
use Drupal\jsonapi\ResourceType\ResourceType;
use Drupal\jsonapi\ResourceType\ResourceTypeRepositoryInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * One link provider per resource type and operation its entity type offers.
 *
 * JSON:API Hypermedia gives each provider one fixed link key, so the set of
 * operations is the entity type's link templates, not hook_entity_operation's
 * runtime list. An operation with no link template is not offered.
 */
final class EntityOperationLinkProviderDeriver extends DeriverBase implements ContainerDeriverInterface {

  /**
   * The link templates offered, and the label each is shown with.
   */
  public const OPERATIONS = [
    'edit-form' => 'Edit',
    'delete-form' => 'Delete',
    'version-history' => 'Revisions',
    'drupal:content-translation-overview' => 'Translate',
  ];

  public function __construct(
    private readonly ResourceTypeRepositoryInterface $resourceTypes,
    private readonly EntityTypeManagerInterface $entityTypeManager,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, $base_plugin_id) {
    return new self(
      $container->get('jsonapi.resource_type.repository'),
      $container->get('entity_type.manager'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getDerivativeDefinitions($base_plugin_definition) {
    $this->derivatives = [];
    foreach ($this->resourceTypes->all() as $resource_type) {
      assert($resource_type instanceof ResourceType);
      if ($resource_type->isInternal() || !$resource_type->isLocatable()) {
        continue;
      }
      $entity_type = $this->entityTypeManager->getDefinition($resource_type->getEntityTypeId(), FALSE);
      if (!$entity_type) {
        continue;
      }
      foreach (self::OPERATIONS as $template => $title) {
        if (!$entity_type->hasLinkTemplate($template)) {
          continue;
        }
        // A link key is a JSON:API member name, which allows no colon:
        // drupal:content-translation-overview is published as
        // drupal-content-translation-overview, its relation type unchanged.
        $key = str_replace(':', '-', $template);
        $this->derivatives["{$resource_type->getTypeName()}.{$key}"] = [
          'link_key' => $key,
          'link_relation_type' => $template,
          'link_context' => ['resource_object' => $resource_type->getTypeName()],
          'default_configuration' => ['template' => $template, 'title' => $title],
        ] + $base_plugin_definition;
      }
    }
    return $this->derivatives;
  }

}
