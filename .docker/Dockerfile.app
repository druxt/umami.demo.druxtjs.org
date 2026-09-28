FROM uselagoon/node-16-builder:latest as builder

COPY ./nuxt/ /app/
RUN yarn install --frozen-lockfile

FROM uselagoon/node-16:latest

COPY --from=builder /app/node_modules /app/node_modules
COPY ./nuxt/ /app/
# The site builds when the container starts, into /app.
RUN fix-permissions /app

ENV HOST=0.0.0.0 PORT=3000 DRUPAL_URL=http://nginx:8080
EXPOSE 3000

CMD ["node", "server/start.js"]
