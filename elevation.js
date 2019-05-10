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

var _ = require('lodash');
var fs = require('fs');
var http = require('http');

var config = require('./config.json');
var gdal = require('gdal');
var utils = require('./utils');

// TileSet containing coordinates of all tiles on the system
var tiles;

var logger = require('./logger').createLogger('elevation.js');

module.exports = {
  init:  function() {
    if (config.elevation != null && config.elevation.datasetDir != null && tiles == null ) {
      tiles = new TileSet(config.elevation.datasetDir);
    }
    return this;
  },
  fillElevations: fillElevations,
  fillElevationsForRoutes: fillElevationsForRoutes
};

const NO_DATA = -32768;

class TileSet {

  constructor(dir) {
    var paths, t, _this;
    _this = this;
    this.tiles = [];
    if (!dir.endsWith('/')) {
      dir += '/';
    }
    logger.debug('Searching for tif files in %s', dir);
    logger.debug("Memory before processing tiles", process.memoryUsage());
    // console.time('read-tiles');
    paths = fs.readdirSync(dir);
    paths.forEach(function(f) {
      if (f.endsWith('.tif')) {
        if (fs.statSync(dir + f).isFile()) {
          logger.debug('Loading tile: %s', f);
          try {
            t = new ElevationTile(dir + f);
            t.close();
            logger.debug('Adding tile %s to set', t.path);
            _this.tiles.push(t);
          } catch (e) {
            logger.error('Failed to add file "%s" to tile set', dir + f, e);
          }
        }
      }
    });
    // console.timeEnd('read-tiles');
    logger.debug("Memory after processing tiles", process.memoryUsage());
    logger.debug('Added %d tiles to set', this.tiles.length);
  }

  tileFor(longitude, latitude) {
    var tile = null;
    this.tiles.forEach(function(t) {
      // logger.debug('Considering whether tile %s covers lat: %d, lng: %d', t.path, latitude, longitude);
      if (longitude >= t.left && longitude <= t.right && latitude >= t.bottom && latitude <= t.top) {
        tile = t;
      } else {
        t.closeIfOld();
      }
    });
    if (tile === null) {
      logger.debug('Failed to find tile containing latitude: %d and longitude: %d', latitude, longitude);
    } else {
      logger.debug('Tile %s covers lat: %d, lng: %d', tile.path, latitude, longitude);
    }
    return tile;
  }

}

class ElevationTile {

  constructor(path) {
    var gt;
    this.path = path;
    this._openDataSet();
    gt = this.dataset.geoTransform;
    this.left = gt[0];
    this.pixelWidth = gt[1];
    this.xskew = gt[2];
    this.top = gt[3];
    this.yskew = gt[4];
    this.lineHeight = gt[5];
    this.right = this.left + this.dataset.rasterSize.x * this.pixelWidth;
    this.bottom = this.top + this.dataset.rasterSize.y * this.lineHeight;
  }

  _openDataSet() {
    logger.debug('Opening data set for path: "%s"', this.path);
    this.dataset = gdal.open(this.path);
    logger.debug('Data set has %d bands', this.dataset.bands.count());
    logger.debug('Width: %d', this.dataset.rasterSize.x);
    logger.debug('Height: %d', this.dataset.rasterSize.y);
    logger.debug('Geotransform: %j', this.dataset.geoTransform);
    this.dataset.srs.setWellKnownGeogCS('WGS84');
    logger.debug('srs: %j', this.dataset.srs.toWKT());
    this.band = this.dataset.bands.get(1);
    this.ct = new gdal.CoordinateTransformation(this.dataset.srs, new gdal.SpatialReference(this.dataset.getGCPProjection()));
    this.time = new Date().getTime();
  }

  // Call close to allow memory used to load the tif file to be garbage collected
  close() {
    if (this.dataset != null) {
      logger.debug('Closing dataset for %s', this.path);
      this.dataset.close();
      this.dataset = null;
    }
  }

  closeIfOld() {
    var diff;
    if (this.dataset != null) {
      diff = new Date().getTime() - this.time;
      logger.debug('Diff of %d ms for %s', diff, this.path);
      if (config.elevation.tileCacheMs && diff >= config.elevation.tileCacheMs) {
        logger.debug('Closing tile %s as is %d ms old', this.path, diff);
        this.close();
      }
    }
  }

  _coordinateTransformation() {
    if (this.dataset === null) {
      this._openDataSet();
    }
    this.time = new Date().getTime();
    return this.ct;
  }

  elevation(longitude, latitude) {
    var geo, x, y, retval;
    logger.debug('Converting %d latitude %d longitude', latitude, longitude);
    geo = this._coordinateTransformation().transformPoint(longitude, latitude);
    logger.debug('geo: %j', geo);
    // convert the pixels to coordinates
    // lat = left + geo.x * this.pixelWidth + geo.y * this.xskew;
    // lng = top + geo.x * this.yskew + geo.y * this.lineHeight;
    // convert coordinates to pixels
    x = (geo.x - this.left - geo.y * this.xskew) / this.pixelWidth;
    y = (geo.y - this.top - geo.x * this.yskew) / this.lineHeight;
    logger.debug('x: %d, y: %d', x, y);
    retval = this.band.pixels.get(x, y);
    return retval === NO_DATA ? undefined : retval;
  }

}

