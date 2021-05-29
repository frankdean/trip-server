# -*- mode: dockerfile; -*- vim: set ft=dockerfile:
FROM node:10.24.1-buster-slim AS build
LABEL uk.co.fdsd.tripserver.version="1.6.1-rc.3"
#LABEL uk.co.fdsd.tripserver.release-date="2021-05-29"
#LABEL uk.co.fdsd.tripserver.is-production=""
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock ./
RUN yarn install

FROM node:10.24.1-buster-slim AS trip-web-client
WORKDIR /app
ARG TRIP_CLIENT_VERSION=v1.6.1-rc.3
ARG TRIP_CLIENT_SHA256=9fb6034837d700faf65f4bd194e10651e890679061f15a9bb3d464d60603ebe0
ARG TRIP_CLIENT_FILENAME=trip-web-client-release-${TRIP_CLIENT_VERSION}.tgz
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*
RUN true \
    && mkdir app \
    && curl -fsSL "https://www.fdsd.co.uk/trip-server/download/${TRIP_CLIENT_FILENAME}" -o "trip-web-client-release-${TRIP_CLIENT_VERSION}.tgz" \
    && echo "$TRIP_CLIENT_SHA256 *${TRIP_CLIENT_FILENAME}" | sha256sum -c - \
    && tar --strip-components=1 -xaf "$TRIP_CLIENT_FILENAME" -C /app/app \
    && rm "$TRIP_CLIENT_FILENAME"

FROM node:10.24.1-buster-slim

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=trip-web-client /app/app ./app
COPY . .

COPY docker-entrypoint.sh /usr/local/bin/

RUN rm -f config.json && touch config.json && chown node:node config.json && chmod 0640 config.json
RUN rm -f config.yaml

USER node

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["node", "index.js"]
