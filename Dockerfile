# -*- mode: dockerfile; -*- vim: set ft=dockerfile:
FROM node:10.19-buster-slim AS build
LABEL uk.co.fdsd.tripserver.version="1.2.0-rc.5"
#LABEL uk.co.fdsd.tripserver.release-date="2020-05-26"
#LABEL uk.co.fdsd.tripserver.is-production=""
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

FROM node:10.19-buster-slim AS trip-web-client
WORKDIR /app
ARG TRIP_CLIENT_VERSION=v1.2.0-rc.5
ARG TRIP_CLIENT_SHA256=5fd39f1406c68508e88e8c97ed32938e71fb064803324b376f2f9d74dbd31bb5
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
