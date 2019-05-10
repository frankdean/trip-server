/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2016-2019 Frank Dean <frank@fdsd.co.uk>
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

var winston = require('winston');
var config = require('./config.json');

function createLogger(label) {

  var myLogFormat = winston.format.printf(({ level, message, label, timestamp }) => {
    // Don't want timestamps when running under systemd as system log will have them anyway
    return (process.env.LISTEN_PID > 0) ? `[${label}] ${level}: ${message}` : `${timestamp} [${label}] ${level}: ${message}`;
  });

  return winston.createLogger({
    level: config.log.level,
    transports: [
      new winston.transports.Console()
    ],
    format: winston.format.combine(
      winston.format.label({ label: label }),
      winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
      winston.format.splat(),
      myLogFormat
    ),
    exitOnError: false,
    silent: false
  });
}

module.exports = {
  createLogger: createLogger
};
