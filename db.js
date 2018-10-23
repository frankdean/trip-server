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

var pg = require('pg');
var types = require('pg').types;
var NUMERIC_OID = 1700;

var winston = require('winston');

var config = require('./config.json');

// Delay after finishing queries with many insert statements before calling
// done() to release the connection to the pool.
var myDoneDelay = (config.db && config.db.doneDelayMs) || 1000;

// See node-postgres documentation
pg.defaults.poolSize = (config.db && config.db.poolSize) || 25;
pg.defaults.poolIdleTimeout = (config.db && config.db.poolIdleTimeout) || 30000;
// Seems current node-postgres ignores the reapIntervalMillis - always 1000
pg.defaults.reapIntervalMillis = (config.db && config.db.reapIntervalMillis) || 1000;

winston.info('pg.defaults.poolSize: %d', pg.defaults.poolSize);
winston.info('pg.defaults.poolIdleTimeout: %d', pg.defaults.poolIdleTimeout);
winston.info('pg.defaults.reapIntervalMillis: %d', pg.defaults.reapIntervalMillis);

module.exports = {
  createLocationShare: createLocationShare,
  updateUser: updateUser,
  createUser: createUser,
  deleteUser: deleteUser,
  deleteItinerary: deleteItinerary,
  deleteLocationShares: deleteLocationShares,
  deleteTile: deleteTile,
  fetchTile: fetchTile,
  findUserByNickname: findUserByNickname,
  findUserByUsername: findUserByUsername,
  findUserByUuid: findUserByUuid,
  getNicknameForUsername: getNicknameForUsername,
  getLocationCount: getLocationCount,
  getLocationShareCountByUsername: getLocationShareCountByUsername,
  getLocationShareDetails: getLocationShareDetails,
  getLocationShareExistsByUsername: getLocationShareExistsByUsername,
  getLocationSharesByUsername: getLocationSharesByUsername,
  getSharedItinerariesNicknamesForUser: getSharedItinerariesNicknamesForUser,
  getLocationSharingId: getLocationSharingId,
  getLocations: getLocations,
  getMostRecentLocationTime: getMostRecentLocationTime,
  getNicknames: getNicknames,
  getPathColors: getPathColors,
  getWaypointSymbols: getWaypointSymbols,
  getGeoreferenceFormats: getGeoreferenceFormats,
  getPassword: getPassword,
  getTrackingInfo: getTrackingInfo,
  getUserCount: getUserCount,
  getUser: getUser,
  getUsers: getUsers,
  getUserIdByUsername: getUserIdByUsername,
  hasRole: hasRole,
  addRole: addRole,
  removeRole: removeRole,
  logPoint: logPoint,
  resetPassword: resetPassword,
  saveTile: saveTile,
  incrementTileCounter: incrementTileCounter,
  saveTileCount: saveTileCount,
  tileExists: tileExists,
  updateLocationShare: updateLocationShare,
  updateLocationShareActiveStates: updateLocationShareActiveStates,
  getItinerary: getItinerary,
  getItinerariesCountByUsername: getItinerariesCountByUsername,
  getItinerariesByUsername: getItinerariesByUsername,
  updateItinerary: updateItinerary,
  createItinerary: createItinerary,
  confirmItineraryOwnership: confirmItineraryOwnership,
  confirmItinerarySharedAccess: confirmItinerarySharedAccess,
  getItinerarySharesCountByUsername: getItinerarySharesCountByUsername,
  getItinerarySharesByUsername: getItinerarySharesByUsername,
  getItineraryShare: getItineraryShare,
  getCountSharedItinerariesForUser: getCountSharedItinerariesForUser,
  getSharedItinerariesForUser: getSharedItinerariesForUser,
  createItineraryShare: createItineraryShare,
  updateItineraryShare: updateItineraryShare,
  updateItineraryShareActiveStates: updateItineraryShareActiveStates,
  deleteItineraryShares: deleteItineraryShares,
  updateItineraryWaypoint: updateItineraryWaypoint,
  moveItineraryWaypoint: moveItineraryWaypoint,
  createItineraryWaypoint: createItineraryWaypoint,
  getItineraryWaypointCount: getItineraryWaypointCount,
  getItineraryWaypoint: getItineraryWaypoint,
  getItineraryWaypoints: getItineraryWaypoints,
  getSpecifiedItineraryWaypoints: getSpecifiedItineraryWaypoints,
  getItineraryRoutes: getItineraryRoutes,
  getItineraryRoutePointsCount: getItineraryRoutePointsCount,
  getItineraryRoutePoints: getItineraryRoutePoints,
  getItineraryTracks: getItineraryTracks,
  getItineraryTrackSegment: getItineraryTrackSegment,
  getItineraryTrackSegmentCount: getItineraryTrackSegmentCount,
  getItineraryTrackSegments: getItineraryTrackSegments,
  getItineraryTrackSegmentPointCount: getItineraryTrackSegmentPointCount,
  getItineraryTrackSegmentPoints: getItineraryTrackSegmentPoints,
  deleteItineraryTrackSegments: deleteItineraryTrackSegments,
  replaceItineraryTrackSegments: replaceItineraryTrackSegments,
  deleteItineraryTrackSegmentPoints: deleteItineraryTrackSegmentPoints,
  getItineraryRouteNames: getItineraryRouteNames,
  getItineraryRouteName: getItineraryRouteName,
  updateItineraryRouteName: updateItineraryRouteName,
  getItineraryTrackNames: getItineraryTrackNames,
  getItineraryTrackName: getItineraryTrackName,
  updateItineraryTrackName: updateItineraryTrackName,
  updateItineraryTrackDistanceElevation: updateItineraryTrackDistanceElevation,
  createItineraryWaypoints: createItineraryWaypoints,
  createItineraryRoute: createItineraryRoute,
  createItineraryRoutes: createItineraryRoutes,
  updateItineraryDistanceElevationData: updateItineraryDistanceElevationData,
  updateItineraryRoutePoints: updateItineraryRoutePoints,
  deleteItineraryRoutePoints: deleteItineraryRoutePoints,
  createItineraryTracks: createItineraryTracks,
  deleteItineraryWaypoint: deleteItineraryWaypoint,
  deleteItineraryWaypoints: deleteItineraryWaypoints,
  deleteItineraryRoute: deleteItineraryRoute,
  deleteItineraryRoutes: deleteItineraryRoutes,
  deleteItineraryTracks: deleteItineraryTracks,
  updateTile: updateTile,
  updateTrackingInfo: updateTrackingInfo,
  getTileCount: getTileCount,
  unitTests: {convertArrayToSqlArray: convertArrayToSqlArray}
};

function UserNotFoundError(message) {
  this.name = 'UserNotFoundError';
  this.message = message || 'User not found';
  this.stack = (new Error()).stack;
}
UserNotFoundError.prototype = Object.create(Error.prototype);
UserNotFoundError.prototype.constructor = UserNotFoundError;

function resetPassword(username, hash, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE usertable SET password=$2 WHERE email=$1',
                   [username, hash],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function createUserQueryClause(nickname, email, searchType) {
  var retval = {};
  retval.params = [];
  var clauses = 0;
  retval.from = 'FROM usertable u ';
  retval.where = '';
  if (nickname !== undefined) {
    retval.where += 'WHERE nickname ';
    clauses++;
    if (searchType !== 'partial') {
      retval.where += '= $' + clauses + ' ';
      retval.params.push(nickname);
    } else {
      retval.where += 'LIKE $' + clauses + ' ';
      retval.params.push('%' + nickname + '%');
    }
  }
  if (email !== undefined) {
    retval.where += (clauses ? 'AND' : 'WHERE') + ' email ';
    clauses++;
    if (searchType !== 'partial') {
      retval.where += '= $' + clauses + ' ';
      retval.params.push(email);
    } else {
      retval.where += 'LIKE $' + clauses + ' ';
      retval.params.push('%' + email + '%');
    }
  }
  return retval;
}

function getUserCount(nickname, email, searchType, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var criteria = createUserQueryClause(nickname, email, searchType);
      var sql = 'SELECT count(*) ' +
          criteria.from +
          criteria.where;
      client.query(sql,
                   criteria.params,
                   function(err, result) {
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows[0].count);
                     }
                   });
    }
  });
}

