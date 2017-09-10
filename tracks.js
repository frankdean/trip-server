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

var builder = require('xmlbuilder');
var uuid = require('uuid');
var validator = require('validator');
var winston = require('winston');

var db = require('./db');
var utils = require('./utils');

module.exports = {
  getLocations: getLocations,
  getLocationsAsXml: getLocationsAsXml,
  getNicknames: getNicknames,
  getColors: getColors,
  getTrackingInfo: getTrackingInfo,
  logPoint: logPoint,
  updateTrackingInfo: updateTrackingInfo,
  unitTests: {constrainSharedLocationDates: constrainSharedLocationDates}
};

function getNicknames(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getNicknames(username, function(err, result) {
      callback(err, result);
  });
}

function getColors(callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getPathColors(function(err, result) {
      callback(err, result);
  });
}

function getTrackingInfo(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getTrackingInfo(username, function(err, result) {
    if (err) {
      callback(err);
    } else {
      callback(err, {uuid: result});
    }
  });
}

function updateTrackingInfo(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var newUuid = uuid.v4();
  db.updateTrackingInfo(username, newUuid, function(err) {
    callback(err, {uuid: newUuid});
  });
}

function getLocationsByUserId(userId, from, to, maxHdop, notesOnlyFlag, order, offset, pageSize, callback) {
  db.getLocationCount(userId, from, to, maxHdop, notesOnlyFlag, function(err, count) {
    if (err) {
      callback(err);
    } else {
      var locations = {};
      locations.count = count;
      db.getLocations(userId,
                      from,
                      to,
                      maxHdop,
                      notesOnlyFlag,
                      order,
                      offset,
                      pageSize,
                      function(err, result) {
                        if (err) {
                          callback(err);
                        } else {
                          locations.payload = result;
                          // include in the result the queried date range
                          // which may have been constrained if the search is
                          // for shared locations.
                          locations.date_from = from.toISOString();
                          locations.date_to = to.toISOString();
                          callback(err, locations);
                        }
                      });
    }
  });
}

/**
 * @param {number} sharedById - The user ID of the user to retrieve locations for.
 * @param {string} from - Range start datetime value in ISO 8601 format.
 * @param {string} to - Range end datetime value in ISO 8601 format.
 * @param {number} maxMinutes - The maximum number of minutes before now that
 * the range can start from.
 * @param recentMinutes - The maximum number of minutes before the
 * last logged point that the range can start from.
 */
function constrainSharedLocationDates(sharedById, from, to, maxMinutes, recentMinutes, callback) {
  var earliestPossible, mostRecentFrom, fromMs, toMs;
  fromMs = Date.parse(from);
  toMs = Date.parse(to);
  db.getMostRecentLocationTime(sharedById, function(err, latestTime) {
    if (err) {
      callback(err);
    } else {
      if (maxMinutes) {
        earliestPossible = Date.now() - maxMinutes * 60000;
      }
      if (recentMinutes) {
        mostRecentFrom = latestTime ? latestTime.getTime() - recentMinutes * 60000 : earliestPossible;
      }
      earliestPossible = (earliestPossible && earliestPossible > mostRecentFrom) ?
        earliestPossible : mostRecentFrom;
      fromMs = (earliestPossible && fromMs < earliestPossible) ? earliestPossible : fromMs;
      toMs = (fromMs > toMs) ? fromMs : toMs;
      callback(null, new Date(fromMs), new Date(toMs));
    }
  });
}

function getSharedLocations(nickname, userId, from, to, maxHdop, notesOnlyFlag, order, offset, pageSize, callback) {
  // Constrain requested date range to within those of the recent and maximum period values
  db.getLocationShareDetails(nickname, userId, function(err, shareDetails) {
    if (err) {
      callback(err);
    } else {
      db.getLocationSharingId(userId, nickname, function(err, sharedById) {
        if (err) {
          callback(err);
        } else {
          constrainSharedLocationDates(
            sharedById,
            from,
            to,
            shareDetails.max_minutes,
            shareDetails.recent_minutes,
            function(err, fromDate, toDate) {
              if (err) {
                callback(err);
              } else {
                getLocationsByUserId(sharedById, fromDate, toDate, maxHdop, notesOnlyFlag, order, offset, pageSize, function(err, result) {
                  callback(err, result);
                });
              }
            });
        }
      });
    }
  });
}

