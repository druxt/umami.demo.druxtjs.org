#!/usr/bin/env bash

# Download ddev's images
ddev debug download-images

# Set up ddev for use on gitpod
DRUPAL_DIR="${GITPOD_REPO_ROOT}"

# Misc housekeeping before start
ddev config global --instrumentation-opt-in=true

# Start ddev
cd $DRUPAL_DIR && ddev start -y
