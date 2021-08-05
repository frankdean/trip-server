/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2016-2018 Frank Dean <frank@fdsd.co.uk>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

var http = require('http');
var util = require('util');

var _ = require('lodash');

var db = require('./db');
var config = require('./config');

var logger = require('./logger').createLogger('tiles.js', config.log.level, config.log.timestamp);

/**
 * Primarily contains functions for handling map tiles.
 * @module tiles
 */
module.exports = {
  fetchTile: fetchTile,
  unitTests: {transliterateTileUrl: transliterateTileUrl}
};

function transliterateTileUrl(url, x, y, z) {
  return url.replace(/{x}/, x).replace(/{y}/, y).replace(/{z}/, z);
}

function fetchRemoteTile(id, x, y, z, callback) {
  var tile, tileProvider, req, expires, expiresHeader, options, buffer, image = '';
  tileProvider = config.tile.providers[id];
  // logger.debug('Fetching remote tile x=%d y=%d z=%d', x, y, z);
  // tileProvider.cache should be treated as true if undefined
  if (tileProvider.cache !== false) {
    // logger.debug('tiles.js incrementing tile counter');
    db.incrementTileCounter(function(err, tileCount) {
      // logger.debug('tiles.js tile count:', JSON.stringify(tileCount));
      if (tileCount && tileCount.nextval && tileCount.nextval % config.reporting.metrics.tile.count.frequency === 0) {
        // logger.debug('Saving tile count');
        db.saveTileCount(tileCount.nextval, function(err, result) {
          if (err) {
            logger.error('Error saving latest tile count. %s', err);
          }
          // The default behaviour is to prune
          // logger.debug('TileProvider: %j', tileProvider);
          if (tileProvider.prune !== false) {
            db.pruneTileCache(config.tile.cache.maxAge, function(err, result) {
              if (err) {
                logger.error('Error pruning tile cache %s', err);
              } else {
                logger.debug('Pruned %j tiles', result);
              }
            });
          }
        });
      }
    });
  }
  options = {
    protocol: config.tile.providers[id].options.protocol,
    host: config.tile.providers[id].options.host,
    port: config.tile.providers[id].options.port,
    method: config.tile.providers[id].options.method,
    headers: {
      'User-Agent' : 'trip/' + config.app.version + ' ' +
        config.tile.providers[id].userAgentInfo,
      'Referer' : config.tile.providers[id].refererInfo
    }
  };
  options.path = transliterateTileUrl(config.tile.providers[id].options.path, x, y, z);
  req = http.request(options, function(res) {
    // logger.debug('Response status code %d for tile x=%d y=%d z=%d', res.statusCode, x, y, z);
    if (res.statusCode !== 200) {
      logger.debug('Fetching remote tile id: %s, x=%d y=%d z=%d failed: %d', id, x, y, z, res.statusCode);
      callback(new Error(util.format('Failure (%d) fetching remote tile x=%d y=%d z=%d', res.statusCode, x, y, z)));
    } else {
      res.setEncoding('binary');
      res.on('data', function(chunk) {
        image += chunk;
      }).on('end', function() {
        buffer = Buffer.from(image, 'binary');
        expiresHeader = res.headers.expires;
        if (expiresHeader !== undefined) {
          expires = new Date(expiresHeader);
        } else {
          logger.warn('expires header was not set for tile x=%d y=%d z=%d', x, y, z);
        }
        if (expires === undefined || isNaN(expires.getTime())) {
          // Set expiry for one week
          logger.warn('expires header was invalid for tile x=%d y=%d z=%d, %s', x, y, z, expiresHeader);
          expires = new Date(Date.now() + 592200000);
          // logger.debug('Expires set to', expires);
        }
        tile = {
          expires: expires,
          image: buffer
        };
        if (config.tile.providers[id].cache !== false) {
          db.tileExists(id, x, y, z, null, function(err, exists) {
            if (err) {
              callback(err);
            } else {
              if (exists) {
                // logger.debug('Updating tile x=%d y=%d z=%d', x, y, z);
                db.updateTile(id, x, y, z, expires, buffer, function(err) {
                  if (err) {
                    logger.error('ERROR updating tile x=%d y=%d z=%d error: %j', x, y, z, err);
                  }
                  callback(err, tile);
                });
              } else {
                // logger.debug('Saving tile x=%d y=%d z=%d', x, y, z);
                db.saveTile(id, x, y, z, expires, buffer, function(err) {
                  if (err) {
                    logger.error('ERROR saving tile x=%d y=%d z=%d error: %j', x, y, z, err);
                  }
                  callback(err, tile);
                });
              }
            }
          });
        } else {
          callback(null, tile);
        }
      });
    }
  });
  req.on('error', function(err) {
    callback(err);
  });
  req.setHeader('Connection', 'keep-alive');
  req.end();
}