function getUser(id, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT u.id, firstname, lastname, email, nickname, r.name=\'Admin\' AND r.name IS NOT NULL AS admin FROM usertable u LEFT JOIN user_role ur ON ur.user_id=u.id LEFT JOIN role r on ur.role_id=r.id WHERE u.id=$1',
                   [id],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0]);
                       } else {
                         callback(new UserNotFoundError());
                       }
                     }
                   });
    }
  });
}

function getUsers(offset, limit, nickname, email, searchType, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var criteria = createUserQueryClause(nickname, email, searchType);
	  var sql = 'SELECT u.id, firstname, lastname, email, uuid, nickname, r.name=\'Admin\' AND r.name IS NOT NULL AS admin ' +
          criteria.from +
          'LEFT JOIN user_role ur ON ur.user_id=u.id LEFT JOIN role r on ur.role_id=r.id ' +
          criteria.where +
          (criteria.where === '' ? 'WHERE ' : 'AND ') +
          '(r.name IS NULL OR r.name=\'Admin\') ' +
          'ORDER BY nickname ';
      if (offset) {
        sql += 'OFFSET ' + offset;
      }
      if (limit) {
        sql += ' LIMIT ' + limit;
      }
      client.query(sql,
                   criteria.params,
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows);
                     }
                   });
    }
  });
}

function createUser(user, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('INSERT INTO usertable (email, password, firstname, lastname, uuid, nickname) VALUES($1, $2, $3, $4, $5, $6)',
                   [user.username, user.hash, user.firstname, user.lastname,
                    user.uuid, user.nickname],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function updateUser(user, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE usertable set email=$2, firstname=$3, lastname=$4, nickname=$5 WHERE id=$1',
                   [user.id,
                    user.username,
                    user.firstname,
                    user.lastname,
                    user.nickname],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function deleteUser(userId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM usertable WHERE id=$1',
                   [userId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function getPassword(username, password, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT password FROM usertable WHERE email = $1',
                   [username],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].password);
                       } else {
                         callback(new UserNotFoundError());
                       }
                     }
                   });
    }
  });
}

function findUserByUsername(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id FROM usertable WHERE email = $1',
                   [username],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].id);
                       } else {
                         callback(new UserNotFoundError());
                       }
                     }
                   });
    }
  });
}

function findUserByUuid(uuid, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id, nickname FROM usertable WHERE uuid = $1',
                   [uuid],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0]);
                       } else {
                         callback(new UserNotFoundError());
                       }
                     }
                   });
    }
  });
}

function findUserByNickname(nickname, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id FROM usertable WHERE nickname = $1',
                   [nickname],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].id);
                       } else {
                         callback(new UserNotFoundError());
                       }
                     }
                   });
    }
  });
}

function getNicknameForUsername(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT nickname FROM usertable WHERE email = $1',
                   [username],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].nickname);
                       } else {
                         callback(new UserNotFoundError());
                       }
                     }
                   });
    }
  });
}

function hasRole(username, role, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT count(*) FROM usertable u JOIN user_role ur ON u.id = ur.user_id JOIN role r ON ur.role_id=r.id WHERE u.email = $1 AND r.name = $2',
                   [username, role],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].count > 0);
                       } else {
                         callback(null, false);
                       }
                     }
                   });
    }
  });
}

function addRole(userId, role, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('INSERT INTO user_role (user_id, role_id) VALUES($1, (SELECT id FROM role WHERE name=$2))',
                   [userId, role],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function removeRole(userId, role, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM user_role WHERE user_id=$1 AND role_id=(SELECT id FROM role WHERE name=$2)',
                   [userId, role],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function getNicknames(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT u2.nickname FROM usertable u JOIN location_sharing ls ON u.id=ls.shared_to_id JOIN usertable u2 ON ls.shared_by_id=u2.id WHERE ls.active=true AND u.email=$1 ORDER BY u2.nickname',
                   [username],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows);
                     }
                   });
    }
  });
}

function getPathColors(callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT key, value FROM path_color ORDER BY value, key',
                   [],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows);
                     }
                   });
    }
  });
}

function getWaypointSymbols(callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT key, value FROM waypoint_symbol ORDER BY value, key',
                   [],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows);
                     }
                   });
    }
  });
}

function getGeoreferenceFormats(callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT key, value FROM georef_format ORDER BY ord',
                   [],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows);
                     }
                   });
    }
  });
}

function getLocationShareCountByUsername(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT count(*) FROM usertable u JOIN location_sharing ls ON u.id=ls.shared_by_id JOIN usertable u2 ON u2.id=ls.shared_to_id WHERE u.email=$1',
                   [username],
                   function(err, result) {
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows[0].count);
                     }
                   });
    }
  });
}

function getLocationSharesByUsername(username, offset, limit, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT u2.nickname, ls.recent_minutes, ls.max_minutes, ls.active FROM usertable u JOIN location_sharing ls ON u.id=ls.shared_by_id JOIN usertable u2 ON u2.id=ls.shared_to_id WHERE u.email=$1 ORDER BY u2.nickname OFFSET $2 LIMIT $3',
                   [username, offset, limit],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows);
                     }
                   });
    }
  });
}

function getTrackingInfo(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT uuid FROM usertable WHERE email = $1',
                   [username],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].uuid);
                       } else {
                         callback(new Error('Tracking info not found'));
                       }
                     }
                   });
    }
  });
}

function updateTrackingInfo(username, newUuid, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE usertable SET uuid=$2 WHERE email=$1',
                   [username, newUuid],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function getUserIdByUsername(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id FROM usertable WHERE email = $1',
                   [username],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].id);
                       } else {
                         callback(new UserNotFoundError());
                       }
                     }
                   });
    }
  });
}

function createLocationQueryClauses(userId, from, to, maxHdop, notesOnlyFlag) {
  var retval = {};
  retval.params = [userId, from, to];
  retval.from = 'FROM location WHERE user_id = $1 AND time >= $2 AND time <= $3';
  if (maxHdop !== undefined) {
    retval.from += ' AND hdop <= $4';
    retval.params.push(maxHdop);
  }
  if (notesOnlyFlag === true) {
    retval.from += ' AND note is not null';
  }
  return retval;
}

function getLocationCount(userId, from, to, maxHdop, notesOnlyFlag, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var criteria = createLocationQueryClauses(userId, from, to, maxHdop, notesOnlyFlag);
      var sql = 'SELECT COUNT(*) ' + criteria.from;
      client.query(sql,
                   criteria.params,
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].count);
                       } else {
                         callback(null, false);
                       }
                     }
                   });
    }
  });
}

function getLocations(userId, from, to, maxHdop, notesOnlyFlag, order, offset, limit, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var criteria = createLocationQueryClauses(userId, from, to, maxHdop, notesOnlyFlag);
      var sql = 'SELECT id, location[1] as lat, location[0] as lng, time, hdop, altitude, speed, bearing, sat, provider, battery, note ' +
            criteria.from + ' ORDER BY time ' + order + ', id ' + order;
      if (offset !== undefined) {
        sql += ' OFFSET ' + offset;
      }
      if (limit !== undefined) {
        sql += ' LIMIT ' + limit;
      }
      client.query(sql,
                   criteria.params,
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows);
                     }
                   });
    }
  });
}

