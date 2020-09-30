/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2020 Frank Dean <frank@fdsd.co.uk>
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

const fs = require('fs'),
      YAML = require('yaml'),
      LOGGER = require('./logger'),
      DATE_FORMATTER = new Intl.DateTimeFormat(undefined, LOGGER.timeOptions);

/**
 * The configuration module for the application.
 * @module config
 */

var config,
    logger;

/**
 * Allows us to log information even if configuration fails, and we therefore
 * do not know what level to log at.
 *
 * If configurations fails, all messages are logged, regardless of their level.
 *
 * @param {string} level the log level - one of the levels defined in `./logger.js`
 * @param {string} message format string to consider writing to the log
 * @param {vararg} arguments optional arguments for formatting the message
 */
function log() {

  const args = Array.from(arguments),
        level = args.shift();
   if (config && config.log && config.log.level) {
    if (!logger) {
      logger = LOGGER.createLogger('config.js', config.log.level, config.log.timestamp);
    }
    logger.timeOptions = { hour: 'numeric', hour12: true, hourCycle: 'h12', minute: '2-digit', second: '2-digit', fractionalSecondDigits: '3' };
    logger[level].apply(null, args);
  } else {
    args.unshift("[" + level.toUpperCase() + "]");
    args.unshift('config.js');
    args.unshift(DATE_FORMATTER.format(new Date()));
    console.error.apply(null, args);
  }
}

try {
  config = YAML.parse(fs.readFileSync('./config.yaml', 'utf8'));
  log(LOGGER.level.info, 'Successfully read config from config.yaml');
} catch (e) {
  if (e.code !== 'ENOENT') {
    log(LOGGER.level.emergency, 'Error reading config.yaml:', e);
  }
  try {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    // Seems like the wrong place for this debug logging, but this ensures we
    // log what must be the case *after* successfully reading the
    // configuration so that logging takes into account the desired log level.
    log(LOGGER.level.debug, 'config.yaml does not exist');
    log(LOGGER.level.info, 'Successfully read config from config.json');
  } catch (e) {
    if (e.code === 'ENOENT') {
      log(LOGGER.level.emergency, 'Failed to find a configuration file');
    } else {
      log(LOGGER.level.emergency, 'Error reading config.json:', e);
    }
    process.exit(1);
  }
}

/**
 * Reads the application's configuration file from the root directory of the
 * application.
 *
 * It firstly looks for `config.yaml`, failing that it looks for `config.json`.
 * The application should be distributed with example configuration files,
 * named `config-dist.json/yaml`.
 */
module.exports = config;
