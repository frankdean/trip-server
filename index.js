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

var http = require('http');
var url = require('url');

var _ = require('lodash');
var autoquit = require('autoquit');
var formidable = require('formidable');
var nstatic = require('node-static');
var qs = require('qs');
var systemd = require('systemd');

var config = require('./config.json');
var npm_package = require('./package.json');
var db = require('./db');
var itineraries = require('./itineraries.js');
var gpxUpload = require('./gpx-upload.js');
var login = require('./login');
var shares = require('./shares');
var tiles = require('./tiles');
var tracks = require('./tracks');
var reports = require('./reports');
var utils = require('./utils');

var myApp = myApp || {};
myApp.version = npm_package.version;
module.exports = myApp;

var logger = require('./logger').createLogger('index.js');

myApp.fileServer = new(nstatic.Server)('./', {cache: 3600});
// Set to x to indent JSON with x spaces.  Zero: no pretty print.
myApp.pretty = config.app.json.indent.level;
myApp.maxItinerarySearchRadius = (config.app.maxItinerarySearchRadius) || 250000;

function BadRequestError(message) {
  this.name = 'BadRequestError';
  this.message = message || 'Bad request';
  this.stack = (new Error()).stack;
}
BadRequestError.prototype = Object.create(Error.prototype);
BadRequestError.prototype.constructor = BadRequestError;

function SystemError(message) {
  this.name = 'error';
  this.message = message || 'System Error';
  this.severity = 'FATAL';
  this.stack = (new Error()).stack;
}
SystemError.prototype = Object.create(Error.prototype);
SystemError.prototype.constructor = SystemError;

myApp.handleError = function handleError(e, res) {
  if (e) {
    if (e instanceof login.UnauthorizedError) {
      res.statusCode = 401;
      logger.debug(e);
    } else if (e instanceof BadRequestError) {
      res.statusCode = 400;
      logger.debug(e);
    } else if (e.name !== undefined && e.name === 'error' &&
               e.severity !== undefined && e.severity === 'FATAL') {
      res.statusCode = 500;
      logger.error(e);
    } else {
      res.statusCode = 400;
      logger.debug(e);
    }
    var resBody = {
      error: e.message
    };
    if (config.debug) {
      try {
        res.setHeader('Content-Type', 'application/json');
      } catch (ex) {
        logger.error('Headers were already sent.', ex);
      }
      res.end(JSON.stringify(resBody, null, myApp.pretty) + '\n');
    } else {
      res.end();
    }
  }
  return e ? false : true;
};

myApp.validateHeadersAndBody = function(headers, body, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var err;
  if (!/(^|;)application\/json(;|$)/.test(headers['content-type'])) {
    if (config.validation && config.validation.headers && config.validation.headers.contentType &&
        config.validation.headers.contentType.warn === false) {
      logger.error('Unexpected content-type: ' + headers['content-type']);
      err = new BadRequestError('Unexpected content-type: ' + headers['content-type']);
    } else {
      logger.warn('Header validation failed for headers: %j', headers);
    }
  }
  if (err) {
    callback(err);
  } else {
    if (!utils.isJSON(body)) {
      callback(new BadRequestError('Body is not valid JSON'));
    } else {
      // if (config.debug) {
      //   logger.debug('BODY: %s', JSON.stringify(JSON.parse(body), null, 4) + '\n');
      //   logger.debug('BODY: %j', body);
      // }
      callback(null);
    }
  }
};

myApp.validatePagingParameters = function(req, callback) {
  var q = url.parse(req.url, true).query;
  if ((q.offset === undefined || (_.isInteger(Number(q.offset)) && _.inRange(q.offset, Number.MAX_SAFE_INTEGER))) &&
      (q.page_size === undefined || (_.isInteger(Number(q.page_size)) && _.inRange(q.page_size, 1, 1000)))) {

    q.offset = q.offset ? q.offset : 0;
    q.page_size = q.page_size ? q.page_size : 1000;
    callback(null, q.offset, q.page_size);
  } else {
    callback(new BadRequestError('Paging parameters failed validation'));
  }
};

myApp.extractCredentials = function(headers, body, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  myApp.validateHeadersAndBody(headers, body, function(err) {
    if (err) {
      callback(err);
    } else {
      var creds = JSON.parse(body);
      if (creds.email === undefined || creds.password === undefined) {
        callback(new BadRequestError('Credentials not supplied'));
      } else {
        creds.email += '';
        creds.password += '';
        if (/^[!-~]+$/.test(creds.email) && /^[!-~]+$/.test(creds.password)) {
          callback(null, creds);
        } else {
          callback(new BadRequestError('Credentials contain invalid characters'));
        }
      }
    }
  });
};

myApp.parseCookies = function(cookieHeader) {
  var p, retval = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(function(c) {
      p = c.split('=');
      retval[p.shift().trim()] = decodeURI(p).trim();
    });
  }
  return retval;
};

myApp.handleLogin = function(req, res) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.extractCredentials(req.headers, body, function(err, creds) {
      if (err) {
        myApp.handleError(err, res);
      } else {
        login.doLogin(res, creds.email, creds.password, function(err, token) {
          if (err) {
            myApp.handleError(err, res);
          } else {
            res.statusCode = 200;
            res.end(JSON.stringify(token, null, myApp.pretty) + '\n');
          }
        });
      }
    });
  });
};

myApp.renewAuthenticationToken = function(req, res, token) {
  req.on('data', function(chunk) {
  }).on('end', function() {
    login.updateToken(res, token.sub, function(err, token) {
      if (err) {
        myApp.handleError(err, res);
      } else {
        res.statusCode = 200;
        res.end(JSON.stringify(token, null, myApp.pretty) + '\n');
      }
    });
  });
};

myApp.passwordReset = function(req, res) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.extractCredentials(req.headers, body, function(err, creds) {
      if (err) {
        myApp.handleError(err, res);
      } else {
        login.resetPassword(creds.email, creds.password, function(err) {
          if (err) {
            myApp.handleError(err, res);
          } else {
            res.statusCode = 200;
            res.end();
          }
        });
      }
    });
  });
};

myApp.handlePasswordChange = function(req, res, token) {
  logger.debug('Password change requested');
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        var creds = JSON.parse(body);
        login.changePassword(token.sub, creds.current, creds.password, function(err) {
          if (err && err instanceof login.InvalidCredentialsError) {
            res.statusCode = 400;
            res.end();
          } else {
            if (myApp.handleError(err, res)) {
              res.statusCode = 200;
              res.end();
            }
          }
        });
      }
    });
  });
};

myApp.handleGetSystemStatus = function(req, res) {
  req.on('data', function(chunk) {
  }).on('end', function() {
    reports.getSystemStatus(function(err, status) {
      if (myApp.handleError(err, res)) {
        myApp.respondWithData(err, res, status);
      }
    });
  });
};

myApp.handleGetItinerary = function(req, res, token) {
  var match, id;
  req.on('data', function() {
  }).on('end', function() {
    match = /\/itinerary\/([0-9]+)?(?:\/|\?.*|$)/.exec(req.url);
    id = match ? match[1] : undefined;
    itineraries.getItinerary(token.sub, id, function(err, result) {
      myApp.respondWithData(err, res, result);
    });
  });
};

