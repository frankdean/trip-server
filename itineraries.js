// vim: set ts=2 sts=-1 sw=2 et ft=javascript norl:
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
var builder = require('xmlbuilder');

var db = require('./db');
var config = require('./config');
var elevation = require('./elevation');
var utils = require('./utils');

var validNickname = /^[!-\.0->@-~]+$/;

var logger = require('./logger').createLogger('itineries.js', config.log.level, config.log.timestamp);

// TODO This should be a per user configurable default
var flatSpeed = (config.app.averageFlatSpeedKph) || 4;

/**
 * Primarily contains functions for managing itineraries.
 * @module itineraries
 */
module.exports = {
  deleteItinerary: deleteItinerary,
  getItinerary: getItinerary,
  getItineraries: getItineraries,
  getItinerariesWithinDistance: getItinerariesWithinDistance,
  getItineraryRoutesWithinDistance: getItineraryRoutesWithinDistance,
  getItineraryWaypointsWithinDistance: getItineraryWaypointsWithinDistance,
  getItineraryTracksWithinDistance: getItineraryTracksWithinDistance,
  saveItinerary: saveItinerary,
  getItineraryShares: getItineraryShares,
  getSharedItinerariesForUser: getSharedItinerariesForUser,
  shareItinerary: shareItinerary,
  downloadItineraryGpx: downloadItineraryGpx,
  downloadItineraryKml: downloadItineraryKml,
  updateItinerarySharesActiveStates: updateItinerarySharesActiveStates,
  deleteItinerarySharesForShareList: deleteItinerarySharesForShareList,
  getItineraryWaypointCount: getItineraryWaypointCount,
  saveItineraryRoute: saveItineraryRoute,
  replaceItineraryRoutePoints: replaceItineraryRoutePoints,
  deleteItineraryRoutePoints: deleteItineraryRoutePoints,
  getItineraryRouteNames: getItineraryRouteNames,
  getItineraryRouteName: getItineraryRouteName,
  updateItineraryRouteName: updateItineraryRouteName,
  deleteItineraryRoute: deleteItineraryRoute,
  getItineraryRoutePoints: getItineraryRoutePoints,
  getItineraryTrackNames: getItineraryTrackNames,
  getItineraryTrackName: getItineraryTrackName,
  updateItineraryTrackName: updateItineraryTrackName,
  getItineraryWaypointForUser: getItineraryWaypointForUser,
  getItineraryWaypointsForUser: getItineraryWaypointsForUser,
  getSpecifiedItineraryWaypointsForUser: getSpecifiedItineraryWaypointsForUser,
  saveItineraryWaypoint: saveItineraryWaypoint,
  moveItineraryWaypoint: moveItineraryWaypoint,
  deleteItineraryWaypoint: deleteItineraryWaypoint,
  getItineraryTracksForUser: getItineraryTracksForUser,
  getItineraryTrackSegmentsForUser: getItineraryTrackSegmentsForUser,
  getItineraryTrackSegmentForUser: getItineraryTrackSegmentForUser,
  saveItineraryTrack: saveItineraryTrack,
  deleteItineraryTrackSegmentsForUser: deleteItineraryTrackSegmentsForUser,
  deleteItineraryTrackSegmentPointsForUser: deleteItineraryTrackSegmentPointsForUser,
  getItineraryRoutesForUser: getItineraryRoutesForUser,
  deleteItineraryUploads: deleteItineraryUploads,
  getWaypointSymbols: getWaypointSymbols,
  getGeoreferenceFormats: getGeoreferenceFormats,
  unitTests: {formatKmlSnippetDate: formatKmlSnippetDate}
};

function formatKmlSnippetDate(date) {
  var s, dtf, parts;
  dtf = new Intl.DateTimeFormat('en-GB', {
    localeMatcher: 'lookup',
    formatMatcher: 'basic',
    weekday: 'short', month: 'short', day: '2-digit',
    hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    year: 'numeric'});
  s = dtf.format(date);
  // node v6.11.3 "Sat, Sep 02, 2017, 13:30:45"
  // node v6.11.4 "Sat, 02 Sep 2017, 13:30:45"
  parts = /^(\D{3}),?\s+(\d+)\s+(\D+)\s+(\d+),?\s+(.*)$/.exec(s);
  if (parts && parts.length > 0) {
    // logger.debug('Successfully parsed as Node v6.11.4 format');
    return parts[1] + ' ' + parts[3] + ' ' + Number(parts[2]) + ' ' + parts[5] + ' ' + parts[4];
  } else {
    logger.warn('Failed to parse date "%s", trying Node v6.11.3 format', s);
    parts = /^(\D{3}),?\s+(\D+)\s+(\d+),?\s+(\d+),?\s+(.*)$/.exec(s);
  }
  if (parts && parts.length > 0) {
    return parts[1] + ' ' + parts[2] + ' ' + Number(parts[3]) + ' ' + parts[5] + ' ' + parts[4];
  } else {
    return s;
  }
}

function getItinerary(username, id, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getItinerary(username, id, callback);
}

function saveItinerary(username, itinerary, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (_.isEmpty(itinerary.title)) {
    callback(new Error('Invalid title'));
    return;
  }
  if (itinerary.date && !utils.isISO8601(itinerary.start)) {
    callback(new Error('Invalid start date'));
    return;
  }
  if (itinerary.date && !utils.isISO8601(itinerary.finish)) {
    callback(new Error('Invalid finish date'));
    return;
  }
  itinerary.description = _.isEmpty(itinerary.description) ? null : itinerary.description;
  db.getUserIdByUsername(username, function(err, userId) {
    if (err) {
      callback(err);
      return;
    }
    if (itinerary.id) {
      db.updateItinerary(userId, itinerary, function(err, result) {
        callback(result ? null : new Error('Update failed'), result);
      });
    } else {
      db.createItinerary(userId, itinerary, function(err, itineraryId) {
        callback(err, itineraryId);
      });
    }
  });
}

