/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2016-2020 Frank Dean <frank@fdsd.co.uk>
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

var util = require('util');

function createLogger(label, logLevel, timestamp = true) {

  // Logging levels from https://tools.ietf.org/html/rfc5424
  var levels = [ 'emergency', 'alert', 'critical', 'error', 'warn', 'notice', 'info', 'debug' ],
      timeOptions = {hour: '2-digit', hourCycle: 'h24', minute: '2-digit', second: '2-digit', fractionalSecondDigits: '3' },
      dateFormatter = new Intl.DateTimeFormat(undefined, timeOptions),
      logger = {};

  // Default log level is 'info'
  if (logLevel === undefined) {
    logLevel = levels[6];
  }

  var level = levels.indexOf(logLevel.toLowerCase());

  function nolog() {}

  function log() {
    var level,
        args = Array.from(arguments),
        logArgs = [];
    level = args.shift();
    if (timestamp) {
      logArgs.push(dateFormatter.format(new Date()));
    }
    if (label) {
      logArgs.push(label);
    }
    logArgs.push("[" + level + "]");
    logArgs.push(util.format.apply(util, args));
    console.log.apply(null, logArgs);
  }

  function logWithLevel() {
    var level, params, args = Array.from(arguments);
    level = args.shift();
    params = Array.from(args.shift());
    params.unshift(String(level).toUpperCase());
    log.apply(log, params);
  }

  function makeFunc(name) {
    function innerLog() {
      logWithLevel(name, arguments);
    }
    return innerLog;
  }

  // Create logXXX methods for each of items defined in the levels array
  for (var i = 0; i < levels.length; i++) {
    var name = 'log' + levels[i].charAt(0).toUpperCase() + levels[i].slice(1);
    var text = levels[i];
    createLogger[name] = makeFunc(text);
    logger[levels[i]] = level >= i ? createLogger[name] : nolog;
  }

  return logger;
}

module.exports = {
  createLogger: createLogger
};
