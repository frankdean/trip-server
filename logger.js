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

var util = require('util'),
    config = require('./config.json');

function createLogger(label) {

  var levels = [ 'emergency', 'alert', 'critical', 'error', 'warn', 'notice', 'info', 'debug' ],
      timestamp = process.env.LISTEN_PID <= 0,
      level = levels.indexOf(config.log.level),
      timeOptions = {hour: '2-digit', hourCycle: 'h24', minute: '2-digit', second: '2-digit', fractionalSecondDigits: '3' },
      dateFormatter = new Intl.DateTimeFormat(undefined, timeOptions);

  function log(format, args) {
    if (timestamp) {
      console.log(dateFormatter.format(new Date()), label, "[" + levels[level] + "]", util.format(format, args));
    } else {
      console.log(label, "[" + levels[level] + "]", util.format(format, args));
    }
  }

  function nolog() {}

  // From https://tools.ietf.org/html/rfc5424
  return {
    emergency: level >= 0 ? log : nolog,
    alert: level >= 1 ? log : nolog,
    critical: level >= 2 ? log : nolog,
    error: level >= 3 ? log : nolog,
    warn: level >= 4 ? log : nolog,
    notice: level >= 5 ? log : nolog,
    info: level >= 6 ? log : nolog,
    debug: level >= 7 ? log : nolog
  };

}

module.exports = {
  createLogger: createLogger
};
