
#!/usr/bin/env bash
set -eu -o pipefail

# Set up Drupal website
ddev composer install
ddev drush -y si demo_umami
ddev drush -y en druxt_umami
ddev drush rap anonymous 'access\ druxt\ resources'
ddev drush config:set jsonapi.settings read_only 0 -y
ddev drush search-api:index
