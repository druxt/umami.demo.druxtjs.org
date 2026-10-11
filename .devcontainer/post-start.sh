#!/usr/bin/env bash
# Starts the backend and the site each time the container starts. The site
# builds against the backend when it starts, as it does on Lagoon.
set -uo pipefail
mkdir -p .devcontainer/logs
(cd drupal && nohup .devtools/start > ../.devcontainer/logs/drupal.log 2>&1 &)
(cd nuxt && nohup node server/start.js > ../.devcontainer/logs/site.log 2>&1 &)
echo "Drupal on port 8888, the site on port 3000. Logs are in .devcontainer/logs/."
