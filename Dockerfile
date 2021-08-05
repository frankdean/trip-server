# -*- mode: dockerfile; -*- vim: set ft=dockerfile:
FROM node:12.22.4-buster-slim AS build
LABEL uk.co.fdsd.tripserver.version="1.7.0"
#LABEL uk.co.fdsd.tripserver.release-date="2021-08-02"
#LABEL uk.co.fdsd.tripserver.is-production=""
WORKDIR /app-server
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock ./
RUN yarn

FROM node:12.22.4-buster-slim AS trip-web-client
WORKDIR /app-server

ARG TRIP_CLIENT_VERSION=v1.7.0-rc.1
ARG TRIP_CLIENT_SHA256=d8251dc20bbafe8d16487aaf84422ec0b6c6970f96a8ef9a4c02df8c56f4bd02
ARG TRIP_CLIENT_FILENAME=trip-web-client-release-${TRIP_CLIENT_VERSION}.tgz

ADD --chown=node:node https://www.fdsd.co.uk/trip-server/download/trip-web-client-release-${TRIP_CLIENT_VERSION}.tgz .

RUN echo "$TRIP_CLIENT_SHA256 *${TRIP_CLIENT_FILENAME}" | sha256sum -c - \
    && mkdir app \
    && chown node:node app

USER node

RUN tar --strip-components=1 -xaf "$TRIP_CLIENT_FILENAME" -C app

USER root

RUN rm "$TRIP_CLIENT_FILENAME"

FROM node:12.22.4-buster-slim

USER root

WORKDIR /app-server

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app-server/node_modules ./node_modules
COPY --from=trip-web-client /app-server/app ./app
COPY yarn.lock package.json .jshintrc *.js /app-server/
COPY spec/*.js spec/*.gpx spec/*.yaml /app-server/spec/
COPY spec/*.js spec/*.json /app-server/spec/support/

COPY docker-entrypoint.sh /usr/local/bin/

RUN rm -f config.json && touch config.json && chown node:node config.json && chmod 0640 config.json
RUN rm -f config.yaml

USER node

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["node", "index.js"]
