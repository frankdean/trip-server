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
var turfHelpers = require('@turf/helpers');
var turf = {
  bbox: require('@turf/bbox'),
  bearing: require('@turf/bearing'),
  center: require('@turf/center'),
  distance: require('@turf/distance'),
  bboxPolygon: require('@turf/bbox-polygon'),
  helpers: turfHelpers,
  featureCollection: turfHelpers.featureCollection,
  lineString: turfHelpers.lineString,
  point: turfHelpers.point
};

var config = require('./config.json');

var logger = require('./logger').createLogger('utils.js', config.log.level, config.log.timestamp);

module.exports = {
  handleError: handleError,
  fillDistanceElevationForPath: fillDistanceElevationForPath,
  fillDistanceElevationForTrack: fillDistanceElevationForTrack,
  fillDistanceElevationForTracks: fillDistanceElevationForTracks,
  fillDistanceElevationForRoutes: fillDistanceElevationForRoutes,
  getTimeSpanForWaypoints: getTimeSpanForWaypoints,
  getTimeSpan: getTimeSpan,
  getWaypointBounds: getWaypointBounds,
  getBounds: getBounds,
  getRange: getRange,
  getCenter: getCenter,
  isoDate: isoDate,
  parseJSON: parseJSON,
  isJSON: isJSON,
  isISO8601: isISO8601,
  isEmail: isEmail,
  scarfsEquivalence: scarfsEquivalence
};

function handleError(err, callback) {
  if (err) {
    callback(err);
    return false;
  }
  return true;
}

function fillDistanceElevationForPath(path, options) {
  var totalDistance = 0,
      coords = [],
      b, d, e, h, lo, lp,
      asc = 0, desc = 0,
      p1, p2,
      t1, t2,
      totalSpeed = 0,
      speedCount = 0,
      startTime,
      endTime,
      minSpeed,
      maxSpeed,
      prev;

  path.points.forEach(function(pt) {
    // create array for calculating bounds
    coords.push([pt.lng, pt.lat]);
    if (pt.time) {
      t2 = new Date(pt.time);
      if (startTime === undefined || t2.getTime() < startTime.getTime()) {
        startTime = t2;
      }
      if (endTime === undefined || t2.getTime() > endTime.getTime()) {
        endTime = t2;
      }
    }
    // elevation data
    e = pt.ele ? Number.parseFloat(pt.ele) : Number.parseFloat(pt.altitude);
    if (e) {
      if (lp) {
        if (e > lp) {
          asc += e - lp;
          // logger.debug('ele: %d  asc: %d,   up by: %d', e, Math.round(asc * 100) / 100, Math.round((e - lp) * 100) / 100);
        } else if (e < lp) {
          desc += lp - e;
          // logger.debug('ele: %d desc: %d, down by: %d', e, Math.round(desc * 100) / 100, Math.round((lp - e) * 100) / 100);
        } else {
          // logger.debug('ele: %d', e);
        }
      }
      if (!h || e > h) h = e;
      if (!lo || e < lo) lo = e;
      lp = e;
    }
    // distance, speed, bearing
    if (prev !== undefined) {
      try {
        p1 = turf.point([Number(prev.lng), Number(prev.lat)]);
        p2 = turf.point([Number(pt.lng), Number(pt.lat)]);
        // distance kilometres
        d = turf.distance(p1, p2);
        if (options && options.calcPoints === true) {
          pt.distance = d;
        }
        totalDistance += d;
        if (options && options.calcPoints === true) {
          // speed km/h
          if (prev.time && pt.time && pt.distance) {
            t1 = new Date(prev.time);
            t2 = new Date(pt.time);
            pt.speed = pt.distance / ((t2.getTime() - t1.getTime()) / 1000 / 3600);
            if (minSpeed === undefined || pt.speed < minSpeed) {
              minSpeed = pt.speed;
            }
            if (maxSpeed === undefined || pt.speed > maxSpeed) {
              maxSpeed = pt.speed;
            }
            totalSpeed += pt.speed;
          }
          // bearing degrees
          if (turfHelpers.bearingToAzimuth === undefined) {
            // Convert to angle (version 4.7.3)
            pt.bearing = turfHelpers.bearingToAngle(turf.bearing(p1, p2));
          } else {
            // Version 5.1.x
            pt.bearing = turfHelpers.bearingToAzimuth(turf.bearing(p1, p2));
          }
        } // if options.calcPoints
      } catch (e) {
        logger.warn('Error converting path points'/*, e*/);
      }
    }
    speedCount++;
    prev = pt;
  });  // forEach

  // bounds
  if (options && options.calcPoints === true) {
    // logger.debug('coords: %j', coords);
    if (coords.length > 1) {
      path.bounds = turf.bbox(turf.lineString(coords));
    } else if (coords.length === 1) {
      path.bounds = [coords[0][0], coords[0][1], coords[0][0], coords[0][1]];
    } else {
      path.bounds = undefined;
    }
    // logger.debug('bounds: %j', path.bounds);
  }

  // elevation summary
  if (lp) {
    path.highest = h;
    path.lowest = lo;
    path.ascent = asc;
    path.descent = desc;
  }

  // distance summary
  path.distance = totalDistance;

  // speed, bearing summary
  if (options && options.calcPoints === true) {
    path.minSpeed = minSpeed;
    path.maxSpeed = maxSpeed;
    if (speedCount > 0 && startTime && endTime) {
      // logger.debug('Total distance: %d kilometres', totalDistance);
      // logger.debug('Time %d seconds', (endTime.getTime() - startTime.getTime()) / 1000);
      // logger.debug('Time %d hours', (endTime.getTime() - startTime.getTime()) / 1000 / 3600);
      path.avgSpeed = totalDistance / ((endTime.getTime() - startTime.getTime()) / 1000 / 3600);
      // logger.debug('Average: %d\n', path.avgSpeed);
    }
    path.startTime = startTime;
    path.endTime = endTime;
  }

}

