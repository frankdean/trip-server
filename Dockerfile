# -*- mode: dockerfile; -*- vim: set ft=dockerfile:
FROM node:12.22.9-buster-slim AS build
LABEL uk.co.fdsd.tripserver.version="1.9.1"
#LABEL uk.co.fdsd.tripserver.release-date="2021-09-18"
#LABEL uk.co.fdsd.tripserver.is-production=""
WORKDIR /app-server
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock ./
RUN yarn

FROM node:12.22.9-buster-slim AS trip-web-client
WORKDIR /app-server

ARG TRIP_CLIENT_VERSION=v1.9.1
ARG TRIP_CLIENT_SHA256=42d36743d2a6e7db52dda1bc087ae5ae6a84576f2047c606377d443ea2bdb9d1
ARG TRIP_CLIENT_FILENAME=trip-web-client-release-${TRIP_CLIENT_VERSION}.tgz

ADD --chown=node:node https://www.fdsd.co.uk/trip-server/download/trip-web-client-release-${TRIP_CLIENT_VERSION}.tgz .

RUN echo "$TRIP_CLIENT_SHA256 *${TRIP_CLIENT_FILENAME}" | sha256sum -c - \
    && mkdir app \
    && chown node:node app

USER node

RUN tar --strip-components=1 -xaf "$TRIP_CLIENT_FILENAME" -C app

USER root

RUN rm "$TRIP_CLIENT_FILENAME"

FROM node:12.22.9-buster-slim

# Create directories owned by node user
WORKDIR /webapp
WORKDIR node_modules
WORKDIR /app-server
WORKDIR node_modules
WORKDIR /app-server

RUN chown -R node:node /webapp /app-server

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

USER node

COPY --chown=node:node --from=build /app-server/node_modules ./node_modules
COPY --chown=node:node --from=trip-web-client /app-server/app ./app
COPY --chown=node:node yarn.lock package.json .jshintrc *.js /app-server/
COPY --chown=node:node spec/*.js spec/*.gpx spec/*.yaml /app-server/spec/
COPY --chown=node:node spec/*.js spec/*.json /app-server/spec/support/

COPY docker-entrypoint.sh /usr/local/bin/

USER root

RUN rm -f config.yaml && touch config.yaml && chown node:node config.yaml && chmod 0640 config.yaml

USER node

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["node", "index.js"]