myApp.handleGetItineraries = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    var q = url.parse(req.url, true).query;
    if (_.isInteger(Number(q.offset)) && _.inRange(q.offset, Number.MAX_SAFE_INTEGER) &&
        _.isInteger(Number(q.page_size)) && _.inRange(q.page_size, 1, 1000)) {

      itineraries.getItineraries(token.sub, q.offset, q.page_size, function(err, result) {
        myApp.respondWithData(err, res, result);
      });
    } else {
      myApp.handleError(new BadRequestError('Parameters failed validation'), res);
    }
  });
};

myApp.handleGetItinerariesWithinDistance = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    var q = url.parse(req.url, true).query;
    if (q.lon !== undefined) {
      q.lng = q.lon;
    }
    if (q.longitude !== undefined) {
      q.lng = q.longitude;
    }
    if (q.latitude !== undefined) {
      q.lat = q.latitude;
    }
    logger.debug('Max search radius is: %d metres', myApp.maxItinerarySearchRadius);
    if (_.isInteger(Number(q.offset)) && _.inRange(q.offset, Number.MAX_SAFE_INTEGER) &&
        _.isInteger(Number(q.page_size)) && _.inRange(q.page_size, 1, 1000) &&
        Number(q.lat) >= -90 && Number(q.lat) <= 90 &&
        Number(q.lng) >= -180 && Number(q.lng) <= 180 &&
        Number(q.distance) >= 0 && Number(q.distance) <= myApp.maxItinerarySearchRadius) {

      itineraries.getItinerariesWithinDistance(token.sub, q.lng, q.lat, q.distance, q.offset, q.page_size, function(err, result) {
        myApp.respondWithData(err, res, result);
      });
    } else {
      myApp.handleError(new BadRequestError('Parameters failed validation'), res);
    }
  });
};

myApp.handleGetItineraryRoutesWithinDistance = function(req, res, token) {
  logger.debug('----------------------------------------');
  var match, id, q;
  req.on('data', function() {
  }).on('end', function() {
    match = /\/itinerary\/(\d+)\/routes\/?\?.*distance.*$/.exec(req.url);
    id = match ? match[1] : undefined;
    q = url.parse(req.url, true).query;
    if (q.lon !== undefined) {
      q.lng = q.lon;
    }
    if (q.longitude !== undefined) {
      q.lng = q.longitude;
    }
    if (q.latitude !== undefined) {
      q.lat = q.latitude;
    }
    if (Number(q.lat) >= -90 && Number(q.lat) <= 90 &&
        Number(q.lng) >= -180 && Number(q.lng) <= 180 &&
        Number(q.distance) >= 0 && Number(q.distance) <= myApp.maxItinerarySearchRadius) {

      itineraries.getItineraryRoutesWithinDistance(token.sub, id, q.lng, q.lat, q.distance, function(err, result) {
        myApp.respondWithData(err, res, result);
      });
    } else {
      myApp.handleError(new BadRequestError('Parameters failed validation'), res);
    }
  });
};

myApp.handleGetItineraryWaypointsWithinDistance = function(req, res, token) {
  var match, id, q;
  req.on('data', function() {
  }).on('end', function() {
    match = /\/itinerary\/(\d+)\/waypoints\/?\?.*distance.*$/.exec(req.url);
    id = match ? match[1] : undefined;
    q = url.parse(req.url, true).query;
    if (q.lon !== undefined) {
      q.lng = q.lon;
    }
    if (q.longitude !== undefined) {
      q.lng = q.longitude;
    }
    if (q.latitude !== undefined) {
      q.lat = q.latitude;
    }
    if (Number(q.lat) >= -90 && Number(q.lat) <= 90 &&
        Number(q.lng) >= -180 && Number(q.lng) <= 180 &&
        Number(q.distance) >= 0 && Number(q.distance) <= myApp.maxItinerarySearchRadius) {

      itineraries.getItineraryWaypointsWithinDistance(token.sub, id, q.lng, q.lat, q.distance, function(err, result) {
        myApp.respondWithData(err, res, result);
      });
    } else {
      myApp.handleError(new BadRequestError('Parameters failed validation'), res);
    }
  });
};

myApp.handleGetItineraryTracksWithinDistance = function(req, res, token) {
  var match, id, q;
  req.on('data', function() {
  }).on('end', function() {
    match = /\/itinerary\/(\d+)\/tracks\/?\?.*distance.*$/.exec(req.url);
    id = match ? match[1] : undefined;
    q = url.parse(req.url, true).query;
    if (q.lon !== undefined) {
      q.lng = q.lon;
    }
    if (q.longitude !== undefined) {
      q.lng = q.longitude;
    }
    if (q.latitude !== undefined) {
      q.lat = q.latitude;
    }
    if (Number(q.lat) >= -90 && Number(q.lat) <= 90 &&
        Number(q.lng) >= -180 && Number(q.lng) <= 180 &&
        Number(q.distance) >= 0 && Number(q.distance) <= myApp.maxItinerarySearchRadius) {

      itineraries.getItineraryTracksWithinDistance(token.sub, id, q.lng, q.lat, q.distance, function(err, result) {
        myApp.respondWithData(err, res, result);
      });
    } else {
      myApp.handleError(new BadRequestError('Parameters failed validation'), res);
    }
  });
};

myApp.handleSaveItinerary = function(req, res, token) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        var itinerary = JSON.parse(body);
        itineraries.saveItinerary(token.sub, itinerary, function(err, itineraryId) {
          myApp.respondWithData(err, res, itineraryId);
        });
      }
    });
  });
};

myApp.handleDeleteItinerary = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match = /\/itinerary\/([0-9]+)?(?:\/|\?.*|$)/.exec(req.url);
    id = match ? match[1] : undefined;
    itineraries.deleteItinerary(token.sub, id, function(err) {
      if (myApp.handleError(err, res)) {
        res.statusCode = 200;
        res.end();
      }
    });
  });
};

myApp.handleUploadItineraryFile = function(req, res, token) {
  var match, itineraryId;
  match = /\/itinerary\/file\/(\d+)(?:\?.*)?$/.exec(req.url);
  itineraryId = match ? match[1] : undefined;
  var form = new formidable.IncomingForm();
  form.maxFieldsSize = 10 * 1024 * 1024;
  form.hash = 'sha1';
  form.on('file', function(name, file) {
    // logger.debug('File saved as %s', file.path);
    // logger.debug('Original name: %s', file.name);
    // logger.debug('File size: %d bytes', file.size);
    // logger.debug('Hash: %s', file.hash);
    gpxUpload.importFile(itineraryId, file.path, true, function(err, result) {
      // logger.debug('Import result:', result);
    });
  });
  form.on('error', function() {
    logger.warn('Form upload failed');
    myApp.handleError(new Error('Form upload failed'));
  });
  form.on('abort', function() {
    logger.warn('Form upload aborted');
    myApp.handleError(new Error('Form upload aborted'));
  });
  form.on('end', function() {
    // logger.debug('Received upload of %d bytes', form.bytesReceived);
    // logger.debug('Expected %d bytes', form.bytesExpected);
    // logger.debug('File path: %s', form.uploadDir);
    res.statusCode = 200;
    res.end();
  });
  form.parse(req, function(err, fields, files) {
    // logger.debug('index.js - File uploaded');
  });
  return;
};