function getLocations(query, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var path = {};
  db.getUserIdByUsername(query.username, function(err, userId) {
    if (err) {
      callback(err);
    } else {
      if (query.nickname === undefined) {
        getLocationsByUserId(userId,
                            new Date(query.from),
                            new Date(query.to),
                            query.max_hdop,
                            query.notesOnlyFlag,
                            query.order,
                            query.offset,
                            query.page_size,
                            function(err, result) {
                              // Only include distance and elevation on request of full result set
                              if (!query.offset && result && result.payload && Array.isArray(result.payload) && result.payload.length > 0) {
                                path.points = result.payload;
                                utils.fillDistanceElevationForPath(path);
                                result.distance = path.distance;
                                result.ascent = path.ascent;
                                result.descent = path.descent;
                                result.lowest = path.lowest;
                                result.highest = path.highest;
                              }
                              callback(err, result);
                            });
      } else {
        getSharedLocations(query.nickname,
                           userId,
                           query.from,
                           query.to,
                           query.max_hdop,
                           query.notesOnlyFlag,
                           query.order,
                           query.offset,
                           query.page_size,
                           function(err, result) {
                             // Only include distance and elevation on request of full result set
                             if (!query.offset && result && result.payload) {
                               path.points = result.payload;
                               utils.fillDistanceElevationForPath(path);
                               result.distance = path.distance;
                               result.ascent = path.ascent;
                               result.descent = path.descent;
                               result.lowest = path.lowest;
                               result.highest = path.highest;
                             }
                             callback(err, result);
                           });
      }
    }
  });
}