/**
 * @param {number} id the ID of the tile source.  Each source has it's own set of
 * tiles.
 * @param {number} x the x coordinate of the tile
 * @param {number} y the y coordinate of the tile
 * @param {number} z the zoom level of the tile
 */
function fetchTile(id, x, y, z, callback) {
  var tileProvider, maxZoom;
  callback = typeof callback === 'function' ? callback : function() {};
  if (!(_.isInteger(config.tile.cache.maxAge) && _.inRange(config.tile.cache.maxAge, 0, Number.MAX_SAFE_INTEGER))) {
    logger.error('config.tile.cache.maxAge in config file must be an integer and less than %d', Number.MAX_SAFE_INTEGER);
    config.tile.cache.maxAge = 0;
  }
  if (config.tile.providers === undefined) {
    logger.warn('No map tile provider configured in config file');
    callback(new Error('No map tile provider configured in config file'));
    return;
  }
  if (_.isInteger(Number(id)) && _.inRange(id, config.tile.providers.length)) {
    tileProvider = config.tile.providers[id];
    maxZoom = tileProvider.mapLayer.maxZoom;
    if (maxZoom === undefined) {
      // OSM discourage zoom above 17 - you can configure higher maxZoom in config.yaml
      maxZoom = 17;
    }
  }
  if (tileProvider !== undefined &&
      _.isInteger(Number(x)) && _.inRange(x, Number.MAX_SAFE_INTEGER) &&
      _.isInteger(Number(y)) && _.inRange(y, Number.MAX_SAFE_INTEGER) &&
      _.isInteger(Number(z)) && _.inRange(z, maxZoom +1)) {
    // tileProvider.cache should be treated as true if undefined
    if (tileProvider.cache !== false) {
      // logger.debug('Checking tile cache');
      db.tileExists(id, x, y, z, config.tile.cache.maxAge, function(err, exists) {
        if (err) {
          callback(err);
        } else {
          if (exists) {
            // logger.debug('Fetching existing tile, id:%d, x:%d, y:%d, z:%d', id, x, y, z);
            db.fetchTile(id, x, y, z, config.tile.cache.maxAge, function(err, tile) {
              if (err || tile === undefined || tile.image === undefined) {
                logger.warn('Error retrieving tile, id:%d, x:%d, y:%d, z:%d', id, x, y, z, err);
                fetchRemoteTile(id, x, y, z, callback);
              } else {
                callback(null, tile);
              }
            });
          } else {
            // logger.debug('Fetching non-existent or expired tile from remote site: id:%d, x:%d, y:%d, z:%d', id, x, y, z);
            fetchRemoteTile(id, x, y, z, function(err, buffer) {
              if (err || !buffer) {
                logger.warn(err);
                logger.warn('Failed to fetch remote tile: id:%d, x:%d, y:%d, z:%d', id, x, y, z);
                // Fall back to attempting to fetch a stale tile
                db.fetchTile(id, x, y, z, null, function(err, tile) {
                  if (err || tile === undefined || tile.image === undefined) {
                    logger.warn('Error retrieving local tile: id:%d, x:%d, y:%d, z:%d', id, x, y, z, err);
                    callback(err);
                  } else {
                    // logger.debug('Fetched stale tile from cache: id: %d, x:%d, y:%d, z:%d', id, x, y, z);
                    callback(null, tile);
                  }
                });
              } else {
                callback(err, buffer);
              }
            });
          }
        }
      });
    } else {
      // logger.debug('Ignoring cache');
      fetchRemoteTile(id, x, y, z, function(err, buffer) {
        if (err || !buffer) {
          logger.warn(err);
          logger.warn('Failed to fetch remote tile: id:%d, x:%d, y:%d, z:%d', id, x, y, z);
        }
        callback(err, buffer);
      });
    }
  } else {
    logger.warn(util.format('Invalid values for fetching tile id=%d x=%d y=%d z=%d', id, x, y, z));
    callback(new Error(util.format('Invalid values for fetching tile id=%d x=%d y=%d z=%d', id, x, y, z)));
  }
}
