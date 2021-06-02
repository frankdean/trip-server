# -*- mode: dockerfile; -*- vim: set ft=dockerfile:
FROM node:12.22.1-buster-slim AS build
LABEL uk.co.fdsd.tripserver.version="1.6.1"
#LABEL uk.co.fdsd.tripserver.release-date="2021-05-29"
#LABEL uk.co.fdsd.tripserver.is-production=""
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock ./
RUN yarn

FROM node:12.22.1-buster-slim AS trip-web-client
WORKDIR /app

ARG TRIP_CLIENT_VERSION=v1.6.1
ARG TRIP_CLIENT_SHA256=f2fd02bb0ec5e91020c4eeddde13817bdd3c29d36610a5a86a198ce8f47d26a4
ARG TRIP_CLIENT_FILENAME=trip-web-client-release-${TRIP_CLIENT_VERSION}.tgz

ADD --chown=node:node https://www.fdsd.co.uk/trip-server/download/trip-web-client-release-${TRIP_CLIENT_VERSION}.tgz .

RUN echo "$TRIP_CLIENT_SHA256 *${TRIP_CLIENT_FILENAME}" | sha256sum -c - \
    && mkdir app \
    && chown node:node app

USER node

RUN tar --strip-components=1 -xaf "$TRIP_CLIENT_FILENAME" -C app

USER root

RUN rm "$TRIP_CLIENT_FILENAME"

FROM node:12.22.1-buster-slim

USER root

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=trip-web-client /app/app ./app
COPY yarn.lock package.json .jshintrc *.js /app/
COPY spec /app/spec/

COPY docker-entrypoint.sh /usr/local/bin/

RUN rm -f config.json && touch config.json && chown node:node config.json && chmod 0640 config.json
RUN rm -f config.yaml

USER node

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["node", "index.js"]