/**
 * @param userId the id of the user the locations are shared to
 * @param nickname the nickname of the user sharing their location
 */
function getLocationSharingId(userId, nickname, callback) {
  // Validate the passed user has a valid share to the nicknamed user
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT ls.shared_by_id FROM usertable u JOIN location_sharing ls ON ls.shared_by_id=u.id WHERE ls.active=true AND ls.shared_to_id=$1 AND u.nickname=$2',
                   [userId, nickname],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else if (result.rowCount === 0) {
                       callback(new Error('Access denied'));
                     } else {
                       callback(err, result.rows[0].shared_by_id);
                     }
                   });
    }
  });
}

function getLocationShareDetails(nickname, sharedToId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT recent_minutes, max_minutes, active FROM location_sharing ls JOIN usertable u ON u.id=ls.shared_by_id WHERE u.nickname=$1 AND ls.shared_to_id=$2',
                   [nickname, sharedToId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0]);
                       } else {
                         callback(new Error('Location share not found'));
                       }
                     }
                   });
    }
  });
}

function getMostRecentLocationTime(userId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT max("time") AS "time" FROM location WHERE user_id=$1',
                   [userId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount === 0) {
                         callback(null, false);
                       } else {
                         callback(null, result.rows[0].time);
                       }
                     }
                   });
    }
  });
}

function getLocationShareExistsByUsername(username, nickname, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT count(*) FROM usertable u JOIN location_sharing ls ON u.id=ls.shared_by_id JOIN usertable u2 ON u2.id=ls.shared_to_id WHERE u.email=$1 and u2.nickname=$2',
                   [username, nickname],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].count > 0);
                       } else {
                         callback(null, false);
                       }
                     }
                   });
    }
  });
}

function createLocationShare(sharedById, sharedToId, recentMinutes, maximumMinutes, active, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('INSERT INTO location_sharing (shared_by_id, shared_to_id, recent_minutes, max_minutes, active) VALUES ($1, $2, $3, $4, $5)',
                   [sharedById, sharedToId, recentMinutes, maximumMinutes, active],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function updateLocationShare(sharedById, sharedToId, recentMinutes, maximumMinutes, active, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE location_sharing SET recent_minutes=$3, max_minutes=$4, active=$5 WHERE shared_by_id=$1 AND shared_to_id=$2',
                   [sharedById, sharedToId, recentMinutes, maximumMinutes, active],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function convertArrayToSqlArray(array) {
 var r, first;
  r = '{';
  first = true;
  array.forEach(function(v) {
    if (!first) {
      r += ',';
    } else {
      first = false;
    }
    switch (typeof v) {
    case 'boolean' :
      r += (v ? '\'t\'' : '\'f\'');
      break;
    case 'string' :
      r += '"' + v + '"';
      break;
    default:
      r += v;
      break;
    }
  });
  r += '}';
  return r;
}

function updateLocationShareActiveStates(username, shares, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var counter = shares.length;
  if (counter === 0) {
    callback(null);
    return;
  }
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      shares.forEach(function(v) {
        client.query({name: 'upd-loc-state',
                      text: 'UPDATE location_sharing ls SET active=$3 WHERE EXISTS (SELECT 1 FROM (SELECT ls2.shared_by_id, ls2.shared_to_id FROM location_sharing ls2 JOIN usertable u ON ls2.shared_by_id=u.id JOIN usertable u2 ON ls2.shared_to_id=u2.id WHERE u.email=$1 AND u2.nickname=$2) as q WHERE ls.shared_by_id=q.shared_by_id AND ls.shared_to_id=q.shared_to_id)',
                      values: [username, v.nickname, v.active]});
        if (--counter === 0) {
          done();
          callback(null);
        }
      });
    }
  });
}

function deleteLocationShares(username, nicknames, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM location_sharing ls WHERE EXISTS (SELECT 1 FROM (SELECT ls2.shared_by_id, ls2.shared_to_id FROM location_sharing ls2 JOIN usertable u ON ls2.shared_by_id=u.id JOIN usertable u2 ON ls2.shared_to_id=u2.id WHERE u.email=$1 AND u2.nickname=ANY($2::text[])) AS q WHERE ls.shared_by_id=q.shared_by_id AND ls.shared_to_id=q.shared_to_id)',
                   [username, convertArrayToSqlArray(nicknames)],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function getItinerariesCountByUsername(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT sum(count) FROM (SELECT count(*) FROM itinerary i JOIN usertable u ON i.user_id=u.id WHERE i.archived != true AND u.email=$1 UNION SELECT count(*) FROM itinerary i2 JOIN usertable u3 ON u3.id=i2.user_id JOIN itinerary_sharing s ON i2.id=s.itinerary_id JOIN usertable u2 ON u2.id=s.shared_to_id WHERE i2.archived != true AND s.active=true AND u2.email=$1) as q',
                   [username],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (result.rowCount > 0) {
                       callback(err, result.rows[0].sum);
                     } else {
                       callback(null, false);
                     }
                   });
    }
  });
}

function getItinerary(username, id, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT i.id, i.start, i.finish, i.title, i.description, u.nickname AS owned_by_nickname, null AS shared_to_nickname FROM itinerary i JOIN usertable u ON i.user_id=u.id WHERE i.id=$2 AND u.email=$1 UNION SELECT i2.id, i2.start, i2.finish, i2.title, i2.description, ownr.nickname AS owned_by_nickname, u2.nickname AS shared_to_nickname FROM itinerary i2 JOIN itinerary_sharing s ON i2.id=s.itinerary_id JOIN usertable u2 ON s.shared_to_id=u2.id JOIN usertable ownr ON ownr.id=i2.user_id WHERE i2.id=$2 AND s.active=true AND u2.email=$1 ORDER BY shared_to_nickname DESC',
                   [username, id],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                       return;
                     }
                     if (result.rowCount > 0) {
                       callback(err, result.rows[0]);
                     } else {
                       callback(new Error('Itinerary not found'));
                     }
                   });
    }
  });
}

function deleteItinerary(username, id, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary i WHERE i.id=$2 AND EXISTS (SELECT 1 FROM (SELECT i2.id FROM itinerary i2 JOIN usertable u ON i2.user_id=u.id WHERE i2.id=$2 AND u.email=$1) AS q)',
                   [username, id],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                       return;
                     }
                     if (result.rowCount > 0) {
                       callback(err, result.rows[0]);
                     } else {
                       callback(new Error('Itinerary not found'));
                     }
                   });
    }
  });
}

function getItinerariesByUsername(username, offset, limit, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT i.id, i.start, i.finish, i.title, null AS nickname, (SELECT true FROM (SELECT DISTINCT itinerary_id FROM itinerary_sharing xx WHERE xx.itinerary_id=i.id AND active=true) as q) AS shared FROM itinerary i JOIN usertable u ON i.user_id=u.id WHERE i.archived != true AND u.email=$1 UNION SELECT i2.id, i2.start, i2.finish, i2.title, u3.nickname, false AS shared FROM itinerary i2 JOIN usertable u3 ON u3.id=i2.user_id JOIN itinerary_sharing s ON i2.id=s.itinerary_id JOIN usertable u2 ON u2.id=s.shared_to_id WHERE i2.archived != true AND s.active=true AND u2.email=$1 ORDER BY start DESC, finish DESC, title, id DESC OFFSET $2 LIMIT $3',
                   [username, offset, limit],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err, result.rows);
                   });
    }
  });
}

