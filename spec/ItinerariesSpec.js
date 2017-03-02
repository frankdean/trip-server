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
winston.level = 'error';

describe('itinerary.js', function() {
  var Itineraries = require('../itineraries.js');
  var db = require('../db.js');

  var testUsername = 'no_secrets@secret.org';
  var testUserId = 42;
  var err, itinerary = {};

  describe('saveItinerary()', function() {

    describe('update an itinerary', function() {

      beforeEach(function() {
        itinerary.id = 59;
        itinerary.title = 'My itinerary';
        spyOn(db, 'getUserIdByUsername').and.callFake(
          function(username, callback) {
            callback(null, testUserId);
          });
        spyOn(db, 'createItinerary').and.callFake(
          function(username, itinerary, callback) {
            callback(null);
          });
      });

      describe('successfully', function() {

        beforeEach(function(done) {
          spyOn(db, 'updateItinerary').and.callFake(
            function(username, itinerary, callback) {
              callback(null, true);
            });
          Itineraries.saveItinerary(testUsername, itinerary, function(_err_) {
            err = _err_;
            done();
          });
        });

        it('should have looked up the user ID', function() {
          expect(db.getUserIdByUsername).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
        });

        it('should not create a new itinerary', function() {
          expect(db.createItinerary).not.toHaveBeenCalled();
        });

        it('should update an existing itinerary', function() {
          expect(db.updateItinerary).toHaveBeenCalledWith(testUserId, itinerary, jasmine.any(Function));
        });

        it('should not raise an error when the db call result is true', function() {
          expect(err).toBeFalsy();
        });
      });

      describe('unsuccessfully', function() {

        beforeEach(function(done) {
          spyOn(db, 'updateItinerary').and.callFake(
            function(username, itinerary, callback) {
              callback(null, false);
            });
          Itineraries.saveItinerary(testUsername, itinerary, function(_err_) {
            err = _err_;
            done();
          });
        });

        it('should have looked up the user ID', function() {
          expect(db.getUserIdByUsername).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
        });

        it('should not create a new itinerary', function() {
          expect(db.createItinerary).not.toHaveBeenCalled();
        });

        it('should update an existing itinerary', function() {
          expect(db.updateItinerary).toHaveBeenCalledWith(testUserId, itinerary, jasmine.any(Function));
        });

        it('should not raise an error when the db call result is true', function() {
          expect(err).toBeTruthy();
        });

      });

    });

    describe('create a minimal itinerary', function() {

      beforeEach(function(done) {
        itinerary.id = undefined;
        itinerary.title = 'My itinerary';
        spyOn(db, 'getUserIdByUsername').and.callFake(
          function(username, callback) {
            callback(null, testUserId);
            done();
          });
        spyOn(db, 'createItinerary').and.callFake(
          function(username, itinerary, callback) {
            callback(null);
          });
        Itineraries.saveItinerary(testUsername, itinerary, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should have looked up the user ID', function() {
        expect(db.getUserIdByUsername).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
      });

      it('should create a new itinerary', function() {
        expect(db.createItinerary).toHaveBeenCalledWith(testUserId, itinerary, jasmine.any(Function));
      });

      it('should not raise an error', function() {
        expect(err).toBeFalsy();
      });

    });

    describe('Missing title', function() {

      beforeEach(function(done) {
        itinerary.title = '';
        itinerary.description = 'This is my itinerary';
        spyOn(db, 'getUserIdByUsername').and.callFake(
          function(username, callback) {
            callback(null, testUserId);
            done();
          });
        spyOn(db, 'createItinerary').and.callFake(
          function(username, itinerary, callback) {
            callback(null);
          });
        Itineraries.saveItinerary(testUsername, itinerary, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should not have looked up the user ID', function() {
        expect(db.getUserIdByUsername).not.toHaveBeenCalled();
      });

      it('should not create a new itinerary', function() {
        expect(db.createItinerary).not.toHaveBeenCalled();
      });

      it('should not return an error', function() {
        expect(err).toBeTruthy();
      });

    });

    describe('Valid date', function() {

      beforeEach(function(done) {
        itinerary.title = 'Title is mandatory';
        itinerary.start = '2016-03-07';
        spyOn(db, 'getUserIdByUsername').and.callFake(
          function(username, callback) {
            callback(null, testUserId);
            done();
          });
        spyOn(db, 'createItinerary').and.callFake(
          function(username, itinerary, callback) {
            callback(null);
          });
        Itineraries.saveItinerary(testUsername, itinerary, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should have looked up the user ID', function() {
        expect(db.getUserIdByUsername).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
      });

      it('should create a new itinerary', function() {
        expect(db.createItinerary).toHaveBeenCalledWith(testUserId, itinerary, jasmine.any(Function));
      });

      if('should not return an error', function() {
        expect(err).toBeFalsy();
      });

    });

    describe('Invalid date', function() {

      beforeEach(function(done) {
        itinerary.title = 'Title is mandatory';
        itinerary.date = 'Rubbish';
        spyOn(db, 'getUserIdByUsername').and.callFake(
          function(username, callback) {
            callback(null, testUserId);
            done();
          });
        spyOn(db, 'createItinerary').and.callFake(
          function(username, itinerary, callback) {
            callback(null);
          });
        Itineraries.saveItinerary(testUsername, itinerary, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should not have looked up the user ID', function() {
        expect(db.getUserIdByUsername).not.toHaveBeenCalled();
      });

      it('should not create a new itinerary', function() {
        expect(db.createItinerary).not.toHaveBeenCalled();
      });

      it('should return an error', function() {
        expect(err).toBeTruthy();
      });

    });

  });

  describe('Fetch itineraries', function() {
    var result;
    var testCount = 2000;
    var testPayload = [{id: 1, title: 'test 1'}];

    beforeEach(function(done) {
      spyOn(db, 'getItinerariesCountByUsername').and.callFake(
        function(username, callback) {
          callback(null, testCount);
          done();
        });
      spyOn(db, 'getItinerariesByUsername').and.callFake(
        function(username, offset, limit, callback) {
          callback(null, testPayload);
          done();
        });
      Itineraries.getItineraries(testUsername, 0, 10, function(_err_, _result_) {
        err = _err_;
        result = _result_;
      });
    });

    it('should return an object wrapping the total count and the payload', function() {
      expect(result.count).toEqual(testCount);
      expect(result.payload).toEqual(testPayload);
    });

  });

  describe('Share itineraries', function() {
    var testItineraryShare = {
      nickname:  'testNickname',
      active: true
    };

    var testInactiveItineraryShare = {
      nickname:  testItineraryShare.nickname,
      active: false
    };

    var testExistingItineraryShare = {
      itinerary_id: 42,
      shared_to_id: 99,
      active: true
    };

    var testShares = [testItineraryShare, testInactiveItineraryShare];
    var testInvalidShares = [testItineraryShare,
                             testInactiveItineraryShare,
                             {nickname: '',
                              active: false}];

    describe('save itinerary', function() {
      
      beforeEach(function() {
        spyOn(db, 'createItineraryShare').and.callFake(
          function(itineraryId, nickname, active, callback) {
            callback(null);
          });
        spyOn(db, 'updateItineraryShare').and.callFake(
          function(itineraryId, sharedToId, active, callback) {
            callback(null);
          });
      });

      describe('which belongs to the user', function() {

        beforeEach(function() {
          spyOn(db, 'confirmItineraryOwnership').and.callFake(
            function(username, itineraryId, callback) {
              callback(null, true);
            });
        });

        describe('and exists', function() {

          beforeEach(function() {
            spyOn(db, 'getItineraryShare').and.callFake(
              function(itineraryId, nickname, callback) {
                callback(null, testExistingItineraryShare);
              });
          });

          describe('and active flag differs', function() {

            beforeEach(function(done) {
              Itineraries.shareItinerary(testUsername,
                                         testExistingItineraryShare.itinerary_id,
                                         testInactiveItineraryShare,
                                         function(_err_) {
                                           err = _err_;
                                           done();
                                         });
            });

            it('should update the existing shared itinerary', function() {
              expect(err).toBeFalsy();
              expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
                testUsername,
                testExistingItineraryShare.itinerary_id,
                jasmine.any(Function));
              expect(db.getItineraryShare).toHaveBeenCalledWith(
                testExistingItineraryShare.itinerary_id,
                testItineraryShare.nickname,
                jasmine.any(Function));
              expect(db.updateItineraryShare).toHaveBeenCalledWith(
                testExistingItineraryShare.itinerary_id,
                testExistingItineraryShare.shared_to_id,
                testInactiveItineraryShare.active,
                jasmine.any(Function));
              expect(db.createItineraryShare).not.toHaveBeenCalled();
            });

          });

          describe('and active flag does not differ', function() {

            beforeEach(function(done) {
              Itineraries.shareItinerary(testUsername,
                                         testExistingItineraryShare.itinerary_id,
                                         testItineraryShare,
                                         function(_err_) {
                                           err = _err_;
                                           done();
                                         });
            });

            it('should not update the existing shared itinerary as no change in state', function() {
              expect(err).toBeFalsy();
              expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
                testUsername,
                testExistingItineraryShare.itinerary_id,
                jasmine.any(Function));
              expect(db.getItineraryShare).toHaveBeenCalledWith(
                testExistingItineraryShare.itinerary_id,
                testItineraryShare.nickname,
                jasmine.any(Function));
              expect(db.updateItineraryShare).not.toHaveBeenCalled();
              expect(db.createItineraryShare).not.toHaveBeenCalled();
            });

          });

        });

        describe('and does not exist', function() {

          beforeEach(function(done) {
            spyOn(db, 'getItineraryShare').and.callFake(
              function(itineraryId, nickname, callback) {
                callback(null, null);
              });
            Itineraries.shareItinerary(testUsername,
                                       testExistingItineraryShare.itinerary_id,
                                       testInactiveItineraryShare,
                                       function(_err_) {
                                         err = _err_;
                                         done();
                                       });
          });

          it('should create a new shared itinerary', function() {
            expect(err).toBeFalsy();
            expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              jasmine.any(Function));
            expect(db.getItineraryShare).toHaveBeenCalledWith(
              testExistingItineraryShare.itinerary_id,
              testItineraryShare.nickname,
              jasmine.any(Function));
            expect(db.createItineraryShare).toHaveBeenCalledWith(
              testExistingItineraryShare.itinerary_id,
              testItineraryShare.nickname,
              testInactiveItineraryShare.active,
              jasmine.any(Function));
            expect(db.updateItineraryShare).not.toHaveBeenCalled();
          });

        });

      });

      describe('which does not belong to the user', function() {

        beforeEach(function(done) {
          spyOn(db, 'confirmItineraryOwnership').and.callFake(
            function(username, itineraryId, callback) {
              callback(null, false);
            });
          spyOn(db, 'getItineraryShare').and.stub();
          Itineraries.shareItinerary(testUsername,
                                     testExistingItineraryShare.itinerary_id,
                                     testInactiveItineraryShare,
                                     function(_err_) {
                                       err = _err_;
                                       done();
                                     });
        });

        it('should not update or create a shared itinerary', function() {
          expect(err).toBeTruthy();
          expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
            testUsername,
            testExistingItineraryShare.itinerary_id,
            jasmine.any(Function));
          expect(db.getItineraryShare).not.toHaveBeenCalled();
          expect(db.updateItineraryShare).not.toHaveBeenCalled();
          expect(db.createItineraryShare).not.toHaveBeenCalled();
        });
      });

    });

    describe('update active states', function() {

      beforeEach(function() {
        spyOn(db, 'updateItineraryShareActiveStates').and.callFake(
          function(itineraryId, shares, callback) {
            callback(null);
          });
      });

      describe('which do belong to the user', function() {

        beforeEach(function() {
          spyOn(db, 'confirmItineraryOwnership').and.callFake(
            function(username, itineraryId, callback) {
              callback(null, true);
            });
        });

        describe('and shares are valid', function() {

          beforeEach(function(done) {
            Itineraries.updateItinerarySharesActiveStates(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              testShares,
              function(_err_) {
                err = _err_;
                done();
              });
          });

          it('should update the existing shared itineraries', function() {
            expect(err).toBeFalsy();
            expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              jasmine.any(Function));
            expect(db.updateItineraryShareActiveStates).toHaveBeenCalledWith(
              testExistingItineraryShare.itinerary_id,
              testShares,
              jasmine.any(Function));
          });

        });

        describe('and one share is invalid', function() {

          beforeEach(function(done) {
            Itineraries.updateItinerarySharesActiveStates(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              testInvalidShares,
              function(_err_) {
                err = _err_;
                done();
              });
          });

          it('should fail if one or more shares fail validation', function() {
            expect(err).toBeTruthy();
            expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              jasmine.any(Function));
            expect(db.updateItineraryShareActiveStates).not.toHaveBeenCalled();
          });

        });

      });

      describe('which do not belong to the user', function() {

        beforeEach(function(done) {
          spyOn(db, 'confirmItineraryOwnership').and.callFake(
            function(username, itineraryId, callback) {
              callback(null, false);
            });
            Itineraries.updateItinerarySharesActiveStates(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              testShares,
              function(_err_) {
                err = _err_;
                done();
              });
        });

          it('should not update the existing shared itineraries', function() {
            expect(err).toBeTruthy();
            expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              jasmine.any(Function));
            expect(db.updateItineraryShareActiveStates).not.toHaveBeenCalled();
          });

      });

    });

    describe('delete shares', function() {

      beforeEach(function() {
        spyOn(db, 'deleteItineraryShares').and.callFake(
          function(itineraryId, shares, callback) {
            callback(null);
          });
        testShares.forEach(function(v) {
          v.deleted = true;
        });
      });

      describe('which do belong to the user', function() {

        beforeEach(function() {
          spyOn(db, 'confirmItineraryOwnership').and.callFake(
            function(username, itineraryId, callback) {
              callback(null, true);
            });
        });

        describe('and shares are valid', function() {

          beforeEach(function(done) {
            Itineraries.deleteItinerarySharesForShareList(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              testShares,
              function(_err_) {
                err = _err_;
                done();
              });
          });

          it('should delete the existing shared itineraries', function() {
            expect(err).toBeFalsy();
            expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              jasmine.any(Function));
            expect(db.deleteItineraryShares).toHaveBeenCalledWith(
              testExistingItineraryShare.itinerary_id,
              jasmine.any(Object),
              jasmine.any(Function));
          });

        });

        describe('and one share is invalid', function() {

          beforeEach(function(done) {
            Itineraries.deleteItinerarySharesForShareList(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              testInvalidShares,
              function(_err_) {
                err = _err_;
                done();
              });
          });

          it('should fail if one or more shares fail validation', function() {
            expect(err).toBeTruthy();
            expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              jasmine.any(Function));
            expect(db.deleteItineraryShares).not.toHaveBeenCalled();
          });

        });

      });

      describe('which do not belong to the user', function() {

        beforeEach(function(done) {
          spyOn(db, 'confirmItineraryOwnership').and.callFake(
            function(username, itineraryId, callback) {
              callback(null, false);
            });
            Itineraries.deleteItinerarySharesForShareList(
              testUsername,
              testExistingItineraryShare.itinerary_id,
              testShares,
              function(_err_) {
                err = _err_;
                done();
              });
        });

        it('should not delete the existing shared itineraries', function() {
          expect(err).toBeTruthy();
          expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
            testUsername,
            testExistingItineraryShare.itinerary_id,
            jasmine.any(Function));
          expect(db.deleteItineraryShares).not.toHaveBeenCalled();
        });

      });

    });

  });

  describe('getItineraryWaypointForUser', function() {
    var wpt,
        itineraryId = 929,
        waypointId = 8966,
        testWaypoint = {id: waypointId, altitude: 429};

    beforeEach(function(done) {
      spyOn(db, 'confirmItinerarySharedAccess').and.callFake(
        function(username, itineraryId, callback) {
          callback(null, true);
        });
      spyOn(db, 'getItineraryWaypoint').and.callFake(
        function(itineraryId, waypointId, callback) {
          callback(null, testWaypoint);
        });
      Itineraries.getItineraryWaypointForUser(testUsername, itineraryId, waypointId, function(_err_, _result_) {
        err = _err_;
        wpt = _result_;
        done();
      });
    });

    it('should return the altitude as a numeric value', function() {
      expect(wpt.altitude).toEqual(429);
      expect(db.confirmItinerarySharedAccess).toHaveBeenCalledWith(testUsername, itineraryId, jasmine.any(Function));
      expect(db.getItineraryWaypoint).toHaveBeenCalledWith(itineraryId, waypointId, jasmine.any(Function));
    });

  });

  describe('save itinerary waypoint', function() {
    var testWaypointId = 929,
        itineraryId = 9302,
        newWaypointId;

    beforeEach(function() {
      spyOn(db, 'updateItineraryWaypoint').and.callFake(
        function(itineraryId, waypointId, waypoint, callback) {
          callback(null);
        });
      spyOn(db, 'createItineraryWaypoint').and.callFake(
        function(itineraryId, waypoint, callback) {
          callback(null, 42);
        });
    });

    describe('user is owner of itinerary', function() {
      var testWaypoint = {
        "name": "waypoint name",
        "lat": 50.5,
        "lng": -2.5,
        "altitude": 42.5,
        "time": "2016-12-01T19:43:27.000Z",
        "symbol": "Flag, Blue",
        "comment": "test comment",
        "description": "test desc"
      };

      describe ('update existing itinerary waypoint', function() {

        beforeEach(function(done) {
          spyOn(db, 'confirmItineraryOwnership').and.callFake(
            function(username, itineraryId, callback) {
              callback(null, true);
            });
          Itineraries.saveItineraryWaypoint(testUsername, itineraryId, testWaypointId, testWaypoint, function(_err_, _result_) {
            err = _err_;
            newWaypointId = _result_;
            done();
          });
        });

        it('should update the itinerary waypoint', function() {
          expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
            testUsername,
            itineraryId,
            jasmine.any(Function));
          expect(db.updateItineraryWaypoint).toHaveBeenCalledWith(itineraryId, testWaypointId, testWaypoint, jasmine.any(Function));
        });

      });

      describe ('create a new itinerary waypoint', function() {

        beforeEach(function(done) {
          spyOn(db, 'confirmItineraryOwnership').and.callFake(
            function(username, itineraryId, callback) {
              callback(null, true);
            });
          Itineraries.saveItineraryWaypoint(testUsername, itineraryId, null, testWaypoint, function(_err_, _result_) {
            err = _err_;
            newWaypointId = _result_;
            done();
          });
        });

        it('should update an existing itinerary waypoint', function() {
          expect(db.confirmItineraryOwnership).toHaveBeenCalledWith(
            testUsername,
            itineraryId,
            jasmine.any(Function));
          expect(db.createItineraryWaypoint).toHaveBeenCalledWith(itineraryId, testWaypoint, jasmine.any(Function));
          expect(newWaypointId).toEqual(42);
        });

      });

    });

  });

  describe('Itinerary sharing report', function() {
    var result,
        sharedItineraries = [
          {id: 1234, title: 'test itinerary 1234', start: null},
          {id: 1235, title: 'test itinerary 1235', start: '2017-01-28T09:56:43'},
          {id: 1236, title: 'test itinerary 1236', start: '2017-01-28T09:55:47'}
        ],
        nicknames = [
          {id: 1234, nickname: 'Adam'},
          {id: 1234, nickname: 'Orange'},
          {id: 1234, nickname: 'Purple'},
          {id: 1235, nickname: 'Adam'},
          {id: 1235, nickname: 'Adam'},
          {id: 1236, nickname: 'Adam'}
        ];

    describe('itinerary shares exist', function() {
      var expectedSharedItineraries = {
        count: 1000,
        payload: [
          {id: 1234, title: 'test itinerary 1234', start: null,
           shares: [
             nicknames[0].nickname,
             nicknames[1].nickname,
             nicknames[2].nickname
           ]},
          {id: 1235, title: 'test itinerary 1235', start: '2017-01-28T09:56:43',
           shares: [
             nicknames[3].nickname,
             nicknames[4].nickname
           ]},
          {id: 1236, title: 'test itinerary 1236', start: '2017-01-28T09:55:47',
           shares: [
             nicknames[5].nickname
           ]}
        ]
      };

      beforeEach(function(done) {
        spyOn(db, 'getCountSharedItinerariesForUser').and.callFake(
          function(username, callback) {
            callback(null, 1000);
          });
        spyOn(db, 'getSharedItinerariesForUser').and.callFake(
          function(username, offset, limit, callback) {
            callback(null, sharedItineraries);
          });
        spyOn(db, 'getSharedItinerariesNicknamesForUser').and.callFake(
          function(username, itineraryIds, callback) {
            callback(null, nicknames);
          });
        Itineraries.getSharedItinerariesForUser(testUsername, 0, 3, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('should succeed in returning a page of itinerary shares', function() {
        expect(db.getCountSharedItinerariesForUser).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
        expect(db.getSharedItinerariesForUser).toHaveBeenCalledWith(testUsername, 0, 3, jasmine.any(Function));
        expect(db.getSharedItinerariesNicknamesForUser).toHaveBeenCalledWith(testUsername, [1234, 1235, 1236], jasmine.any(Function));
        expect(result).toEqual(expectedSharedItineraries);
      });

    });

    describe('itinerary shares do not exist', function() {
      var expectedSharedItineraries = {
        count: 0,
        payload: []
      };

      beforeEach(function(done) {
        spyOn(db, 'getCountSharedItinerariesForUser').and.callFake(
          function(username, callback) {
            callback(null, 0);
          });
        spyOn(db, 'getSharedItinerariesForUser').and.callFake(
          function(username, offset, limit, callback) {
            callback(null, sharedItineraries);
          });
        spyOn(db, 'getSharedItinerariesNicknamesForUser').and.callFake(
          function(username, itineraryIds, callback) {
            callback(null, nicknames);
          });
        Itineraries.getSharedItinerariesForUser(testUsername, 0, 3, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('should succeed in returning a page of itinerary shares', function() {
        expect(db.getCountSharedItinerariesForUser).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
        expect(db.getSharedItinerariesForUser).not.toHaveBeenCalled();
        expect(db.getSharedItinerariesNicknamesForUser).not.toHaveBeenCalled();
        expect(result).toEqual(expectedSharedItineraries);
      });

    });

    describe('itinerary shares exist but nicknames missing', function() {
      // Unlikely to occur in practice, but a user could modify shares between calls
      var expectedSharedItineraries = {
        count: 1000,
        payload: [
          {id: 1234, title: 'test itinerary 1234', start: null,
           shares: []},
          {id: 1235, title: 'test itinerary 1235', start: '2017-01-28T09:56:43',
           shares: []},
          {id: 1236, title: 'test itinerary 1236', start: '2017-01-28T09:55:47',
           shares: []}
        ]
      };

      beforeEach(function(done) {
        spyOn(db, 'getCountSharedItinerariesForUser').and.callFake(
          function(username, callback) {
            callback(null, 1000);
          });
        spyOn(db, 'getSharedItinerariesForUser').and.callFake(
          function(username, offset, limit, callback) {
            callback(null, sharedItineraries);
          });
        spyOn(db, 'getSharedItinerariesNicknamesForUser').and.callFake(
          function(username, itineraryIds, callback) {
            callback(null, []);
          });
        Itineraries.getSharedItinerariesForUser(testUsername, 0, 10, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('should succeed in returning a page of itinerary shares', function() {
        expect(db.getCountSharedItinerariesForUser).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
        expect(db.getSharedItinerariesForUser).toHaveBeenCalledWith(testUsername, 0, 10, jasmine.any(Function));
        expect(db.getSharedItinerariesNicknamesForUser).toHaveBeenCalledWith(testUsername, [1234, 1235, 1236], jasmine.any(Function));
        expect(result).toEqual(expectedSharedItineraries);
      });

    });

    describe('itinerary shares exist but unexpected nickname', function() {
      // Unlikely to occur in practice, but a user could modify shares between calls
      var expectedSharedItineraries = {
        count: 1000,
        payload: [
          {id: 1234, title: 'test itinerary 1234', start: null,
           shares: [
             nicknames[0].nickname,
             nicknames[1].nickname,
             nicknames[2].nickname
           ]},
          {id: 1235, title: 'test itinerary 1235', start: '2017-01-28T09:56:43',
           shares: [
             nicknames[3].nickname,
             nicknames[4].nickname
           ]},
          {id: 1236, title: 'test itinerary 1236', start: '2017-01-28T09:55:47',
           shares: [
             nicknames[5].nickname
           ]}
        ]
      };
      var nicknames2 = [
        {id: 1234, nickname: 'Adam'},
        {id: 1234, nickname: 'Orange'},
        {id: 1234, nickname: 'Purple'},
        {id: 1235, nickname: 'Adam'},
        {id: 1235, nickname: 'Adam'},
        {id: 1236, nickname: 'Adam'},
        {id: 1237, nickname: 'Adam'}
      ];

      beforeEach(function(done) {
        spyOn(db, 'getCountSharedItinerariesForUser').and.callFake(
          function(username, callback) {
            callback(null, 1000);
          });
        spyOn(db, 'getSharedItinerariesForUser').and.callFake(
          function(username, offset, limit, callback) {
            callback(null, sharedItineraries);
          });
        spyOn(db, 'getSharedItinerariesNicknamesForUser').and.callFake(
          function(username, itineraryIds, callback) {
            callback(null, nicknames2);
          });
        Itineraries.getSharedItinerariesForUser(testUsername, 0, 10, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('should succeed in returning a page of itinerary shares', function() {
        expect(db.getCountSharedItinerariesForUser).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
        expect(db.getSharedItinerariesForUser).toHaveBeenCalledWith(testUsername, 0, 10, jasmine.any(Function));
        expect(db.getSharedItinerariesNicknamesForUser).toHaveBeenCalledWith(testUsername, [1234, 1235, 1236], jasmine.any(Function));
        expect(result).toEqual(expectedSharedItineraries);
      });

    });

  });

});
