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
var validator = require('validator');
var winston = require('winston');

var db = require('./db');
var utils = require('./utils');

var validNickname = /^[!-\.0->@-~]+$/;

module.exports = {
  deleteItinerary: deleteItinerary,
  getItinerary: getItinerary,
  getItineraries: getItineraries,
  saveItinerary: saveItinerary,
  getItineraryShares: getItineraryShares,
  getSharedItinerariesForUser: getSharedItinerariesForUser,
  shareItinerary: shareItinerary,
  downloadItineraryGpx: downloadItineraryGpx,
  updateItinerarySharesActiveStates: updateItinerarySharesActiveStates,
  deleteItinerarySharesForShareList: deleteItinerarySharesForShareList,
  getItineraryWaypointCount: getItineraryWaypointCount,
  saveItineraryRoute: saveItineraryRoute,
  replaceItineraryRoutePoints: replaceItineraryRoutePoints,
  getItineraryRouteNames: getItineraryRouteNames,
  getItineraryRouteName: getItineraryRouteName,
  updateItineraryRouteName: updateItineraryRouteName,
  deleteItineraryRoute: deleteItineraryRoute,
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
  getItineraryRoutesForUser: getItineraryRoutesForUser,
  deleteItineraryUploads: deleteItineraryUploads,
  getWaypointSymbols: getWaypointSymbols,
  getGeoreferenceFormats: getGeoreferenceFormats
};

function getItinerary(username, id, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getItinerary(username, id, callback);
}

function saveItinerary(username, itinerary, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (!itinerary.title || validator.isEmpty(itinerary.title)) {
    callback(new Error('Invalid title'));
    return;
  }
  if (itinerary.date && !validator.isISO8601('' + itinerary.start)) {
    callback(new Error('Invalid start date'));
    return;
  }
  if (itinerary.date && !validator.isISO8601('' + itinerary.finish)) {
    callback(new Error('Invalid finish date'));
    return;
  }
  itinerary.description = itinerary.description !== undefined &&
    !validator.isEmpty('' + itinerary.description) ? itinerary.description : null;
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
                  // winston.debug('Not updating itinerary share as no change');
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
  return share.nickname !== undefined && validNickname.test(share.nickname) &&
    (share.active === undefined || validator.isBoolean('' + share.active));
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
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        if (!routeId) {
          utils.fillDistanceElevationForPath(route);
          // winston.debug('itineries.js saving route: %j', route);
          db.createItineraryRoute(itineraryId, route, function(err, result) {
            if (utils.handleError(err, callback)) {
              callback(err, result);
            }
          });
        } else {
          winston.error('Update itinerary route not yet implemented');
          callback(new Error('Update itinerary route not yet implemented'));
        }
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function replaceItineraryRoutePoints(username, itineraryId, routeId, points, callback) {
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        var route =  {points: points};
        utils.fillDistanceElevationForPath(route);
        db.updateItineraryDistanceElevationData(itineraryId, routeId, route, function(err) {
          db.updateItineraryRoutePoints(routeId, points, callback);
        });
      } else {
        callback(new Error('Access denied'));
      }
    }
  });
}

function getItineraryRouteNames(username, itineraryId, callback) {
  db.confirmItinerarySharedAccess(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.getItineraryRouteNames(itineraryId, function(err, result) {
          callback(err, result);
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

function updateItineraryRouteName(username, itineraryId, routeId, name, callback) {
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result) {
        db.updateItineraryRouteName(itineraryId, routeId, name, function(err, result) {
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
  callback = typeof callback === 'function' ? callback : function() {};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
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
      }
    }
  });
}

function moveItineraryWaypoint(username, itineraryId, waypointId, position, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.confirmItineraryOwnership(username, itineraryId, function(err, result) {
    if (utils.handleError(err, callback)) {
      if (result !== true) {
        callback(new Error('Access denied'));
      } else {
        db.moveItineraryWaypoint(itineraryId, waypointId, position, callback);
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
  var root, rte, rtept, trk, trkseg, trkpt, wpt, ext, trkext, wptext;
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
                      if (v.time) wpt.e('time', null, v.time.toISOString());
                      if (v.altitude) wpt.e('ele', null, v.altitude);
                      if (v.name) {
                        wpt.e('name', v.name);
                      } else {
                        wpt.e('name', 'WPT: ' + v.id);
                      }
                      if (v.comment) wpt.e('cmt', v.comment);
                      if (v.description) wpt.e('desc', v.description);
                      if (v.symbol) wpt.e('sym', v.symbol);
                      if (v.type) wpt.e('type', v.type);
                      if (v.color || v.samples) {
                        ext = wpt.e('extensions');
                        if (v.color) {
                          ext.e('color', v.color);
                        }
                        if (v.samples) {
                          wptext = ext.e('wptx1:WaypointExtension');
                          wptext.e('wptx1:Samples', v.samples);
                        }
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
                              if (v.time) trkpt.e('time', null, v.time.toISOString());
                              if (v.altitude) trkpt.e('ele', null, v.altitude);
                              if (v.hdop) trkpt.e('hdop', null, v.hdop);
                            });
                          } else {
                            winston.error('Track segment points array is missing');
                          }
                        }); // forEach trackSegment
                      } else {
                        winston.error('Track segments array is missing');
                      }
                    }); // forEach track
                  }
                  if (routes !== undefined && Array.isArray(routes)) {
                    routes.forEach(function(r) {
                      rte = root.e('rte');
                      if (r.name) {
                        rte.e('name', r.name);
                      } else {
                        rte.e('name', 'RTE: ' + r.id);
                      }
                      if (r.points !== undefined && Array.isArray(r.points)) {
                        r.points.forEach(function(v) {
                          rtept = rte.e('rtept', {lon: v.lng, lat: v.lat});
                          if (v.altitude) rtept.e('ele', null, v.altitude);
                          if (v.name) rtept.e('name', v.name);
                          if (v.comment) rtept.e('cmt', v.comment);
                          if (v.description) rtept.e('desc', v.description);
                          if (v.symbol) rtept.e('sym', v.symbol);
                        });
                      }
                    });
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
