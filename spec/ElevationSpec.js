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

var logger = require('../logger').createLogger('ElevationSpec.js');

describe('elevation.js', function() {
  var Elevation = require('../elevation.js');
  var err, result;
  var p1 = {lat: 51.500194, lng: -0.134583};
  var p2 = {lat: 51.493355, lng: -0.491638};
  var p3 = {lat: 51.500194, lng: -1.093140};
  var p4 = {lat: 51.518998, lng: -1.562805};
  var p5 = {lng: -3.1805419921875, lat: 58.6054722343032};
  var p6 = {lng: -1.2944233417511, lat: 60.3088842900007};
  var p7 = {lng: -7.108154296875, lat: 62.1757596207084};
  var p8 = {lng: -2.296142578125, lat: 63.3816786930298};
  var noDataExpectedForPoint = {lng: -5.45608520507813, lat: 56.5950344674725};
  var testPoints1 = {
    locations: [ p1, p2, p3]
  },
      testPoints2 = {
        locations: [p5, p6, p7, p8]
      };

  describe('Fetch live elevation data - elevation server needs to be running', function() {

    describe('Passing point with no data', function() {

      beforeEach(function(done) {
        Elevation.fillElevations([noDataExpectedForPoint], null, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('Should return the same number of locations as provided', function() {
        expect(err).toBeNull();
        expect(result.length).toEqual(1);
      });

      it('Should not populate the elevation for a single point', function() {
        logger.debug('Result: %j', result);
        expect(result[0].ele).not.toBeDefined();
      });
    });

    describe('Passing single point', function() {

      beforeEach(function(done) {
        Elevation.fillElevations([p1], null, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('Should return the same number of locations as provided', function() {
        expect(err).toBeNull();
        expect(result.length).toEqual(1);
      });

      it('Should populate the elevation for a single point', function() {
        logger.debug('Result: %j', result);
        expect(result[0].ele).toBeDefined();
      });

      it('should return the same results when the formulae are reversed', function() {
        var x, y, xskew = 0.081, yskew = 0.0325, expected,
            lat = p1.lat, lng = p1.lng,
            pixelWidth = 10, lineHeight = 30, left = 50, top = 3;

        // Using Affine GeoTransform published at https://www.gdal.org/gdal_datamodel.html
        x = left + lng * pixelWidth + lat * xskew;
        logger.debug('  x: %d', x);
        y = top + lng * yskew + lat * lineHeight;
        logger.debug('  y: %d', y);

        // Using reversed formulae
        lat = left + x * pixelWidth + y * xskew;
        expected = x;
        logger.debug('lat: %d', lat);
        x = (lat - left - y * xskew) / pixelWidth;
        logger.debug('  x: %d', x);
        expect(x).toBeCloseTo(expected, 5);
        lng = top + x * yskew + y * lineHeight;
        expected = y;
        logger.debug('lng: %d', lng);
        y = (lng - top - x * yskew) / lineHeight;
        logger.debug('  y: %d', y);
        expect(y).toBeCloseTo(expected, 5);
      });

    });

    describe('Passing set of points', function() {

      beforeEach(function(done) {
        Elevation.fillElevations(testPoints1.locations, null, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('Should return the same number of locations as provided', function() {
        expect(err).toBeNull();
        logger.debug('Result: %j', result);
        expect(result.length).toEqual(testPoints1.locations.length);
      });

      it('Should populate the elevations for each point', function() {
        logger.debug('Result: %j', result);
        result.forEach(function(v) {
          logger.debug('Value: ', v);
          expect(v.ele).toBeDefined();
        });
      });

    });

    describe('Passing empty set of points', function() {

      beforeEach(function(done) {
        Elevation.fillElevations([], null, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('Should handle an empty set of points', function() {
        expect(err).toBeNull();
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBeTruthy();
        expect(result.length).toEqual(0);
      });

    });

  });

  describe('Handling missing data points', function() {

    beforeEach(function(done) {
      Elevation.fillElevations(testPoints2.locations, null, function(_err_, _result_) {
        err = _err_;
        result = _result_;
        done();
      });
    });

    it('should populate some, but not all points', function() {
      logger.debug('Result: %j', result);
      expect(p5.ele).toBeDefined();
      expect(p6.ele).not.toBeDefined();
      expect(p7.ele).not.toBeDefined();
      expect(p8.ele).not.toBeDefined();
    });

  });

});