function updateItinerary(userId, itinerary, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE itinerary SET start=$2, finish=$3, title=$4, description=$5 WHERE id=$1 AND user_id=$6',
                   [itinerary.id,
                    itinerary.start,
                    itinerary.finish,
                    itinerary.title,
                    itinerary.description,
                    userId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(err, result.rowCount === 1);
                     }
                   });
    }
  });
}

function createItinerary(userId, itinerary, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('INSERT INTO itinerary (start, finish, title, description, user_id) VALUES($1, $2, $3, $4, $5) RETURNING id',
                   [itinerary.start, itinerary.finish, itinerary.title, itinerary.description, userId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows[0]);
                       } else {
                         callback(new Error('Insert itinerary failed - reason unknown'));
                       }
                     }
                   });
    }
  });
}

function confirmItineraryOwnership(username, itineraryId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT COUNT(*) FROM itinerary i JOIN usertable u ON u.id = i.user_id WHERE u.email = $1 AND i.id=$2',
                   [username, itineraryId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows[0].count == 1);
                       } else {
                         callback(new Error('confirmItineraryOwnership() failed - reason unknown'));
                       }
                     }
                   });
    }
  });
}

function confirmItinerarySharedAccess(username, itineraryId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT COUNT(*) FROM (SELECT i.user_id FROM itinerary i JOIN usertable u ON u.id=i.user_id WHERE i.id=$2 AND u.email=$1 UNION SELECT s.shared_to_id FROM itinerary_sharing s JOIN usertable u ON u.id=s.shared_to_id WHERE s.active=true AND s.itinerary_id=$2 AND u.email=$1) as q',
                   [username, itineraryId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows[0].count > 0);
                       } else {
                         callback(new Error('confirmItinerarySharedAccess() failed - reason unknown'));
                       }
                     }
                   });
    }
  });
}


function getItinerarySharesCountByUsername(username, itineraryId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT count(*) FROM itinerary_sharing s JOIN itinerary i ON i.id=s.itinerary_id JOIN usertable u2 ON u2.id=i.user_id JOIN usertable u ON u.id=s.shared_to_id WHERE u2.email=$1 AND i.id=$2',
                   [username, itineraryId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount > 0) {
                         callback(null, result.rows[0].count);
                       } else {
                         winston.warn('Error fetching itinerary share count', result);
                         callback(new Error('Error fetching itinerary share count'));
                       }
                     }
                   });
    }
  });
}

function getItinerarySharesByUsername(username, itineraryId, offset, limit, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT u.nickname, s.active FROM itinerary_sharing s JOIN itinerary i ON i.id=s.itinerary_id JOIN usertable u2 ON u2.id=i.user_id JOIN usertable u ON u.id=s.shared_to_id WHERE u2.email=$1 AND i.id=$2 ORDER BY u.nickname OFFSET $3 LIMIT $4',
                   [username, itineraryId, offset, limit],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rows) {
                         callback(null, result.rows);
                       } else {
                         winston.warn('Error fetching itinerary shares', result);
                         callback(new Error('Error fetching itinerary shares'));
                       }
                     }
                   });
    }
  });
}

function getItineraryShare(itineraryId, nickname, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT s.itinerary_id, s.shared_to_id, s.active FROM itinerary_sharing s JOIN itinerary i ON i.id=s.itinerary_id JOIN usertable u ON s.shared_to_id=u.id WHERE i.id=$1 AND u.nickname=$2',
                   [itineraryId, nickname],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                       return;
                     }
                     if (result.rowCount) {
                       callback(err, result.rows[0]);
                     } else {
                       callback(null);
                     }
                   });
    }
  });
}

function getCountSharedItinerariesForUser(username, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var itineraries = [], id, it;
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT COUNT(*) FROM (SELECT distinct i.id FROM itinerary i JOIN usertable u ON i.user_id=u.id JOIN itinerary_sharing ish ON i.id=ish.itinerary_id WHERE u.email=$1 AND NOT i.archived AND ish.active) AS q',
                   [username],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount > 0) {
                         callback(null, result.rows[0].count);
                       } else {
                         winston.warn('Error fetching shared itineraries count', result);
                         callback(new Error('Error fetching shared itineraries count'));
                       }
                     }
                   });
    }
  });
}

function getSharedItinerariesForUser(username, offset, limit, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var itineraries = [], id, it;
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT distinct i.id, i.title, i.start FROM itinerary i JOIN usertable u ON i.user_id=u.id JOIN itinerary_sharing ish ON i.id=ish.itinerary_id WHERE u.email=$1 AND NOT i.archived AND ish.active ORDER BY i.start desc, i.id OFFSET $2 LIMIT $3',
                   [username, offset, limit],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows);
                       } else {
                         callback(err, []);
                       }
                     }
                   });
    }
  });
}

function getSharedItinerariesNicknamesForUser(username, itineraryIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT i.id, ush.nickname FROM itinerary i JOIN usertable u ON i.user_id=u.id JOIN itinerary_sharing ish ON i.id=ish.itinerary_id JOIN usertable ush ON ish.shared_to_id=ush.id WHERE i.id=ANY($1) AND ish.active ORDER BY i.start desc, i.id, ush.nickname',
                   [itineraryIds],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows);
                       } else {
                         callback(err, []);
                       }
                     }
                   });
    }
  });
}

function createItineraryShare(itineraryId, nickname, active, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('INSERT INTO itinerary_sharing (itinerary_id, shared_to_id, active) VALUES ($1, (SELECT id FROM usertable WHERE nickname=$2), $3)',
                   [itineraryId, nickname, active],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function updateItineraryShare(itineraryId, sharedToId, active, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE itinerary_sharing SET active=$3 WHERE itinerary_id=$1 AND shared_to_id=$2',
                   [itineraryId, sharedToId, active],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function updateItineraryShareActiveStates(itineraryId, shares, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var counter = shares.length;
  if (counter === 0) {
    callback(null);
    return;
  }
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      shares.forEach(function(v) {
        client.query({name: 'upd-itnshr-state',
                      text: 'UPDATE itinerary_sharing s SET active=$3 WHERE EXISTS (SELECT 1 FROM (SELECT is2.itinerary_id, is2.shared_to_id FROM itinerary_sharing is2 JOIN usertable u2 ON is2.shared_to_id=u2.id WHERE s.itinerary_id=$1 AND u2.nickname=$2) as q WHERE q.itinerary_id=$1 AND s.shared_to_id=q.shared_to_id)',
                      values: [itineraryId, v.nickname, v.active]});
        if (--counter === 0) {
          done();
          callback(null);
        }
      });
    }
  });
}

function deleteItineraryShares(itineraryId, nicknames, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_sharing s WHERE EXISTS (SELECT 1 FROM (SELECT is2.itinerary_id, is2.shared_to_id FROM itinerary_sharing is2 JOIN usertable u2 ON is2.shared_to_id=u2.id WHERE s.itinerary_id=$1 AND u2.nickname=ANY($2::text[])) AS q WHERE q.itinerary_id=$1 AND s.shared_to_id=q.shared_to_id)',
                   [itineraryId, convertArrayToSqlArray(nicknames)],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function updateItineraryWaypoint(itineraryId, waypointId, w, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE itinerary_waypoint SET name=$3, position=POINT($4, $5), altitude=$6, time=$7, symbol=$8, comment=$9, description=$10, avg_samples=$11, type=$12, color=$13 WHERE itinerary_id=$1 AND id=$2',
                   [
                     itineraryId,
                     waypointId,
                     w.name,
                     w.lng,
                     w.lat,
                     w.altitude,
                     w.time,
                     w.symbol,
                     w.comment,
                     w.description,
                     w.samples,
                     w.type,
                     w.color
                   ],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (!err && result.rowCount === 0) {
                       callback(new Error('Updated 0 records'));
                     } else {
                       callback(err);
                     }
                   });
    }
  });
}

