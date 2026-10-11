<?php

declare(strict_types=1);

namespace Drupal\druxt_umami\Plugin\jsonapi_hypermedia\LinkProvider;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\jsonapi\JsonApiResource\ResourceObject;
use Drupal\jsonapi_hypermedia\AccessRestrictedLink;
use Drupal\jsonapi_hypermedia\Plugin\LinkProviderBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * An entity operation, such as Edit, as a link on its resource object.
 *
 * Present only for a user who may follow it, and cached by what decided that.
 *
 * @JsonapiHypermediaLinkProvider(
 *   id = "druxt_umami.entity_operation",
 *   deriver = "Drupal\druxt_umami\Plugin\Derivative\EntityOperationLinkProviderDeriver",
 * )
 */
final class EntityOperationLinkProvider extends LinkProviderBase implements ContainerFactoryPluginInterface {

  private EntityRepositoryInterface $entityRepository;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $provider = new self($configuration, $plugin_id, $plugin_definition);
    $provider->entityRepository = $container->get('entity.repository');
    return $provider;
  }

  /**
   * {@inheritdoc}
   */
  public function getLink($resource_object) {
    assert($resource_object instanceof ResourceObject);
    $cacheability = CacheableMetadata::createFromObject($resource_object);
    $entity = $this->entityRepository->loadEntityByUuid($resource_object->getResourceType()->getEntityTypeId(), $resource_object->getId());
    if (!$entity) {
      return AccessRestrictedLink::createInaccessibleLink($cacheability);
    }
    // The translation the request is in, so a Spanish page edits the Spanish
    // translation, under its own prefix.
    $entity = $this->entityRepository->getTranslationFromContext($entity);
    $url = $entity->toUrl($this->configuration['template']);
    $access = $url->access(NULL, TRUE);
    assert($access instanceof AccessResult);
    return AccessRestrictedLink::createLink($access->addCacheableDependency($entity), $cacheability, $url, $this->getLinkRelationType(), [
      'title' => $this->configuration['title'],
    ]);
  }

}
