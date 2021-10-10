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

var fs = require('fs');
var sax = require('sax');
var _ = require('lodash');

var elevation = require('./elevation');
var db = require('./db');
var utils = require('./utils');
var config = require('./config');

var logger = require('./logger').createLogger('gpx-upload.js', config.log.level, config.log.timestamp);

/**
 * Handles uploading GPX files.
 * @module gpx-upload
 */
module.exports = {
  importFile: importFile,
  parseFile: parseFile
};

/**
 * Simple sax implementation with the option to improve it in the future to
 * perform updates in batches of waypoints or routes to handle very large
 * uploads.  E.g. when the list of waypoints or routes contains more than n
 * items, write them to the database, empty the array and continue.
 *
 * @param {number} itineraryId the ID of the associated itinerary.  Not
 * currently used, but would be required to implement batch updates in the
 * future.
 *
 * @param {string} pathname the full path name to the file to be imported.
 *
 * @param {function} callback the callback function, the first parameter being
 * null or an Error, and if no error, the second parameter being a list of
 * waypoints and the third a list of routes.
 */
function parseFile(itineraryId, pathname, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var firstError = null;
  // logger.debug('Importing file %s', pathname);
  var parser = sax.createStream(false, {lowercasetags: true, trim: true}),
      dt,
      waypoints = [],
      waypoint = null,
      routes = [],
      route = null,
      routePoint = null,
      tracks = [],
      track = null,
      trackPoint = null,
      trackSegments = [],
      trackSegment = null,
      currentTag = null,
      lastText = null;

  parser.on('opentag', function(tag) {
    switch(tag.name) {
    case 'wpt':
      waypoint = {};
      waypoint.lat = tag.attributes.lat;
      waypoint.lng = tag.attributes.lon;
      waypoints.push(waypoint);
      break;
    case 'rte':
      route = {};
      route.points = [];
      routes.push(route);
      break;
    case 'rtept':
      routePoint = {};
      if (route) {
        routePoint.lat = tag.attributes.lat;
        routePoint.lng = tag.attributes.lon;
        route.points.push(routePoint);
      } else {
        logger.warn('Parse rtept without rte');
      }
      break;
    case 'trk':
      track = {};
      track.segments = [];
      tracks.push(track);
      break;
    case 'trkseg':
      trackSegment = {};
      trackSegment.points = [];
      if (track) {
        track.segments.push(trackSegment);
      } else {
        logger.warn('Parse trkseg without trk');
      }
      break;
    case 'trkpt':
      trackPoint = {};
      if (trackSegment) {
        trackPoint.lat = tag.attributes.lat;
        trackPoint.lng = tag.attributes.lon;
        trackSegment.points.push(trackPoint);
      } else {
        logger.warn('Parse trkpt without trkseg');
      }
      break;
    }
    tag.parent = currentTag;
    tag.children = [];
    if (tag.parent) {
      tag.parent.children.push(tag);
    }
    currentTag = tag;
  });
  parser.on('closetag', function(tagName) {
    switch(tagName) {
    case 'wpt':
      currentTag = waypoint = null;
      break;
    case 'rte':
      currentTag = route = null;
      break;
    case 'rtept':
      currentTag = routePoint = null;
      break;
    case 'trk':
      currentTag = track = null;
      break;
    case 'trkseg':
      currentTag = trackSegment = null;
      break;
    case 'trkpt':
      currentTag = trackPoint = null;
      break;
    case 'ogr:section':
      // http://osgeo.org/gdal
      // https://github.com/OSGeo/gdal/blob/bcadaf0a530715db604aaddcd66362c25b71e58c/gdal/doc/source/drivers/vector/gpx.rst
      if (currentTag.parent && currentTag.parent.name === 'extensions') {
        if (currentTag.parent.parent && currentTag.parent.parent.name === 'trk') {
          if (track.name ==  null) {
            track.name = lastText;
          }
        } else if (currentTag.parent.parent && currentTag.parent.parent.name === 'rte') {
          if (route.name ==  null) {
            route.name = lastText;
          }
        }
      }
      currentTag = currentTag.parent;
      break;
    default:
      if (currentTag && currentTag.parent) {
        switch (currentTag.parent.name) {
        case 'wpt':
          if (tagName !== 'extensions') {
            switch (tagName) {
            case 'time':
              dt = new Date(lastText);
              if (_.isDate(dt)) {
                waypoint[tagName] = lastText;
              } else {
                dt = utils.isoDate(lastText);
                if (dt !== null) {
                  logger.debug('Converted invalid date of "%s" to "%s"', lastText, dt.toISOString());
                  waypoint[tagName] = dt.toISOString();
                } else {
                  logger.warn('waypoint %j has an invalid date of "%s"', waypoint, lastText);
                }
              }
              break;
            default:
              waypoint[tagName] = lastText;
            }
          }
          break;
        case 'rte':
          route[tagName] = lastText;
          break;
        case 'rtept':
          routePoint[tagName] = lastText;
          break;
        case 'trk':
          if (tagName !== 'extensions') {
            track[tagName] = lastText;
          }
          break;
        case 'trkseg':
          trackSegment[tagName] = lastText;
          break;
        case 'trkpt':
          switch (tagName) {
          case 'time':
            dt = new Date(lastText);
            if (_.isDate(dt)) {
              trackPoint[tagName] = lastText;
            } else {
              dt = utils.isoDate(lastText);
              if (dt !== null) {
                logger.debug('Converted invalid date of "%s" to "%s"', lastText, dt.toISOString());
                trackPoint[tagName] = dt.toISOString();
              } else {
                logger.warn('trackPoint %j has an invalid date of "%s"', trackPoint, lastText);
              }
            }
            break;
          default:
            trackPoint[tagName] = lastText;
          }
          break;
        case 'extensions':
          if (waypoint && currentTag && currentTag.name === 'color') {
            waypoint.color = lastText;
          }
          break;
        case 'gpxx:routeextension':
          if (route && currentTag && currentTag.name === 'gpxx:displaycolor' &&
              currentTag.parent.parent && currentTag.parent.parent.name === 'extensions' &&
              currentTag.parent.parent.parent && currentTag.parent.parent.parent.name === 'rte') {
            route.color = lastText;
          }
          break;
        case 'gpxx:trackextension':
          if (track && currentTag && currentTag.name === 'gpxx:displaycolor' &&
              currentTag.parent.parent && currentTag.parent.parent.name === 'extensions' &&
              currentTag.parent.parent.parent && currentTag.parent.parent.parent.name === 'trk') {
            track.color = lastText;
          }
          break;
        case 'wptx1:waypointextension':
          if (waypoint && currentTag && currentTag.name === 'wptx1:samples' &&
              currentTag.parent.parent && currentTag.parent.parent.name === 'extensions' &&
             currentTag.parent.parent.parent && currentTag.parent.parent.parent.name === 'wpt') {
            waypoint.samples = lastText;
          }
          break;
        }
        var p = currentTag.parent;
        delete currentTag.parent;
        currentTag = p;
      }
    }
    lastText = null;
  });
  parser.on('cdata', function(data) {
    lastText = data;
    if (currentTag) {
      currentTag.children.push(data);
    }
  });
  parser.on('text', function(text) {
    lastText = text;
    if (currentTag) {
      currentTag.children.push(text);
    }
  });
  parser.on('end', function() {
    callback(firstError, waypoints, routes, tracks);
  });
  parser.on('error', function(e) {
    logger.error(e);
    if (!firstError) {
      firstError = e;
    }
    fstr.resume();
  });
  var fstr = fs.createReadStream(pathname, { encoding: 'utf8' });
  fstr.pipe(parser);
}