function deleteItinerary(username, id, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.deleteItinerary(username, id, callback);
}

function getItineraries(username, offset, pageSize, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getItinerariesCountByUsername(username, function(err, count) {
    if (err) {
      callback(err);
      return;
    }
    db.getItinerariesByUsername(username, offset, pageSize, function(err, result) {
      callback(err, {count: count, payload: result});
    });
  });
}

function getItinerariesWithinDistance(username, longitude, latitude, distance, offset, pageSize, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.findUserByUsername(username, function(err, userId) {
    if (err) {
      callback(err);
      return;
    }
    console.time("searchItinerariesByDistance");
    db.getItinerariesByDistanceWithinCount(userId, longitude, latitude, distance, function(err, count) {
      if (err) {
        callback(err);
        return;
      }
      db.getItinerariesByDistanceWithin(userId, longitude, latitude, distance, offset, pageSize, function(err, result) {
        console.timeEnd("searchItinerariesByDistance");
        callback(err, {count: count, payload: result});
      });
    });
  });
}

function getItineraryRoutesWithinDistance(username, itineraryId, longitude, latitude, distance, callback) {
  var t;
  callback = typeof callback === 'function' ? callback : function() {};
  db.findUserByUsername(username, function(err, userId) {
    if (err) {
      callback(err);
      return;
    }
    console.time("searchItineraryRoutesByDistance");
    db.getItineraryRoutesByDistanceWithin(userId, itineraryId, longitude, latitude, distance, function(err, result) {
      console.timeEnd("searchItineraryRoutesByDistance");
      if (utils.handleError(err, callback)) {
        result.forEach(function(v) {
          t = utils.scarfsEquivalence(v.distance, v.ascent, flatSpeed);
          v.hours = t.hours;
          v.minutes = t.minutes;
        });
        callback(err, result);
      }
    });
  });
}

function getItineraryWaypointsWithinDistance(username, itineraryId, longitude, latitude, distance, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.findUserByUsername(username, function(err, userId) {
    if (err) {
      callback(err);
      return;
    }
    console.time("searchItineraryWaypointsByDistance");
    db.getItineraryWaypointsByDistanceWithin(userId, itineraryId, longitude, latitude, distance, function(err, result) {
      console.timeEnd("searchItineraryWaypointsByDistance");
      callback(err, result);
    });
  });
}

function getItineraryTracksWithinDistance(username, itineraryId, longitude, latitude, distance, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.findUserByUsername(username, function(err, userId) {
    if (err) {
      callback(err);
      return;
    }
    console.time("searchItineraryTracksByDistance");
    db.getItineraryTracksByDistanceWithin(userId, itineraryId, longitude, latitude, distance, function(err, result) {
      console.timeEnd("searchItineraryTracksByDistance");
      callback(err, result);
    });
  });
}

function getItineraryShares(username, itineraryId, offset, limit, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getItinerarySharesCountByUsername(username, itineraryId, function(err, count) {
    if (utils.handleError(err, callback)) {
      db.getItinerarySharesByUsername(username, itineraryId, offset, limit, function(err, result) {
        callback(err, {count: count, payload: result});
      });
    }
  });
}

function getSharedItinerariesForUser(username, offset, limit, callback) {
  var itineraryIds = [],
      itineraryMap = [];
  callback = typeof callback === 'function' ? callback : function() {};
  db.getCountSharedItinerariesForUser(username, function(err, count) {
    if (utils.handleError(err, callback)) {
      if (count === 0 ) {
        callback(null, {count: count, payload: []});
      } else {
        db.getSharedItinerariesForUser(username, offset, limit, function(err, itineraries) {
          if (utils.handleError(err, callback)) {
            if (itineraries) {
              itineraries.forEach(function(v) {
                itineraryIds.push(v.id);
                itineraryMap[v.id] = v;
                v.shares = [];
              });
              db.getSharedItinerariesNicknamesForUser(username, itineraryIds, function(err, nicknames) {
                if (utils.handleError(err, callback)) {
                  if (nicknames) {
                    nicknames.forEach(function(i) {
                      if (itineraryMap[i.id]) {
                        itineraryMap[i.id].shares.push(i.nickname);
                      }
                    });
                  }
                }
                callback(err, { count: count, payload: itineraries });
              });
            } else {
              callback(new Error('Unexpected error fetching shared itineraries for user'));
            }
          }
        });
      }
    }
  });
}

function shareItinerary(username, itineraryId, share, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (validateItineraryShare(share.nickname)) {
    callback(new Error('Nickname must not be empty'));
  } else {
    share.active = share.active ? true : false;
    db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
      if (utils.handleError(err, callback)) {
        if (result !== true) {
          callback(new Error('Access denied'));
        } else {
          db.getItineraryShare(itineraryId, share.nickname, function(err, existingShare) {
            if (utils.handleError(err, callback)) {
              if (!existingShare) {
                db.createItineraryShare(itineraryId, share.nickname, share.active, function(err, result) {
                  if (err) {
                    callback(new Error('Create itinerary share failed - check nickname is correct'));
                  } else {
                    callback(err, result);
                  }
                });
              } else {
                if (share.active !== existingShare.active) {
                  db.updateItineraryShare(existingShare.itinerary_id,
                                          existingShare.shared_to_id,
                                          share.active,
                                          callback);
                } else {
                  // logger.debug('Not updating itinerary share as no change');
                  callback(null);
                }
              }
            }
          });
        }
      }
    });
  }
}

