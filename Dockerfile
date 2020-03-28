# -*- mode: dockerfile; -*- vim: set ft=dockerfile:
FROM node:10.19-buster-slim AS build
LABEL uk.co.fdsd.tripserver.version="1.1.5"
#LABEL uk.co.fdsd.tripserver.release-date="2020-03-19"
#LABEL uk.co.fdsd.tripserver.is-production=""
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

FROM node:10.19-buster-slim AS trip-web-client
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN true \
    && mkdir app \
    && curl -fsSL https://www.fdsd.co.uk/trip-server/download/trip-web-client-release-v1.1.5.tar.gz -o trip-web-client-release-v1.1.5.tar.gz \
    && echo 'c595703e94235bdab33a30d02dfb0d76b577f33422527af9aaf21a95e67bb4ad *trip-web-client-release-v1.1.5.tar.gz' | sha256sum -c - \
    && tar --strip-components=1 -xaf trip-web-client-release-v1.1.5.tar.gz -C /app/app \
    && rm trip-web-client-release-v1.1.5.tar.gz

FROM node:10.19-buster-slim

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=trip-web-client /app/app ./app
COPY . .
COPY config-dist.json config.json

COPY docker-entrypoint.sh /usr/local/bin/

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["node", "index.js"]