myApp.handleGetItineraryWaypointCount = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match =  /\/itinerary\/(\d+)\/waypoints\/count(?:\?.*)?$/.exec(req.url);
    id = match ? match[1] : undefined;
    itineraries.getItineraryWaypointCount(token.sub, id, function(err, count) {
      myApp.respondWithData(err, res, {count: count});
    });
  });
};

myApp.handleGetItineraryWaypoints = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match =  /\/itinerary\/(\d+)\/waypoint(?:\?.*)?$/.exec(req.url);
    id = match ? match[1] : undefined;
    itineraries.getItineraryWaypointsForUser(token.sub, id, function(err, waypoints) {
      myApp.respondWithData(err, res, waypoints);
    });
  });
};

myApp.handleGetItineraryWaypoint = function(req, res, token) {
  var match, itineraryId, waypointId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match = /\/itinerary\/(\d+)\/waypoint\/(\d+)(?:\?.*)?$/.exec(req.url);
    itineraryId = match ? match[1] : undefined;
    waypointId = match ? match[2] : undefined;
    itineraries.getItineraryWaypointForUser(token.sub, itineraryId, waypointId, function(err, waypoint) {
      myApp.respondWithData(err, res, waypoint);
    });
  });
};

myApp.handleGetSpecifiedItineraryWaypoints = function(req, res, token) {
  var match, id, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/waypoints\/specified(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        var params = JSON.parse(body);
        if (params && Array.isArray(params.waypoints)) {
          itineraries.getSpecifiedItineraryWaypointsForUser(token.sub, id, params.waypoints, function(err, waypoints) {
            myApp.respondWithData(err, res, waypoints);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleSaveItineraryWaypoint = function(req, res, token) {
  var match, itineraryId, wptId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/(\d+)\/waypoint(?:\/?|\/(\d+))?(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        wptId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params) {
          itineraries.saveItineraryWaypoint(token.sub, itineraryId, wptId, params, function(err, newWaypointId) {
            myApp.respondWithData(err, res, newWaypointId);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleMoveItineraryWaypoint = function(req, res, token) {
  var match, itineraryId, wptId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/(\d+)\/waypoint\/(\d+)\/move(?:\/?|\/(\d+))?(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        wptId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params) {
          itineraries.moveItineraryWaypoint(token.sub, itineraryId, wptId, params, function(err) {
            myApp.noResponseData(err, res);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleDeleteItineraryWaypoint = function(req, res, token) {
  var match, itineraryId, wptId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match = /\/itinerary\/(\d+)\/waypoint\/(\d+)(?:\/?|\/(\d+))?(?:\?.*)?$/.exec(req.url);
    itineraryId = match ? match[1] : undefined;
    wptId = match ? match[2] : undefined;
    itineraries.deleteItineraryWaypoint(token.sub, itineraryId, wptId, function(err) {
      myApp.noResponseData(err, res);
    });
  });
};

myApp.handleGetItineraryRouteNames = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match =  /\/itinerary\/(\d+)\/routes\/names(?:\?.*)?$/.exec(req.url);
    id = match ? match[1] : undefined;
    itineraries.getItineraryRouteNames(token.sub, id, function(err, routeNames) {
      myApp.respondWithData(err, res, routeNames);
    });
  });
};

myApp.handleGetItineraryRouteName = function(req, res, token) {
  var match, itineraryId, routeId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match =  /\/itinerary\/(\d+)\/route\/name\/(\d+)(?:\?.*)?$/.exec(req.url);
    itineraryId = match ? match[1] : undefined;
    routeId = match ? match[2] : undefined;
    itineraries.getItineraryRouteName(token.sub, itineraryId, routeId, function(err, route) {
      myApp.respondWithData(err, res, route);
    });
  });
};

myApp.handleUpdateItineraryRouteName = function(req, res, token) {
  var match, itineraryId, routeId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/route\/name\/(\d+)(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        routeId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params && params.name !== undefined && params.color !== undefined) {
          itineraries.updateItineraryRouteName(token.sub, itineraryId, routeId, params.name, params.color, function(err) {
            myApp.noResponseData(err, res);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleSaveItineraryRoute = function(req, res, token) {
  var match, itineraryId, routeId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/(\d+)\/route(?:\/(\d+))?(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        routeId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params && params.points !== undefined) {
          itineraries.saveItineraryRoute(token.sub, itineraryId, routeId, params, function(err, result) {
            myApp.respondWithData(err, res, result);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleDeleteItineraryRoute = function(req, res, token) {
  var match, itineraryId, routeId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match =  /\/itinerary\/(\d+)\/route\/(\d+)(?:\?.*)?$/.exec(req.url);
    itineraryId = match ? match[1] : undefined;
    routeId = match ? match[2] : undefined;
    if (routeId) {
      itineraries.deleteItineraryRoute(token.sub, itineraryId, routeId, function(err) {
        myApp.noResponseData(err, res);
      });
    } else {
      myApp.handleError(new Error('Invalid parameters'), res);
    }
  });
};

myApp.handleGetItineraryRoutePoints = function(req, res, token) {
  var match, itineraryId, routeId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validatePagingParameters(req, function(err, offset, limit) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/route\/(\d+)\/points(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        routeId = match ? match[2] : undefined;
        if (routeId) {
          itineraries.getItineraryRoutePoints(
            token.sub,
            itineraryId,
            routeId,
            offset,
            limit,
            function(err, result) {
              myApp.respondWithData(err, res, result);
            });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleReplaceItineraryRoutePoints = function(req, res, token) {
  var match, itineraryId, routeId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/(\d+)\/route\/(\d+)\/points(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        routeId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params && params.points !== undefined) {
          itineraries.replaceItineraryRoutePoints(token.sub, itineraryId, routeId, params.points, function(err, result) {
            myApp.respondWithData(err, res, result);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleDeleteItineraryRoutePoints = function(req, res, token) {
  var match, itineraryId, routeId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/(\d+)\/route\/(\d+)\/delete-points(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        routeId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params && params.points !== undefined) {
          itineraries.deleteItineraryRoutePoints(token.sub, itineraryId, routeId, params.points, function(err, result) {
            myApp.respondWithData(err, res, result);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleGetItineraryTrackNames = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match =  /\/itinerary\/(\d+)\/track\/names(?:\?.*)?$/.exec(req.url);
    id = match ? match[1] : undefined;
    itineraries.getItineraryTrackNames(token.sub, id, function(err, trackNames) {
      myApp.respondWithData(err, res, trackNames);
    });
  });
};

myApp.handleSaveItineraryTrack = function(req, res, token) {
  var match, itineraryId, trackId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/(\d+)\/track(?:\/(\d+))?(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        trackId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params && ((Array.isArray(params.segments) || (params.track && Array.isArray(params.track.segments))))) {
          itineraries.saveItineraryTrack(
            token.sub,
            itineraryId,
            trackId,
            params.track,
            params.segments,
            function(err, track) {
              myApp.noResponseData(err, res, track);
            });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleGetItineraryTrackName = function(req, res, token) {
  var match, itineraryId, trackId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match =  /\/itinerary\/(\d+)\/track\/name\/(\d+)(?:\?.*)?$/.exec(req.url);
    itineraryId = match ? match[1] : undefined;
    trackId = match ? match[2] : undefined;
    itineraries.getItineraryTrackName(token.sub, itineraryId, trackId, function(err, track) {
      myApp.respondWithData(err, res, track);
    });
  });
};

myApp.handleUpdateItineraryTrackName = function(req, res, token) {
  var match, itineraryId, trackId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/track\/name\/(\d+)(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        trackId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params && params.name !== undefined && params.color !== undefined) {
          itineraries.updateItineraryTrackName(token.sub, itineraryId, trackId, params.name, params.color, function(err) {
            myApp.noResponseData(err, res);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleGetItineraryTracks = function(req, res, token) {
  var match, id, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/tracks\/selected(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        var params = JSON.parse(body);
        if (params && Array.isArray(params.tracks)) {
          itineraries.getItineraryTracksForUser(token.sub, id, params.tracks, function(err, tracks) {
            myApp.respondWithData(err, res, tracks);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleGetItineraryTrackSegments = function(req, res, token) {
  var match, itineraryId, trackId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validatePagingParameters(req, function(err, offset, limit) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/track\/(\d+)\/segment(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        trackId = match ? match[2] : undefined;
        itineraries.getItineraryTrackSegmentsForUser(
          token.sub,
          itineraryId,
          trackId,
          offset,
          limit,
          function(err, track) {
            myApp.respondWithData(err, res, track);
          });
      }
    });
  });
};

myApp.handleGetItineraryTrackSegmentWithPaging = function(req, res, token) {
  var match, itineraryId, segmentId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validatePagingParameters(req, function(err, offset, limit) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/track\/\d+\/segment\/(\d+)(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        segmentId = match ? match[2] : undefined;
        itineraries.getItineraryTrackSegmentForUser(
          token.sub,
          itineraryId,
          segmentId,
          offset,
          limit,
          function(err, track) {
            myApp.respondWithData(err, res, track);
          });
      }
    });
  });
};

myApp.handleGetItineraryTrackSegmentWithoutPaging = function(req, res, token) {
  var match, itineraryId, segmentId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match =  /\/itinerary\/(\d+)\/track\/\d+\/segment\/(\d+)(?:\?.*)?$/.exec(req.url);
    itineraryId = match ? match[1] : undefined;
    segmentId = match ? match[2] : undefined;
    itineraries.getItineraryTrackSegmentForUser(
      token.sub,
      itineraryId,
      segmentId,
      null,
      null,
      function(err, track) {
        myApp.respondWithData(err, res, track);
      });
  });
};

myApp.handleDeleteItineraryTrackSegments = function(req, res, token) {
  var match, itineraryId, trackId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match = /itinerary\/(\d+)\/track\/(\d+)\/delete-segments(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        trackId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params && Array.isArray(params.segments)) {
          itineraries.deleteItineraryTrackSegmentsForUser(
            token.sub,
            itineraryId,
            trackId,
            params.segments,
            function(err) {
              myApp.noResponseData(err, res);
            });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleDeleteItineraryTrackSegmentPoints = function(req, res, token) {
  var match, itineraryId, trackId, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /itinerary\/(\d+)\/track\/(\d+)\/segment\/\d+\/delete-points(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        trackId = match ? match[2] : undefined;
        var params = JSON.parse(body);
        if (params && Array.isArray(params.points)) {
          itineraries.deleteItineraryTrackSegmentPointsForUser(
            token.sub,
            itineraryId,
            trackId,
            params.points,
            function(err) {
              myApp.noResponseData(err, res);
            });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleGetItineraryRoutes = function(req, res, token) {
  var match, id, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/routes(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        var params = JSON.parse(body);
        if (params && Array.isArray(params.routes)) {
          itineraries.getItineraryRoutesForUser(token.sub, id, params.routes, function(err, routes) {
            myApp.respondWithData(err, res, routes);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleGetItineraryRoute = function(req, res, token) {
  var match, itineraryId, routeId, route;
  req.on('data', function(chunk) {
  }).on('end', function() {
    match =  /\/itinerary\/(\d+)\/route\/(\d+)(?:\?.*)?$/.exec(req.url);
    itineraryId = match ? match[1] : undefined;
    routeId = match ? match[2] : undefined;
    if (itineraryId && routeId) {
      itineraries.getItineraryRoutesForUser(token.sub, itineraryId, [routeId], function(err, routes) {
        if (routes && routes.length === 1) {
          route = routes[0];
        } else {
          if (routes && routes.length > 1) {
            logger.error('itineraries.getItineraryRoutesForUser() returned multiple routes when queried for a single route with id: %s', routeId);
          }
          route = {};
        }
        myApp.respondWithData(err, res, route);
      });
    } else {
      myApp.handleError(new Error('Invalid parameters'), res);
    }
  });
};

myApp.handleGetItineraryShares = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validatePagingParameters(req, function(err, offset, limit) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/share\/([0-9]+)(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        itineraries.getItineraryShares(token.sub, id, offset, limit, function(err, myItineraries) {
          myApp.respondWithData(err, res, myItineraries);
        });
      }
    });
  });
};

myApp.handleGetSharedItinerariesForUser = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validatePagingParameters(req, function(err, offset, limit) {
      if (myApp.handleError(err, res)) {
        match = /\/itineraries\/shares(?:\?.*)$/.exec(req.url);
        id = match ? match[1] : undefined;
        itineraries.getSharedItinerariesForUser(token.sub, offset, limit, function(err, myItineraries) {
          myApp.respondWithData(err, res, myItineraries);
        });
      }
    });
  });
};

myApp.handleShareItinerary = function(req, res, token) {
  var body = [];
  var match, id, share;
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        share = JSON.parse(body);
        match = /\/itinerary\/share\/([0-9]+)(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        if (share !== undefined) {
          itineraries.shareItinerary(token.sub, id, share, function(err) {
            if (myApp.handleError(err, res)) {
              res.statusCode = 200;
              res.end();
            }
          });
        } else {
          myApp.handleError(new BadRequestError('Missing body'));
        }
      }
    });
  });
};

myApp.handleUpdateItineraryShares = function(req, res, token) {
  var body = [];
  var match, id, data;
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        data = JSON.parse(body);
        match = /\/itinerary\/share\/([0-9]+)(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        if (data.updateType !== undefined && data.shares !== undefined &&
            Array.isArray(data.shares)) {
          switch(data.updateType) {
          case 'activeStateChange':
            itineraries.updateItinerarySharesActiveStates(token.sub, id, data.shares, function(err) {
              myApp.noResponseData(err, res);
            });
            break;
          case 'delete':
            itineraries.deleteItinerarySharesForShareList(token.sub, id, data.shares, function(err) {
              myApp.noResponseData(err, res);
            });
            break;
          default:
            myApp.handleError(new Error('Invalid itinerary share updateType of ' + data.updateType), res);
            break;
          }
        }
      }
    });
  });
};

myApp.handleGetUser = function(req, res) {
  var match = /\/admin\/user\/([\d]+)\/?(?:\?.*)?$/.exec(req.url);
  var id = match !== null ? match[1] : undefined;
  if (!id) {
    myApp.handleError(new BadRequestError('Missing user ID'));
  } else {
    login.getUser(id, function(err, result) {
      myApp.respondWithData(err, res, result);
    });
  }
};

myApp.handleGetUsers = function(req, res) {
  req.on('data', function() {
  }).on('end', function() {
    myApp.validatePagingParameters(req, function(err, offset, limit) {
      var q = url.parse(req.url, true).query;
      if (myApp.handleError(err, res)) {
        login.getUsers(offset, limit, q.nickname, q.email, q.searchType, function(err, result) {
          myApp.respondWithData(err, res, result);
        });
      }
    });
  });
};

myApp.handleDeleteUser = function(req, res) {
  var match = /\/admin\/user\/([\d]+)\/?(?:\?.*)?$/.exec(req.url);
  var id = match !== null ? match[1] : undefined;
  if (!id) {
    myApp.handleError(new BadRequestError('Missing user ID'));
  } else {
    login.deleteUser(id, function(err, result) {
      if (myApp.handleError(err, res)) {
        res.statusCode = 200;
        res.end();
      }
    });
  }
};

myApp.handleCreateUser = function(req, res) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        var user = JSON.parse(body);
        login.createUser(user, function(err) {
          myApp.noResponseData(err, res);
        });
      }
    });
  });
};

myApp.handleUpdateUser = function(req, res) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        var user = JSON.parse(body);
        login.updateUser(user, function(err) {
          myApp.noResponseData(err, res);
        });
      }
    });
  });
};

myApp.handleGetNicknames = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    tracks.getNicknames(token.sub, function(err, result) {
      myApp.respondWithData(err, res, result);
    });
  });
};

myApp.handleGetNickname = function(req, res, token) {
  login.getNicknameForUsername(token.sub, function(err, nickname) {
    myApp.respondWithData(err, res, {nickname: nickname});
  });
};

myApp.handleGetPathColors = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    tracks.getColors(function(err, result) {
      myApp.respondWithData(err, res, result);
    });
  });
};

