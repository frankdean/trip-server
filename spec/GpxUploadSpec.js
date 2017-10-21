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

var winston = require('winston');

describe('gpx-upload.js', function() {
  var err, result;
  var db = require('../db.js');
  var GpxUpload = require('../gpx-upload.js');
  // Whether to write to DB for debugging purposes
  var writeToDb = false;
  var testItineraryId = 929;

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
      expect(result.routeCount).toEqual(2);
      expect(result.trackCount).toEqual(2);
      expect(db.createItineraryWaypoints).toHaveBeenCalledTimes(1);
      expect(db.createItineraryRoutes).toHaveBeenCalledTimes(1);
      expect(db.createItineraryTracks).toHaveBeenCalledTimes(1);

      expect(db.createItineraryRoutes).toHaveBeenCalledWith(testItineraryId, [ Object({ points: [ Object({ lat: '62.788059', lng: '-67.038345', ele: '100.00000', name: '001', cmt: 'p1', desc: 'p1', sym: 'Small City' }), Object({ lat: '64.046402', lng: '93.801498', name: '002', cmt: 'p2', desc: 'p2', sym: 'Small City' }), Object({ lat: '-32.039452', lng: '143.371811', name: '003', cmt: 'p3', desc: 'p3', sym: 'Small City' }), Object({ lat: '-37.427879', lng: '25.584221', name: '004', cmt: 'p4', desc: 'p4', sym: 'Small City' }), Object({ lat: '-51.608559', lng: '-61.075935', name: '005', cmt: 'p5', desc: 'p5', sym: 'Small City' }), Object({ lat: '59.896576', lng: '-116.62281', name: '006', cmt: 'p6', desc: 'p6', sym: 'Small City' }) ], name: 'Test One', distance: 47310.024657979964, highest: 100, lowest: 100, ascent: 0, descent: 0 }), Object({ points: [ Object({ lat: '30.538809', lng: '-43.953796', name: '001', cmt: 'p1', desc: 'p1', sym: 'Small City' }), Object({ lat: '-33.637295', lng: '11.417296', name: '002', cmt: 'p2', desc: 'p2', sym: 'Small City' }), Object({ lat: '18.911703', lng: '74.522766', name: '003', cmt: 'p3', desc: 'p3', sym: 'Small City' }), Object({ lat: '56.130375', lng: '89.11261', name: '004', cmt: 'p4', desc: 'p4', sym: 'Small City' }), Object({ lat: '17.743677', lng: '27.061827', name: '005', cmt: 'p5', desc: 'p5', sym: 'Small City' }) ], name: 'Test Two', distance: 29059.949952735366 }) ], jasmine.any(Function));

      expect(db.createItineraryTracks).toHaveBeenCalledWith(testItineraryId, [ Object({ segments: [ Object({ points: [ Object({ lat: '18.49486923', lng: '-64.45214081', ele: '100.00000', time: '1970-01-01T00:00:01.000Z', hdop: '140.0' }), Object({ lat: '45.40974808', lng: '-105.49706268', ele: '100.00000', time: '1970-01-01T00:00:02.000Z' }), Object({ lat: '-3.32189083', lng: '-133.70994568', ele: '100.00000', time: '1970-01-01T00:00:03.000Z' }), Object({ lat: '-0.59913325', lng: '-90.73143768', ele: '100.00000', time: '1970-01-01T00:00:04.000Z' }), Object({ lat: '4.05566788', lng: '-6.79588938', ele: '100.00000', time: '1970-01-01T00:00:05.000Z' }), Object({ lat: '-9.08620834', lng: '13.4189539', ele: '100.00000', time: '1970-01-01T00:00:06.000Z' }) ], highest: 100, lowest: 100, ascent: 0, descent: 0, distance: 27715.287479210987 }), Object({ points: [ Object({ lat: '-33.34461975', lng: '17.81348419', ele: '100.00000', time: '1970-01-01T00:00:07.000Z' }), Object({ lat: '-34.80059052', lng: '26.07520294', ele: '100.00000', time: '1970-01-01T00:00:08.000Z' }), Object({ lat: '-25.94357681', lng: '44.26856232', ele: '100.00000', time: '1970-01-01T00:00:09.000Z' }), Object({ lat: '11.79707623', lng: '51.12403107', ele: '100.00000', time: '1970-01-01T00:00:10.000Z' }), Object({ lat: '36.11537552', lng: '-5.8290925', ele: '100.00000', time: '1970-01-01T00:00:11.000Z' }), Object({ lat: '38.62944031', lng: '-27.8896389', ele: '100.00000', time: '1970-01-01T00:00:12.000Z' }), Object({ lat: '11.79707623', lng: '-61.20018387', ele: '100.00000', time: '1970-01-01T00:00:13.000Z' }) ], highest: 100, lowest: 100, ascent: 0, descent: 0, distance: 19734.860788456666 }) ], name: 'Test track one', color: 'Green', distance: 50185.78222178865, highest: 100, lowest: 100, ascent: 0, descent: 0 }), Object({ segments: [ Object({ points: [ Object({ lat: '17.49486923', lng: '-54.45214081', ele: '100.00000', time: '1970-01-01T00:00:01.000Z', hdop: '140.0' }), Object({ lat: '42.40974808', lng: '-75.49706268', ele: '100.00000', time: '1970-01-01T00:00:02.000Z' }) ], highest: 100, lowest: 100, ascent: 0, descent: 0, distance: 3413.351800788805 }) ], name: 'Test track two', color: 'Yellow', distance: 3413.351800788805, highest: 100, lowest: 100, ascent: 0, descent: 0 }) ] , jasmine.any(Function));

      expect(db.createItineraryWaypoints).toHaveBeenCalledWith(testItineraryId, [ Object({ lat: '51.51743317', lng: '-0.13483334', ele: '100.00000', time: '2016-11-02T19:28:50.000Z', name: 'London', cmt: 'Test Comment 1', desc: 'Test description 1', sym: 'City (Capitol)', type: 'My Type', samples: '1' }), Object({ lat: '43.6143837', lng: '3.86420012', time: '2016-11-02T19:29:08.000Z', name: 'Montpellier', cmt: 'Test Comment 2', desc: 'Test description 2', sym: 'City (Large)', samples: '2' }), Object({ lat: '48.85945129', lng: '2.33159995', time: '2016-11-02T19:28:15.000Z', name: 'Paris', cmt: 'Test Comment 3', desc: 'Test description 3', sym: 'City (Capitol)' }) ], jasmine.any(Function));

    });

  });

});