function moveItineraryWaypoint(itineraryId, waypointId, w, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE itinerary_waypoint SET position=POINT($3, $4), altitude=$5 WHERE itinerary_id=$1 AND id=$2',
                   [
                     itineraryId,
                     waypointId,
                     w.lng,
                     w.lat,
                     w.ele
                   ],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (!err && result.rowCount === 0) {
                       callback(new Error('Updated 0 records'));
                     } else {
                       callback(err);
                     }
                   });
    }
  });
}

function deleteItineraryWaypoint(itineraryId, waypointId, w, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE itinerary_waypoint SET position=POINT($3, $4) WHERE itinerary_id=$1 AND id=$2',
                   [
                     itineraryId,
                     waypointId,
                     w.lng,
                     w.lat,
                   ],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (!err && result.rowCount === 0) {
                       callback(new Error('Updated 0 records'));
                     } else {
                       callback(err);
                     }
                   });
    }
  });
}

function createItineraryWaypoint(itineraryId, w, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('INSERT INTO itinerary_waypoint (itinerary_id, name, position, altitude, time, symbol, comment, description, avg_samples, type, color) VALUES ($1, $2, POINT($3, $4), $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id',
                   [
                     itineraryId,
                     w.name,
                     w.lng,
                     w.lat,
                     w.altitude,
                     w.time,
                     w.symbol,
                     w.comment,
                     w.description,
                     w.samples,
                     w.type,
                     w.color
                   ],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows[0]);
                       } else {
                         callback(new Error('Insert itinerary waypoint failed - reason unknown'));
                       }
                     }
                   });
    }
  });
}

function getItineraryWaypointCount(itineraryId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT COUNT(*) FROM itinerary_waypoint WHERE itinerary_id=$1',
                   [itineraryId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows[0].count);
                       } else {
                         callback(new Error('getItineraryWaypointCount() failed - reason unknown'));
                       }
                     }
                   });
    }
  });
}

function getItineraryWaypoint(itineraryId, waypointId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      // Parse numeric as float see https://github.com/brianc/node-pg-types
      types.setTypeParser(NUMERIC_OID, function(val) {
        return parseFloat(val);
      });
      client.query('SELECT id, name, position[1] as lat, position[0] as lng, altitude, time, symbol, comment, description, color, type, avg_samples AS samples FROM itinerary_waypoint WHERE itinerary_id=$1 AND id=$2',
                   [itineraryId, waypointId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows[0]);
                       } else {
                         callback(null, null);
                       }
                     }
                   });
    }
  });
}

function getItineraryWaypoints(itineraryId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id, name, position[1] as lat, position[0] as lng, time, comment, symbol, altitude, type FROM itinerary_waypoint WHERE itinerary_id=$1 ORDER BY name, symbol, id',
                   [itineraryId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows);
                       } else {
                         callback(null, []);
                       }
                     }
                   });
    }
  });
}

function getSpecifiedItineraryWaypoints(itineraryId, waypointIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id, name, position[1] as lat, position[0] as lng, time, altitude, symbol, comment, description, color, type, avg_samples AS samples FROM itinerary_waypoint WHERE itinerary_id=$1 AND id=ANY($2) ORDER BY name, symbol, id',
                   [itineraryId, waypointIds],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows);
                       } else {
                         callback(null, []);
                       }
                     }
                   });
    }
  });
}

function getItineraryRoutes(itineraryId, routeIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var routes = [], rid, rte, rtept;
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT r.id AS route_id, r.name AS route_name, r.color AS path_color, Rc.html_code, r.distance, r.ascent, r.descent, r.lowest, r.highest, p.id AS point_id, p.position[1] AS lat, p.position[0] AS lng, p.name AS point_name, p.comment, p.description, p.symbol, p.altitude FROM itinerary_route r LEFT JOIN path_color RC ON r.color=rc.key LEFT JOIN itinerary_route_point p ON r.id=p.itinerary_route_id WHERE r.itinerary_id = $1 AND r.id=ANY($2) ORDER BY r.id, p.id',
                   [itineraryId, routeIds],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount > 0) {
                         result.rows.forEach(function(v, k) {
                           if (rid === undefined || rid != v.route_id) {
                             rid = v.route_id;
                             rte = {};
                             rte.id = rid;
                             rte.name = v.route_name;
                             rte.color = v.path_color;
                             rte.htmlcolor = v.html_code;
                             rte.distance = v.distance;
                             rte.ascent = v.ascent;
                             rte.descent = v.descent;
                             rte.lowest = v.lowest;
                             rte.highest = v.highest;
                             rte.points = [];
                             routes.push(rte);
                           }
                           if (v.point_id !== null) {
                             rtept = {};
                             rtept.id = v.point_id;
                             rtept.lat = v.lat;
                             rtept.lng = v.lng;
                             rtept.name = v.point_name;
                             rtept.comment = v.comment;
                             rtept.description = v.description;
                             rtept.symbol = v.symbol;
                             rtept.altitude = v.altitude;
                             rte.points.push(rtept);
                           }
                         });
                       }
                       callback(err, routes);
                     }
                   });
    }
  });
}

function getItineraryRoutePointsCount(itineraryId, routeId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var sql = 'SELECT count(*) FROM itinerary_route_point rp JOIN itinerary_route r ON r.id=rp.itinerary_route_id WHERE r.itinerary_id=$1 AND itinerary_route_id=$2';
      client.query(sql,
                   [itineraryId,
                    routeId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount === 1) {
                         callback(null, result.rows[0].count);
                       } else {
                         callback(new Error('Route not found'));
                       }
                     }
                   });
    }
  });
}

function getItineraryRoutePoints(itineraryId, routeId, offset, limit, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var sql = 'SELECT r.itinerary_id, rp.itinerary_route_id, rp.id, position[1] AS lat, position[0] AS lng, altitude, rp.name, rp.comment, rp.description, rp.symbol FROM itinerary_route_point rp JOIN itinerary_route r ON r.id=rp.itinerary_route_id WHERE r.itinerary_id=$1 AND itinerary_route_id=$2 ORDER BY rp.id';
      if (offset) {
        sql += ' OFFSET ' + offset;
      }
      if (limit) {
        sql += ' LIMIT ' + limit;
      }
      client.query(sql,
                   [itineraryId,
                    routeId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(null, result.rows);
                     }
                   });
    }
  });
}

