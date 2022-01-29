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

describe('gpx-upload.js', function() {

  const db = require('../db.js'),
        // logger = require('../logger').createLogger('GpxUploadSpec.js'),
        GpxUpload = require('../gpx-upload.js'),
        // Whether to write to DB for debugging purposes
        writeToDb = false,
        testItineraryId = 929;
  var err, result;

  var customMatchers = {
    toHaveBeenCalledWithTrackNames: function(util) {
      return {
        compare: function(actual, expected) {
          var result = {},
              actualNames = [];

          if (actual.calls.allArgs().length > 0 &&
              actual.calls.allArgs()[0].length > 1 &&
              actual.calls.allArgs()[0][1].length > 0) {

            actual.calls.allArgs()[0][1].forEach(function(v) {
              actualNames.push(v.name);
            });
          }

          result.pass = util.equals(actualNames, expected);
          if (result.pass) {
            result.message = "Was called with the expected track names";
          } else {
            result.message = "Expected track names of " + util.pp(expected) + " but the actual track names were " + util.pp(actualNames);
          }
          return result;
        }
      };
    },
    toHaveBeenCalledWithRouteNames: function(util) {
      return {
        compare: function(actual, expected) {
          var result = {},
              actualNames = [];

          if (actual.calls.allArgs().length > 0 &&
              actual.calls.allArgs()[0].length > 1 &&
              actual.calls.allArgs()[0][1].length > 0) {

            actual.calls.allArgs()[0][1].forEach(function(v) {
              actualNames.push(v.name);
            });
          }

          result.pass = util.equals(actualNames, expected);
          if (result.pass) {
            result.message = "Was called with the expected route names";
          } else {
            result.message = "Expected route names of " + util.pp(expected) + " but the actual route names were " + util.pp(actualNames);
          }
          return result;
        }
      };
    }
  };

  beforeAll(function(done) {
    // Elevation data is loaded asynchronously.  When this is the first unit
    // being tested, we need a little delay to ensure the elevation data loads
    // before executing the tests.
    setTimeout(done, 1000);
  });

  beforeEach(function() {
    if (writeToDb) {
      spyOn(db, 'createItineraryWaypoints').and.callThrough();
      spyOn(db, 'createItineraryRoutes').and.callThrough();
      spyOn(db, 'createItineraryTracks').and.callThrough();
    } else {
      spyOn(db, 'createItineraryWaypoints').and.callFake(function(itineraryId, waypoints, callback) {
        callback(null);
      });
      spyOn(db, 'createItineraryRoutes').and.callFake(function(itineraryId, routes, callback) {
        callback(null);
      });
      spyOn(db, 'createItineraryTracks').and.callFake(function(itineraryId, tracks, callback) {
        callback(null);
      });
    }
  });

  describe('Test import single waypoint', function() {

    beforeEach(function(done) {
      GpxUpload.importFile(testItineraryId, './spec/TestWaypoint.gpx', false, function(_err_, _result_) {
        err = _err_;
        result = _result_;
        done();
      });
    });

    it('should import a single waypoint', function() {
      expect(err).toBeFalsy();
      expect(result).toBeDefined();
      expect(result.waypointCount).toEqual(1);
      expect(result.routeCount).toEqual(0);
      expect(result.trackCount).toEqual(0);
      expect(db.createItineraryWaypoints).toHaveBeenCalledTimes(1);
      expect(db.createItineraryRoutes).toHaveBeenCalledTimes(1);
      expect(db.createItineraryTracks).toHaveBeenCalledTimes(1);
      expect(db.createItineraryWaypoints).toHaveBeenCalledWith(testItineraryId, [ Object({ lat: '51.51743317', lng: '-0.13483334', ele: '100.00000', time: '2016-11-02T19:28:50.000Z', name: 'London', cmt: 'Test Comment 1', desc: 'Test description 1', sym: 'City (Capitol)', type: 'My Type', samples: '1' }) ], jasmine.any(Function));
    });

  });

  describe('Test import waypoints, tracks and routes', function() {

    beforeEach(function() {
      jasmine.addMatchers(customMatchers);
    });

    beforeEach(function(done) {
      GpxUpload.importFile(testItineraryId, './spec/TestWaypointRouteTrack.gpx', false, function(_err_, _result_) {
        err = _err_;
        result = _result_;
        done();
      });
    });

    it('should upload the named file', function() {
      expect(err).toBeFalsy();
      expect(result).toBeDefined();
      expect(result.waypointCount).toEqual(3);
      expect(result.routeCount).toEqual(4);
      expect(result.trackCount).toEqual(4);
      expect(db.createItineraryWaypoints).toHaveBeenCalledTimes(1);
      expect(db.createItineraryRoutes).toHaveBeenCalledTimes(1);
      expect(db.createItineraryTracks).toHaveBeenCalledTimes(1);

      expect(db.createItineraryRoutes).toHaveBeenCalledWith(testItineraryId, jasmine.any(Object), jasmine.any(Function));

      expect(db.createItineraryTracks).toHaveBeenCalledWith(testItineraryId, jasmine.any(Object), jasmine.any(Function));

      expect(db.createItineraryWaypoints).toHaveBeenCalledWith(testItineraryId, jasmine.any(Object), jasmine.any(Function));

      // The third route should ignore the section name and use the route name, the fourth route should pick the section name
      expect(db.createItineraryRoutes).toHaveBeenCalledWithRouteNames(['Test One', 'Test Two', 'Test Three', 'Section Four']);
      // The third track should ignore the section name and use the track name, the fourth track should pick the section name
      expect(db.createItineraryTracks).toHaveBeenCalledWithTrackNames(['Test track one', 'Test track two', 'Test track three', 'Track section four']);
    });

  });

});
