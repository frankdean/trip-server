# -*- mode: dockerfile; -*- vim: set ft=dockerfile:
FROM node:10.19-buster-slim AS build
LABEL uk.co.fdsd.tripserver.version="1.4.0"
#LABEL uk.co.fdsd.tripserver.release-date="2020-08-12"
#LABEL uk.co.fdsd.tripserver.is-production=""
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

FROM node:10.19-buster-slim AS trip-web-client
WORKDIR /app
ARG TRIP_CLIENT_VERSION=v1.4.0
ARG TRIP_CLIENT_SHA256=5377a83bf63c95f7a2d274721b36ce24d5f8fc0873f44f9d01a20e98b5511068
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN true \
    && mkdir app \
    && curl -fsSL "https://www.fdsd.co.uk/trip-server/download/trip-web-client-release-${TRIP_CLIENT_VERSION}.tar.gz" -o "trip-web-client-release-${TRIP_CLIENT_VERSION}.tar.gz" \
    && echo "$TRIP_CLIENT_SHA256 *trip-web-client-release-${TRIP_CLIENT_VERSION}.tar.gz" | sha256sum -c - \
    && tar --strip-components=1 -xaf "trip-web-client-release-${TRIP_CLIENT_VERSION}.tar.gz" -C /app/app \
    && rm "trip-web-client-release-${TRIP_CLIENT_VERSION}.tar.gz"

FROM node:10.19-buster-slim

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=trip-web-client /app/app ./app
COPY . .

COPY docker-entrypoint.sh /usr/local/bin/

RUN rm -f config.json && touch config.json && chown node:node config.json && chmod 0640 config.json

USER node

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["node", "index.js"]