function fetchRemoteElevations(points, callback) {
  var postData, q, req, options, contentType, rawData = '';
  postData = JSON.stringify({locations: points}, null, false);
  options = {
    protocol: config.elevation.provider.options.protocol,
    host: config.elevation.provider.options.host,
    port: config.elevation.provider.options.port,
    path: config.elevation.provider.options.path,
    method: config.elevation.provider.options.method,
    headers: {
      'User-Agent' : 'trip/' + config.app.version + ' ' +
        config.elevation.provider.userAgentInfo,
      'Content-Type' : 'application/json',
      'Content-Length': postData.length,
      'Referer' : config.elevation.provider.refererInfo
    }
  };

  req = http.request(options, function(res) {
    res.setEncoding('utf8');
    // if (res.statusCode !== 200) {
    //   logger.warn('Response status code %s fetching elevation data: %j', res.statusCode);
    //   callback(new Error('Failure fetching elevation data'));
    // } else {
    res.on('data', function(chunk) {
      if (chunk) {
        rawData += chunk;
      }
    }).on('end', function() {
      // logger.debug('Response headers: %j', res.headers);
      contentType = res.headers['content-type'];
      // logger.debug('content-type: "%s"', contentType);
      // logger.debug('Raw-data: %s', rawData);
      q = utils.parseJSON(rawData);
      if (q !== undefined) {
        callback(null, q);
      } else {
        logger.error('Failure parsing elevation data');
      }
    });
    // }
  });
  req.on('error', function(err) {
    logger.error('Failure fetching elevation data from remote server:', err);
    callback(err);
  });
  req.setHeader('Connection', 'keep-alive');
  req.write(postData);
  req.end();
}

/*
function getCorners(dataset) {
  var pixelWidth, pixelHeight, lineWidth, lineHeight, upperLeftPixelX, upperLeftPixelY,
      gt,
      ulx, xres, xskew, uly, yskew, yres, lrx, lry;
  gt = dataset.geoTransform;
  ulx = gt[0];
  xres = gt[1];
  xskew = gt[2];
  uly = gt[3];
  yskew = gt[4];
  yres = gt[5];
  lrx = ulx + dataset.rasterSize.x * xres;
  lry = uly + dataset.rasterSize.y * yres;
  return {upperLeft: {x: ulx, y: uly}, lowerLeft: {x: ulx, y: lry}, upperRight: {x: lrx, y: uly}, lowerRight: {x: lrx, y: lry}};
}

function getCorners2(elevationTile) {
  return {upperLeft: {x: elevationTile.left, y: elevationTile.top}, lowerLeft: {x: elevationTile.left, y: elevationTile.bottom}, upperRight: {x: elevationTile.right, y: elevationTile.top}, lowerRight: {x: elevationTile.right, y: elevationTile.bottom}};
}
*/

function calculateElevations(points, callback) {
  var retval, tile;
  logger.debug('Filling elevations using internal service');
  points.forEach(function(pt) {
    logger.debug('Transforming point: %j', pt);
    tile = tiles.tileFor(pt.longitude, pt.latitude);
    if (tile !== null) {
      pt.elevation = tile.elevation(pt.longitude, pt.latitude);
    }
  });
  callback(null, {results: points});
}

function fillElevations(points, options, callback) {
  var fetchElevations = fetchRemoteElevations, skipIfAnyExist, force, i, elevationCount = 0, queryPoints = [], locations, myErr = null;
  if (config.elevation !== undefined && config.elevation.datasetDir !== undefined) {
    fetchElevations = calculateElevations;
  } else if (!config.elevation || !config.elevation.provider) {
    logger.debug('elevation.datasetDir not configured - skipping reading elevation data');
    callback(null, {results: points});
    return;
  }
  points.forEach(function(pt) {
    if (pt.ele || pt.altitude) {
      elevationCount++;
    }
    queryPoints.push({latitude: _.round(pt.lat, 5), longitude: _.round(pt.lng, 5)});
  });
  force = options && options.force === true;
  skipIfAnyExist = options && options.skipIfAnyExist === true;
  if ((!skipIfAnyExist || elevationCount === 0) && (elevationCount < points.length || force)) {
    fetchElevations(queryPoints, function(err, result) {
      if (utils.handleError(err, callback)) {
        if (result && Array.isArray(result.results)) {
          // logger.debug('Filling elevations from: %j', result);
          locations = result.results;
          if (points.length != locations.length) {
            logger.error("Invalid number of locations received.  Expected %d got %d", points.length, locations.length);
            callback(new Error('Locations service returned unexpected values'));
          } else {
            for (i = 0; i < points.length; i++) {
              if (_.round(points[i].lat, 5) == _.round(locations[i].latitude, 5) &&
                  _.round(points[i].lng, 5) == _.round(locations[i].longitude, 5)) {
                if (locations[i].elevation !== undefined && (force || !(points[i].ele || points[i].altitude))) {
                  if (points[i].altitude !== undefined) {
                    points[i].altitude = locations[i].elevation;
                  } else {
                    points[i].ele = locations[i].elevation;
                  }
                }
              } else {
                logger.error("Returned locations do not appear to the be same as those sent to elevation service");
                myErr = new Error("Returned locations do not appear to the be same as those sent to elevation service");
                break;
              }
            }
            logger.debug("Memory", process.memoryUsage());
            callback(myErr, points);
          }
        } else {
          logger.warn('No or invalid results returned from elevation service');
          callback(new Error('No or invalid results returned from elevation service'));
        }
      }
    });
  } else {
    callback(null, points);
    if (skipIfAnyExist && elevationCount !== 0) {
      logger.debug('One or more altitudes exist in route, skipping update');
    } else {
      logger.debug('All altitudes exist in route, not updating');
    }
  }
}


function fillElevationsForRoutes(routes, options, callback) {
  var counter = routes.length, firstError = null;
  if (counter === 0) callback();
  routes.forEach(function(r) {
    fillElevations(r.points, options, function(err) {
      firstError = firstError ? firstError : err;
      if (--counter === 0) {
        callback(firstError);
      }
    });
  });
}
