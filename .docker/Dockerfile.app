FROM uselagoon/node-14-builder:latest as builder

COPY ./nuxt/ /app/

RUN yarn

ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET
ARG OAUTH_CLIENT_ID

ENV GITHUB_CLIENT_ID ${GITHUB_CLIENT_ID}
ENV GITHUB_CLIENT_SECRET ${GITHUB_CLIENT_SECRET}
ENV OAUTH_CLIENT_ID ${OAUTH_CLIENT_ID}

RUN npm run generate

FROM uselagoon/nginx:latest

COPY --from=builder /app/dist /app/

COPY nginx.conf /etc/nginx/conf.d/app.conf

ENV HOST 0.0.0.0
EXPOSE 8080