function getItineraryTracks(itineraryId, trackIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var tracks = [], tid, sid, trk, trkseg, trkpt;
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT t.id AS track_id, t.name AS track_name, t.color AS path_color, tc.html_code, t.distance, t.ascent, t.descent, t.lowest, t.highest, ts.id AS segment_id, p.id AS point_id, p.position[1] AS lat, p.position[0] AS lng, p.time, p.hdop, p.altitude FROM itinerary_track t LEFT JOIN path_color tc ON t.color=tc.key LEFT JOIN itinerary_track_segment ts ON t.id=ts.itinerary_track_id LEFT JOIN itinerary_track_point p ON ts.id=p.itinerary_track_segment_id WHERE t.itinerary_id = $1 AND t.id=ANY($2) ORDER BY t.id, ts.id, p.id',
                   [itineraryId, trackIds],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       winston.error('Error getting tracks', err);
                       callback(err);
                     } else {
                       if (result && result.rowCount > 0) {
                         result.rows.forEach(function(v, k) {
                           if (tid === undefined || tid != v.track_id) {
                             tid = v.track_id;
                             trk = {};
                             trk.id = tid;
                             trk.name = v.track_name;
                             trk.color = v.path_color;
                             trk.htmlcolor = v.html_code;
                             trk.distance = v.distance;
                             trk.ascent = v.ascent;
                             trk.descent = v.descent;
                             trk.lowest = v.lowest;
                             trk.highest = v.highest;
                             trk.segments = [];
                             tracks.push(trk);
                           }
                           if (v.segment_id !== null) {
                             if (sid === undefined || sid != v.segment_id) {
                               sid = v.segment_id;
                               trkseg = {};
                               trkseg.id = sid;
                               trkseg.points =[];
                               trk.segments.push(trkseg);
                             }
                             if (v.point_id !== null) {
                               trkpt = {};
                               trkpt.id = v.point_id;
                               trkpt.time = v.time;
                               trkpt.lat = v.lat;
                               trkpt.lng = v.lng;
                               trkpt.hdop = v.hdop;
                               trkpt.altitude = v.altitude;
                               trkseg.points.push(trkpt);
                             }
                           }
                         });
                       }
                       callback(err, tracks);
                     }
                   });
    }
  });
}

function getItineraryTrackSegment(itineraryId, segmentId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT its.id, its.distance, its.ascent, its.descent, its.lowest, its.highest FROM itinerary_track_segment its JOIN itinerary_track it ON its.itinerary_track_id=it.id WHERE it.itinerary_id=$1 AND its.id=$2',
                   [itineraryId, segmentId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount) {
                         callback(err, result.rows[0]);
                       } else {
                         callback(null, null);
                       }
                     }
                   });
    }
  });
}

function getItineraryTrackSegmentCount(trackId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT count(*) FROM itinerary_track_segment WHERE itinerary_track_id=$1',
                   [trackId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount === 1) {
                         callback(null, result.rows[0].count);
                       } else {
                         callback(new Error('Track not found'));
                       }
                     }
                   });
    }
  });
}

function getItineraryTrackSegments(itineraryId, trackId, offset, limit, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var track, segments = [];
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var sql = 'SELECT ts.id FROM itinerary_track_segment ts JOIN itinerary_track it ON it.id=ts.itinerary_track_id WHERE it.itinerary_id = $1 AND itinerary_track_id=$2 ORDER BY ts.id';
      if (offset) {
        sql += ' OFFSET ' + offset;
      }
      if (limit) {
        sql += ' LIMIT ' + limit;
      }
      client.query(sql,
                   [itineraryId, trackId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows);
                       } else {
                         callback(new Error('Track not found'));
                       }
                     }
                   });
    }
  });
}

function getItineraryTrackSegmentPointCount(segmentId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT count(*) FROM itinerary_track_point WHERE itinerary_track_segment_id=$1',
                   [segmentId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount === 1) {
                         callback(null, result.rows[0].count);
                       } else {
                         callback(new Error('Track segment not found'));
                       }
                     }
                   });
    }
  });
}

function getItineraryTrackSegmentPoints(itineraryId, segmentId, offset, limit, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var track, segments = [];
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var sql = 'SELECT tp.id, tp.position[1] AS lat, tp.position[0] as lng, tp.time, tp.hdop, tp.altitude FROM itinerary_track_point tp JOIN itinerary_track_segment ts ON ts.id=tp.itinerary_track_segment_id JOIN itinerary_track it ON it.id=ts.itineRary_track_id WHERE it.itinerary_id=$1 AND ts.id=$2 ORDER BY tp.id';
      if (offset) {
        sql += ' OFFSET ' + offset;
      }
      if (limit) {
        sql += ' LIMIT ' + limit;
      }
      client.query(sql,
                   [itineraryId, segmentId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows);
                       } else {
                         callback(new Error('Track segment not found: ' + segmentId));
                       }
                     }
                   });
    }
  });
}

function deleteItineraryTrackSegments(itineraryId, segments, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_track_segment ts2 WHERE EXISTS(SELECT 1 FROM (SELECT it.itinerary_id, ts.id FROM itinerary_track_segment ts JOIN itinerary_track it ON it.id=ts.itinerary_track_id WHERE it.itinerary_id=$1 AND ts.id=ANY($2)) AS q WHERE q.itinerary_id=$1 AND q.id=ts2.id)',
                   [itineraryId, segments],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function replaceItineraryTrackSegments(itineraryId, trackId, segments, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_track_segment ts2 WHERE EXISTS(SELECT 1 FROM (SELECT it.itinerary_id, ts.itinerary_track_id FROM itinerary_track_segment ts JOIN itinerary_track it ON it.id=ts.itinerary_track_id WHERE it.itinerary_id=$1 AND ts.itinerary_track_id=$2) AS q WHERE q.itinerary_id=$1 AND q.itinerary_track_id=ts2.itinerary_track_id)',
                   [itineraryId, trackId],
                   function(err, result) {
                     if (err) {
                       winston.error('Failure deleting itinerary track segments', err);
                       callback(err);
                     } else {
                       localCreateItineraryTrackSegments(client, trackId, segments, function() {
                         done();
                         callback(null);
                       });
                     }
                   });
    }
  });
}

function deleteItineraryTrackSegmentPoints(itineraryId, points, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_track_point tp2 WHERE EXISTS (SELECT 1 FROM (SELECT it.itinerary_id, tp.id FROM itinerary_track_point tp JOIN itinerary_track_segment ts ON ts.id=tp.itinerary_track_segment_id JOIN itinerary_track it ON it.id=ts.itinerary_track_id WHERE it.itinerary_id=$1 AND tp.id=ANY($2)) AS q WHERE q.itinerary_id=$1 AND q.id=tp2.id)',
                   [itineraryId, points],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function getItineraryRouteNames(itineraryId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id, name, color, distance, ascent, descent, lowest, highest FROM itinerary_route WHERE itinerary_id=$1 ORDER BY name, id',
                   [itineraryId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount > 0) {
                         callback(err, result.rows);
                       } else {
                         callback(err, []);
                       }
                     }
                   });
    }
  });
}

function getItineraryRouteName(itineraryId, routeId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id, name, color, distance, ascent, descent, lowest, highest FROM itinerary_route WHERE itinerary_id=$1 AND id=$2',
                   [itineraryId, routeId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount > 0) {
                         callback(err, result.rows[0]);
                       } else {
                         callback(err, []);
                       }
                     }
                   });
    }
  });
}

function updateItineraryRouteName(itineraryId, routeId, name, color, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE itinerary_route SET name=$3, color=$4 WHERE itinerary_id=$1 AND id=$2',
                   [itineraryId, routeId, name, color],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(err, result.rowCount === 1);
                     }
                   });
    }
  });
}

function getItineraryTrackNames(itineraryId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id, name, color, distance, ascent, descent, lowest, highest FROM itinerary_track WHERE itinerary_id=$1 ORDER BY name, id',
                   [itineraryId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount > 0) {
                         callback(err, result.rows);
                       } else {
                         callback(err, []);
                       }
                     }
                   });
    }
  });
}

function getItineraryTrackName(itineraryId, trackId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT id, name, color, distance, ascent, descent, lowest, highest FROM itinerary_track WHERE itinerary_id=$1 AND id=$2',
                   [itineraryId, trackId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount > 0) {
                         callback(err, result.rows[0]);
                       } else {
                         callback(err, []);
                       }
                     }
                   });
    }
  });
}

