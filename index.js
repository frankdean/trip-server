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

var http = require('http');
var url = require('url');

var autoquit = require('autoquit');
var formidable = require('formidable');
var nstatic = require('node-static');
var systemd = require('systemd');
var validator = require('validator');
var winston = require('winston');

var config = require('./config.json');
var itineraries = require('./itineraries.js');
var gpxUpload = require('./gpx-upload.js');
var login = require('./login');
var shares = require('./shares');
var tiles = require('./tiles');
var tracks = require('./tracks');
var reports = require('./reports');

var myApp = myApp || {};
myApp.version = '0.13.0-rc.2';
module.exports = myApp;

winston.level = config.log.level;
myApp.fileServer = new(nstatic.Server)('./', {cache: 3600});
// Set to x to indent JSON with x spaces.  Zero: no pretty print.
myApp.pretty = config.app.json.indent.level;

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
    } else if (e instanceof BadRequestError) {
      res.statusCode = 400;
    } else if (e.name !== undefined && e.name === 'error' &&
               e.severity !== undefined && e.severity === 'FATAL') {
      res.statusCode = 500;
    } else {
      res.statusCode = 400;
    }
    winston.warn(e);
    var resBody = {
      error: e.message
    };
    if (config.debug) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(resBody, null, myApp.pretty) + '\n');
    } else {
      res.end();
    }
  }
  return e ? false : true;
};

myApp.validateHeaders = function(headers, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  if (!/^|;application\/json;|$/.test(headers['content-type'])) {
    callback(new BadRequestError('Unexpected content-type: ' + headers['content-type']));
  } else {
    callback(null);
  }
};

myApp.validateBody = function(body, callback) {
  if (!validator.isJSON(body)) {
    callback(new BadRequestError('Body is not valid JSON'));
  } else {
    // if (config.debug) {
    //   winston.debug('BODY:', JSON.stringify(JSON.parse(body), null, 4) + '\n');
    //   winston.debug('BODY:', body);
    // }
    callback(null);
  }
};

myApp.validateHeadersAndBody = function(headers, body, callback) {
  callback = typeof callback === 'function' ? callback : function() {};
  myApp.validateHeaders(headers, function(err) {
    if (err) {
      callback(err);
      } else {
        myApp.validateBody(body, function(err) {
          callback(err);
        });
      }
  });
};

myApp.validatePagingParameters = function(req, callback) {
  var q = url.parse(req.url, true).query;
  if ((q.offset && !validator.isInt(q.offset, {min: 0})) ||
      (q.page_size && !validator.isInt(q.page_size, {min: 1, max: 1000}))) {
    callback(new BadRequestError('Parameters failed validation'));
  } else {
    q.offset = q.offset ? q.offset : 0;
    q.page_size = q.page_size ? q.page_size : 1000;
    callback(null, q.offset, q.page_size);
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
        if (validator.isEmail(creds.email) && /^[!-~]+$/.test(creds.password)) {
          callback(null, creds);
        } else {
          callback(new BadRequestError('Credentials contain invalid characters'));
        }
      }
    }
  });
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
        login.doLogin(creds.email, creds.password, function(err, token) {
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

myApp.handleGetSystemStatus = function(req, res) {
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        reports.getSystemStatus(function(err, status) {
          if (myApp.handleError(err, res)) {
            myApp.respondWithData(err, res, status);
          }
        });
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
    if (q.offset === undefined || !validator.isInt(q.offset, {min: 0}) ||
        q.page_size === undefined || !validator.isInt(q.page_size, {min: 1, max: 1000})) {
      myApp.handleError(new BadRequestError('Parameters failed validation'), res);
    } else {
      itineraries.getItineraries(token.sub, q.offset, q.page_size, function(err, result) {
        myApp.respondWithData(err, res, result);
      });
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
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/([0-9]+)?(?:\/|\?.*|$)/.exec(req.url);
        id = match ? match[1] : undefined;
        itineraries.deleteItinerary(token.sub, id, function(err) {
          if (myApp.handleError(err, res)) {
            res.statusCode = 200;
            res.end();
          }
        });
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
    /*
    winston.debug('File saved as %s', file.path);
    winston.debug('Original name: %s', file.name);
    winston.debug('File size: %d bytes', file.size);
    winston.debug('Hash: %s', file.hash);
    */
    gpxUpload.importFile(itineraryId, file.path, true, function(err, result) {
      // winston.debug('Import result:', result);
    });
  });
  form.on('error', function() {
    winston.warn('Form upload failed');
    myApp.handleError(new Error('Form upload failed'));
  });
  form.on('abort', function() {
    winston.warn('Form upload aborted');
    myApp.handleError(new Error('Form upload aborted'));
  });
  form.on('end', function() {
    /*
    winston.debug('Received upload of %d bytes', form.bytesReceived);
    winston.debug('Expected %d bytes', form.bytesExpected);
    winston.debug('File path: %s', form.uploadDir);
    */
    res.statusCode = 200;
    res.end();
  });
  form.parse(req, function(err, fields, files) {
    // winston.debug('index.js - File uploaded');
  });
  return;
};

myApp.handleGetItineraryWaypointCount = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/waypoints\/count(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        itineraries.getItineraryWaypointCount(token.sub, id, function(err, count) {
          myApp.respondWithData(err, res, {count: count});
        });
      }
    });
  });
};