myApp.handleGetWaypointSymbols = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    itineraries.getWaypointSymbols(function(err, result) {
      myApp.respondWithData(err, res, result);
    });
  });
};

myApp.handleGetGeoreferenceFormats = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    itineraries.getGeoreferenceFormats(function(err, result) {
      myApp.respondWithData(err, res, result);
    });
  });
};

myApp.extractLocationQueryParams = function(req, token, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  var q = url.parse(req.url, true).query;
  var match = /\/(?:location|download\/tracks)\/([!-\.0->@-~]+)(?:\?|\/|$)/.exec(req.url);
  q.username = token.sub;
  // Reduce the size of the object by removing unused attributes
  q.access_token = undefined;
  q.nickname = match !== null ? match[1] : undefined;
  q.notesOnlyFlag = (q.notesOnlyFlag !== 'true') ? false : true;
  q.order = (q.order !== 'DESC') ? 'ASC' : 'DESC';
  if (q.from === undefined || q.to === undefined ||
      !utils.isISO8601(q.from) || !utils.isISO8601(q.to) ||
      (q.max_hdop !== undefined && !_.inRange(q.max_hdop, 99999.9)) ||
      (q.page_size !== undefined && (!_.isInteger(Number(q.page_size)) || !_.inRange(q.page_size, 1, 1000))) ||
      (q.offset !== undefined && (!_.isInteger(Number(q.offset)) || !_.inRange(q.offset, Number.MAX_SAFE_INTEGER)))) {
    logger.error('Parameters failed validation: %j', q);
    callback(new BadRequestError('Parameters failed validation'));
  } else {
    callback(null, q);
  }
};

