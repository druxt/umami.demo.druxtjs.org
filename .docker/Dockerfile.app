FROM uselagoon/node-16-builder:latest as builder

COPY ./nuxt/ /app/
RUN yarn

FROM uselagoon/node-16:latest

COPY --from=builder /app/node_modules /app/node_modules
COPY ./nuxt/ /app/
COPY ./.env /app/

ARG BASE_URL
ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET
ARG OAUTH_CLIENT_ID

ENV BASE_URL ${BASE_URL}
ENV GITHUB_CLIENT_ID ${GITHUB_CLIENT_ID}
ENV GITHUB_CLIENT_SECRET ${GITHUB_CLIENT_SECRET}
ENV OAUTH_CLIENT_ID ${OAUTH_CLIENT_ID}

RUN yarn build && yarn generate

ENV HOST 0.0.0.0
EXPOSE 3000

CMD ["yarn", "start"]
