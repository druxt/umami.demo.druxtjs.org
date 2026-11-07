ARG CLI_IMAGE
FROM ${CLI_IMAGE} as cli

FROM uselagoon/php-8.3-fpm:26.10.0

COPY --from=cli /app /app
