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

describe('logger.js', function() {
  var logger, module, util = require('util'),
      testFormat = 'Test: %s - %s',
      param1 = 'Param 1',
      param2 = 'Param 2',
      moduleName = 'LoggerSpec.js';

  module = require('../logger.js');

  describe('valid logger without timestamps', function() {
    var testFormat = 'Test: %s - %s',
        param1 = 'Param 1',
        param2 = 'Param 2';

    describe('info log level', function() {

      beforeEach(function() {
        spyOn(console, 'log').and.callThrough();
        logger = module.createLogger(moduleName, 'info', false);
      });

      it('should log info statements', function() {
        logger.info(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(moduleName, '[INFO]', util.format(testFormat, param1, param2));
      });

      it('should log notice statements', function() {
        logger.notice(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(moduleName, '[NOTICE]', util.format(testFormat, param1, param2));
      });

      it('should not log debug statements', function() {
        logger.debug(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(0);
      });

    });

  });

  describe('valid logger with timestamps', function() {
    var testFormat = 'Test: %s - %s',
        param1 = 'Param 1',
        param2 = 'Param 2';

    describe('info log level', function() {

      beforeEach(function() {
        spyOn(console, 'log').and.callThrough();
        logger = module.createLogger(moduleName, 'info');
      });

      it('should log info statements', function() {
        logger.info(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching('\\d{2}:\\d{2}:\\d{2}'), moduleName, '[INFO]', util.format(testFormat, param1, param2));
      });

      it('should log notice statements', function() {
        logger.notice(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching('\\d{2}:\\d{2}:\\d{2}'), moduleName, '[NOTICE]', util.format(testFormat, param1, param2));
      });

      it('should not log debug statements', function() {
        logger.debug(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(0);
      });

    });

  });

  describe('minimal logger configuration', function() {
    var testFormat = 'Test: %s - %s',
        param1 = 'Param 1',
        param2 = 'Param 2';

    describe('default log level', function() {

      beforeEach(function() {
        spyOn(console, 'log').and.callThrough();
        logger = module.createLogger();
      });

      it('should log emergency statements', function() {
        logger.emergency(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching('\\d{2}:\\d{2}:\\d{2}'), '[EMERGENCY]', util.format(testFormat, param1, param2));
      });

      it('should log notice statements', function() {
        logger.notice(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching('\\d{2}:\\d{2}:\\d{2}'), '[NOTICE]', util.format(testFormat, param1, param2));
      });

      it('should log info statements', function() {
        logger.info(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(jasmine.stringMatching('\\d{2}:\\d{2}:\\d{2}'), '[INFO]', util.format(testFormat, param1, param2));
      });


      it('should not log debug statements', function() {
        logger.debug(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(0);
      });

    });

  });

  describe('invalid logger configuration', function() {
    var testFormat = 'Test: %s - %s',
        param1 = 'Param 1',
        param2 = 'Param 2';

    describe('default log level', function() {

      beforeEach(function() {
        spyOn(console, 'log').and.callThrough();
        logger = module.createLogger(null, 'rubbish');
      });

      it('should not log any statements', function() {
        logger.emergency(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(0);
      });

      it('should not log alert statements', function() {
        logger.alert(testFormat, param1, param2);
        expect(console.log).toHaveBeenCalledTimes(0);
      });

    });

  });

});