myApp.handleGetTile = function(req, res) {
  var q = url.parse(req.url, true).query;
  // Must be authorized to fetch tiles - but we use URL parameter instead of authorization header
  if (q.access_token === undefined) {
    myApp.handleError(new login.UnauthorizedError('Access token  missing fetching tile'), res);
  } else {
    login.checkAuthenticatedForBasicResources(q.access_token, function(err, token) {
      if (err) {
        logger.debug('Token failed verification for map tile');
        res.statusCode = 401;
        res.end();
      } else {
        // User is authorized - Fetch tile
        if (q.x !== undefined && q.y !== undefined && q.z !== undefined && q.id !== undefined) {
          tiles.fetchTile(q.id, q.x, q.y, q.z, function(err, tile) {
            if (err) {
              logger.debug('Returning HTTP status 404 for tile: id:%d, x:%d, y:%d, z:%d', q.id, q.x, q.y, q.z);
              res.statusCode = 404;
              res.end();
            } else {
              if (Buffer.isBuffer(tile.image)) {
                res.setHeader('Expires', tile.expires.toUTCString());
                res.setHeader('Content-type', 'image/png');
                res.statusCode = 200;
                res.end(tile.image);
              } else {
                logger.warn('Failure retrieving tile - image is not a Buffer id:%d, x:%d, y:%d, z:%d', q.id, q.x, q.y, q.z);
                logger.warn('Returning HTTP status 500 for tile: id:%d, x:%d, y:%d, z:%d', q.id, q.x, q.y, q.z);
                res.statusCode = 500;
                res.end();
              }
            }
          });
        } else {
          myApp.handleError(new BadRequestError('Invalid tile parameters'), res);
        }
      }
    });
  }
};

myApp.handleLogPoint = function(req, res) {
  var q = url.parse(req.url, true).query;
  tracks.logPoint(q, function(err, user) {
    if (myApp.handleError(err, res)) {
      io.emit(user.nickname, {update: true});
      res.statusCode = 200;
      res.end();
    }
  });
};

myApp.handlePostLogPoint = function(req, res) {
  var q, contentType, body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    contentType = req.headers['content-type'];
    logger.debug('content-type: "%s"', contentType);
    if (/(^|;)application\/x-www-form-urlencoded(;|$)/.test(contentType)) {
      logger.debug('Handling as application/x-www-form-urlencoded');
      q = qs.parse(body);
    } else if (/(^|;)application\/json(;|$)/.test(contentType)) {
      logger.debug('Handling as application/json');
      q = utils.parseJSON(body);
    } else {
      // TracCar client doesn't set content-type, so just log failure
      logger.debug('Unexpected content-type of %s - handling as containing query parameters', contentType);
      // myApp.handleError(new BadRequestError('handlePostLogPoint() unexpected content-type: ' + req.headers['content-type']), res);
      // return;
      q = url.parse(req.url, true).query;
    }
    // if (config.debug) {
    //   logger.debug('BODY:', body);
    // }
    if (q !== undefined) {
      if (q.decodenote === 'true' && q.note && q.note.length > 0) {
        // fix where note has been URI encoded twice
        q.note = decodeURIComponent(q.note.replace('+', '%20'));
      }
      tracks.logPoint(q, function(err, user) {
        if (myApp.handleError(err, res)) {
          io.emit(user.nickname, {update: true});
          myApp.noResponseData(err, res);
        }
      });
    } else {
      logger.debug('Failure parsing data handling POSTed location with content-type: %s', contentType);
    }
  });
};

