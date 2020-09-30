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

describe('tracks.js', function() {
  var Tracks = require('../tracks.js');
  var db = require('../db.js');
  var testId = 42;
  var testUsername = 'trip_user@trip.test';

  describe('constrainSharedLocationDates()', function() {
      var err, from, to;
      var maxMinutes = 40 * 24 * 60;
      var recentMinutes = 10 * 24 * 60;
      var tomorrowMs = Date.now() + 24 * 60 * 60000;
      // Set test date to be older than maxMinutes
      var fromMs = Date.now() - (maxMinutes + 10 * 24 * 60) * 60000;

    describe('Recent days most significant', function() {
      // Set latestLocation to be 5 days ago
      var latestLocationMs = Date.now() - 5 * 24 * 60 * 60000;

      beforeEach(function(done) {
        spyOn(db, 'getMostRecentLocationTime').and.callFake(
          function(sharedById, callback) {
            callback(null, new Date(latestLocationMs));
          });
        Tracks.unitTests.constrainSharedLocationDates(
          testId,
          (new Date(fromMs)).toISOString(),
          (new Date(tomorrowMs)).toISOString(),
          maxMinutes,
          recentMinutes,
          function(_err_, _from_, _to_) {
            err = _err_;
            from = _from_;
            to = _to_;
            done();
          });
      });

      it('should constrain the from date based on the most recent value', function() {
        var expected = latestLocationMs - recentMinutes * 60000;
        // allow a ridiculous 10 seconds tolerance
        expect(Math.abs(expected - from.getTime()) < 10000).toBe(true);
      });

    });

    describe('Maximum days most significant', function() {
      // Set latestLocation to be 5 days ago
      var latestLocationMs = Date.now() - 35 * 24 * 60 * 60000;

      beforeEach(function(done) {
        spyOn(db, 'getMostRecentLocationTime').and.callFake(
          function(sharedById, callback) {
            callback(null, new Date(latestLocationMs));
          });
        Tracks.unitTests.constrainSharedLocationDates(
          testId,
          (new Date(fromMs)).toISOString(),
          (new Date(tomorrowMs)).toISOString(),
          maxMinutes,
          recentMinutes,
          function(_err_, _from_, _to_) {
            err = _err_;
            from = _from_;
            to = _to_;
            done();
          });
      });

      it('should constrain the from date based on the most recent value', function() {
        var expected = Date.now() - maxMinutes * 60000;
        // allow a ridiculous 10 seconds tolerance
        expect(Math.abs(expected - from.getTime()) < 10000).toBe(true);
      });

    });

    describe('Chosen from date is most significant', function() {
      // Set latestLocation to be 5 days ago
      var latestLocationMs = Date.now() - 5 * 24 * 60 * 60000;
      // Set the chosen from date to be 2 days newer
      var testFromMs = latestLocationMs + 2 * 24 * 60 * 60000;

      beforeEach(function(done) {
        spyOn(db, 'getMostRecentLocationTime').and.callFake(
          function(sharedById, callback) {
            callback(null, new Date(latestLocationMs));
          });
        Tracks.unitTests.constrainSharedLocationDates(
          testId,
          (new Date(testFromMs)).toISOString(),
          (new Date(tomorrowMs)).toISOString(),
          maxMinutes,
          recentMinutes,
          function(_err_, _from_, _to_) {
            err = _err_;
            from = _from_;
            to = _to_;
            done();
          });
      });

      it('should not modify the specified from date as it is later than any constraint', function() {
        expect(testFromMs).toEqual(from.getTime());
      });

    });

  });

  describe('nicknames', function() {
    var err, result;
    var nicknames = {test: 'test-result'};

    beforeEach(function(done) {
      spyOn(db, 'getNicknames').and.callFake(
        function(username, callback) {
          callback(null, nicknames);
        });
      Tracks.getNicknames(testUsername, function(_err_, _result_) {
        err = _err_;
        result = _result_;
        done();
      });
    });

    it('should call the database with the passed username', function() {
      expect(db.getNicknames).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
    });

    it('should return the query results', function() {
      expect(result).toEqual(nicknames);
    });

  });

  describe('logPoint', function() {
    var err,
        testUserId = '42',
        validOsmAndPoint = {
          lat: '52.5', lng: '-0.3',
          timestamp: '1484487268073',
          hdop: '27.2',
          altitude: '-46.72',
          speed: '38.4',
          bearing: '43.8',
          uuid: '63ee806c-2529-499d-ad2c-308d9ad1ef77'
        },
        validGPSLoggerPoint = {
          lat: '52.5',
          lng: '-0.3',
          time: '2017-01-15T13:40:10.000Z',
          hdop: '31.0',
          altitude: '47.73',
          speed: '24.3',
          bearing: '19.2',
          sat: '5',
          prov: 'gps',
          batt: '56.0',
          note: '',
          uuid: '63ee806c-2529-499d-ad2c-308d9ad1ef77'
        };


    beforeEach(function() {
      spyOn(db, 'findUserByUuid').and.callFake(
        function(uuid, callback) {
          callback(null, {id: testUserId});
        });
    });

    describe('Valid OsmAnd format', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint(validOsmAndPoint, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should save the point', function() {
        expect(err).toBeNull();
        expect(db.findUserByUuid).toHaveBeenCalled();
        expect(db.logPoint).toHaveBeenCalled();
      });

    });

    describe('OsmAnd format with minimal parameters', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validOsmAndPoint.lat,
                         lon: validOsmAndPoint.lng,
                         timestamp: validOsmAndPoint.timestamp,
                         uuid: validOsmAndPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should save the point passing the timestamp as a millisecond value', function() {
        expect(err).toBeNull();
        expect(db.findUserByUuid).toHaveBeenCalledWith(validOsmAndPoint.uuid, jasmine.any(Function));
        expect(db.logPoint).toHaveBeenCalledWith(testUserId, { lat: '52.5', lon: '-0.3', timestamp: validOsmAndPoint.timestamp, uuid: '63ee806c-2529-499d-ad2c-308d9ad1ef77', unixtime: '' + validOsmAndPoint.timestamp, mstime: Number(validOsmAndPoint.timestamp) * 1000, hdop: undefined, altitude: undefined, batt: undefined, sat: undefined, speed: undefined, bearing: undefined, lng: '-0.3' }, jasmine.any(Function) );
      });

    });

    describe('OsmAnd format with missing UUID', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validOsmAndPoint.lat,
                         lon: validOsmAndPoint.lng,
                         timestamp: validOsmAndPoint.timestamp},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should not save the point', function() {
        expect(err).not.toBeNull();
        expect(db.findUserByUuid).not.toHaveBeenCalled();
        expect(db.logPoint).not.toHaveBeenCalled();
      });

    });

    describe('Valid GPSLogger format', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint(validGPSLoggerPoint, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should save the point', function() {
        expect(err).toBeNull();
        expect(db.findUserByUuid).toHaveBeenCalled();
        expect(db.logPoint).toHaveBeenCalled();
      });

    });

    describe('GPSLogger format with minimal parameters', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validGPSLoggerPoint.lat,
                         lon: validGPSLoggerPoint.lng,
                         time: validGPSLoggerPoint.time,
                         uuid: validGPSLoggerPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should save the point', function() {
        expect(err).toBeNull();
        expect(db.findUserByUuid).toHaveBeenCalled();
        expect(db.logPoint).toHaveBeenCalled();
      });

    });

    describe('GPSLogger format with missing UUID', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validGPSLoggerPoint.lat,
                         lon: validGPSLoggerPoint.lng,
                         time: validGPSLoggerPoint.time},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should not save the point', function() {
        expect(err).not.toBeNull();
        expect(db.findUserByUuid).not.toHaveBeenCalled();
        expect(db.logPoint).not.toHaveBeenCalled();
      });

    });

    describe('GPSLogger format with invalid time', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validGPSLoggerPoint.lat,
                         lon: validGPSLoggerPoint.lng,
                         time: '1484494394',
                         uuid: validGPSLoggerPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should not save the point', function() {
        expect(err).not.toBeNull();
        expect(db.findUserByUuid).not.toHaveBeenCalled();
        expect(db.logPoint).not.toHaveBeenCalled();
      });

    });

    describe('Only mandatory parameters', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validGPSLoggerPoint.lat,
                         lon: validGPSLoggerPoint.lng,
                         uuid: validGPSLoggerPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should save the point with \'now\' as the default value for time', function() {
        expect(err).toBeNull();
        expect(db.findUserByUuid).toHaveBeenCalled();
        expect(db.logPoint).toHaveBeenCalledWith(
          '42',
          Object({ lat: validGPSLoggerPoint.lat,
                   lon: validGPSLoggerPoint.lng,
                   uuid: validGPSLoggerPoint.uuid,
                   mstime: jasmine.any(Number),
                   hdop: undefined,
                   altitude: undefined,
                   batt: undefined,
                   sat: undefined,
                   speed: undefined,
                   bearing: undefined,
                   lng: validGPSLoggerPoint.lng}),
          jasmine.any(Function));
      });

    });

    describe('GPSLogger format with invalid bearing', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validGPSLoggerPoint.lat,
                         lon: validGPSLoggerPoint.lng,
                         bearing: 'abc',
                         time: validGPSLoggerPoint.time,
                         uuid: validGPSLoggerPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should save the point with bearing set to NaN', function() {
        expect(err).toBeNull();
        expect(db.findUserByUuid).toHaveBeenCalledWith(validGPSLoggerPoint.uuid, jasmine.any(Function));
        expect(db.logPoint).toHaveBeenCalledWith(testUserId, {
          lat: validGPSLoggerPoint.lat,
          lon: '-0.3', bearing: undefined, time: '2017-01-15T13:40:10.000Z', uuid: '63ee806c-2529-499d-ad2c-308d9ad1ef77', mstime: 1484487610000, hdop: undefined, altitude: undefined, batt: undefined, sat: undefined, speed: undefined, lng: '-0.3'}, jasmine.any(Function));
      });

    });

    describe('GPSLogger format with invalid satellite count', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validGPSLoggerPoint.lat,
                         lon: validGPSLoggerPoint.lng,
                         bearing: '180',
                         sat: '19.6',
                         unixtime: 1516806728.0348,
                         uuid: validGPSLoggerPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should save the point with satellite count set to undefined', function() {
        expect(err).toBeNull();
        expect(db.findUserByUuid).toHaveBeenCalledWith(validGPSLoggerPoint.uuid, jasmine.any(Function));
        expect(db.logPoint).toHaveBeenCalledWith(testUserId, {
          lat: validGPSLoggerPoint.lat,
          lon: '-0.3', bearing: 180, unixtime: 1516806728.0348, uuid: '63ee806c-2529-499d-ad2c-308d9ad1ef77', mstime: 1516806728034.8, hdop: undefined, altitude: undefined, batt: undefined, sat: undefined, speed: undefined, lng: '-0.3'}, jasmine.any(Function));
      });

    });

    describe('GPSLogger format with invalid latitude', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: 120,
                         lon: validGPSLoggerPoint.lng,
                         bearing: 'abc',
                         time: validGPSLoggerPoint.time,
                         uuid: validGPSLoggerPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should not save the point', function() {
        expect(err).not.toBeNull();
        expect(db.findUserByUuid).not.toHaveBeenCalled();
        expect(db.logPoint).not.toHaveBeenCalled();
      });

    });

    describe('GPSLogger format with non-numeric latitude', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: 'x',
                         lon: validGPSLoggerPoint.lng,
                         bearing: 'abc',
                         time: validGPSLoggerPoint.time,
                         uuid: validGPSLoggerPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should not save the point', function() {
        expect(err).not.toBeNull();
        expect(db.findUserByUuid).not.toHaveBeenCalled();
        expect(db.logPoint).not.toHaveBeenCalled();
      });

    });

    describe('GPSLogger format with invalid longitude', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validGPSLoggerPoint.lat,
                         lon: 181,
                         bearing: 'abc',
                         time: validGPSLoggerPoint.time,
                         uuid: validGPSLoggerPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should not save the point', function() {
        expect(err).not.toBeNull();
        expect(db.findUserByUuid).not.toHaveBeenCalled();
        expect(db.logPoint).not.toHaveBeenCalled();
      });

    });

    describe('Traccar format', function() {

      beforeEach(function(done) {
        spyOn(db, 'logPoint').and.callFake(
          function(userId, params, callback) {
            callback(null, testUserId);
          });
        Tracks.logPoint({lat: validGPSLoggerPoint.lat,
                         lon: validGPSLoggerPoint.lng,
                         timestamp: '1484494615',
                         id: validGPSLoggerPoint.uuid},
                        function(_err_) {
                          err = _err_;
                          done();
                        });
      });

      it('should save the point with timestamp in Unix Epoch converted to milliseconds', function() {
        expect(err).toBeNull();
        expect(db.findUserByUuid).toHaveBeenCalledWith(validGPSLoggerPoint.uuid, jasmine.any(Function));
        expect(db.logPoint).toHaveBeenCalledWith(testUserId, {
          lat: validGPSLoggerPoint.lat,
          lon: validGPSLoggerPoint.lng,
          timestamp: '1484494615',
          id: '63ee806c-2529-499d-ad2c-308d9ad1ef77',
          uuid: '63ee806c-2529-499d-ad2c-308d9ad1ef77',
          unixtime: '1484494615',
          mstime: 1484494615000,
          hdop: undefined,
          altitude: undefined,
          batt: undefined,
          sat: undefined,
          speed: undefined,
          bearing: undefined,
          lng: validGPSLoggerPoint.lng}, jasmine.any(Function));
      });

    });
  });

  describe('utils', function() {

    it('should convert a valid string to a number', function() {
      expect(Tracks.unitTests.toNum('34')).toEqual(34);
    });

    it('should convert a valid floating point string to a number', function() {
      expect(Tracks.unitTests.toNum('3.142')).toEqual(3.142);
    });

    it('should convert a negative string to a number', function() {
      expect(Tracks.unitTests.toNum('-3.142')).toEqual(-3.142);
    });

    it('should convert a string to a number', function() {
      expect(Tracks.unitTests.toNum('.142')).toEqual(0.142);
    });

    it('should convert a negative string to a number', function() {
      expect(Tracks.unitTests.toNum('-.142')).toEqual(-0.142);
    });

    it('should fail to convert an invalid floating point string to a number', function() {
      expect(Tracks.unitTests.toNum('3.142.')).toEqual(NaN);
    });

    it('should convert a valid hexadecimal string to a number', function() {
      expect(Tracks.unitTests.toNum('0x22')).toEqual(34);
    });

    it('should fail to convert an invalid string to a number', function() {
      expect(Tracks.unitTests.toNum('x34')).toEqual(NaN);
    });

    it('should fail to convert an invalid string to a number', function() {
      expect(Tracks.unitTests.toNum('')).toEqual(undefined);
    });

    it('should fail to convert an undefined value to a number', function() {
      expect(Tracks.unitTests.toNum(undefined)).toEqual(undefined);
    });

  });

  describe('createDefaultSettings', function() {
    var host = 'www.trip.test',
        port = '8080',
        validRequest = {
          headers: { 'host':  host + ':' + port},
          url: '/trip/rest/nickname/download/settings/triplogger'
        },
        validRequestNoPort = {
          headers: { 'host':  host},
          url: '/trip/rest/nickname/download/settings/triplogger'
        },
        validRequestNoHost = {
          headers: {},
          url: '/trip/rest/nickname/download/settings/triplogger'
        },
        validRequestNoUrlPrefix = {
          headers: {},
          url: '/nickname/download/settings/triplogger'
        },
        validRequestRubbishURL = {
          headers: { 'host':  host + ':' + port},
          url: '/trip/rest/rubbish'
        },
        testUserId = 'test user id',
        testConfig = {
          "defaultProfile": {
            "uuid": null,
            "name": "Initial configuration",
            "localLoggingInterval": 1.2e+1,
            "localLoggingDistance": 1e+1,
            "localLoggingEnabled": true,
            "remoteInterval": 1.8e+2,
            "remoteDistance": 1.5e+2,
            "remoteEnabled": false,
            "desiredAccuracyIndex": 0,
            "minimumHdop": 1.5e+1,
            "maxAccuracySeekTime": 3e+1,
            "strictHdopCompliance": false
          },
          "defaultSettings": {
            "currentSettingUUID": null,
            "settingProfiles": null,
            "activityBarEnabled": true,
            "notifyAfterSendNote": false,
            "notifyAfterSendSingle": false,
            "maxActivityHistory": 100,
            "batteryChargingLevel": 0e+0,
            "batteryDischargingLevel": 0e+0,
            "httpsEnabled": true,
            "httpPostEnabled": true,
            "postJson": false,
            "hostname": "trip.test",
            "hostPort": "8000",
            "hostPath": "/location",
            "userId": null,
            "noteSuggestions": ["Parked here"]
          }
        };

    it('should set the host name based on the passed request', function() {
      var result = Tracks.unitTests.createDefaultSettings(null, validRequest, testUserId);
      expect(result.hostname).toEqual(host);
      expect(result.hostPort).toEqual(port);
      expect(result.hostPath).toEqual('/trip/rest/log_point');
      expect(result.userId).toEqual(testUserId);
    });

    it('should set the host name based on the passed request where no port name is specified', function() {
      var result = Tracks.unitTests.createDefaultSettings(null, validRequestNoPort, testUserId);
      expect(result.hostname).toEqual(host);
      expect(result.hostPort).toEqual('');
      expect(result.userId).toEqual(testUserId);
    });

    it('should not set the host name based on the passed request where no host is specified', function() {
      var result = Tracks.unitTests.createDefaultSettings(null, validRequestNoHost, testUserId);
      expect(result.hostname).toEqual('');
      expect(result.hostPort).toEqual('');
      expect(result.userId).toEqual(testUserId);
    });

    it('should set the url where the passed request does not contain a url prefixed with /trip/rest', function() {
      var result = Tracks.unitTests.createDefaultSettings(null, validRequestNoUrlPrefix, testUserId);
      expect(result.hostPath).toEqual('/log_point');
      expect(result.userId).toEqual(testUserId);
    });

    it('should set values based on the passed configuration', function() {
      var result = Tracks.unitTests.createDefaultSettings(testConfig, validRequestRubbishURL, testUserId);
      expect(result.hostname).toEqual(testConfig.defaultSettings.hostname);
      expect(result.hostPort).toEqual(testConfig.defaultSettings.hostPort);
      expect(result.hostPath).toEqual(testConfig.defaultSettings.hostPath);
      expect(result.userId).toEqual(testConfig.defaultSettings.userId);
    });

  });

});
