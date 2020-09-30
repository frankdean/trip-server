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

var db = require('./db');

var validNickname = /^[!-\.0->@-~]+$/;

/**
 * Primarily contains functions for handling the sharing of itineries.
 * @module shares
 */
module.exports = {
  deleteLocationSharesForShareList: deleteLocationSharesForShareList,
  getLocationShares: getLocationShares,
  saveLocationShare: saveLocationShare,
  updateLocationShareActiveStates: updateLocationShareActiveStates,
  validateShare: validateShare,
  validateShares: validateShares,
  unitTests: {convertDaysHoursMinsToMins: convertDaysHoursMinsToMins}
};

function convertDaysHoursMinsToMins(days, hours, mins) {
  days = days === undefined ? 0 : days;
  hours = hours === undefined ? 0 : hours;
  mins = mins === undefined ? 0 : mins;
  var retval = (days * 24 + hours) * 60 + mins;
  return (retval === 0) ? null : retval;
}

function convertMinutesToDaysHoursMinutes(mins) {
  var d, h;
  var r = {};
  if (mins) {
    h = Math.floor(mins / 60);
    r.minutes = mins - h * 60;
    d = Math.floor(h / 24);
    r.hours = h - d * 24;
    r.days = d;
  } else {
    r.minutes = 0;
    r.hours = 0;
    r.days = 0;
  }
  return r;
}

function formatDaysAsText(t) {
  return t.days + 'd ' + t.hours + 'h ' + t.minutes + 'm';
}

function getLocationShares(username, offset, pageSize, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  db.getLocationShareCountByUsername(username, function(err, count) {
    if (err) {
      callback(err);
    } else {
      db.getLocationSharesByUsername(username, offset, pageSize, function(err, result) {
        if (err) {
          callback(err);
        } else {
          var payload = [];
          result.forEach(function(v) {
            var s = {};
            var r = convertMinutesToDaysHoursMinutes(v.recent_minutes);
            var max = convertMinutesToDaysHoursMinutes(v.max_minutes);
            s.nickname = v.nickname;
            s.recentDays = r.days;
            s.recentHours = r.hours;
            s.recentMinutes = r.minutes;
            s.maximumDays = max.days;
            s.maximumHours = max.hours;
            s.maximumMinutes = max.minutes;
            s.recentLimit = formatDaysAsText(r);
            s.maximumLimit = formatDaysAsText(max);
            s.active = v.active ? true : false;
            payload.push(s);
          });
          callback(null, {count: count, payload: payload});
        }
      });
    }
  });
}

function validateShare(share) {
  return share.nickname !== undefined && validNickname.test(share.nickname) &&
    (share.recentDays === undefined || share.recentDays === null ||
     _.isInteger(share.recentDays)) &&
    (share.recentHours === undefined || share.recentHours === null ||
     _.isInteger(share.recentHours)) &&
    (share.recentMinutes === undefined || share.recentMinutes === null ||
     _.isInteger(share.recentMinutes)) &&
    (share.maximumDays === undefined || share.maximumDays === null ||
     _.isInteger(share.maximumDays)) &&
    (share.maximumHours === undefined || share.maximumHours === null ||
     _.isInteger(share.maximumHours)) &&
    (share.maximumMinutes === undefined || share.maximumMinutes === null ||
     _.isInteger(share.maximumMinutes)) &&
    (share.active === undefined || share.active === null ||
     _.isBoolean(share.active));
}

function validateShares(shares) {
  var valid = true;
  shares.forEach(function(v) {
    if (valid && !validateShare(v)) {
      valid = false;
    }
  });
  return valid;
}

function saveLocationShare(username, share, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var active, recentMinutes, maximumMinutes;
  if (validNickname.test(share.nickname)) {
    recentMinutes = convertDaysHoursMinsToMins(share.recentDays, share.recentHours, share.recentMinutes);
    maximumMinutes = convertDaysHoursMinsToMins(share.maximumDays, share.maximumHours, share.maximumMinutes);
    active = share.active ? true : false;
    db.findUserByUsername(username, function(err, sharedById) {
      if (err) {
        callback(err);
      } else {
        db.findUserByNickname(share.nickname, function(err, sharedToId) {
          if (err) {
            callback(err);
          } else {
            db.getLocationShareExistsByUsername(username, share.nickname, function(err, result) {
              if (err) {
                callback(err);
              } else {
                if (result) {
                  db.updateLocationShare(sharedById, sharedToId, recentMinutes, maximumMinutes, active, function(err) {
                    callback(err);
                  });
                } else {
                  db.createLocationShare(sharedById, sharedToId, recentMinutes, maximumMinutes, active, function(err) {
                    callback(err);
                  });
                }
              }
            });
          }
        });
      }
    });
  } else {
    callback(new Error('invalid nickname'));
  }
}

function updateLocationShareActiveStates(username, shares, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (validateShares(shares)) {
    db.updateLocationShareActiveStates(username, shares, function(err) {
      callback(err);
    });
  } else {
    callback(new Error('Invalid nickname passed'));
  }
}

function deleteLocationSharesForShareList(username, shares, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (validateShares(shares)) {
    var c = 0;
    var nicknames = [];
    shares.forEach(function(v) {
      if (v.deleted) {
        nicknames.push(v.nickname);
        c++;
      }
    });
    if (c) {
      db.deleteLocationShares(username, nicknames, function(err) {
        callback(err);
      });
    } else {
      callback(null);
    }
  } else {
    callback(new Error('Invalid nickname passed'));
  }
}