myApp.handleGetLocations = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    myApp.extractLocationQueryParams(req, token, function(err, query) {
      if (err) {
        myApp.handleError(err, res);
      } else {
        tracks.getLocations(query, function(err, result) {
          myApp.respondWithData(err, res, result);
        });
      }
    });
  });
};

myApp.handleDownloadLocations = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    myApp.extractLocationQueryParams(req, token, function(err, query) {
      if (err) {
        myApp.handleError(err, res);
      } else {
        tracks.getLocationsAsXml(query, function(err, result) {
          if (err) {
            logger.warn('Error fetching tracks', err);
            myApp.handleError(err, res);
          } else {
            res.setHeader('Content-type', 'application/gpx+xml');
            res.setHeader('Content-Disposition', 'attachment; filename="trip.gpx"');
            res.statusCode = 200;
            res.end(result);
          }
        });
      }
    });
  });
};

myApp.handleDownloadItineraryGpx = function(req, res, token) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        var match, itineraryId;
        match = /\/download\/itinerary\/(\d+)\/gpx(?:\/)?([!-\.0->@-~]+)?(\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        var params = utils.parseJSON(body);
        itineraries.downloadItineraryGpx(token.sub, itineraryId, params, function(err, result) {
          if (myApp.handleError(err, res)) {
            res.setHeader('Content-type', 'application/gpx+xml');
            res.setHeader('Content-Disposition', 'attachment; filename=trip.gpx');
            res.statusCode = 200;
            res.end(result);
          }
        });
      }
    });
  });
};

myApp.handleDownloadItineraryKml = function(req, res, token) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        var match, itineraryId;
        match = /\/download\/itinerary\/(\d+)\/kml(?:\/)?([!-\.0->@-~]+)?(\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        var params = JSON.parse(body);
        itineraries.downloadItineraryKml(token.sub, itineraryId, params, function(err, result) {
          if (myApp.handleError(err, res)) {
            res.setHeader('Content-type', 'application/vnd.google-earth.kml+xml');
            res.setHeader('Content-Disposition', 'attachment; filename=trip.kml');
            res.statusCode = 200;
            res.end(result);
          }
        });
      }
    });
  });
};

myApp.handleDeleteItineraryUploads = function(req, res, token) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        var match, itineraryId;
        match = /\/download\/itinerary\/(\d+)\/delete-gpx(?:\/)?(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        var params = JSON.parse(body);
        itineraries.deleteItineraryUploads(token.sub, itineraryId, params, function(err) {
          if (myApp.handleError(err, res)) {
            res.statusCode = 200;
            res.end();
          }
        });
      }
    });
  });
};

myApp.handleGetTrackingInfo = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    tracks.getTrackingInfo(token.sub, function(err, result) {
      myApp.respondWithData(err, res, result);
    });
  });
};

myApp.handleUpdateTrackingInfo = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    tracks.updateTrackingInfo(token.sub, function(err, result) {
      myApp.respondWithData(err, res, result);
    });
  });
};

myApp.handleGetLocationShares = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    var q = url.parse(req.url, true).query;
    if ((q.offset === undefined || !_.isInteger(Number(q.offset)) || !_.inRange(q.offset, Number.MAX_SAFE_INTEGER)) &&
        (q.page_size === undefined || !_.isInteger(Number(q.page_size)) || !_.inRange(q.page_size, 1, 1000))) {
      myApp.handleError(new BadRequestError('Parameters failed validation'), res);
    } else {
      shares.getLocationShares(token.sub, q.offset, q.page_size, function(err, result) {
        myApp.respondWithData(err, res, result);
      });
    }
  });
};

myApp.handleGetConfigMapAttribution = function(req, res, token) {
  req.on('data', function() {
  }).on('end', function() {
    if (config.tile && config.tile.providers && Array.isArray(config.tile.providers) &&
        config.tile.providers.length > 0) {
      var layers = [];
      config.tile.providers.forEach(function(v) {
        layers.push(v.mapLayer);
      });
      myApp.respondWithData(null, res, layers);
    } else {
      logger.warn('config.json is invalid - tile.providers must be defined as an array');
      myApp.respondWithData(null, res, [ {"name": "Error", "type": "xyz", "tileAttributions": [{"text": "No map provider configured"}]} ]);
    }
  });
};

myApp.noResponseData = function(err, res) {
  if (err) {
    myApp.handleError(err, res);
  } else {
    res.statusCode = 200;
    res.end();
  }
};

myApp.respondWithData = function(err, res, result) {
  if (myApp.handleError(err, res)) {
    if (result) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.statusCode = 200;
    if (result) {
      res.end(JSON.stringify(result, null, myApp.pretty) + '\n');
    } else {
      res.end();
    }
  }
};

myApp.handleUpdateLocationShares = function(req, res, token) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (err) {
        myApp.handleError(err, res);
      } else {
        var data = JSON.parse(body);
        if (data.updateType !== undefined && data.shares !== undefined &&
            Array.isArray(data.shares)) {
          switch(data.updateType) {
          case 'activeStateChange':
            shares.updateLocationShareActiveStates(token.sub, data.shares, function(err) {
              myApp.noResponseData(err, res);
            });
            break;
          case 'delete':
            shares.deleteLocationSharesForShareList(token.sub, data.shares, function(err) {
              myApp.noResponseData(err, res);
            });
            break;
          default:
            myApp.handleError(new Error('Invalid updateType of ' + data.updateType), res);
            break;
          }
        }
      }
    });
  });
};

myApp.handleSaveLocationShare = function(req, res, token) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    myApp.validateHeadersAndBody(req.headers, body, function(err) {
      if (myApp.handleError(err, res)) {
        var share = JSON.parse(body);
        if (shares.validateShare(share)) {
          shares.saveLocationShare(token.sub, share, function(err) {
            myApp.noResponseData(err, res);
          });
        } else {
          myApp.handleError(new BadRequestError(), res);
        }
      }
    });
  });
};

