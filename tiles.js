/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2016, 2017 Frank Dean <frank@fdsd.co.uk>
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

var validator = require('validator');
var winston = require('winston');

var db = require('./db');
var config = require('./config.json');

module.exports = {
  fetchTile: fetchTile,
  unitTests: {transliterateTileUrl: transliterateTileUrl}
};

function transliterateTileUrl(url, x, y, z) {
  return url.replace(/{x}/, x).replace(/{y}/, y).replace(/{z}/, z);
}

function fetchRemoteTile(id, x, y, z, callback) {
  var tile, req, expires, expiresHeader, options, buffer, image = '';
  // winston.debug('Fetching remote tile', x, y, z);
  // winston.debug('tiles.js incrementing tile counter');
  db.incrementTileCounter(function(err, tileCount) {
    // winston.debug('tiles.js tile count:', JSON.stringify(tileCount));
    if (tileCount && tileCount.nextval && tileCount.nextval % config.reporting.metrics.tile.count.frequency === 0) {
      // winston.debug('Saving tile count');
      db.saveTileCount(tileCount.nextval, function(err, result) {
        if (err) {
          winston.error('Error saving latest tile count. %s', err);
        }
      });
    }
  });
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
    // winston.debug('Response status code %d for tile x=%d y=%d z=%d', res.statusCode, x, y, z);
    if (res.statusCode !== 200) {
      winston.warn('Fetching remote tile', id, x, y, z, 'failed', res.statusCode);
      callback(new Error(util.format('Failure fetching remote tile x=%d y=%d z=%d', x, y, z)));
    } else {
      res.setEncoding('binary');
      res.on('data', function(chunk) {
        image += chunk;
      }).on('end', function() {
        buffer = new Buffer(image, 'binary');
        expiresHeader = res.headers.expires;
        if (expiresHeader !== undefined) {
          expires = new Date(expiresHeader);
        } else {
          winston.warn('expires header was not set for tile', x, y, z);
        }
        if (expires === undefined || isNaN(expires.getTime())) {
          // Set expiry for one week
          winston.warn('expires header was invalid for tile', x, y, z, expiresHeader);
          expires = new Date(Date.now() + 592200000);
          // winston.debug('Expires set to', expires);
        }
        db.tileExists(id, x, y, z, null, function(err, exists) {
          if (err) {
            callback(err);
          } else {
            tile = {
              expires: expires,
              image: buffer
            };
            if (exists) {
              // winston.debug('Updating tile', x, y, z);
              db.updateTile(id, x, y, z, expires, buffer, function(err) {
                if (err) {
                  winston.error('ERROR updating tile', x, y, z, 'error:', err);
                }
                callback(err, tile);
              });
            } else {
              // winston.debug('Saving tile', x, y, z);
              db.saveTile(id, x, y, z, expires, buffer, function(err) {
                if (err) {
                  winston.error('ERROR saving tile', x, y, z, 'error:', err);
                }
                callback(err, tile);
              });
            }
          }
        });
      });
    }
  });
  req.on('error', function(err) {
    callback(err);
  });
  req.setHeader('Connection', 'keep-alive');
  req.end();
}

function fetchTile(id, x, y, z, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (validator.isInt('' + id, {min: 0, max: config.tile.providers.length - 1}) &&
      validator.isInt('' + x, {min: 0}) &&
      validator.isInt('' + y, {min: 0}) &&
      validator.isInt('' + z, {min: 0, max: 19})) {
    db.tileExists(id, x, y, z, config.tile.cache.maxAge, function(err, exists) {
      if (err) {
        callback(err);
      } else {
        if (exists) {
          // winston.debug('Fetching existing tile', id, x, y, z);
          db.fetchTile(id, x, y, z, config.tile.cache.maxAge, function(err, tile) {
            if (err || tile === undefined || tile.image === undefined) {
              winston.warn('Error retrieving tile', id, x, y, z, err);
              fetchRemoteTile(id, x, y, z, callback);
            } else {
              callback(null, tile);
            }
          });
        } else {
          // winston.debug('Fetching non-existent or expired tile from remote site', x, y, z);
          fetchRemoteTile(id, x, y, z, function(err, buffer) {
            if (err || !buffer) {
              winston.warn('Failed to fetch remote tile', id, x, y, z);
              // Fall back to attempting to fetch a stale tile
              db.fetchTile(id, x, y, z, null, function(err, tile) {
                if (err || tile === undefined || tile.image === undefined) {
                  winston.warn('Error retrieving local tile', x, y, z, err);
                  callback(err);
                } else {
                  winston.warn('Fetched stale tile from cache', x, y, z);
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
    callback(new Error(util.format('Invalid values for fetching tile x=%d y=%d z=%d', x, y, z)));
  }
}