myApp.handleGetItineraryWaypoints = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/waypoint(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        itineraries.getItineraryWaypointsForUser(token.sub, id, function(err, waypoints) {
          myApp.respondWithData(err, res, waypoints);
        });
      }
    });
  });
};

myApp.handleGetItineraryWaypoint = function(req, res, token) {
  var match, itineraryId, waypointId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/(\d+)\/waypoint\/(\d+)(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        waypointId = match ? match[2] : undefined;
        itineraries.getItineraryWaypointForUser(token.sub, itineraryId, waypointId, function(err, waypoint) {
          myApp.respondWithData(err, res, waypoint);
        });
      }
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
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match = /\/itinerary\/(\d+)\/waypoint\/(\d+)(?:\/?|\/(\d+))?(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        wptId = match ? match[2] : undefined;
        itineraries.deleteItineraryWaypoint(token.sub, itineraryId, wptId, function(err) {
          myApp.noResponseData(err, res);
        });
      }
    });
  });
};

myApp.handleGetItineraryRouteNames = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/routes\/names(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        itineraries.getItineraryRouteNames(token.sub, id, function(err, routeNames) {
          myApp.respondWithData(err, res, routeNames);
        });
      }
    });
  });
};

myApp.handleGetItineraryRouteName = function(req, res, token) {
  var match, itineraryId, routeId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/route\/name\/(\d+)(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        routeId = match ? match[2] : undefined;
        itineraries.getItineraryRouteName(token.sub, itineraryId, routeId, function(err, route) {
          myApp.respondWithData(err, res, route);
        });
      }
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
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
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
      }
    });
  });
};

myApp.handleGetItineraryRoutePoints = function(req, res, token) {
  var match, itineraryId, routeId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validatePagingParameters(req, function(err, offset, limit) {
      if (myApp.handleError(err, res)) {
        myApp.validateHeaders(req.headers, function(err) {
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
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/track\/names(?:\?.*)?$/.exec(req.url);
        id = match ? match[1] : undefined;
        itineraries.getItineraryTrackNames(token.sub, id, function(err, trackNames) {
          myApp.respondWithData(err, res, trackNames);
        });
      }
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
        winston.debug('Params: %j', params);
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
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/track\/name\/(\d+)(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        trackId = match ? match[2] : undefined;
        itineraries.getItineraryTrackName(token.sub, itineraryId, trackId, function(err, track) {
          myApp.respondWithData(err, res, track);
        });
      }
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
        myApp.validateHeaders(req.headers, function(err) {
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
          } else {
            myApp.handleError(new Error('Invalid parameters'), res);
          }
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
        myApp.validateHeaders(req.headers, function(err) {
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
          } else {
            myApp.handleError(new Error('Invalid parameters'), res);
          }
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
        myApp.validateHeaders(req.headers, function(err) {
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
          } else {
            myApp.handleError(new Error('Invalid parameters'), res);
          }
        });
      }
    });
  });
};

myApp.handleGetItineraryTrackSegmentWithoutPaging = function(req, res, token) {
  var match, itineraryId, segmentId;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
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
      } else {
        myApp.handleError(new Error('Invalid parameters'), res);
      }
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
    myApp.validateHeaders(req.headers, function(err) {
      if (myApp.handleError(err, res)) {
        match =  /\/itinerary\/(\d+)\/route\/(\d+)(?:\?.*)?$/.exec(req.url);
        itineraryId = match ? match[1] : undefined;
        routeId = match ? match[2] : undefined;
        if (itineraryId && routeId) {
          itineraries.getItineraryRoutesForUser(token.sub, itineraryId, [routeId], function(err, routes) {
            if (routes.length === 1) {
              route = routes[0];
            } else {
              if (routes.length > 1) {
                winston.error('itineraries.getItineraryRoutesForUser() returned multiple routes when queried for a single route with id: %s', routeId);
              }
              route = {};
            }
            myApp.respondWithData(err, res, route);
          });
        } else {
          myApp.handleError(new Error('Invalid parameters'), res);
        }
      }
    });
  });
};

