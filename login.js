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
var bcrypt = require('bcrypt');
var crypt = require('crypto');
var jwt = require('jsonwebtoken');
var uuid = require('uuid');

var db = require('./db');
var utils = require('./utils');
var config = require('./config.json');

var validNickname = /^[!-\.0->@-~]+$/;
var printableRegex = /^[!-~]+$/;
var printableRegexPlusSpace = /^[ -~]+$/;

var logger = require('./logger').createLogger('login.js');

module.exports = {
  UnauthorizedError: UnauthorizedError,
  InvalidCredentialsError: InvalidCredentialsError,
  checkAuthenticated: checkAuthenticated,
  checkAuthenticatedForBasicResources: checkAuthenticatedForBasicResources,
  getUser: getUser,
  getUsers: getUsers,
  getNicknameForUsername: getNicknameForUsername,
  createUser: createUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  doLogin: doLogin,
  updateToken: updateToken,
  resetPassword: resetPassword,
  changePassword: changePassword
};

function UnauthorizedError(message) {
  this.name = 'UnauthorizedError';
  this.message = message || 'User is not authorized';
  this.stack = (new Error()).stack;
}
UnauthorizedError.prototype = Object.create(Error.prototype);
UnauthorizedError.prototype.constructor = UnauthorizedError;

function InvalidCredentialsError(message) {
  this.name = 'InvalidCredentialsError';
  this.message  = message || 'Invalid credentials';
  this.stack = (new Error()).stack;
}
InvalidCredentialsError.prototype = Object.create(Error.prototype);
InvalidCredentialsError.prototype.constructor = InvalidCredentialsError;

function resetPassword(username, password, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      callback(err);
    } else {
      bcrypt.hash(password, salt, function(err, hash) {
        if (err) {
          callback(err);
        } else {
          db.resetPassword(username, hash, function(err) {
            callback(err);
          });
        }
      });
    }
  });
}

function changePassword(username, oldPassword, newPassword, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getPassword(username, function(err, hash) {
    if (err) {
      callback(err);
    } else {
      bcrypt.compare(oldPassword, hash, function(err, result) {
        if (err) {
          callback(new InvalidCredentialsError('Failure retrieving user credentials'));
        } else {
          if (result) {
            bcrypt.genSalt(10, function(err, salt) {
              if (err) {
                callback(err);
              } else {
                bcrypt.hash(newPassword, salt, function(err, hash) {
                  if (err) {
                    callback(err);
                  } else {
                    db.resetPassword(username, hash, function(err) {
                      callback(err);
                    });
                  }
                });
              }
            });
          } else {
            callback(new InvalidCredentialsError());
          }
        }
      });
    }
  });
}

function updateToken(res, username, callback) {
  var payload, xsrfToken, expiresIn, resourceExpiresIn, renewWithin;
  expiresIn =  config.app.token && config.app.token.expiresIn ? config.app.token.expiresIn : 7200;
  resourceExpiresIn =  config.app.resourceToken && config.app.resourceToken.expiresIn ? config.app.resourceToken.expiresIn : 86400;
  renewWithin = config.app.token && config.app.token.renewWithin ? config.app.token.renewWithin : 3600;
  // Check for admin role
  db.hasRole(username, 'Admin', function(err, roleResult) {
    if (err) {
      callback(err);
    } else {
      payload = {
        uk_co_fdsd_trip_admin: roleResult,
        uk_co_fdsd_trip_renewWithin: renewWithin
      };
      jwt.sign(payload,
               config.jwt.signingKey,
               {
                 subject: username,
                 expiresIn: expiresIn
               },
               function(err, token) {
                 if (err) {
                   logger.error('Failure signing JWT token for %s, %j', username, err);
                   callback(err);
                 } else {
                   xsrfToken = crypt.createHmac('sha256', config.jwt.signingKey).update(token).digest('hex');
                   res.setHeader('Set-Cookie', [/*'access_token=' + token + '; path=/; HttpOnly;',*/ 'TRIP-XSRF-TOKEN=' + xsrfToken + '; path=/;']);

                   // Create a resource token that should be much longer lasting
                   // than the authentication but allow access to map tiles
                   // which expose the token in GET requests and are only
                   // renewed when auth tokens are renewed.
                   jwt.sign({ uk_co_fdsd_trip_admin:false },
                            config.jwt.resourceSigningKey,
                            {
                              subject: 'anon',
                              expiresIn: resourceExpiresIn
                            },
                            function(err, resourceToken) {
                              if (err) {
                                logger.error('Failure signing resource JWT token for %s, %j', username, err);
                              }
                              callback(err, {token: token, resourceToken: resourceToken});
                            });
                 }
               });
    }
  });
}

