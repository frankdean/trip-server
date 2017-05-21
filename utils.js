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

var winston = require('winston');

var turfLineDistance = require('@turf/line-distance');

module.exports = {
  handleError: handleError,
  calculateElevationData: calculateElevationData,
  fillDistanceElevationForPath: fillDistanceElevationForPath,
  fillDistanceElevationForTrack: fillDistanceElevationForTrack,
  fillDistanceElevationForTracks: fillDistanceElevationForTracks,
  fillDistanceElevationForRoutes: fillDistanceElevationForRoutes,
  unitTests: {
    calculateDistance: calculateDistance
  }
};

function handleError(err, callback) {
  if (err) {
    callback(err);
    return false;
  }
  return true;
}

function calculateDistance(coords) {
  var retval,
      line = {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "LineString",
          "coordinates": coords
        }
      };
  try {
    if (Array.isArray(coords) && coords.length > 0) {
      retval = turfLineDistance(line);
    }
  } catch(e) {
    winston.error(e);
  }
  return retval;
}

function convertLatLngsToCoords(points) {
  var coords = [];
  if (!Array.isArray(points)) {
    winston.error('utils.js.convertLatLngsToCoords() - Points must be an array');
    return coords;
  } else {
    points.forEach(function(v) {
      coords.push([v.lng, v.lat]);
    });
  }
  return coords;
}

function calculateElevationData(path) {
  var asc = 0,
      desc = 0,
      e, h, lo, lp;
  path.points.forEach(function(p) {
    e = p.ele ? Number.parseFloat(p.ele) : Number.parseFloat(p.altitude);
    if (e) {
      if (lp) {
        if (e > lp) {
          asc += e - lp;
          // winston.debug('ele: %d  asc: %d,   up by: %d', e, Math.round(asc * 100) / 100, Math.round((e - lp) * 100) / 100);
        } else if (e < lp) {
          desc += lp - e;
          // winston.debug('ele: %d desc: %d, down by: %d', e, Math.round(desc * 100) / 100, Math.round((lp - e) * 100) / 100);
        } else {
          // winston.debug('ele: %d', e);
        }
      }
      if (!h || e > h) h = e;
      if (!lo || e < lo) lo = e;
      lp = e;
    }
  });
  if (lp) {
    path.highest = h;
    path.lowest = lo;
    path.ascent = asc;
    path.descent = desc;
  }
}

function fillDistanceElevationForPath(path) {
  var coords = convertLatLngsToCoords(path.points);
  path.distance = calculateDistance(coords);
  calculateElevationData(path);
}

function fillDistanceElevationForRoutes(routes) {
  var t = Date.now();
  routes.forEach(function(v) {
    fillDistanceElevationForPath(v);
  });
  winston.debug('Filled distance elevation data for routes in %d ms', Date.now() - t);
}

function fillDistanceElevationForTrack(track) {
  var path;
  path = {};
  path.points = [];
  track.segments.forEach(function(v) {
    v.points.forEach(function(v) {
      path.points.push(v);
    });
  });
  fillDistanceElevationForPath(path);
  track.distance = path.distance;
  track.highest = path.highest;
  track.lowest = path.lowest;
  track.ascent = path.ascent;
  track.descent = path.descent;
}

function fillDistanceElevationForTracks(tracks) {
  var t = Date.now();
  tracks.forEach(function(t) {
    fillDistanceElevationForTrack(t);
  });
  winston.debug('Filled distance elevation data for tracks in %d ms', Date.now() - t);
}