function updateItineraryTrackName(itineraryId, trackId, name, color, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE itinerary_track SET name=$3, color=$4 WHERE itinerary_id=$1 AND id=$2',
                   [itineraryId, trackId, name, color],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       callback(err, result.rowCount === 1);
                     }
                   });
    }
  });
}

function localUpdateItineraryTrackSegmentDistanceElevation(client, trackId, segments, callback) {
  var counter = segments.length;
  if (counter === 0) callback();
  segments.forEach(function(segment) {
    client.query({name: 'upd-itnry-trkseg',
                  text: 'UPDATE itinerary_track_segment SET distance=$3, ascent=$4, descent=$5, lowest=$6, highest=$7 WHERE itinerary_track_id=$1 AND id=$2',
                  values: [trackId,
                           segment.id,
                           segment.distance,
                           segment.ascent,
                           segment.descent,
                           segment.lowest,
                           segment.highest
                          ]}, function(err, result) {
                             if (err) {
                               winston.error('Failure updatting itinerary track segment', err);
                             }
                             if (--counter === 0) {
                               callback(err);
                             }
                           });
  });
}

function updateItineraryTrackDistanceElevation(itineraryId, trackId, track, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE itinerary_track SET distance=$3, ascent=$4, descent=$5, lowest=$6, highest=$7 WHERE itinerary_id=$1 AND id=$2',
                   [itineraryId,
                    trackId,
                    track.distance,
                    track.ascent,
                    track.descent,
                    track.lowest,
                    track.highest],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       localUpdateItineraryTrackSegmentDistanceElevation(client, trackId, track.segments, function() {
                         done();
                         callback(err, result.rowCount === 1);
                       });
                     }
                   });
    }
  });
}

function createItineraryWaypoints(itineraryId, waypoints, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var waypointCounter = waypoints.length;
  if (waypointCounter === 0) {
    callback(null);
    return;
  }
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      waypoints.forEach(function(w) {
        client.query({name: 'crt-itnry-wpt',
                      text: 'INSERT INTO itinerary_waypoint (itinerary_id, name, position, altitude, time, comment, description, symbol, color, type, avg_samples) VALUES ($1, $2, POINT($3, $4), $5, $6, $7, $8, $9, $10, $11, $12)',
                      values: [itineraryId, w.name, w.lng, w.lat, w.ele, w.time, w.cmt, w.desc, w.sym, w.color, w.type, w.samples]}, function(err, result) {
                        if (err) {
                          winston.error('Failure inserting itinerary_waypoint', err);
                        }
                        if (--waypointCounter === 0) {
                          done();
                          callback(null);
                        }
                      });
      });
    }
  });
}

function localCreateItineraryRoutePoints(client, routeId, points, callback) {
  var pointCounter = points.length;
  if (pointCounter === 0) callback();
  points.forEach(function(rp) {
    client.query({name: 'crt-itnry-rtept',
                  text: 'INSERT INTO itinerary_route_point (itinerary_route_id, position, altitude, name, comment, description, symbol) VALUES ($1, POINT($2, $3), $4, $5, $6, $7, $8) RETURNING id',
                  values: [routeId,
                           rp.lng,
                           rp.lat,
                           rp.ele ? rp.ele : rp.altitude,
                           rp.name,
                           rp.cmt ? rp.cmt : rp.comment,
                           rp.desc ? rp.desc : rp.description,
                           rp.sym ? rp.sym : rp.symbol
                          ]}, function(err, result) {
                             if (err) {
                               winston.error('Failure inserting itinerary route point', err);
                             }
                             if (--pointCounter === 0) {
                               callback();
                             }
                           });
  });
}

function createItineraryRoute(itineraryId, route, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('INSERT INTO itinerary_route (itinerary_id, name, color, distance, ascent, descent, lowest, highest) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                   [itineraryId,
                    route.name,
                    route.color,
                    route.distance,
                    route.ascent,
                    route.descent,
                    route.lowest,
                    route.highest
                   ],
                   function(err, result) {
                     if (err) {
                       winston.error('Failure inserting single itinerary_route', err);
                       done();
                       callback(err);
                     } else {
                       var routeResult = result.rows[0];
                       localCreateItineraryRoutePoints(client, routeResult.id, route.points, function() {
                         done();
                         callback(null, routeResult);
                       });
                     }
                   });
    }
  });
}

function createItineraryRoutes(itineraryId, routes, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (routes.length === 0) {
    callback(null);
    return;
  }
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var routeCounter = routes.length;
      routes.forEach(function(r) {
        client.query({name: 'crt-itnry-rte',
                      text: 'INSERT INTO itinerary_route (itinerary_id, name, color, distance, ascent, descent, lowest, highest) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                      values: [itineraryId, r.name, r.color, r.distance, r.ascent, r.descent, r.lowest, r.highest]}, function(err, result) {
                        if (err) {
                          winston.error('Failure inserting itinerary_route', err);
                        } else {
                          var routeResult = result.rows[0];
                          localCreateItineraryRoutePoints(client, routeResult.id, r.points, function() {
                            if (--routeCounter === 0) {
                              done();
                              callback(null);
                            }
                          });
                        }
                      });
      });
    }
  });
}

function updateItineraryDistanceElevationData(itineraryId, routeId, route, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE itinerary_route SET distance=$3, ascent=$4, descent=$5, lowest=$6, highest=$7 WHERE itinerary_id=$1 AND id=$2',
                   [itineraryId, routeId, route.distance, route.ascent, route.descent, route.lowest, route.highest],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       winston.error('Failure updating route distance and elevation data', err);
                       callback(err);
                     } else {
                       callback(err, result.rowCount === 1);
                     }
                   });
    }
  });
}

function updateItineraryRoutePoints(itineraryId, routeId, points, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_route_point rp2 WHERE EXISTS (SELECT 1 FROM (SELECT rp.id FROM itinerary_route r JOIN itinerary_route_point rp ON r.id=rp.itinerary_route_id WHERE r.itinerary_id=$1 AND r.id=$2) AS q WHERE q.id=rp2.id)',
                   [itineraryId, routeId],
                   function(err, result) {
                     if (err) {
                       winston.error('Failure removing existing itinerary_route_points', err);
                       done();
                       callback(null);
                     } else {
                       localCreateItineraryRoutePoints(client, routeId, points, function() {
                         done();
                         callback(null);
                       });
                     }
                   });
    }
  });
}

function deleteItineraryRoutePoints(itineraryId, points, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_route_point rp2 WHERE EXISTS (SELECT 1 FROM (SELECT r.itinerary_id, rp.id FROM itinerary_route_point rp JOIN itinerary_route r ON r.id=rp.itinerary_route_id WHERE r.itinerary_id=$1 AND rp.id=ANY($2)) AS q WHERE q.itinerary_id=$1 AND q.id=rp2.id)',
                   [itineraryId,
                    points],
                   function(err, result) {
                     done();
                     callback(err);
                   });
    }
  });
}

function localCreateItineraryTrackPoints(client, segmentId, points, callback) {
  var pointCounter = points ? points.length : 0;
  if (pointCounter === 0) {
    callback();
  } else {
    points.forEach(function(tp) {
      client.query({name: 'crt-itnry-trkpt',
                    text: 'INSERT INTO itinerary_track_point (itinerary_track_segment_id, position, time, hdop, altitude) VALUES ($1, POINT($2, $3), $4, $5, $6) RETURNING id',
                    values: [segmentId,
                             tp.lng,
                             tp.lat,
                             tp.time,
                             tp.hdop,
                             (tp.ele ? tp.ele : tp.altitude) ]}, function(err, result) {
                               if (err) {
                                 winston.error('Failure inserting itinerary track point', err);
                               }
                               if (--pointCounter === 0) {
                                 callback();
                               }
                             });
    });
  }
}

