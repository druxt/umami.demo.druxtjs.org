FROM amazeeio/node:14-builder as builder
COPY package.json package-lock.json /app/
RUN npm install

FROM amazeeio/node:14
COPY --from=builder /app/node_modules /app/node_modules
COPY . /app/

EXPOSE 3000

CMD ["npm", "run", "dev"]