/**
 * Imports the specified file associating any waypoints and routes with the
 * specified itineraryId.
 *
 * @param {number} itineraryId the ID of the associated itinerary.  Not
 * currently used, but would be required to implement batch updates in the
 * future.
 *
 * @param {string} pathname the full path name to the file to be imported.
 *
 * @param {boolean} deleteFlag true if the file should be unlinked (deleted)
 * after processing.
 *
 * @param {function} callback the callback function, the first parameter being
 * null or an Error, and if no error, the second parameter being a list of
 * waypoints and the third a list of routes.
 */
function importFile(itineraryId, pathname, deleteFlag, callback) {
  var elevationFillError = null, error = null, elevationFillOptions = {force: false, skipIfAnyExist: true};
  // logger.debug('importing from %s', pathname);
  parseFile(itineraryId, pathname, function(err, waypoints, routes, tracks) {
    // logger.debug('Imported %d waypoints', waypoints.length);
    // logger.debug('Imported %d routes', routes.length);
    // logger.debug('Imported %d tracks', tracks.length);
    if (deleteFlag) {
      // logger.debug('Deleting %s', pathname);
      fs.unlinkSync(pathname);
    }
    if (err) {
      logger.warn('Error on parsing GPX import', err);
    }
    if (utils.handleError(err, callback)) {
      elevation.fillElevationsForRoutes(routes, elevationFillOptions, function(err) {
        if (err) {
          logger.error('Error filling elevations values for routes', err);
          callback(err);
          return;
        }
        elevationFillError = err;
        utils.fillDistanceElevationForRoutes(routes);
        utils.fillDistanceElevationForTracks(tracks, {calcSegments: true});
        db.createItineraryWaypoints(itineraryId, waypoints, function(err) {
          error = error ? error : err;
          db.createItineraryRoutes(itineraryId, routes, function(err) {
            error = error ? error : err;
            db.createItineraryTracks(itineraryId, tracks, function(err) {
              error = error ? error : err;
              // If error not set by database imports, report any error during filling elevation values
              error = err ? err : elevationFillError;
              if (error) {
                logger.error('Error importing GPX file', error);
              }
              callback(error, {waypointCount: waypoints.length, routeCount: routes.length, trackCount: tracks.length});
            });
          });
        });
      });
    }
  });
}
