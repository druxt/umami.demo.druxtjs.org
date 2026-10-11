#!/usr/bin/env bash
# Dev container setup, for DevPod, Codespaces and VS Code. The PHP feature
# builds PHP without gd and with sodium disabled. Drupal's installer needs gd,
# and simple_oauth signs tokens with sodium, so both are fixed here.
set -euo pipefail

echo "==> Installing system dependencies"
sudo apt-get update -qq > /dev/null
sudo apt-get install -y -qq python3 python3-setuptools build-essential sqlite3 libjpeg-dev libpng-dev libwebp-dev libfreetype-dev zlib1g-dev > /dev/null

CONF_DIR=$(php --ini | grep 'Scan for additional .ini files' | sed 's/.*: *//')
echo 'extension=sodium' | sudo tee "$CONF_DIR/sodium.ini" > /dev/null

if ! php -m | grep -qx gd; then
  echo "==> Building gd from PHP's own source tree"
  PHP_FULL_VERSION=$(php -r 'echo PHP_VERSION;')
  PHP_SRC_TMP="$(mktemp -d)"
  trap 'rm -rf "$PHP_SRC_TMP"' EXIT
  mkdir -p "$PHP_SRC_TMP/gd"
  curl -fsSL "https://www.php.net/distributions/php-${PHP_FULL_VERSION}.tar.gz" -o "$PHP_SRC_TMP/php-src.tar.gz"
  tar -xzf "$PHP_SRC_TMP/php-src.tar.gz" -C "$PHP_SRC_TMP/gd" --strip-components=3 "php-${PHP_FULL_VERSION}/ext/gd"
  (
    cd "$PHP_SRC_TMP/gd"
    phpize > /dev/null
    ./configure --with-jpeg --with-webp --with-freetype > /dev/null
    make -j"$(nproc)" > /dev/null
    sudo make install > /dev/null
  )
  echo 'extension=gd' | sudo tee "$CONF_DIR/gd.ini" > /dev/null
fi
php -r "exit(extension_loaded('gd') && extension_loaded('sodium') && extension_loaded('pdo_sqlite') ? 0 : 1);" || { echo "gd, sodium or pdo_sqlite is not loaded" >&2; exit 1; }

echo "==> Installing the root tooling and turning on the commit hooks"
npm ci --loglevel=error
npm run hooks:install

echo "==> Installing Drupal and provisioning a fresh Umami"
(cd drupal && composer install --no-interaction --no-progress && .devtools/provision)

echo "==> Installing the frontend (Yarn 1)"
corepack enable 2> /dev/null || sudo env "PATH=$PATH" corepack enable
(cd nuxt && yarn install --frozen-lockfile)

echo
echo "Ready. The backend and the site start on their own; the site opens on port 3000."