function localCreateItineraryTrackSegments(client, trackId, segments, callback) {
  var segmentCounter = segments ? segments.length : 0;
  if (segmentCounter === 0) {
    callback();
  } else {
    segments.forEach(function(ts) {
      client.query({name: 'crt-itnry-trkseg',
                    text: 'INSERT INTO itinerary_track_segment (itinerary_track_id, distance, ascent, descent, lowest, highest) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                    values: [trackId,
                             ts.distance,
                             ts.ascent,
                             ts.descent,
                             ts.lowest,
                             ts.highest
                            ]}, function(err, result) {
                      if (err) {
                        winston.error('Failure inserting itinerary track segment', err);
                      }
                      var segmentResult = result.rows[0];
                      localCreateItineraryTrackPoints(client, segmentResult.id, ts.points, function() {
                        if (--segmentCounter === 0) {
                          callback();
                        }
                      });
                    });
    });
  }
}

function createItineraryTracks(itineraryId, tracks, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (tracks.length === 0) {
    callback(null);
    return;
  }
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var trackCounter = tracks.length;
      tracks.forEach(function(t) {
        client.query({name: 'crt-itnry-trk',
                      text: 'INSERT INTO itinerary_track (itinerary_id, name, color, distance, ascent, descent, lowest, highest) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                      values: [itineraryId, t.name, t.color, t.distance, t.ascent, t.descent, t.lowest, t.highest]}, function(err, result) {
                        if (err) {
                          winston.error('Failure inserting itinerary_track', err);
                        }
                        var trackResult = result.rows[0];
                        localCreateItineraryTrackSegments(client, trackResult.id, t.segments, function() {
                          if (--trackCounter === 0) {
                            done();
                            callback(null, trackResult.id);
                          }
                        });
                      });
      });
    }
  });
}

function deleteItineraryWaypoint(itineraryId, waypointId, w, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_waypoint WHERE itinerary_id=$1 AND id=$2',
                   [itineraryId,
                    waypointId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (!err && result.rowCount === 0) {
                       callback(new Error('Deleteted 0 records'));
                     } else {
                       callback(err);
                     }
                   });
    }
  });
}

function deleteItineraryWaypoints(itineraryId, waypointIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_waypoint WHERE itinerary_id=$1 AND id=ANY($2)',
                   [itineraryId, waypointIds],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function deleteItineraryRoute(itineraryId, routeId, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_route WHERE itinerary_id=$1 AND id=$2',
                   [itineraryId, routeId],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (!err && result.rowCount === 0) {
                       winston.warn('Failed to delete itinerary route for itinerary id %s and route id %s');
                     } else {
                       callback(err);
                     }
                   });
    }
  });
}

function deleteItineraryRoutes(itineraryId, routeIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_route WHERE itinerary_id=$1 AND id=ANY($2)',
                   [itineraryId, routeIds],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function deleteItineraryTracks(itineraryId, trackIds, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM itinerary_track WHERE itinerary_id=$1 AND id=ANY($2)',
                   [itineraryId, trackIds],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

/**
 * True if the specified tile has not reached it's expiry date and it
 * is less than maxAge days old.
 *
 * @param {number} id the index id of the tile server
 *
 * @param {number} maxAge the maximum number of days to cache a tile
 * for.  Ignored if null or undefined.
 *
 * @param {object} callback the callback function, the first parameter
 * being null or an Error, and if no error, the second parameter
 * containing the result true or false.
 */
function tileExists(id, x, y, z, maxAge, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var sql;
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      sql = 'SELECT COUNT(*) FROM tile WHERE x=$1 AND y=$2 AND z=$3 AND server_id=$4';
      if (maxAge !== null && maxAge !== undefined) {
        sql += ' AND (expires > now() OR updated > now()::timestamp::date - INTERVAL \'' + maxAge + ' days\')';
      }
      client.query(sql,
                   [x, y, z, id],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0].count > 0);
                       } else {
                         callback(new Error('db.tileExists: Unexpectedly got no results', x, y, z));
                       }
                     }
                   });
    }
  });
}

/**
 * Provides a tile if the specified tile has not reached it's expiry
 * date and it is less than maxAge days old.
 *
 * @param {number} id the index id of the tile server
 *
 * @param {number} maxAge the maximum number of days to cache a tile
 * for.  Ignored if null or undefined.
 *
 * @param {object} callback the callback function, the first parameter
 * being null or an Error if not tile is found, with the second
 * parameter containing the tile as a buffer.
 */
function fetchTile(id, x, y, z, maxAge, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var sql;
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      sql = 'SELECT image, updated, expires FROM tile WHERE x=$1 AND y=$2 AND z=$3 AND server_id=$4';
      if (maxAge !== null && maxAge !== undefined) {
        sql += ' AND (expires > now() OR updated > now()::timestamp::date - INTERVAL \'' + maxAge + ' days\')';
      }
      client.query(sql,
                   [x, y, z, id],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result.rowCount > 0) {
                         callback(null, result.rows[0]);
                       } else {
                         callback(new Error('Tile not found', x, y, z));
                       }
                     }
                   });
    }
  });
}

function incrementTileCounter(callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT nextval(\'tile_download_seq\')',
                   [],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (result && result.rows) {
                       callback(err, result.rows[0]);
                     } else {
                       winston.error('Error incrementing tile counter', err);
                       callback(err);
                     }
                   });
    }
  });
}

function saveTileCount(count, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('INSERT INTO tile_metric ("count") VALUES ($1)',
                   [count],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     callback(err, result);
                   });
    }
  });
}

function saveTile(id, x, y, z, expires, tileBuffer, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('INSERT INTO tile (x, y, z, image, expires, server_id) VALUES ($1, $2, $3, $4, $5, $6)',
                   [x, y, z, tileBuffer, expires, id],
                   function(err) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function updateTile(id, x, y, z, expires, tileBuffer, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('UPDATE tile SET image=$4, expires=$5, updated=now() WHERE x=$1 AND y=$2 AND z=$3 AND server_id=$6',
                   [x, y, z, tileBuffer, expires, id],
                   function(err) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function deleteTile(id, x, y, z, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('DELETE FROM tile where x=$1 AND y=$2 AND z=$3 AND server_id=$4',
                   [x, y, z, id],
                   function(err) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function logPoint(userId, q, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      var date = new Date(Number(q.mstime));
      client.query('INSERT INTO location (user_id, location, time, hdop, altitude, speed, bearing, sat, provider, battery, note) VALUES($1, POINT($2, $3), $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                   [userId, q.lng, q.lat, date, q.hdop, q.altitude, q.speed, q.bearing, q.sat, q.prov, q.batt, q.note],
                   function(err) {
                     // release the client back to the pool
                     done();
                     callback(err);
                   });
    }
  });
}

function getTileCount(callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  pg.connect(config.db.uri, function(err, client, done) {
    if (err) {
      callback(err);
    } else {
      client.query('SELECT time, count FROM tile_metric ORDER BY time DESC LIMIT 1',
                   [],
                   function(err, result) {
                     // release the client back to the pool
                     done();
                     if (err) {
                       callback(err);
                     } else {
                       if (result && result.rowCount && result.rowCount === 1) {
                         callback(err, result.rows[0]);
                       } else {
                         callback(err, null);
                       }
                     }
                   });
    }
  });
}