function fillDistanceElevationForRoutes(routes, options) {
  var bounds, strBounds, minY;
  routes.forEach(function(v) {
    fillDistanceElevationForPath(v, options);
    if (options && options.calcPoints === true) {
      if (bounds === undefined) {
        bounds = v.bounds;
      } else {
        bounds = turf.bbox(
          turf.featureCollection(
            [turf.bboxPolygon(bounds),
             turf.bboxPolygon(v.bounds)]
          ));
      }
    }
    if (v.startTime &&
        (routes.startTime === undefined || v.startTime.getTime() < routes.startTime.getTime())) {
      routes.startTime = v.startTime;
    }
    if (v.endTime &&
        (routes.endTime === undefined || v.endTime.getTime() > routes.endTime.getTime())) {
      routes.endTime = v.endTime;
    }
  });
  if (bounds !== undefined) {
    // Version 4.7.3 of turf returned strings - maintaining previous behaviour for this function
    // 4.7.3 also returned minY and maxY in the wrong order
    if (bounds.length === 4) {
      if (Number(bounds[1]) > Number(bounds[3])) {
        logger.debug('Swapping Y bounds as they are in the wrong order');
        minY = bounds[3];
        bounds[3] = bounds[1];
        bounds[1] = minY;
      }
    } else {
      logger.error('Bounds are invalid2:', bounds);
    }
    strBounds = [];
    bounds.forEach(function(b) {
      if (_.isNumber(b)) {
        strBounds.push('' + b);
      } else {
        strBounds.push(b);
      }
    });
    routes.bounds = strBounds;
  }
}

function fillDistanceElevationForTrack(track, options) {
  var path;
  path = {};
  path.points = [];
  track.segments.forEach(function(seg) {
    // Create additional list to calculate just this segment
    seg.points.forEach(function(v) {
      path.points.push(v);
    });
    if (options && options.calcSegments === true) {
      // calculate each segment in addition to the overall path
      fillDistanceElevationForPath(seg, options);
    }
  });
  fillDistanceElevationForPath(path, options);
  if (path.bounds) {
    track.bounds = path.bounds;
  }
  track.distance = path.distance;
  track.highest = path.highest;
  track.lowest = path.lowest;
  track.ascent = path.ascent;
  track.descent = path.descent;
  if (options && options.calcPoints === true) {
    track.startTime = path.startTime;
    track.endTime = path.endTime;
    track.minSpeed = path.minSpeed;
    track.maxSpeed = path.maxSpeed;
    track.avgSpeed = path.avgSpeed;
  }
}

function fillDistanceElevationForTracks(tracks, options) {
  var bounds, strBounds, minY;

  tracks.forEach(function(t) {
    fillDistanceElevationForTrack(t, options);
    if (options && options.calcPoints === true) {
      if (bounds === undefined) {
        bounds = t.bounds;
      } else {
        bounds = turf.bbox(
          turf.featureCollection(
            [turf.bboxPolygon(bounds),
             turf.bboxPolygon(t.bounds)]
          ));
      }
    }
    if (t.startTime &&
        (tracks.startTime === undefined || t.startTime.getTime() < tracks.startTime.getTime())) {
      tracks.startTime = t.startTime;
    }
    if (t.endTime &&
        (tracks.endTime === undefined || t.endTime.getTime() > tracks.endTime.getTime())) {
      tracks.endTime = t.endTime;
    }
  });
  if (bounds !== undefined) {
    // Version 4.7.3 of turf returned strings - maintaining previous behaviour for this function
    // 4.7.3 also returned minY and maxY in the wrong order
    if (bounds.length === 4) {
      if (Number(bounds[1]) > Number(bounds[3])) {
        logger.debug('Swapping Y bounds as they are in the wrong order');
        minY = bounds[3];
        bounds[3] = bounds[1];
        bounds[1] = minY;
      }
    } else {
      logger.error('Bounds are invalid:', bounds);
    }
    strBounds = [];
    bounds.forEach(function(b) {
      if (_.isNumber(b)) {
        strBounds.push('' + b);
      } else {
        strBounds.push(b);
      }
    });
    tracks.bounds = strBounds;
  }
}

