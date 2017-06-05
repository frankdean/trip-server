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

var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var uuid = require('uuid');
var validator = require('validator');
var winston = require('winston');

var db = require('./db');
var config = require('./config.json');

var validNickname = /^[!-\.0->@-~]+$/;
var printableRegex = /^[!-~]+$/;
var printableRegexPlusSpace = /^[ -~]+$/;

module.exports = {
  UnauthorizedError: UnauthorizedError,
  checkAuthenticated: checkAuthenticated,
  getUser: getUser,
  getUsers: getUsers,
  getNicknameForUsername: getNicknameForUsername,
  createUser: createUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  doLogin: doLogin,
  resetPassword: resetPassword
};

function UnauthorizedError(message) {
  this.name = 'UnauthorizedError';
  this.message = message || 'User is not authorized';
  this.stack = (new Error()).stack;
}
UnauthorizedError.prototype = Object.create(Error.prototype);
UnauthorizedError.prototype.constructor = UnauthorizedError;

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

function doLogin(username, password, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getPassword(username, password, function(err, hash) {
    if (err) {
      callback(err);
    } else {
      bcrypt.compare(password, hash, function(err, result) {
        if (err) {
          callback(err);
        } else {
          if (result) {
            // Check for admin role
            db.hasRole(username, 'Admin', function(err, roleResult) {
              if (err) {
                callback(err);
              } else {
                var payload = {
                  admin: roleResult,
                  sub: username
                };
                jwt.sign(payload,
                         config.jwt.signingKey,
                         {noTimestamp: true},
                         function(err, token) {
                           if (err) {
                             winston.error('Failure signing JWT token for', username, err);
                           }
                           callback(err, {token: token});
                         });
              }
            });
          } else {
            callback(new UnauthorizedError('Invalid credentials'));
          }
        }
      });
    }
  });
}

function checkAuthenticated(token, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  jwt.verify(token, config.jwt.signingKey, function(err, decoded) {
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
  if (!nickname || !validator.isLength('' + nickname, {min: 1, max: 120})) {
    nickname = undefined;
  }
  if (!email || !validator.isLength('' + email, {min: 1, max: 120})) {
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
  if (validator.isEmail('' + user.username) && validNickname.test(user.nickname) &&
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
  if (validator.isInt('' + user.id) &&
      validator.isEmail('' + user.username) &&
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