function doLogin(res, username, password, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getPassword(username, function(err, hash) {
    if (err) {
      callback(err);
    } else {
      bcrypt.compare(password, hash, function(err, result) {
        if (err) {
          callback(err);
        } else {
          if (result) {
            updateToken(res, username, function(err, token) {
              callback(err, token);
            });
          } else {
            callback(new UnauthorizedError('Invalid credentials'));
          }
        }
      });
    }
  });
}

function checkAuthenticated(token, xsrfToken, callback) {
  var hmac;
  callback = typeof callback === 'function' ? callback : function() {};
  jwt.verify(token, config.jwt.signingKey, function(err, decoded) {
    if (!err) {
      // Check XSRF token <https://docs.angularjs.org/api/ng/service/$http>
      hmac = crypt.createHmac('sha256', config.jwt.signingKey).update(token).digest('hex');
      if (hmac !== xsrfToken) {
        logger.warn('Invalid XSRF-TOKEN');
        err = new Error('Invalid XSRF-TOKEN');
      }
    }
    callback(err, decoded);
  });
}

/**
 * Implements a simpler authentication method for resources such as tiles.
 */
function checkAuthenticatedForBasicResources(token, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  jwt.verify(token, config.jwt.resourceSigningKey, function(err, decoded) {
    if (err  && config.debug) {
      var decodedToken = jwt.decode(token, {complete: true});
      logger.debug('Token header: %j', decodedToken.header);
      logger.debug('Token payload: %j', decodedToken.payload);
      var exp = new Date(0);
      exp.setUTCSeconds(decodedToken.payload.exp);
      logger.debug('Expires: %j', exp);
    }
    callback(err, decoded);
  });
}

function getUser(id, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getUser(id, callback);
}

function deleteUser(id, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.deleteUser(id, callback);
}

function getUsers(offset, limit, nickname, email, searchType, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  searchType = searchType !== 'partial' ? 'exact' : 'partial';
  if (_.isEmpty(nickname) || !_.inRange(nickname.length, 1, 121)) {
    nickname = undefined;
  }
  if (_.isEmpty(email) || !_.inRange(email.length, 1, 121)) {
    email = undefined;
  }
  db.getUserCount(nickname, email, searchType, function(err, count) {
    if (err) {
      callback(err);
    } else {
      var users = {count: count};
      db.getUsers(offset, limit, nickname, email, searchType, function(err, result) {
        users.payload = result;
        callback(err, users);
      });
    }
  });
}

function getNicknameForUsername(username, callback) {
  db.getNicknameForUsername(username, callback);
}

function createUser(user, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (utils.isEmail(user.username) && validNickname.test(user.nickname) &&
      printableRegex.test(user.password) &&
      printableRegexPlusSpace.test(user.firstname) &&
      printableRegexPlusSpace.test(user.lastname)) {

    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        callback(err);
      } else {
        bcrypt.hash(user.password, salt, function(err, hash) {
          if (err) {
            callback(err);
          } else {
            user.hash = hash;
            user.uuid = uuid.v4();
            db.createUser(user, function(err) {
              callback(err);
            });
          }
        });
      }
    });
  } else {
    callback(new Error('Failed validation'));
  }
}

function updateUser(user, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (_.isInteger(user.id) && _.inRange(user.id, Number.MAX_SAFE_INTEGER) &&
      utils.isEmail(user.username) &&
      validNickname.test(user.nickname) &&
      printableRegexPlusSpace.test(user.firstname) &&
      printableRegexPlusSpace.test(user.lastname)) {
    db.updateUser(user, function(err) {
      if (user.admin !== undefined) {
        db.hasRole(user.username, 'Admin', function(err, roleResult) {
          if (user.admin !== roleResult) {
            if (user.admin) {
              db.addRole(user.id, 'Admin', callback);
            } else {
              db.removeRole(user.id, 'Admin', callback);
            }
          } else {
            callback(null);
          }
        });
      } else {
        callback(null);
      }
    });
  } else {
    callback(new Error('Failed validation'));
  }
}
