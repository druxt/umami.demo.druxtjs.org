# Only what the install reads, so a code change reuses the installed
# dependencies. Dockerfile.storybook repeats these stages to share them.
FROM uselagoon/node-16-builder:23.10.0 AS manifests
COPY ./nuxt/ /nuxt/
RUN mkdir /manifests && cd /nuxt \
  && cp package.json yarn.lock /manifests/ \
  && for dir in patches vendor; do \
    if [ -d "$dir" ]; then cp -R "$dir" "/manifests/$dir"; fi; \
  done

FROM uselagoon/node-16-builder:23.10.0 AS deps
COPY --from=manifests /manifests /app/
RUN yarn install --frozen-lockfile

# Dependencies first, as a layer of their own that a code change leaves as it
# was. Owned by Lagoon's runtime user, so the build at start can write to /app
# without a fix-permissions pass over node_modules.
FROM uselagoon/node-16:23.10.0
COPY --from=deps --chown=10000:0 /app /app
COPY --chown=10000:0 ./nuxt/ /app/

ENV HOST=0.0.0.0 PORT=3000 DRUPAL_URL=http://nginx:8080
EXPOSE 3000

CMD ["node", "server/start.js"]
