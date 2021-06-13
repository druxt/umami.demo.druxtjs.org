FROM amazeeio/node:14-builder as builder
COPY package.json package-lock.json /app/
RUN npm install

FROM amazeeio/node:14
COPY --from=builder /app/node_modules /app/node_modules
COPY . /app/

ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET
ARG OAUTH_CLIENT_ID

ENV GITHUB_CLIENT_ID ${GITHUB_CLIENT_ID}
ENV GITHUB_CLIENT_SECRET ${GITHUB_CLIENT_SECRET}
ENV OAUTH_CLIENT_ID ${OAUTH_CLIENT_ID}

RUN npm run generate

ENV HOST 0.0.0.0
EXPOSE 3000

CMD ["NODE_OPTIONS=-'--max-http-header-size=15000'", "npm", "start"]