function validateItineraryShare(share) {
  return share.nickname !== undefined && validNickname.test(share.nickname) && _.isBoolean(share.active);
}

function validateItineraryShares(shares) {
  var valid = true;
  shares.forEach(function(v) {
    if (valid && !validateItineraryShare(v)) {
      valid = false;
    }
  });
  return valid;
}

function updateItinerarySharesActiveStates(username, itineraryId, shares, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
        if (validateItineraryShares(shares)) {
          db.updateItineraryShareActiveStates(itineraryId, shares, function(err) {
            callback(err);
          });
        } else {
          callback(new Error('Invalid nickname passed'));
        }
      }
    }
  });
}

function deleteItinerarySharesForShareList(username, itineraryId, shares, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
        if (validateItineraryShares(shares)) {
          var c = 0;
          var nicknames = [];
          shares.forEach(function(v) {
            if (v.deleted) {
              nicknames.push(v.nickname);
              c++;
            }
          });
          if (c) {
            db.deleteItineraryShares(itineraryId, nicknames, function(err) {
              callback(err);
            });
          } else {
            callback(null);
          }
        } else {
          callback(new Error('Invalid nickname passed'));
        }
      }
    }
  });
}

function getItineraryWaypointCount(username, itineraryId, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryWaypointCount(itineraryId, function(err, result) {
          callback(err, result);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function saveItineraryRoute(username, itineraryId, routeId, route, callback) {
  var elevationFillOptions = {force: false, skipIfAnyExist: false};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        if (!routeId) {
          elevation.fillElevations(route.points, elevationFillOptions, function(err) {
            // Ignore err - try to save the route anyway
            utils.fillDistanceElevationForPath(route);
            db.createItineraryRoute(itineraryId, route, function(err, result) {
              if (utils.handleError(err, callback)) {
                callback(err, result);
              }
            });
          });
        } else {
          logger.error('Update itinerary route not yet implemented');
          callback(new Error('Update itinerary route not yet implemented'));
        }
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function replaceItineraryRoutePoints(username, itineraryId, routeId, points, callback) {
  var route =  {points: points},
      elevationFillOptions = {force: false, skipIfAnyExist: false};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
          elevation.fillElevations(route.points, elevationFillOptions, function(err) {
            utils.fillDistanceElevationForPath(route);
            db.updateItineraryDistanceElevationData(itineraryId, routeId, route, function(err) {
              if (utils.handleError(err, callback)) {
                db.updateItineraryRoutePoints(itineraryId, routeId, points, callback);
              }
            });
          });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function deleteItineraryRoutePoints(username, itineraryId, routeId, points, callback) {
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.deleteItineraryRoutePoints(itineraryId, points, function(err) {
          if (utils.handleError(err, callback)) {
            db.getItineraryRoutePoints(itineraryId, routeId, null, null, function(err, result) {
              if (utils.handleError(err, callback)) {
                var route =  {points: result};
                utils.fillDistanceElevationForPath(route);
                db.updateItineraryDistanceElevationData(itineraryId, routeId, route, callback);
              }
            });
          }
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryRouteNames(username, itineraryId, callback) {
  var t;
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryRouteNames(itineraryId, function(err, result) {
          if (utils.handleError(err, callback)) {
            result.forEach(function(v) {
              // Calculation using Scarf's Equivalence based on flat speed of 4 km/h
              t = utils.scarfsEquivalence(v.distance, v.ascent, flatSpeed);
              v.hours = t.hours;
              v.minutes = t.minutes;
            });
            callback(err, result);
          }
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryRouteName(username, itineraryId, routeId, callback) {
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryRouteName(itineraryId, routeId, function(err, result) {
          callback(err, result);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function updateItineraryRouteName(username, itineraryId, routeId, name, color, callback) {
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.updateItineraryRouteName(itineraryId, routeId, name, color, function(err, result) {
          if (!err && result) {
            callback(err);
          } else {
            callback(new Error('Update route name failed'));
          }
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryRoutePoints(username, itineraryId, routeId, offset, limit, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryRoutePointsCount(itineraryId, routeId, function(err, count) {
          if (utils.handleError(err, callback)) {
            db.getItineraryRoutePoints(itineraryId, routeId, offset, limit, function(err, result) {
              callback(err, {count: count, points: result});
            });
          }
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryTrackNames(username, itineraryId, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryTrackNames(itineraryId, function(err, result) {
          callback(err, result);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryTrackName(username, itineraryId, trackId, callback) {
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryTrackName(itineraryId, trackId, function(err, result) {
          callback(err, result);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function updateItineraryTrackName(username, itineraryId, trackId, name, color, callback) {
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.updateItineraryTrackName(itineraryId, trackId, name, color, function(err, result) {
          if (!err && result) {
            callback(err);
          } else {
            callback(new Error('Update track name failed'));
          }
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryWaypointForUser(username, itineraryId, waypointId, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryWaypoint(itineraryId, waypointId, function(err, result) {
          callback(err, result);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryWaypointsForUser(username, itineraryId, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryWaypoints(itineraryId, function(err, result) {
          callback(err, result);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getSpecifiedItineraryWaypointsForUser(username, itineraryId, waypointIds, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getSpecifiedItineraryWaypoints(itineraryId, waypointIds, function(err, result) {
          callback(err, result);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function saveItineraryWaypoint(username, itineraryId, waypointId, waypoint, callback) {
  var elevationFillOptions = {force: false, skipIfAnyExist: true};
  callback = typeof callback === 'function' ? callback : function() {};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
        elevation.fillElevations([waypoint], elevationFillOptions, function(err) {
          if (waypoint.ele && !waypoint.altitude) {
            waypoint.altitude = waypoint.ele;
          }
          // Ignore any error and carry on
          if (waypointId) {
            db.updateItineraryWaypoint(itineraryId, waypointId, waypoint, function(err) {
              if (utils.handleError(err, callback)) {
                callback(null);
              }
            });
          } else {
            db.createItineraryWaypoint(itineraryId, waypoint, function(err, newWaypointId) {
              if (utils.handleError(err, callback)) {
                callback(null, newWaypointId);
              }
            });
          }
        });
      }
    }
  });
}

function moveItineraryWaypoint(username, itineraryId, waypointId, position, callback) {
  var elevationFillOptions = {force: true, skipIfAnyExist: false};
  callback = typeof callback === 'function' ? callback : function() {};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
        elevation.fillElevations([position], elevationFillOptions, function(err) {
          db.moveItineraryWaypoint(itineraryId, waypointId, position, callback);
        });
      }
    }
  });
}

function deleteItineraryWaypoint(username, itineraryId, waypointId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
        db.deleteItineraryWaypoint(itineraryId, waypointId, callback);
      }
    }
  });
}

function getItineraryTracksForUser(username, itineraryId, trackIds, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryTracks(itineraryId, trackIds, function(err, result) {
          callback(err, result);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryTrackSegmentsForUser(username, itineraryId, trackId, offset, limit, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryTrackSegmentCount(trackId, function(err, count) {
          if (utils.handleError(err, callback)) {
            if (count > 0) {
              db.getItineraryTrackName(itineraryId, trackId, function(err, track) {
                if (utils.handleError(err, callback)) {
                  db.getItineraryTrackSegments(itineraryId, trackId, offset, limit, function(err, segments) {
                    if (utils.handleError(err, callback)) {
                      track.segments = segments;
                      callback(err, {count: count, track: track});
                    }
                  });
                }
              });
            } else {
              callback(null, {count: 0, track: {id: null, segments: []}});
            }
          }
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryTrackSegmentForUser(username, itineraryId, segmentId, offset, limit, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryTrackSegmentPointCount(segmentId, function(err, count) {
          if (utils.handleError(err, callback)) {
            if (count > 0) {
              db.getItineraryTrackSegmentPoints(itineraryId, segmentId, offset, limit, function(err, points) {
                if (utils.handleError(err, callback)) {
                  if (offset && limit) {
                    // If called to get just a page of segment points
                    callback(err, {count: count, points: points});
                  } else {
                    // As we're getting all the segment points, return a segment populated with its attributes
                    db.getItineraryTrackSegment(itineraryId, segmentId, function(err, segment) {
                      if (utils.handleError(err, callback)) {
                        if (segment != null) {
                          segment.count = count;
                          segment.points = points;
                          callback(err, segment);
                        } else {
                          callback(new Error('Itinerary Track Segment not found'), segment);
                        }
                      }
                    });
                  }
                }
              });
          } else {
              callback(null, {count: 0, points: []});
            }
          }
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function saveItineraryTrack(username, itineraryId, trackId, newTrack, segments, callback) {
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
        if (!newTrack) {
          db.replaceItineraryTrackSegments(itineraryId, trackId, segments, function(err) {
            if (utils.handleError(err, callback)) {
              // Re-calculate track length etc.
              db.getItineraryTracks(itineraryId, [trackId], function(err, result) {
                if (utils.handleError(err, callback)) {
                  if (result.length > 0) {
                    utils.fillDistanceElevationForTrack(result[0], {calcSegments: true});
                    db.updateItineraryTrackDistanceElevation(itineraryId, trackId, result[0], callback);
                  } else {
                    logger.warn('Failed to find any matching tracks for track id: %d', trackId);
                    callback(null);
                  }
                }
              });
            }
          });
        } else {
          // Create as a new track
          db.createItineraryTracks(itineraryId, [newTrack], function(err, newTrackId) {
            if (utils.handleError(err, callback)) {
              // Re-calculate track length etc.
              db.getItineraryTracks(itineraryId, [newTrackId], function(err, result) {
                if (utils.handleError(err, callback)) {
                  if (result.length > 0) {
                    utils.fillDistanceElevationForTrack(result[0], {calcSegments: true});
                    db.updateItineraryTrackDistanceElevation(itineraryId, newTrackId, result[0], callback);
                  } else {
                    logger.warn('Failed to find any matching tracks for track id: %d', newTrackId);
                    callback(null);
                  }
                }
              });
            }
          });
        }
      }
      }
  });
}

function deleteItineraryTrackSegmentsForUser(username, itineraryId, trackId, segments, callback) {
    db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
      if (utils.handleError(err, callback)) {
        if (result !== true) {
          callback(new Error('Access denied'));
        } else {
          db.deleteItineraryTrackSegments(itineraryId, segments, function(err) {
            if (utils.handleError(err, callback)) {
              // Re-calculate track length etc.
              db.getItineraryTracks(itineraryId, [trackId], function(err, result) {
                if (utils.handleError(err, callback) && result.length > 0) {
                  utils.fillDistanceElevationForTrack(result[0], {calcSegments: true});
                  db.updateItineraryTrackDistanceElevation(itineraryId, trackId, result[0], callback);
                }
              });
            }
          });
        }
      }
    });
}

function deleteItineraryTrackSegmentPointsForUser(username, itineraryId, trackId, points, callback) {
    db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
      if (utils.handleError(err, callback)) {
        if (result !== true) {
          callback(new Error('Access denied'));
        } else {
          db.deleteItineraryTrackSegmentPoints(itineraryId, points, function(err) {
            if (utils.handleError(err, callback)) {
              // Re-calculate track length etc.
              db.getItineraryTracks(itineraryId, [trackId], function(err, result) {
                if (utils.handleError(err, callback) && result.length > 0) {
                  utils.fillDistanceElevationForTrack(result[0], {calcSegments: true});
                  db.updateItineraryTrackDistanceElevation(itineraryId, trackId, result[0], callback);
                }
              });
            }
          });
        }
      }
    });
}

function getItineraryRoutesForUser(username, itineraryId, routeIds, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryRoutes(itineraryId, routeIds, function(err, result) {
          callback(err, result);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getWaypoints(itineraryId, waypointIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (!waypointIds || waypointIds.length === 0) {
    callback(null, []);
  } else {
    db.getSpecifiedItineraryWaypoints(itineraryId, waypointIds, function(err, result) {
      callback(err, result);
    });
  }
}

function getRoutes(itineraryId, routeIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (!routeIds || routeIds.length === 0) {
    callback(null, []);
  } else {
    db.getItineraryRoutes(itineraryId, routeIds, function(err, result) {
      callback(err, result);
    });
  }
}

function getTracks(itineraryId, trackIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (!trackIds || trackIds.length === 0) {
    callback(null, []);
  } else {
    db.getItineraryTracks(itineraryId, trackIds, function(err, result) {
      callback(err, result);
    });
  }
}

function downloadItineraryGpx(username, itineraryId, params, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var rteptCount, rteptName, root, rte, rteext, rtept, trk, trkseg, trkpt, wpt, ext, trkext, wptext;
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
        getWaypoints(itineraryId, params.waypoints, function(err, waypoints) {
          if (utils.handleError(err, callback)) {
            getRoutes(itineraryId, params.routes, function(err, routes) {
              if (utils.handleError(err, callback)) {
                getTracks(itineraryId, params.tracks, function(err, tracks) {
                  root = builder.create('gpx', {version: '1.0', encoding: 'UTF-8'});
                  root.a('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
                    .a('creator', 'TRIP')
                    .a('version', '1.1')
                    .a('xmlns', 'http://www.topografix.com/GPX/1/1')
                    .a('xmlns:gpxx', 'http://www.garmin.com/xmlschemas/GpxExtensions/v3')
                    .a('xmlns:wptx1', 'http://www.garmin.com/xmlschemas/WaypointExtension/v1')
                    .a('xsi:schemaLocation',
                       'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/WaypointExtension/v1 http://www8.garmin.com/xmlschemas/WaypointExtensionv1.xsd');
                  root.e('metadata')
                    .e('time', null, (new Date()).toISOString());
                  if (waypoints !== undefined && Array.isArray(waypoints)) {
                    waypoints.forEach(function(v, i, a) {
                      wpt = root.e('wpt', {lon: v.lng, lat: v.lat});
                      if (v.altitude) wpt.e('ele', null, v.altitude);
                      if (v.time) wpt.e('time', null, v.time.toISOString());
                      if (v.name) {
                        wpt.e('name', v.name);
                      } else {
                        wpt.e('name', 'WPT: ' + v.id);
                      }
                      if (v.comment) wpt.e('cmt', v.comment);
                      if (v.description) wpt.e('desc', v.description);
                      if (v.symbol) wpt.e('sym', v.symbol);
                      if (v.type) wpt.e('type', v.type);
                      // 'color' element used by OsmAnd is not allowed in the XSDs, so optional config
                      if ((config.app.gpx && config.app.gpx.allowInvalidXsd && v.color) || v.samples) {
                        ext = wpt.e('extensions');
                        if (config.app.gpx && config.app.gpx.allowInvalidXsd && v.color) {
                          ext.e('color', v.color);
                        }
                        if (v.samples) {
                          wptext = ext.e('wptx1:WaypointExtension');
                          wptext.e('wptx1:Samples', v.samples);
                        }
                      }
                    });
                  }
                  if (routes !== undefined && Array.isArray(routes)) {
                    routes.forEach(function(r) {
                      rte = root.e('rte');
                      if (r.name) {
                        rte.e('name', r.name);
                      } else {
                        rte.e('name', 'RTE: ' + r.id);
                      }
                      if (r.color) {
                        ext = rte.e('extensions');
                        rteext = ext.e('gpxx:RouteExtension');
                        // IsAutoNamed is mandatory for a RouteExtension in XSD
                        rteext.e('gpxx:IsAutoNamed', 'false');
                        rteext.e('gpxx:DisplayColor', r.color);
                      }
                      if (r.points !== undefined && Array.isArray(r.points)) {
                        rteptCount = 0;
                        r.points.forEach(function(v) {
                          rtept = rte.e('rtept', {lon: v.lng, lat: v.lat});
                          if (v.altitude) rtept.e('ele', null, v.altitude);
                          if (v.name) {
                            rtept.e('name', v.name);
                          } else {
                            rteptName = '00' + (++rteptCount);
                            rtept.e('name', rteptName.slice(-3));
                          }
                          if (v.comment) rtept.e('cmt', v.comment);
                          if (v.description) rtept.e('desc', v.description);
                          if (v.symbol) rtept.e('sym', v.symbol);
                        });
                      }
                    });
                  }
                  if (tracks !== undefined && Array.isArray(tracks)) {
                    tracks.forEach(function(t) {
                      trk = root.e('trk');
                      if (t.name) {
                        trk.e('name', t.name);
                      } else {
                        trk.e('name', 'TRK: ' + t.id);
                      }
                      if (t.color) {
                        ext = trk.e('extensions');
                        trkext = ext.e('gpxx:TrackExtension');
                        trkext.e('gpxx:DisplayColor', t.color);
                      }
                      if (t.segments && Array.isArray(t.segments)) {
                        t.segments.forEach(function(ts) {
                          trkseg = trk.e('trkseg');
                          if (ts.points !== undefined && Array.isArray(ts.points)) {
                            ts.points.forEach(function(v) {
                              trkpt = trkseg.e('trkpt', {lon: v.lng, lat: v.lat});
                              if (v.altitude) trkpt.e('ele', null, v.altitude);
                              if (v.time) trkpt.e('time', null, v.time.toISOString());
                              if (v.hdop) trkpt.e('hdop', null, v.hdop);
                            });
                          } else {
                            logger.error('Track segment points array is missing');
                          }
                        }); // forEach trackSegment
                      } else {
                        logger.error('Track segments array is missing');
                      }
                    }); // forEach track
                  }
                  callback(null, root.end({pretty: false}));
                });
              }
            });
          }
        });
      }
    }
  });
}

function writeKmlStyles(doc, routes, waypoints, tracks) {
  var trackPngUrl = 'http://earth.google.com/images/kml-icons/track-directional/track-none.png',
      waypointPngUrl = 'http://maps.google.com/mapfiles/kml/pal4/icon61.png';
  if (Array.isArray(routes) && routes.length > 0) {
    doc.com('Normal route style')
      .e('Style', {'id': 'route_n'})
      .e('IconStyle').ele('Icon')
      .e('href', null, trackPngUrl);
    doc.com('Highlighted route style')
      .e('Style', {'id': 'route_h'})
      .e('IconStyle')
      .e('scale', null, 1.2)
      .insertAfter('Icon')
      .e('href', null, trackPngUrl);
    doc.e('StyleMap', {'id': 'route'})
      .e('Pair')
      .e('key', null, 'normal')
      .insertAfter('styleUrl', null, '#route_n')
      .up().up()
      .e('Pair')
      .e('key', null, 'highlight')
      .insertAfter('styleUrl', null, '#route_h');
  }
  if (Array.isArray(tracks) && tracks.length > 0) {
    doc.com('Normal track style')
      .e('Style', {'id':'track_n'})
      .e('IconStyle')
      .e('scale', null, '.5')
      .insertAfter('Icon')
      .e('href', null, trackPngUrl)
      .up().up()
      .insertAfter('LabelStyle')
      .e('scale', null, 0);
    doc.com('Highlighted track style')
      .e('Style', {'id':'track_h'})
      .e('IconStyle')
      .e('scale', null, 1.2)
      .insertAfter('Icon')
      .e('href', null, trackPngUrl);
    doc.e('StyleMap', {'id': 'track'})
      .e('Pair')
      .e('key', null, 'normal')
      .insertAfter('styleUrl', null, '#track_n')
      .up().up()
      .e('Pair')
      .e('key', null, 'highlight')
      .insertAfter('styleUrl', null, '#track_h');
  }

  doc.com('Normal waypoint style')
    .e('Style', {'id':'waypoint_n'})
    .e('IconStyle')
    .e('Icon')
    .e('href', null, waypointPngUrl);
  doc.com('Highlighted waypoint style')
    .e('Style', {'id':'waypoint_h'})
    .e('IconStyle')
    .e('scale', null, 1.2)
    .insertAfter('Icon')
    .e('href', null, waypointPngUrl);
  doc.e('StyleMap', {'id': 'waypoint'})
    .e('Pair')
    .e('key', null, 'normal')
    .insertAfter('styleUrl', null, '#waypoint_n')
    .up().up()
    .e('Pair')
    .e('key', null, 'highlight')
    .insertAfter('styleUrl', null, '#waypoint_h');
}

function pointToCoordinateString(p) {
  return p.lng.toFixed(6) + ',' +
    p.lat.toFixed(6) +
    (p.altitude ? ',' + Number(p.altitude).toFixed(2) : '');
}

function speedText(kmh) {
  var speed, units;
  if (kmh >= 1) {
    speed = kmh;
    units = 'km/hour';
  } else if (kmh) {
    speed = kmh * 1000;
    units = 'meters/hour';
  } else {
    speed = null;
    units = null;
  }
  return speed ? (speed.toFixed(1) + ' ' + units) : '';
}

function distanceText(km) {
  var dist, units;
  if (km >= 1) {
    dist = km;
    units = 'km';
  } else if (km) {
    dist = km * 1000;
    units = 'meters';
  } else {
    dist = null;
    units = null;
  }
  return dist ? (dist.toFixed(1) + ' ' + units) : '';
}

function writeKmlWaypointsFolder(doc, waypoints) {
  var folder, placemark, count;
  if (waypoints && Array.isArray(waypoints) && waypoints.length > 0) {
    folder = doc.e('Folder');
    folder.e('name', null, 'Waypoints');
    count = 0;
    waypoints.forEach(function(wpt) {
      placemark = folder.e('Placemark');
      placemark.e('name', wpt.name ? wpt.name : 'WPT: ' + wpt.id);
      if (wpt.comment && wpt.comment.length > 0) {
        placemark.e('description', null, wpt.comment);
      }
      if (wpt.time) {
        placemark.e('TimeStamp').e('when', null, wpt.time.toISOString());
      }
      placemark.e('styleUrl', null, '#waypoint')
        .insertAfter('Point')
        .e('coordinates', null, pointToCoordinateString(wpt));
    });
  }
}

function writeKmlRoutesFolder(doc, routes) {
  var folder, folder2, folder3, placemark, coords, styleStr, lstr, count;
  if (Array.isArray(routes) && routes.length > 0) {
    folder = doc.e('Folder');
    folder.e('name', null, 'Routes');
    routes.forEach(function(r) {
      folder2 = folder.e('Folder');
      // logger.debug('Route: %s', JSON.stringify(r, ['id', 'name', 'distance', 'ascent', 'descent', 'lowest', 'highest', 'bounds'], 4));
      folder2.e('name', null, (r.name ? r.name : 'RTE: ' + r.id));
      folder3 = folder2.e('Folder');
      folder3.e('name', null, 'Points');
      count = 0;
      r.points.forEach(function(p) {
        folder3.e('Placemark')
          .e('name', null, ('00' + (++count)).slice(-3))
          .insertAfter('snippet')
          .insertAfter('description')
          .dat('\n<table>' + '\n' +
               '<tr><td>Longitude: ' + p.lng.toFixed(6) + ' </td></tr>\n' +
               '<tr><td>Latitude: ' + p.lat.toFixed(6) + ' </td></tr>\n' +
               (p.altitude ? '<tr><td>Altitude: ' + Number(p.altitude).toFixed(3) + ' meters </td></tr>\n' : '') +
               // '<tr><td>Heading: ' + (p.bearing ? Number(p.bearing).toFixed(1) : '359.5') + ' </td></tr>\n' +
               '</table>\n')
          .insertAfter('LookAt')
          .e('longitude', null, p.lng.toFixed(6))
          .insertAfter('latitude', null, p.lat.toFixed(6))
          .insertAfter('tilt', null, 66)
          .up().insertAfter('styleUrl', null, '#route')
          .insertAfter('Point')
          .e('coordinates', null, pointToCoordinateString(p));
        }); // forEach point

      // LineString/coordinates section
      placemark = folder2.e('Placemark')
        .e('name', null, 'Path')
        .insertAfter('styleUrl', null, '#lineStyle');
      styleStr = placemark.insertAfter('Style');
      styleStr.e('LineStyle')
        .e('color', null, 'ff0000ff');
        lstr = styleStr.insertAfter('LineString')
          .e('tessellate', null, '1');
        coords = '\n';
        r.points.forEach(function(p) {
          coords += pointToCoordinateString(p) + '\n';
        }); // forEach point
        lstr.insertAfter('coordinates', null, coords);

    }); // foreach route

  }
}

function writeKmlTracksFolder(doc, tracks) {
  var speed, speedUnits, folder, folder2, folder3, placemark, coords, mgstr, lstr, count;
  if (tracks && Array.isArray(tracks) && tracks.length > 0) {
    folder = doc.e('Folder');
    folder.e('name', null, 'Tracks');
    tracks.forEach(function(t) {
      folder2 = folder.e('Folder');
      // logger.debug('Track: %s', JSON.stringify(t, ['id', 'name', 'distance', 'ascent', 'descent', 'lowest', 'highest', 'startTime', 'endTime', 'minSpeed', 'maxSpeed', 'avgSpeed', 'bounds'], 4));
      folder2.e('name', null, (t.name ? t.name : 'TRK: ' + t.id))
        .insertAfter('snippet')
        .insertAfter('description')
        .dat('<table>\n' +
             '<tr><td><b>Distance</b> ' + distanceText(t.distance) + ' </td></tr>\n' +
             (t.lowest ? ('<tr><td><b>Min Alt</b> ' +  t.lowest.toFixed(3) + ' meters </td></tr>\n') : '') +
             (t.highest ? ('<tr><td><b>Max Alt</b> ' + t.highest.toFixed(3) + ' meters </td></tr>\n') : '') +
             (t.maxSpeed  ? ('<tr><td><b>Max Speed</b> ' + speedText(t.maxSpeed) + ' </td></tr>\n') : '') +
             (t.avgSpeed ? ('<tr><td><b>Avg Speed</b> ' + speedText(t.avgSpeed) + ' </td></tr>\n') : '') +
             (t.startTime ? ('<tr><td><b>Start Time</b> ' + t.startTime.toISOString() + '</td></tr>\n') : '') +
             (t.endTime ? ('<tr><td><b>End Time</b> ' + t.endTime.toISOString() + '</td></tr>\n') : '') +
             '</table>');
      if (t.startTime && t.endTime) {
        folder2.e('TimeSpan')
          .e('begin', null, t.startTime.toISOString())
          .insertAfter('end', null, t.endTime.toISOString());
      }
      folder3 = folder2.e('Folder');
      folder3.e('name', null, 'Points');
      count = 0;
      t.segments.forEach(function(seg) {
        seg.points.forEach(function(p) {
          placemark = folder3.e('Placemark');
          placemark.e('name', null, t.name + '-' + count++)
            .insertAfter('snippet')
            .insertAfter('description')
            .dat('\n<table>' + '\n' +
                 '<tr><td>Longitude: ' + p.lng.toFixed(6) + ' </td></tr>\n' +
                 '<tr><td>Latitude: ' + p.lat.toFixed(6) + ' </td></tr>\n' +
                 '<tr><td>Altitude: ' + Number(p.altitude).toFixed(3) + ' meters </td></tr>\n' +
                 (p.speed ? ('<tr><td>Speed: ' + speedText(p.speed) + ' </td></tr>\n') : '') +
                 '<tr><td>Heading: ' + (p.bearing ? Number(p.bearing).toFixed(1) : '359.5') + ' </td></tr>\n' +
                 (p.time ? ('<tr><td>Time: ' + p.time.toISOString() + ' </td></tr>\n') : '') +
                 '</table>\n')
            .insertAfter('LookAt')
            .e('longitude', null, p.lng.toFixed(6))
            .insertAfter('latitude', null, p.lat.toFixed(6))
            .insertAfter('tilt', null, 66);
          if (p.time) {
            placemark.e('TimeStamp')
              .e('when', null, p.time.toISOString());
          }
          placemark.e('styleUrl', null, '#track');
          placemark.e('Point')
            .e('coordinates', null, pointToCoordinateString(p));
        }); // forEach segment point
      }); // foreach segment

      // LineString/coordinates section
      mgstr = folder2.e('Placemark')
        .e('name', null, 'Path')
        .insertAfter('styleUrl', null, '#lineStyle')
        .insertAfter('Style')
        .e('LineStyle')
        .e('color', null, 'ff0000ff')
        .up().up().insertAfter('MultiGeometry');

      t.segments.forEach(function(seg) {
        lstr = mgstr.e('LineString')
          .e('tessellate', null, '1');
        coords = '\n';
        seg.points.forEach(function(p) {
          coords += pointToCoordinateString(p) + '\n';
        }); // forEach point
        lstr.insertAfter('coordinates', null, coords);
      }); // forEach segment

    }); // foreach track

  }
}

function downloadItineraryKml(username, itineraryId, params, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var root, doc, tmpFolder, tmpFolder2, tmpFolder3, lookAt,
      bounds, boundsQuery, center, timeSpan, range;
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
        getWaypoints(itineraryId, params.waypoints, function(err, waypoints) {
          if (utils.handleError(err, callback)) {
            getRoutes(itineraryId, params.routes, function(err, routes) {
              if (utils.handleError(err, callback)) {
                getTracks(itineraryId, params.tracks, function(err, tracks) {
                  utils.fillDistanceElevationForRoutes(routes, {calcPoints: true});
                  utils.fillDistanceElevationForTracks(tracks, {calcPoints: true});
                  timeSpan = utils.getTimeSpanForWaypoints(waypoints);
                  boundsQuery = [];
                  // NOTE: bounds has lng/lat order, not lat/lng
                  bounds = utils.getWaypointBounds(waypoints);
                  if (bounds) {
                    boundsQuery.push(bounds);
                  }
                  if (routes.bounds) {
                    boundsQuery.push(routes.bounds);
                  }
                  if (tracks.bounds) {
                    boundsQuery.push(tracks.bounds);
                  }
                  if (boundsQuery.length > 0) {
                    bounds = utils.getBounds(boundsQuery);
                    center = utils.getCenter(bounds);
                    timeSpan = utils.getTimeSpan([timeSpan, routes, tracks]);
                    // length of the diagonal of the bounding box in kms
                    range = utils.getRange(bounds);
                    if (range < 1) {
                      range = 1;
                    }
                  }
                  root = builder.create('kml', {version: '1.0', encoding: 'UTF-8'});
                  root.a('xmlns', 'http://www.opengis.net/kml/2.2')
                    .a('xmlns:gx', 'http://www.google.com/kml/ext/2.2');
                  doc = root.e('Document');
                  doc.e('name', null, 'GPS device');
                  doc.e('snippet', null, 'Created ' + formatKmlSnippetDate(new Date()));

                  lookAt = doc.e('LookAt');
                  if (timeSpan.startTime) {
                      lookAt.e('gx:TimeSpan')
                      .e('begin', null, timeSpan.startTime.toISOString())
                      .insertAfter('end', null, timeSpan.endTime.toISOString());
                  }

                  if (Array.isArray(center)) {
                    lookAt.e('longitude', center[0].toFixed(6))
                      .insertAfter('latitude', center[1].toFixed(6))
                      .insertAfter('range', (range * 1300).toFixed(6));
                  } else {
                    lookAt.e('longitude', Number(0).toFixed(6))
                      .insertAfter('latitude', Number(0).toFixed(6))
                      .insertAfter('range', Number(26000000).toFixed(6));
                  }

                  writeKmlStyles(doc, routes, waypoints, tracks);

                  if (Array.isArray(routes) && routes.length > 0) {
                    doc.e('Style', {'id':'lineStyle'})
                      .e('LineStyle')
                      .e('color', null, '99ffac59')
                      .insertAfter('width', null, 6);
                  }

                  writeKmlWaypointsFolder(doc, waypoints);
                  writeKmlTracksFolder(doc, tracks);
                  writeKmlRoutesFolder(doc, routes);

                  callback(null, root.end({pretty: true}));
                });
              }
            });
          }
        });
      }
    }
  });
}

function deleteItineraryRoute(username, itineraryId, routeId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.deleteItineraryRoute(itineraryId, routeId, callback);
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function deleteItineraryWaypoints(itineraryId, waypointIds, callback) {
  if (!waypointIds || waypointIds.length === 0) {
    callback(null);
  } else {
    db.deleteItineraryWaypoints(itineraryId, waypointIds, callback);
  }
}

function deleteItineraryRoutes(itineraryId, routeIds, callback) {
  if (!routeIds || routeIds.length === 0) {
    callback(null);
  } else {
      db.deleteItineraryRoutes(itineraryId, routeIds, callback);
  }
}

function deleteItineraryTracks(itineraryId, trackIds, callback) {
  if (!trackIds || trackIds.length === 0) {
    callback(null);
  } else {
      db.deleteItineraryTracks(itineraryId, trackIds, callback);
  }
}

function deleteItineraryUploads(username, itineraryId, params, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        deleteItineraryWaypoints(itineraryId, params.waypoints, function(err) {
          deleteItineraryRoutes(itineraryId, params.routes, function(err) {
            deleteItineraryTracks(itineraryId, params.tracks, callback);
          });
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getWaypointSymbols(callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getWaypointSymbols(function(err, result) {
    callback(err, result);
  });
}

function getGeoreferenceFormats(callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getGeoreferenceFormats(function(err, result) {
    callback(err, result);
  });
}
