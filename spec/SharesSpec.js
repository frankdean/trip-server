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

describe('shares.js', function() {

  var Shares = require('../shares.js');
  var db = require('../db.js');

  var err, result;

  var testUsername = 'trip_user@trip.test';

  var share1 = {nickname: 'nick',
                recentDays: 1,
                recentHours: 2,
                recentMinutes: 3,
                maximumDays: 4,
                maximumHours: 5,
                maximumMinutes: 6,
                recentLimit: '1d 2h 3m',
                maximumLimit: '4d 5h 6m',
                active: true
               };
  var share2 = {nickname: '~Fred@te$t_{what}!.com0>',
                recentDays: 1,
                recentHours: 2,
                recentMinutes: 3,
                maximumDays: 4,
                maximumHours: 5,
                maximumMinutes: 6,
                recentLimit: '1d 2h 3m',
                maximumLimit: '4d 5h 6m',
                active: false
               };
  var share3 = {nickname: '~Jane#@te$t_{what}!.com0>',
                recentDays: 1,
                recentHours: 2,
                recentMinutes: 3,
                maximumDays: 4,
                maximumHours: 5,
                maximumMinutes: 6,
                recentLimit: '1d 2h 3m',
                maximumLimit: '4d 5h 6m',
                deleted: true,
                active: false
               };
  var invalidShare1 = {nickname: 'ni ck',
                recentDays: 1,
                recentHours: 2,
                recentMinutes: 3,
                maximumDays: 4,
                maximumHours: 5,
                maximumMinutes: 6,
                recentLimit: '1d 2h 3m',
                maximumLimit: '4d 5h 6m',
                deleted: true,
                active: true
               };
  var testShares = [
    share1,
    share2
  ];
  var testShares2 = [
    share1,
    share2,
    share3
  ];
  var testInvalidShares = [
    share1,
    share2,
    invalidShare1
  ];
  var testInvalidShares2 = [
    share1,
    share2,
    share3,
    invalidShare1
  ];

  var dbResult = [
    {
      nickname: share1.nickname,
      recent_minutes: (share1.recentDays * 24 + share1.recentHours) * 60 + share1.recentMinutes,
      max_minutes: (share1.maximumDays * 24 + share1.maximumHours) * 60 + share1.maximumMinutes,
      active: true
    }
  ];

  describe('nickname validation', function() {

    it('should accept valid nicknames', function() {
      expect(Shares.validateShares(testShares)).toBeTruthy();
    });

    it('should reject a nickname containing a space', function() {
      expect(Shares.validateShares(testInvalidShares)).toBeFalsy();
    });

    it('should reject a nickname containing a forward slash', function() {
      invalidShare1.nickname = 'nick/';
      expect(Shares.validateShares(testInvalidShares)).toBeFalsy();
    });

    it('should reject a nickname containing a question mark', function() {
      invalidShare1.nickname = 'nick?';
      expect(Shares.validateShares(testInvalidShares)).toBeFalsy();
    });

  });

  describe('location shares', function() {
    var expected = {count: 1, payload: [share1]};

    beforeEach(function(done) {
      spyOn(db, 'getLocationShareCountByUsername').and.callFake(
        function(username, callback) {
          callback(null, expected.count);
        });
      spyOn(db, 'getLocationSharesByUsername').and.callFake(
        function(username, offset, limit, callback) {
          callback(null, dbResult);
        });
      Shares.getLocationShares(testUsername, 3, 10, function(_err_, _result_) {
        err = _err_;
        result = _result_;
        done();
      });
    });

    it('should call the database with the passed username to get the record count', function() {
      expect(db.getLocationShareCountByUsername).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
    });

    it('should call the database with the passed username and page values to fetch the location shares', function() {
      expect(db.getLocationSharesByUsername).toHaveBeenCalledWith(testUsername, 3, 10, jasmine.any(Function));
    });

    it('should return the results in a single object', function() {
      expect(expected).toEqual(result);
    });

  });

  describe('Update location share active states', function() {

    describe('valid nicknames', function() {

      beforeEach(function(done) {
        spyOn(db, 'updateLocationShareActiveStates').and.callFake(
          function(username, shares, callback){
            callback(null);
          });
        Shares.updateLocationShareActiveStates(testUsername, testShares, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should save the values', function() {
        expect(db.updateLocationShareActiveStates).toHaveBeenCalledWith(testUsername, testShares, jasmine.any(Function));
      });

      it('should not return an error', function() {
        expect(err).toBeFalsy();
      });

    });

    describe('valid nicknames', function() {

      beforeEach(function(done) {
        spyOn(db, 'updateLocationShareActiveStates').and.callFake(
          function(username, shares, callback){
            callback(null);
          });
        Shares.updateLocationShareActiveStates(testUsername, testInvalidShares, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should not save the values', function() {
        expect(db.updateLocationShareActiveStates).not.toHaveBeenCalled();
      });

      it('should return an error', function() {
        expect(err).toBeTruthy();
      });

    });

  });

  describe('Delete location shares', function() {

    describe('valid nicknames', function() {
      var expected = [share3.nickname];

      beforeEach(function(done) {
        spyOn(db, 'deleteLocationShares').and.callFake(
          function(username, nicknames, callback){
            callback(null);
          });
        Shares.deleteLocationSharesForShareList(testUsername, testShares2, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should delete the shares flagged as deleted', function() {
        expect(db.deleteLocationShares).toHaveBeenCalledWith(testUsername, expected, jasmine.any(Function));
      });

      it('should not return an error', function() {
        expect(err).toBeFalsy();
      });

    });

    describe('invalid nicknames', function() {
      var expected = [share3.nickname];

      beforeEach(function(done) {
        spyOn(db, 'deleteLocationShares').and.callFake(
          function(username, nicknames, callback){
            callback(null);
          });
        Shares.deleteLocationSharesForShareList(testUsername, testInvalidShares2, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should not delete the shares flagged as deleted', function() {
        expect(db.deleteLocationShares).not.toHaveBeenCalled();
      });

      it('should return an error', function() {
        expect(err).toBeTruthy();
      });

    });
  });

  describe('save location share', function() {

    describe('converting to minutes', function() {

      it('should convert a days, hours and minutes', function() {
        expect(Shares.unitTests.convertDaysHoursMinsToMins(undefined, undefined, undefined)).toBeNull();
      });

    });

    describe('update valid share', function() {

      beforeEach(function(done) {
        spyOn(db, 'findUserByUsername').and.callFake(
          function(username, callback) {
            callback(null, 123);
          });
        spyOn(db, 'findUserByNickname').and.callFake(
          function(nickname, callback) {
            callback(null, 456);
          });
        spyOn(db, 'getLocationShareExistsByUsername').and.callFake(
          function(username, nickname, callback) {
            callback(null, true);
          });
        spyOn(db, 'updateLocationShare').and.callFake(
          function(sharedById, sharedToId, recentMinutes, maximumMinutes, active, callback) {
            callback(null);
          });
        spyOn(db, 'createLocationShare').and.stub();
        Shares.saveLocationShare(testUsername, share1, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should not return an error', function() {
        expect(err).toBeFalsy();
      });

      it('should search for the username', function() {
        expect(db.findUserByUsername).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
      });

      it('should search for the nickname', function() {
        expect(db.findUserByNickname).toHaveBeenCalledWith(share1.nickname, jasmine.any(Function));
      });

      it('should check if the share already exists', function() {
        expect(db.getLocationShareExistsByUsername).toHaveBeenCalledWith(testUsername, share1.nickname, jasmine.any(Function));
      });

      it ('should update the existing location share', function() {
        expect(db.updateLocationShare).toHaveBeenCalledWith(123, 456, dbResult[0].recent_minutes, dbResult[0].max_minutes, share1.active, jasmine.any(Function));
      });

      it ('should not create a new location share', function() {
        expect(db.createLocationShare).not.toHaveBeenCalledWith(123, 456, dbResult[0].recent_minutes, dbResult[0].max_minutes, share1.active, jasmine.any(Function));
      });

    });

    describe('create valid share', function() {

      beforeEach(function(done) {
        spyOn(db, 'findUserByUsername').and.callFake(
          function(username, callback) {
            callback(null, 123);
          });
        spyOn(db, 'findUserByNickname').and.callFake(
          function(nickname, callback) {
            callback(null, 456);
          });
        spyOn(db, 'getLocationShareExistsByUsername').and.callFake(
          function(username, nickname, callback) {
            callback(null, false);
          });
        spyOn(db, 'createLocationShare').and.callFake(
          function(sharedById, sharedToId, recentMinutes, maximumMinutes, active, callback) {
            callback(null);
          });
        spyOn(db, 'updateLocationShare').and.stub();
        Shares.saveLocationShare(testUsername, share1, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should not return an error', function() {
        expect(err).toBeFalsy();
      });

      it('should search for the username', function() {
        expect(db.findUserByUsername).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
      });

      it('should search for the nickname', function() {
        expect(db.findUserByNickname).toHaveBeenCalledWith(share1.nickname, jasmine.any(Function));
      });

      it('should check if the share already exists', function() {
        expect(db.getLocationShareExistsByUsername).toHaveBeenCalledWith(testUsername, share1.nickname, jasmine.any(Function));
      });

      it ('should not update the existing location share', function() {
        expect(db.updateLocationShare).not.toHaveBeenCalledWith(123, 456, dbResult[0].recent_minutes, dbResult[0].max_minutes, share1.active, jasmine.any(Function));
      });

      it ('should not create a new location share', function() {
        expect(db.createLocationShare).toHaveBeenCalledWith(123, 456, dbResult[0].recent_minutes, dbResult[0].max_minutes, share1.active, jasmine.any(Function));
      });

    });

    describe('nickname not found', function() {

      beforeEach(function(done) {
        spyOn(db, 'findUserByUsername').and.callFake(
          function(username, callback) {
            callback(null, 123);
          });
        spyOn(db, 'findUserByNickname').and.callFake(
          function(nickname, callback) {
            callback(new Error('User not found'));
          });
        spyOn(db, 'getLocationShareExistsByUsername').and.callFake(
          function(username, nickname, callback) {
            callback(null, true);
          });
        spyOn(db, 'updateLocationShare').and.callFake(
          function(sharedById, sharedToId, recentMinutes, maximumMinutes, active, callback) {
            callback(null);
          });
        spyOn(db, 'createLocationShare').and.stub();
        Shares.saveLocationShare(testUsername, share1, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should return an error', function() {
        expect(err).toBeTruthy();
      });

      it('should search for the username', function() {
        expect(db.findUserByUsername).toHaveBeenCalledWith(testUsername, jasmine.any(Function));
      });

      it('should search for the nickname', function() {
        expect(db.findUserByNickname).toHaveBeenCalledWith(share1.nickname, jasmine.any(Function));
      });

      it('should not check if the share already exists', function() {
        expect(db.getLocationShareExistsByUsername).not.toHaveBeenCalledWith(testUsername, share1.nickname, jasmine.any(Function));
      });

      it ('should not update the existing location share', function() {
        expect(db.updateLocationShare).not.toHaveBeenCalledWith(123, 456, dbResult[0].recent_minutes, dbResult[0].max_minutes, share1.active, jasmine.any(Function));
      });

      it ('should not create a new location share', function() {
        expect(db.createLocationShare).not.toHaveBeenCalledWith(123, 456, dbResult[0].recent_minutes, dbResult[0].max_minutes, share1.active, jasmine.any(Function));
      });

    });

  });

});