function getLocationsAsXml(query, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var root, trk, trkseg, trkpt;
  getLocations(query, function(err, locations) {
    if (err) {
      callback(err);
    } else {
      root = builder.create('gpx', {version: '1.0', encoding: 'UTF-8'});
      root.a('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        .a('creator', 'TRIP')
        .a('version', '1.1')
        .a('xmlns', 'http://www.topografix.com/GPX/1/1')
        .a('xsi:schemaLocation',
           'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd');
      root.e('metadata')
        .e('time', null, (new Date()).toISOString());
      trk = root.e('trk');
      trkseg = trk.e('trkseg');
      if (locations.payload !== undefined && Array.isArray(locations.payload)) {
        locations.payload.forEach(function(v, i, a) {
          trkpt = trkseg.e('trkpt', {lat: v.lat, lon: v.lng});
          if (v.altitude) {
            trkpt.e('ele', null, v.altitude);
          }
          trkpt.e('time', null, v.time.toISOString());
          if (v.hdop) {
            trkpt.e('hdop', v.hdop);
          }
        });
        callback(null, root.end({pretty: false}));
      } else {
        callback(new Error('Location query failed'));
      }
    }
  });
}

function toNum(v) {
  var r = (v === undefined || validator.isEmpty('' + v)) ? undefined : Number(v);
  return r !== undefined ? r : undefined;
}

function doLogPoint(q, callback) {
  if (q.uuid !== undefined) {
    q.hdop = toNum(q.hdop);
    q.altitude = toNum(q.altitude);
    q.batt = toNum(q.batt);
    q.sat = toNum(q.sat);
    q.speed = toNum(q.speed);
    q.bearing = toNum(q.bearing);
    if (q.note !== undefined && validator.isEmpty(q.note)) {
      q.note = undefined;
    }
    q.lng = q.lng !== undefined ? q.lng : q.lon;
    if (q.lat !== undefined && q.lng !== undefined &&
        validator.isFloat('' + q.lat, {min: -90, max: 90}) && validator.isFloat('' + q.lng, {min: -180, max: 180})) {
      if (!validator.isFloat('' + q.hdop, {min: 0, max: 99999.9})) {
        winston.debug('Received invalid hdop for location %j', q);
        q.hdop = undefined;
      }
      if(q.altitude !== undefined && !validator.isFloat('' + q.altitude, {min: -999999.99999, max: 999999.99999})) {
        winston.debug('Received invalid altitude for location %j', q);
        q.altitude = undefined;
      }
      if(q.speed !== undefined && !validator.isFloat('' + q.speed, {min: -99999.9, max: 99999.9})) {
        winston.debug('Received invalid speed for location %j', q);
        q.speed = undefined;
      }
      if (q.bearing !== undefined && !validator.isFloat('' + q.bearing, {min: -999999.99999, max: 999999.99999})) {
        winston.debug('Received invalid bearing for location %j', q);
        q.bearing = undefined;
      }
      if (q.sat !== undefined && !validator.isInt('' + q.sat, {min: 0, max: 32767})) {
        winston.debug('Received invalid satellite count for location %j', q);
        q.sat = undefined;
      }
      if (q.batt !== undefined && !validator.isFloat('' + q.batt, {min: 0, max: 999.9})) {
        winston.debug('Received invalid battery value for location %j', q);
        q.batt = undefined;
      }
      if (q.mstime !== undefined && validator.isInt('' + q.mstime)) {
        db.findUserByUuid(q.uuid, function(err, user) {
          if (err) {
            winston.info('User not found for UUID', q.uuid, q.id);
            callback(new Error('Invalid UUID'));
          } else {
            winston.debug('Saving %j', q);
            db.logPoint(user.id, q, function(err) {
              if (err) {
                winston.error('Failure saving logged point', err);
              }
              callback(err, user);
            });
          }
        });
      } else {
        winston.debug('Invalid time-type parameter for location %j', q);
        callback(new Error('Invalid time-type parameter'));
      }
    } else {
      winston.debug('Invalid or missing lat/lon parameters for location %j', q);
      callback(new Error('Invalid or missing lat/lon parameters'));
    }
  } else {
    winston.debug('log_point failed for location: %j', q);
    callback(new Error('Missing UUID parameter'));
  }
}

function logPoint(q, callback) {
  var provParams, offsetParams, offsetIndex, offset;
  if (q.uuid === undefined && q.id !== undefined) {
    q.uuid = q.id;
  }
  // Do not redefine mstime
  if (q.mstime === undefined) {
    if (q.unixtime === undefined && q.timestamp && validator.isInt('' + q.timestamp)) {
      q.unixtime = q.timestamp;
    }
    if (q.unixtime !== undefined && validator.isInt('' + q.unixtime)) {
      q.mstime = q.unixtime * 1000;
    }
    // ISO8601 formatted date
    if (q.time !== undefined && validator.isISO8601('' + q.time)) {
      q.mstime = Date.parse(q.time);
    }
    if (q.mstime) {
      // Workaround for bug on some Android devices where GPS time is consistently wrong
      // Apply a second or millisecond correction, max range 25 hours
      winston.debug('tracks.js: mstime before:', q.mstime, new Date(q.mstime));
      // Comma separated list of provider to modify the time for
      if (Array.isArray(q.offsetprovs)) {
        winston.debug('offsetprovs parameter appears to occur more than once - has been parsed as an array');
        provParams = q.offsetprovs;
      } else {
        provParams = q.offsetprovs ? q.offsetprovs.split(',') : [];
      }
      offsetIndex = provParams.indexOf(q.prov);
      if (q.offset && (provParams.length === 0 || offsetIndex !== -1)) {
        if (Array.isArray(q.offset)) {
          winston.debug('offset parameter appears to occur more than once - has been parsed as an array');
          offsetParams = q.offset;
        } else {
          offsetParams = q.offset.split(',');
        }
        if (offsetIndex > -1 && offsetIndex < offsetParams.length) {
          offset = offsetParams[offsetIndex];
        } else {
          if (offsetParams.length > 1) {
            winston.debug('offset has inconsistent number of values compared with offsetprovs parameter');
            offset = 0;
          } else {
            offset = q.offset;
          }
        }
        if (validator.isInt('' + offset, {min: -90000, max: 90000})) {
          winston.debug('Modifying time by %d seconds', offset);
          q.mstime += Number(offset) * 1000;
        } else {
          winston.debug('Invalid value for offset parameter');
        }
      } else if (q.msoffset && (provParams.length === 0 || offsetIndex !== -1)) {
        if (Array.isArray(q.msoffset)) {
          winston.debug('msoffset parameter appears to occur more than once - has been parsed as an array');
          offsetParams = q.msoffset;
        } else {
          offsetParams = q.msoffset.split(',');
        }
        if (offsetIndex > -1 && offsetIndex < offsetParams.length) {
          offset = offsetParams[offsetIndex];
        } else {
          if (offsetParams.length > 1) {
            winston.debug('msoffset has inconsistent number of values compared with offsetprovs parameter');
            offset = 0;
          } else {
            offset = q.msoffset;
          }
        }
        if (validator.isInt('' + offset, {min: -90000000, max: 90000000})) {
          winston.debug('Modifying time by %d milliseconds', offset);
          q.mstime += Number(offset);
        } else {
          winston.debug('Invalid value for msoffset parameter');
        }
      }
    }
    winston.debug('tracks.js: mstime: after', q.mstime, new Date(q.mstime));
    // If no time parameters specified, default to now, but not where an
    // invalid time has been passed.  If someone is trying to specify a time,
    // but it is invalid, we don't want to record a time that may be quite
    // wrong and therefore misleading.
    if (q.mstime === undefined && q.time === undefined && q.timestamp === undefined && q.unixtime === undefined) {
      winston.debug('tracks.js no time parameter specified, logging time as now');
      q.mstime = Date.now();
    }
  }
  doLogPoint(q, callback);
}