myApp.handleGetItineraryShares = function(req, res, token) {
  var match, id;
  req.on('data', function(chunk) {
  }).on('end', function() {
    myApp.validatePagingParameters(req, function(err, offset, limit) {
      if (myApp.handleError(err, res)) {
        myApp.validateHeaders(req.headers, function(err) {
          if (myApp.handleError(err, res)) {
            match = /\/itinerary\/share\/([0-9]+)(?:\?.*)$/.exec(req.url);
            id = match ? match[1] : undefined;
            itineraries.getItineraryShares(token.sub, id, offset, limit, function(err, myItineraries) {
              myApp.respondWithData(err, res, myItineraries);
            });
          }
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
        myApp.validateHeaders(req.headers, function(err) {
          if (myApp.handleError(err, res)) {
            match = /\/itineraries\/shares(?:\?.*)$/.exec(req.url);
            id = match ? match[1] : undefined;
            itineraries.getSharedItinerariesForUser(token.sub, offset, limit, function(err, myItineraries) {
              myApp.respondWithData(err, res, myItineraries);
            });
          }
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
        match = /\/itinerary\/share\/([0-9]+)(?:\?.*)$/.exec(req.url);
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
        match = /\/itinerary\/share\/([0-9]+)(?:\?.*)$/.exec(req.url);
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
        myApp.validateHeaders(req.headers, function(err) {
          if (myApp.handleError(err, res)) {
            login.getUsers(offset, limit, q.nickname, q.email, q.searchType, function(err, result) {
              myApp.respondWithData(err, res, result);
            });
          }
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
      !validator.isISO8601(q.from) || !validator.isISO8601(q.to) ||
      (q.max_hdop !== undefined && !validator.isFloat('' + q.max_hdop, {min: 0, max: 99999.9})) ||
      (q.page_size !== undefined && !validator.isInt('' + q.page_size, {min: 1, max: 1000})) ||
      (q.offset !== undefined && !validator.isInt('' + q.offset, {min: 0}))) {
    callback(new BadRequestError('Parameters failed validation'));
  } else {
    callback(null, q);
  }
};

myApp.handleGetTile = function(req, res, token) {
  var q = url.parse(req.url, true).query;
  if (q.x !== undefined && q.y !== undefined && q.z !== undefined && q.id !== undefined) {
    tiles.fetchTile(q.id, q.x, q.y, q.z, function(err, tile) {
      if (myApp.handleError(err, res)) {
        if (Buffer.isBuffer(tile.image)) {
          res.setHeader('Expires', tile.expires.toUTCString());
          res.setHeader('Content-type', 'image/png');
          res.end(tile.image);
        } else {
          winston.warn('Failure retrieving tile - image is not a Buffer', q.x, q.y, q.z);
          res.statusCode = 500;
          res.end();
        }
      }
    });
  } else {
    myApp.handleError(new BadRequestError('Invalid tile parameters'), res);
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
            winston.warn('Error fetching tracks', err);
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
        var params = JSON.parse(body);
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
    if (q.offset === undefined || !validator.isInt(q.offset, {min: 0}) ||
        q.page_size === undefined || !validator.isInt(q.page_size, {min: 1, max: 1000})) {
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
      winston.error('config.json is invalid - tile.providers must be defined as an array');
      myApp.handleError(new SystemError('config.json is invalid - no tile.providers defined'), res);
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

myApp.handleAuthenticatedRequests = function(req, res, token) {
  if (req.method === 'GET' && /\/tile\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetTile(req, res, token);
  } else if (req.method === 'GET' && /\/nicknames\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetNicknames(req, res, token);
  } else if (req.method === 'GET' && /\/download\/tracks(\/)?([!-\.0->@-~]+)?(\?.*)?$/.test(req.url)) {
    myApp.handleDownloadLocations(req, res, token);
  } else if (req.method === 'POST' && /\/download\/itinerary\/(\d+)\/gpx(?:\/)?([!-\.0->@-~]+)?(\?.*)?$/.test(req.url)) {
    myApp.handleDownloadItineraryGpx(req, res, token);
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
  } else if (token.admin && req.method === 'GET' && /\/admin\/user\/[\d]+\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetUser(req, res);
  } else if (token.admin && req.method === 'GET' && /\/admin\/user\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetUsers(req, res);
  } else if (token.admin && req.method === 'POST' && /\/admin\/user\/[\d]+\/?(\?.*)?$/.test(req.url)) {
    myApp.handleUpdateUser(req, res);
  } else if (token.admin && req.method === 'POST' && /\/admin\/user\/?(\?.*)?$/.test(req.url)) {
    myApp.handleCreateUser(req, res);
  } else if (token.admin && req.method === 'DELETE' && /\/admin\/user\/[\d]+\/?(\?.*)?$/.test(req.url)) {
    myApp.handleDeleteUser(req, res);
  } else if (token.admin && req.method === 'POST' && /\/admin\/password\/reset\/?(\?.*)?$/.test(req.url)) {
    myApp.passwordReset(req, res);
  } else if (token.admin && req.method === 'GET' && /\/admin\/system\/status\/?(\?.*)?$/.test(req.url)) {
    myApp.handleGetSystemStatus(req, res);
  } else {
    winston.debug('URL path not recognised: %s', req.url);
    myApp.handleError(new BadRequestError('URL path not recognised: ' + req.url), res);
  }
};

myApp.serveStaticFiles = function(req, res) {
  myApp.fileServer.serve(req, res, function(err, result) {
    if (err) {
      winston.warn('Error serving static file %s - %s', req.url, err.message);
      if (err.status === 404 || err.status === 500) {
        res.writeHead(err.status, err.headers);
        res.end();
      } else {
        res.writeHead(err.status, err.headers);
        res.end();
      }
    }
  });
};

myApp.shutdown = function() {
  winston.info('Shutdown');
  process.exit(0);
};

myApp.server = http.createServer(function(req, res) {
  if (config.debug) {
    winston.debug('method:', req.method, 'url: ', req.url);
  }
  // req.addListener('end', function() {
  // }).resume();
  var method = req.method;
  // var userAgent = req.headers['user-agent'];
  // res.setHeader('X-Powered-By', 'Node.js');
  req.on('error', function(err) {
    myApp.handleError(err, res);
  });
  if (req.method === 'POST' && /\/login\/?(\?.*)?$/.test(req.url)) {
    myApp.handleLogin(req, res);
  } else if (req.method === 'GET' && /\/log_point(?:\.php)?\/?(\?.*)?$/.test(req.url)) {
    myApp.handleLogPoint(req, res);
  } else if (req.method === 'GET' && /^\/(favicon.ico|apple-touch-icon(-precomposed)?.png)$/.test(req.url)) {
    // Expect front-end webserver to handle requests for /favicon.ico
    // Ignore otherwise
    winston.debug('Returning 404 for %s: %s', req.method, req.url);
    res.statusCode = 404;
    res.end();
  } else if (req.method === 'GET' && /^\/\?id=[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}&timestamp=\d+&lat=[-.\d]+&lon=[-.\d]+&speed=[-.\d]+&bearing=[-.\d]+&altitude=[-.\d]+&batt=[-.\d]+/.test(req.url)) {
    // special handling for Traccar Client that has hard-coded call to root URL
    myApp.handleLogPoint(req, res);
  } else if (req.method === 'GET' && /^\/app(?:(?:\/)?|\/.*)$/.test(req.url)) {
    if (config.staticFiles.allow) {
      myApp.serveStaticFiles(req, res);
    } else {
      winston.warn('Serving static files disabled in config.json - ignoring request: %s', req.url);
      res.statusCode = 404;
      res.end();
    }
  } else {
    // Must be authorized for everything else
    var params = url.parse(req.url, true);
    if (params.query.access_token === undefined) {
      myApp.handleError(new login.UnauthorizedError('Access token  missing'), res);
    } else {
      login.checkAuthenticated(params.query.access_token, function(err, token) {
        if (err) {
          res.statusCode = 401;
          res.end();
        } else {
          myApp.handleAuthenticatedRequests(req, res, token);
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

winston.debug('Serving origins of', io.origins());
io.on('connection', function(socket) {
  winston.debug('Client connected to socket using transport:', socket.conn.transport.name);
  socket.on('disconnect', function() {
    winston.debug('Client disconnected from socket');
  });
});

var port = process.env.LISTEN_PID > 0 ? 'systemd' : 8080;
if (port === 'systemd') {
  myApp.server.autoQuit({ timeOut: config.app.autoQuit.timeOut, exitFn: myApp.shutdown });
  winston.info('TRIP v%s running under systemd with autoQuit after %d seconds', myApp.version, config.app.autoQuit.timeOut);
} else {
  winston.info('TRIP v%s running in development mode', myApp.version);
}
myApp.server.listen(port);
