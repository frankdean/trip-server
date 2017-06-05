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

var fs = require('fs');
var sax = require('sax');
var winston = require('winston');

var db = require('./db');
var utils = require('./utils');

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
  // winston.debug('Importing file %s', pathname);
  var parser = sax.createStream(false, {lowercasetags: true, trim: true}),
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
        winston.warn('Parse rtept without rte');
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
        winston.warn('Parse trkseg without trk');
      }
      break;
    case 'trkpt':
      trackPoint = {};
      if (trackSegment) {
        trackPoint.lat = tag.attributes.lat;
        trackPoint.lng = tag.attributes.lon;
        trackSegment.points.push(trackPoint);
      } else {
        winston.warn('Parse trkpt without trkseg');
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
    default:
      if (currentTag && currentTag.parent) {
        switch (currentTag.parent.name) {
        case 'wpt':
          if (tagName !== 'extensions') {
            waypoint[tagName] = lastText;
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
          trackPoint[tagName] = lastText;
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
    winston.error(e);
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
  var lastError = null;
  // winston.debug('importing from %s', pathname);
  parseFile(itineraryId, pathname, function(err, waypoints, routes, tracks) {
    // winston.debug('Imported %d waypoints', waypoints.length);
    // winston.debug('Imported %d routes', routes.length);
    // winston.debug('Imported %d tracks', tracks.length);
    if (deleteFlag) {
      // winston.debug('Deleting %s', pathname);
      fs.unlinkSync(pathname);
    }
    if (err) {
      winston.warn('Error on parsing GPX import', err);
    }
    if (utils.handleError(err, callback)) {
      utils.fillDistanceElevationForRoutes(routes);
      utils.fillDistanceElevationForTracks(tracks);
      db.createItineraryWaypoints(itineraryId, waypoints, function(err) {
        lastError = lastError ? lastError : err;
        db.createItineraryRoutes(itineraryId, routes, function(err) {
          lastError = lastError ? lastError : err;
          db.createItineraryTracks(itineraryId, tracks, function(err) {
            lastError = lastError ? lastError : err;
            if (lastError) {
              winston.error('Database error saving imported GPX file', lastError);
            }
            callback(lastError, {waypointCount: waypoints.length, routeCount: routes.length, trackCount: tracks.length});
          });
        });
      });
    }
  });
}