function getTimeSpan(elements) {
  var s, e;
  if (elements && Array.isArray(elements)) {
    elements.forEach(function(v) {
      if (v.startTime &&
          (s === undefined || v.startTime.getTime() < s.getTime())) {
        s = v.startTime;
      }
      if (v.endTime &&
          (e === undefined || v.endTime.getTime() > e.getTime())) {
        e = v.endTime;
      }
    });
  } else {
    logger.warn('Invalid elements passed to getTimeSpan()');
  }
  return {startTime: s, endTime: e};
}

function getTimeSpanForWaypoints(waypoints) {
  var s, e, t;
  if (waypoints && Array.isArray(waypoints)) {
    waypoints.forEach(function(pt) {
      if (pt.time) {
        t = new Date(pt.time);
        if (s === undefined || t.getTime() < s.getTime()) {
          s = t;
        }
        if (e === undefined || t.getTime() > s.getTime()) {
          e = t;
        }
      }
    });
  }
  return {startTime: s, endTime: e};
}

function getWaypointBounds(waypoints) {
  var coords = [];
  if (waypoints && Array.isArray(waypoints)) {
    waypoints.forEach(function(pt) {
      coords.push([pt.lng, pt.lat]);
    });
  }
  if (coords.length > 1) {
    return turf.bbox(turf.lineString(coords));
  } else if (coords.length === 1) {
    return [ coords[0][0], coords[0][1], coords[0][0], coords[0][1] ];
  }
  return null;
}

function getRange(bounds) {
  if (bounds && Array.isArray(bounds) && bounds[0] !== null) {
    return turf.distance(turf.point(bounds.slice(0, 2)), turf.point(bounds.slice(2,4)));
  }
  return null;
}

function getBounds(bounds) {
  var polys = [];
  if (bounds && Array.isArray(bounds)) {
    bounds.forEach(function(b) {
      if (b && Array.isArray(b) && b.length === 4) {
        polys.push(turf.bboxPolygon(b));
      } else {
        logger.warn('Invalid element passed to getBounds(): %j', bounds);
      }
    });
    if (polys.length > 0) {
      return turf.bbox(turf.featureCollection(polys));
    }
  }
  return null;
}

function getCenter(bounds) {
  var retval;
  if (bounds && Array.isArray(bounds) && bounds[0] !== null) {
    retval = turf.center(turf.featureCollection([turf.bboxPolygon(bounds)]));
    if (retval && retval.geometry) {
      return retval.geometry.coordinates;
    }
  }
  return null;
}

function isValidDate(dt) {
  if (Object.prototype.toString.call(dt) === '[object Date]') {
    if (isNaN(dt.getTime())) {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
}

/**
 * Converts a valid ISO 8601 formatted date to a Date object.  It additionally
 * attempts to recognise some other variants of the ISO 8601 format.
 *
 * @param {string} s containing a valid ISO 8601 formatted date.
 *
 * @return A Date object if the date is valid, else null.
 */
function isoDate(s) {
  if (s === null) {
    return null;
  }
  var dt = new Date(s);
  if (isValidDate(dt)) {
    return dt;
  }
  // Format seen from Avenza Maps export
  var m = /^(\d{2,4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.)?(\d{3})?:?(\d{2})?$/.exec(s);
  if (m) {
    var s2 = m[1];
    if (m[2]) {
      s2 += '.' + m[2];
    }
    if (m[3]) {
      s2 += '+' + m[3] + ':00';
    }
    dt = new Date(s2);
    if (isValidDate(dt)) {
      return dt;
    }
  }
  return null;
}

function parseJSON(string) {
  try {
    return JSON.parse(string);
  } catch(e) {
    return undefined;
  }
}

function isJSON(string) {
  if (_.isString(string)) {
    try {
      JSON.parse(string);
      return true;
    } catch(e) {
      //
    }
  }
  return false;
}

function isISO8601(string) {
  if (_.isString(string)) {
    var dt = new Date(string);
    return _.isDate(dt);
  }
  return false;
}

function isEmail(string) {
  // This is intended as a reasonably simplistic implementation, for a sophisticated alternative see
  // https://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address
  if (_.isString(string)) {
    return /^[!-?A-~]+@[!-?A-~]+\.[!-?A-~]{2,}$/.test(string);
  }
  return false;
}

function scarfsEquivalence(distance, ascent, flatSpeedKph) {
  var retval, t, hours, minutes;
  if (flatSpeedKph != null) {
    if (ascent != null) {
      // Calculation using Scarf's Equivalence based on flat speed
      if (distance != null) {
        t = (Number(distance) + Number(ascent) * 0.00792) / flatSpeedKph;
      } else {
        t = Number(ascent) * 0.00792 / flatSpeedKph;
      }
    } else {
      if (distance != null) {
        t = Number(distance) / flatSpeedKph;
      }
    }
  } else {
    t = Infinity;
  }
  if (t !== Infinity) {
    if (t !== undefined) {
      hours = Math.floor(t);
      minutes = Math.round((t - hours) * 60);
    }
  } else {
    hours = Infinity;
    minutes = Infinity;
  }
  return {hours: hours, minutes: minutes};
}
