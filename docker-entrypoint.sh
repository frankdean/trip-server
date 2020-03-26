#!/bin/bash
set -e

if [ -r "$POSTGRES_PASSWORD_FILE" ]; then
    POSTGRES_PASSWORD=$(cat ${POSTGRES_PASSWORD_FILE})
fi
if [ -r "$TRIP_SIGNING_KEY_FILE" ];then
    TRIP_SIGNING_KEY=$(cat ${TRIP_SIGNING_KEY_FILE})
fi
if [ -r "$TRIP_RESOURCE_SIGNING_KEY_FILE" ];then
    TRIP_RESOURCE_SIGNING_KEY=$(cat ${TRIP_RESOURCE_SIGNING_KEY_FILE})
fi

cat > config.json <<EOF
{
  "app": {
    "json": {
      "indent": {
        "level": 0
      }
    },
    "gpx": {
      "allowInvalidXsd": false
    },
    "autoQuit": {
      "timeOut": 300
    },
    "token": {
      "expiresIn": 43200,
      "renewWithin": 21600
    },
    "resourceToken": {
      "expiresIn": 86400
    },
    "maxItinerarySearchRadius": 50000,
    "averageFlatSpeedKph": 4
  },
  "jwt": {
EOF
echo "    \"signingKey\": \"${TRIP_SIGNING_KEY}\"," >> config.json
echo "    \"resourceSigningKey\": \"${TRIP_RESOURCE_SIGNING_KEY}\"" >> config.json
cat >>config.json <<EOF
  },
  "tile": {
    "cache": {
      "maxAge": 0
    },
    "providers": [
      {
        "help": " see http://wiki.openstreetmap.org/wiki/Tile_usage_policy",
        "userAgentInfo": "(mailto:your.contact@email.address)",
        "refererInfo": "http://link_to_deployed_application_information",
        "options": {
          "protocol": "http:",
          "host": "tile.openstreetmap.org",
          "port": "80",
          "path": "/{z}/{x}/{y}.png",
          "method": "GET"
        },
        "mapLayer": {
          "name": "OSM Mapnik",
          "type": "xyz",
          "tileAttributions": [
            {
              "text": "Map data &copy; "
            },
            {
              "text": "OpenStreetMap",
              "link": "http://openstreetmap.org"
            },
            {
              "text": " contributors, "
            },
            {
              "text": "CC-BY-SA",
              "link": "http://creativecommons.org/licenses/by-sa/2.0/"
            }
          ]
        }
      }
    ]
  },
  "db": {
EOF

echo "    \"uri\": \"postgresql://trip:${POSTGRES_PASSWORD}@postgis/trip\"," >>config.json

cat >>config.json <<EOF
    "poolSize": 10,
    "poolIdleTimeout": 10000,
    "connectionTimeoutMillis": 0
  },
  "elevation-local-disabled" : {
    "tileCacheMs" : 60000,
    "datasetDir" : "./elevation-data/"
  },
  "elevation-remote-disabled": {
    "provider": {
      "userAgentInfo": "(mailto:your.contact@email.address)",
      "refererInfo": "http://link_to_deployed_application_information",
      "options": {
        "protocol": "http:",
        "host": "localhost",
        "port": "8082",
        "path": "/api/v1/lookup",
        "method": "POST"
      }
    }
  },
  "staticFiles": {
    "allow": true
  },
  "debug": false,
  "log": {
    "level": "info"
  },
  "validation": {
    "headers" : {
      "contentType" : {
        "warn": true
      }
    }
  },
  "reporting": {
    "metrics": {
      "tile": {
        "count": {
          "frequency": 100
        }
      }
    }
  }
}
EOF

exec "$@"