myApp.handleFullyAuthenticatedRequests = function(req, res, token) {
  if (req.method === 'GET' && /\/login\/token\/renew/.test(req.url))  {
    myApp.renewAuthenticationToken(req, res, token);
  } else if (req.method === 'GET' && /\/nicknames\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetNicknames(req, res, token);
  } else if (req.method === 'GET' && /\/nickname\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetNickname(req, res, token);
  } else if (req.method === 'GET' && /\/download\/tracks(\/)?([!-\.0->@-~]+)?(\?.*)?$/.test(req.url)) {
    myApp.handleDownloadLocations(req, res, token);
  } else if (req.method === 'POST' && /\/download\/itinerary\/(\d+)\/gpx(?:\/)?([!-\.0->@-~]+)?(\?.*)?$/.test(req.url)) {
    myApp.handleDownloadItineraryGpx(req, res, token);
  } else if (req.method === 'POST' && /\/download\/itinerary\/(\d+)\/kml(?:\/)?([!-\.0->@-~]+)?(\?.*)?$/.test(req.url)) {
    myApp.handleDownloadItineraryKml(req, res, token);
  } else if (req.method === 'PUT' && /\/download\/itinerary\/(\d+)\/delete-gpx(?:\/)?(?:\?.*)?$/.test(req.url)) {
    myApp.handleDeleteItineraryUploads(req, res, token);
  } else if (req.method === 'GET' && /\/location\/shares\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetLocationShares(req, res, token);
  } else if (req.method === 'POST' && /\/location\/shares\/?(\?.*)?$/.test(req.url)) {
    myApp.handleUpdateLocationShares(req, res, token);
  } else if (req.method === 'PUT' && /\/location\/share\/?(\?.*)?$/.test(req.url)) {
    myApp.handleSaveLocationShare(req, res, token);
  } else if (req.method === 'GET' && /\/location(\/)?([!-\.0->@-~]+)?(\?.*)?$/.test(req.url)) {
    myApp.handleGetLocations(req, res, token);
  } else if (req.method === 'GET' && /\/tracking_uuid\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetTrackingInfo(req, res, token);
  } else if (req.method === 'PUT' && /\/tracking_uuid\/?(\?.*)?$/.test(req.url)) {
    myApp.handleUpdateTrackingInfo(req, res, token);
  } else if (req.method === 'GET' && /\/itineraries\/?\?.*distance.*$/.test(req.url)) {
    myApp.handleGetItinerariesWithinDistance(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/routes\/?\?.*distance.*$/.test(req.url)) {
    myApp.handleGetItineraryRoutesWithinDistance(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/waypoints\/?\?.*distance.*$/.test(req.url)) {
    myApp.handleGetItineraryWaypointsWithinDistance(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/tracks\/?\?.*distance.*$/.test(req.url)) {
    myApp.handleGetItineraryTracksWithinDistance(req, res, token);
  } else if (req.method === 'GET' && /\/itineraries\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraries(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/?(?:[0-9]+)?(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItinerary(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/?(?:[0-9]+)?(?:\?.*)?$/.test(req.url)) {
    myApp.handleSaveItinerary(req, res, token);
  } else if (req.method === 'DELETE' && /\/itinerary\/?(?:[0-9]+)?(?:\?.*)?$/.test(req.url)) {
    myApp.handleDeleteItinerary(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/file\/\d+(?:\?.*)?$/.test(req.url)) {
    myApp.handleUploadItineraryFile(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/\d+\/waypoints\/count(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryWaypointCount(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/(\d+)\/waypoints\/specified(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetSpecifiedItineraryWaypoints(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/waypoint(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryWaypoints(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/waypoint\/(\d+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryWaypoint(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/(\d+)\/waypoint(?:\/?|\/(\d+))?(?:\?.*)?$/.test(req.url)) {
    myApp.handleSaveItineraryWaypoint(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/(\d+)\/waypoint\/(\d+)\/move(?:\/?|\/(\d+))?(?:\?.*)?$/.test(req.url)) {
    myApp.handleMoveItineraryWaypoint(req, res, token);
  } else if (req.method === 'DELETE' && /\/itinerary\/(\d+)\/waypoint\/(\d+)(?:\/?|\/(\d+))?(?:\?.*)?$/.test(req.url)) {
    myApp.handleDeleteItineraryWaypoint(req, res, token);
  } else if (req.method === 'GET' && /\/waypoint\/symbols(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetWaypointSymbols(req, res, token);
  } else if (req.method === 'GET' && /\/georef\/formats(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetGeoreferenceFormats(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/\d+\/routes\/names(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryRouteNames(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/route\/name\/(\d+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryRouteName(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/(\d+)\/route\/name\/(\d+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleUpdateItineraryRouteName(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/(\d+)\/route(?:\/(\d+))?(?:\?.*)?$/.test(req.url)) {
    myApp.handleSaveItineraryRoute(req, res, token);
  } else if (req.method === 'DELETE' && /\/itinerary\/(\d+)\/route\/(\d+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleDeleteItineraryRoute(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/route\/(\d+)\/points(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryRoutePoints(req, res, token);
  } else if (req.method === 'PUT' && /\/itinerary\/(\d+)\/route\/(\d+)\/points(?:\?.*)?$/.test(req.url)) {
    myApp.handleReplaceItineraryRoutePoints(req, res, token);
  } else if (req.method === 'PUT' && /\/itinerary\/(\d+)\/route\/(\d+)\/delete-points(?:\?.*)?$/.test(req.url)) {
    myApp.handleDeleteItineraryRoutePoints(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/\d+\/routes(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryRoutes(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/route\/(\d+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryRoute(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/track\/names(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryTrackNames(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/(\d+)\/track(?:\/(\d+))?(?:\?.*)?$/.test(req.url)) {
    myApp.handleSaveItineraryTrack(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/(\d+)\/tracks\/selected(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryTracks(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/track\/name\/(\d+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryTrackName(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/(\d+)\/track\/name\/(\d+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleUpdateItineraryTrackName(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/track\/(\d+)\/segment(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryTrackSegments(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/track\/\d+\/segment\/(\d+)\?.*page_size=/.test(req.url)) {
    myApp.handleGetItineraryTrackSegmentWithPaging(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/(\d+)\/track\/\d+\/segment\/(\d+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryTrackSegmentWithoutPaging(req, res, token);
  } else if (req.method === 'PUT' && /itinerary\/(\d+)\/track\/(\d+)\/delete-segments(?:\?.*)?$/.test(req.url)) {
    myApp.handleDeleteItineraryTrackSegments(req, res, token);
  } else if (req.method === 'PUT' && /itinerary\/(\d+)\/track\/\d+\/segment\/\d+\/delete-points(?:\?.*)?$/.test(req.url)) {
    myApp.handleDeleteItineraryTrackSegmentPoints(req, res, token);
  } else if (req.method === 'GET' && /\/path\/colors(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetPathColors(req, res, token);
  } else if (req.method === 'GET' && /\/itinerary\/share\/(?:[0-9]+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleGetItineraryShares(req, res, token);
  } else if (req.method === 'GET' && /\/itineraries\/shares(?:\?.*)$/.test(req.url)) {
    myApp.handleGetSharedItinerariesForUser(req, res, token);
  } else if (req.method === 'POST' && /\/itinerary\/share\/(?:[0-9]+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleUpdateItineraryShares(req, res, token);
  } else if (req.method === 'PUT' && /\/itinerary\/share\/(?:[0-9]+)(?:\?.*)?$/.test(req.url)) {
    myApp.handleShareItinerary(req, res, token);
  } else if (req.method === 'GET' && /\/config\/map\/layers\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetConfigMapAttribution(req, res, token);
  } else if (req.method === 'PUT' && /\/account\/password\/?/.test(req.url)) {
    myApp.handlePasswordChange(req, res, token);
  } else if (token.uk_co_fdsd_trip_admin && req.method === 'GET' && /\/admin\/user\/[\d]+\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetUser(req, res);
  } else if (token.uk_co_fdsd_trip_admin && req.method === 'GET' && /\/admin\/user\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetUsers(req, res);
  } else if (token.uk_co_fdsd_trip_admin && req.method === 'POST' && /\/admin\/user\/[\d]+\/?(\?.*)?$/.test(req.url)) {
    myApp.handleUpdateUser(req, res);
  } else if (token.uk_co_fdsd_trip_admin && req.method === 'POST' && /\/admin\/user\/?(\?.*)?$/.test(req.url)) {
    myApp.handleCreateUser(req, res);
  } else if (token.uk_co_fdsd_trip_admin && req.method === 'DELETE' && /\/admin\/user\/[\d]+\/?(\?.*)?$/.test(req.url)) {
    myApp.handleDeleteUser(req, res);
  } else if (token.uk_co_fdsd_trip_admin && req.method === 'POST' && /\/admin\/password\/reset\/?(\?.*)?$/.test(req.url)) {
    myApp.passwordReset(req, res);
  } else if (token.uk_co_fdsd_trip_admin && req.method === 'GET' && /\/admin\/system\/status\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetSystemStatus(req, res);
  } else {
    logger.warn('URL path not recognised: %s', req.url);
    myApp.handleError(new BadRequestError('URL path not recognised: ' + req.url), res);
  }
};

myApp.serveStaticFiles = function(req, res) {
  var m;
  myApp.fileServer.serve(req, res, function(err, result) {
    if (err) {
      // If the URL is prefixed with /trip/ try it without the prefix
      if (err.status === 404  && /^\/trip(\/.+)$/.test(req.url)) {
        m = /^\/trip(\/.+)$/.exec(req.url);
        logger.debug('Attempting to serve %s instead of %s', m[1], req.url);
        req.url = m[1];
        myApp.fileServer.serve(req, res, function(err, result) {
          if (err) {
            logger.debug('Error attempting to serve file: %s', req.url, err);
            if (err.status === 404) {
              logger.debug('Trying to return /app/index.html instead');
              // Might be a page reload with a "pretty" URL
              myApp.fileServer.serveFile('/app/index.html', 200, {}, req, res).addListener('error', function(err) {
                logger.error('Error serving /app/index.html');
                res.statusCode = 501;
                res.end();
              });
            } else {
              logger.error('Error serving static file %s - %s', req.url, err.message);
              res.writeHead(err.status, err.headers);
              res.end();
            }
          }
        });
      } else {
        logger.warn('Error serving static file %s - %s', req.url, err.message);
        res.writeHead(err.status, err.headers);
        res.end();
      }
    }
  });
};

myApp.shutdown = function() {
  logger.info('[index.js] shutdown');
  db.shutdown(function() {
    logger.info('[index.js] database pool closed');
    //   process.exit(0);
  });
};

myApp.server = http.createServer(function(req, res) {
  var xsrfToken, token, cookies;
  if (config.debug) {
    logger.debug('method: %s url: %s', req.method, req.url);
  }
  // req.addListener('end', function() {
  // }).resume();
  var method = req.method;
  // var userAgent = req.headers['user-agent'];
  // res.setHeader('X-Powered-By', 'Node.js');
  req.on('error', function(err) {
    myApp.handleError(err, res);
  });
  if (req.method === 'GET' && /\/tile\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetTile(req, res);
  } else if (req.method === 'POST' && /\/login\/?(\?.*)?$/.test(req.url)) {
    myApp.handleLogin(req, res);
  } else if (req.method === 'GET' && /\/log_point(?:\.php)?\/?(\?.*)?$/.test(req.url)) {
    myApp.handleLogPoint(req, res);
  } else if (req.method === 'POST' && /\/log_point(?:\.php)?\/?(\?.*)?$/.test(req.url)) {
    myApp.handlePostLogPoint(req, res);
  } else if (req.method === 'GET' && /^\/(favicon.ico|apple-touch-icon(-precomposed)?.png)$/.test(req.url)) {
    // Expect front-end webserver to handle requests for /favicon.ico
    // Ignore otherwise
    // logger.debug('Returning 404 for %s: %s', req.method, req.url);
    res.statusCode = 404;
    res.end();
  } else if (req.method === 'GET' && /^\/\?id=[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}&timestamp=\d+&lat=[-.\d]+&lon=[-.\d]+&speed=[-.\d]+&bearing=[-.\d]+&altitude=[-.\d]+&batt=[-.\d]+/.test(req.url)) {
    // special handling for Traccar Client that has hard-coded call to root URL
    myApp.handleLogPoint(req, res);
  } else if (req.method === 'GET' && /^(?:\/trip)?\/app(?:(?:\/)?|\/.*)$/.test(req.url)) {
    if (config.staticFiles.allow) {
      myApp.serveStaticFiles(req, res);
    } else {
      logger.warn('Serving static files disabled in config.json - ignoring request: %s', req.url);
      res.statusCode = 404;
      res.end();
    }
  } else {
    // Must be authorized for everything else
    // logger.debug('Headers: %j', req.headers);
    token = req.headers.authorization;
    // logger.debug('Token: %j', token);
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }
    xsrfToken = req.headers['x-trip-xsrf-token'];
    cookies = myApp.parseCookies(req.headers.cookie);
    // logger.debug('xsrfToken: %j', xsrfToken);
    // logger.debug('Cookies: %j', cookies);
    if (token == null || xsrfToken !== cookies['TRIP-XSRF-TOKEN']) {
      // This happens when the request is simply to '/' when running directly under Node.js
      // so redirect to '/trip/app'
      if (req.url == "/") {
        logger.debug('Redirecting to expected application URL');
        res.writeHead(307, {Location: '/trip/app/tracks'});
        res.end();
      } else {
        logger.debug('Access token missing from request or cookie does not match XSRF token');
        myApp.handleError(new login.UnauthorizedError('Access token  missing - unauthorized'), res);
      }
    } else {
      login.checkAuthenticated(token, xsrfToken, function(err, token) {
        if (err) {
          res.statusCode = 401;
          res.end();
        } else {
          myApp.handleFullyAuthenticatedRequests(req, res, token);
        }
      });
    }
  }
});

var io = require('socket.io')(myApp.server, {
  serveClient: config.debug ,
  path: '/socket.io' /*,
  transports: ['websocket',
               'flashsocket',
               'htmlfile',
               'xhr-polling',
               'jsonp-polling',
               'polling']*/
});

logger.debug('Serving origins of', io.origins());
io.on('connection', function(socket) {
  logger.debug('Client connected to socket using transport:', socket.conn.transport.name);
  socket.on('disconnect', function() {
    logger.debug('Client disconnected from socket');
  });
});

var port = process.env.LISTEN_PID > 0 ? 'systemd' : 8080;
if (config.app.autoQuit && (config.app.autoQuit.nonSystemd && config.app.autoQuit.nonSystemd.enabled === true || port === 'systemd') && config.app.autoQuit.timeOut > 0) {
  myApp.server.autoQuit({ timeOut: config.app.autoQuit.timeOut, exitFn: myApp.shutdown });
  logger.info('TRIP v%s running with autoQuit after %d seconds', myApp.version, config.app.autoQuit.timeOut);
} else {
  logger.info('TRIP v%s running in normal mode', myApp.version);
}
myApp.server.on('close', function() {
  logger.info('[index.js] server closed');
});
logger.info('Listening on port %s', port);
myApp.server.listen(port);
