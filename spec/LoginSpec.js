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

describe('login.js', function() {
  var Login = require('../login.js');
  var bcrypt = require('bcrypt');
  var db = require('../db.js');
  var jwt = require('jsonwebtoken');

  var err, result;
  var username = 'anyone@trip.test';
  var password = 'any_secret';
  var testHash = 'hashed_secret';
  var testSalt = 42;
  var testUuid = '6ebae2b8-3cad-f9be-f0bc-cf3a5ada8f01';

  describe('resetPassword()', function() {

    beforeEach(function(done) {
      spyOn(bcrypt, 'genSalt').and.callFake(
        function(rounds, callback) {
          callback(null, testSalt);
        });
      spyOn(bcrypt, 'hash').and.callFake(
        function(password, salt, callback) {
          callback(null, testHash);
        });
      spyOn(db, 'resetPassword').and.callFake(
        function(username, hash, callback) {
          callback(null);
        });
      Login.resetPassword(username, password, function(_err_) {
        err = _err_;
        done();
      });
    });

    it('should reset the password of the specified user', function() {
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(password, testSalt, jasmine.any(Function));
      expect(db.resetPassword).toHaveBeenCalledWith(username, testHash, jasmine.any(Function));
    });

  });

  describe ('doLogin()', function() {

    beforeEach(function() {
      spyOn(jwt, 'sign').and.callThrough();
    });

    describe('successfull login', function() {

      beforeEach(function(done) {
        spyOn(bcrypt, 'compare').and.callFake(
          function(password, hash, callback) {
            callback(null, true);
          });
        spyOn(db, 'getPassword').and.callFake(
          function(username, password, callback) {
            callback(null, testHash);
          });
        spyOn(db, 'hasRole').and.callFake(
          function(username, role, callback) {
            callback(null, false);
          });
        Login.doLogin(username, password, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('should not set the error parameter', function() {
        expect(err).toBeFalsy();
      });

      it('should provide a token on successful login', function() {
        expect(result.token).toMatch(/.+\..+\..+/);
      });

      it('should have compared the password with the hash', function() {
        expect(bcrypt.compare).toHaveBeenCalled();
      });

      it('should have retrieved the hashed password from the database', function() {
        expect(db.getPassword).toHaveBeenCalledWith(username, password, jasmine.any(Function));
      });

      it('should have checked for admin role', function() {
        expect(db.hasRole).toHaveBeenCalledWith(username, 'Admin', jasmine.any(Function));
      });

      it('should have signed the token', function() {
        expect(jwt.sign).toHaveBeenCalled();
      });

      it('should not have assigned the admin role', function() {
        var decoded = jwt.decode(result.token);
        expect(decoded.admin).toBe(false);
        expect(decoded.sub).toEqual(username);
      });

    });

   describe('admin login', function() {

      beforeEach(function(done) {
        spyOn(bcrypt, 'compare').and.callFake(
          function(password, hash, callback) {
            callback(null, true);
          });
        spyOn(db, 'getPassword').and.callFake(
          function(username, password, callback) {
            callback(null, testHash);
          });
        spyOn(db, 'hasRole').and.callFake(
          function(username, role, callback) {
            callback(null, true);
          });
        Login.doLogin(username, password, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('should have assigned the admin role', function() {
        var decoded = jwt.decode(result.token);
        expect(decoded.admin).toBe(true);
        expect(decoded.sub).toEqual(username);
      });
    });

   describe('Failed login', function() {

      beforeEach(function() {
        spyOn(bcrypt, 'compare').and.callFake(
          function(password, hash, callback) {
            callback(null, false);
          });
        spyOn(db, 'hasRole').and.stub();
      });

     describe('Failed password', function() {

        beforeEach(function(done) {
          spyOn(db, 'getPassword').and.callFake(
            function(username, password, callback) {
              callback(null, testHash);
            });
          Login.doLogin(username, password, function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should throw an error if the password is invalid', function() {
          expect(err.name).toEqual('UnauthorizedError');
        });

        it('should not check the role if the user is not found', function() {
          expect(db.hasRole).not.toHaveBeenCalled();
        });

        it('should not create a token when the user is not found', function() {
          expect(result).toBeUndefined();
        });

      });

     describe('User not found', function() {
        var testFailureMessage = {name: 'fail', message: 'user not found'};

        beforeEach(function(done) {
          spyOn(db, 'getPassword').and.callFake(
            function(username, password, callback) {
              callback(testFailureMessage);
            });
          Login.doLogin(username, password, function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should throw an error if the user is not found', function() {
          expect(err.name).toEqual(testFailureMessage.name);
        });

        it('should not check the password if the user is not found', function() {
          expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should not check the role if the user is not found', function() {
          expect(db.hasRole).not.toHaveBeenCalled();
        });

        it('should not create a token when the user is not found', function() {
          expect(result).toBeUndefined();
        });

      });

    });
  });

  describe('checkAuthenticated()', function() {
    var testFailureMessage = {name: 'test-fail', message: 'Invalid token'};
    var testDecodedToken = {sub: 'subject', admin: false};

    describe('success', function() {

      beforeEach(function(done) {
        spyOn(jwt, 'verify').and.callFake(
          function(token, key, callback) {
            callback(null, testDecodedToken);
          });
        Login.checkAuthenticated('token', function(_err_, _decoded_) {
          err = _err_;
          result = _decoded_;
          done();
        });
      });

      it('should verify tokens when checkAuthenticated called', function() {
        expect(jwt.verify).toHaveBeenCalled();
        expect(err).toBeFalsy();
        expect(result).toEqual(testDecodedToken);
      });

    });

    describe('failure', function() {

      beforeEach(function(done) {
        spyOn(jwt, 'verify').and.callFake(
          function(token, key, callback) {
            callback(testFailureMessage);
          });
        Login.checkAuthenticated('token', function(_err_, _decoded_) {
          err = _err_;
          result = _decoded_;
          done();
        });
      });

      it('should callback with an error when token verification fails', function() {
        expect(jwt.verify).toHaveBeenCalled();
        expect(err).toBeTruthy();
        expect(err).toEqual(testFailureMessage);
        expect(result).toBeUndefined();
      });
    });
  });

  describe('get users', function() {
    var payload = [{nickname: 'nick1'},{nickname: 'nick2'}];
    var offset = 1;
    var limit = 3;

    beforeEach(function() {
      spyOn(db, 'getUserCount').and.callFake(
        function(nickname, email, searchType, callback) {
          callback(null, 2);
        });
      spyOn(db, 'getUsers').and.callFake(
        function(offset, limit, nickname, email, searchType, callback) {
          callback(null, payload);
        });
    });

    describe('exact match by nickname and email', function() {

      beforeEach(function(done) {
        Login.getUsers(offset, limit, payload[0].nickname, 'abc', 'non-partial-defaults-to-exact', function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should have fetched the count of users', function() {
        expect(db.getUserCount).toHaveBeenCalledWith(payload[0].nickname, 'abc', 'exact', jasmine.any(Function));
      });

      it('should have queried the users', function() {
        expect(db.getUsers).toHaveBeenCalledWith(offset, limit, payload[0].nickname, 'abc', 'exact', jasmine.any(Function));
      });

    });

    describe('partial match by nickname and email', function() {

      beforeEach(function(done) {
        Login.getUsers(offset, limit, payload[0].nickname, 'abc', 'partial', function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should have fetched the count of users', function() {
        expect(db.getUserCount).toHaveBeenCalledWith(payload[0].nickname, 'abc', 'partial', jasmine.any(Function));
      });

      it('should have queried the users', function() {
        expect(db.getUsers).toHaveBeenCalledWith(offset, limit, payload[0].nickname, 'abc', 'partial', jasmine.any(Function));
      });

    });

    describe('exact match by nickname with null email', function() {

      beforeEach(function(done) {
        Login.getUsers(offset, limit, payload[0].nickname, null, 'exact', function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should have fetched the count of users', function() {
        expect(db.getUserCount).toHaveBeenCalledWith(payload[0].nickname, undefined, 'exact', jasmine.any(Function));
      });

      it('should have queried the users', function() {
        expect(db.getUsers).toHaveBeenCalledWith(offset, limit, payload[0].nickname, undefined, 'exact', jasmine.any(Function));
      });

    });

    describe('exact match with invalid nickname', function() {

      beforeEach(function(done) {
        Login.getUsers(offset, limit, '', null, 'exact', function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should have fetched the count of users', function() {
        expect(db.getUserCount).toHaveBeenCalledWith(undefined, undefined, 'exact', jasmine.any(Function));
      });

      it('should have queried the users', function() {
        expect(db.getUsers).toHaveBeenCalledWith(offset, limit, undefined, undefined, 'exact', jasmine.any(Function));
      });

    });

    describe('exact match with invalid email', function() {

      beforeEach(function(done) {
        Login.getUsers(offset, limit, 'xx', '', 'exact', function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should have fetched the count of users', function() {
        expect(db.getUserCount).toHaveBeenCalledWith('xx', undefined, 'exact', jasmine.any(Function));
      });

      it('should have queried the users', function() {
        expect(db.getUsers).toHaveBeenCalledWith(offset, limit, 'xx', undefined, 'exact', jasmine.any(Function));
      });

    });

  });

  describe('create user', function() {

    beforeEach(function() {
      spyOn(bcrypt, 'genSalt').and.callFake(
        function(rounds, callback) {
          callback(null, testSalt);
        });
      spyOn(bcrypt, 'hash').and.callFake(
        function(password, salt, callback) {
          callback(null, testHash);
        });
      spyOn(db, 'createUser').and.callFake(
        function(user, callback) {
          callback(null);
        });
    });

    describe('valid user', function() {
      var user = {nickname: 'Fred',
                  username: username,
                  password: password,
                  firstname: 'Frederick the third',
                  lastname: 'Jones Smith'};
      var expectedUser = {nickname: user.nickname,
                          username: user.username,
                          password: user.password,
                          firstname: user.firstname,
                          lastname: user.lastname,
                          hash: testHash,
                          uuid: jasmine.anything()
                         };
      beforeEach(function(done) {
        Login.createUser(user, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should generate a salt', function() {
        expect(bcrypt.genSalt).toHaveBeenCalled();
      });

      it('should generate a password hash', function() {
        expect(bcrypt.hash).toHaveBeenCalled();
      });

      it('should save the user', function() {
        expect(db.createUser).toHaveBeenCalledWith(expectedUser, jasmine.any(Function));
      });

    });

   describe('invalid user object', function() {
      var user = {nickname: 'Fred',
                  username: username,
                  password: password,
                  firstname: 'Frederick',
                  lastname: 'Smith'};

      beforeEach(function(done) {
        Login.createUser({}, function(_err_) {
          err = _err_;
          done();
        });
      });

      it('should not generate a salt', function() {
        expect(bcrypt.genSalt).not.toHaveBeenCalled();
      });

      it('should not generate a password hash', function() {
        expect(bcrypt.hash).not.toHaveBeenCalled();
      });

      it('should not save the user', function() {
        expect(db.createUser).not.toHaveBeenCalled();
      });

      it('should return an error', function() {
        expect(err).toBeTruthy();
      });

    });

   describe('invalid nickname', function() {

      beforeEach(function(done) {
        Login.createUser({nickname: 'Fr ed',
                          username: username,
                          password: password,
                          firstname: 'Frederick',
                          lastname: 'Smith'},
                         function(_err_) {
                           err = _err_;
                           done();
                         });
      });

      it('should not generate a salt', function() {
        expect(bcrypt.genSalt).not.toHaveBeenCalled();
      });

      it('should not generate a password hash', function() {
        expect(bcrypt.hash).not.toHaveBeenCalled();
      });

      it('should not save the user', function() {
        expect(db.createUser).not.toHaveBeenCalled();
      });

      it('should return an error', function() {
        expect(err).toBeTruthy();
      });

    });

   describe('invalid password', function() {

      beforeEach(function(done) {
        Login.createUser({nickname: 'Fred',
                          username: username,
                          password: '\ttest\r',
                          firstname: 'Frederick',
                          lastname: 'Smith'},
                         function(_err_) {
                           err = _err_;
                           done();
                         });
      });

      it('should not generate a salt', function() {
        expect(bcrypt.genSalt).not.toHaveBeenCalled();
      });

      it('should not generate a password hash', function() {
        expect(bcrypt.hash).not.toHaveBeenCalled();
      });

      it('should not save the user', function() {
        expect(db.createUser).not.toHaveBeenCalled();
      });

      it('should return an error', function() {
        expect(err).toBeTruthy();
      });

    });

  });

  describe('Update user', function() {

    beforeEach(function() {
      spyOn(db, 'updateUser').and.callFake(
        function(user, callback) {
          callback(null);
        });
      spyOn(db, 'addRole').and.callFake(
        function(userId, role, callback) {
          callback(null);
        });
      spyOn(db, 'removeRole').and.callFake(
        function(userId, role, callback) {
          callback(null);
        });
    });

    describe('when does not have admin role', function() {

      beforeEach(function() {
        spyOn(db, 'hasRole').and.callFake(
          function(username, role, callback) {
            callback(null, false);
          });
      });

      describe('when specifying new admin role as true', function() {

        beforeEach(function(done) {
          Login.updateUser({"id": 99,
                            "nickname": "test",
                            "username": "test@trip.test",
                            "lastname": "Smith",
                            "firstname": "John",
                            "admin": true}, function(_err_) {
                              err = _err_;
                              done();
                            });
        });

        it('should set the admin role', function() {
          expect(db.hasRole).toHaveBeenCalled();
          expect(db.addRole).toHaveBeenCalledWith(99, 'Admin', jasmine.any(Function));
          expect(db.removeRole).not.toHaveBeenCalled();
        });

      });

      describe('when specifying new admin role as false', function() {

        beforeEach(function(done) {
          Login.updateUser({"id": 99,
                            "nickname": "test",
                            "username": "test@trip.test",
                            "lastname": "Smith",
                            "firstname": "John",
                            "admin": false}, function(_err_) {
                              err = _err_;
                              done();
                            });
        });

        it('should not remove the role which it does not have', function() {
          expect(db.hasRole).toHaveBeenCalled();
          expect(db.addRole).not.toHaveBeenCalled();
          expect(db.removeRole).not.toHaveBeenCalled();
        });

      });

      describe('when no admin role is specified', function() {

        beforeEach(function(done) {
          Login.updateUser({"id": 99,
                            "nickname": "test",
                            "username": "test@trip.test",
                            "lastname": "Smith",
                            "firstname": "John"}, function(_err_) {
                              done();
                            });
        });

        it('should not modify the role', function() {
          expect(db.hasRole).not.toHaveBeenCalled();
          expect(db.addRole).not.toHaveBeenCalled();
          expect(db.removeRole).not.toHaveBeenCalled();
        });

      });

    });

    describe('when does have admin role', function() {

      beforeEach(function() {
        spyOn(db, 'hasRole').and.callFake(
          function(username, role, callback) {
            callback(null, true);
          });
      });

      describe('when specifying new admin role as false', function() {

        beforeEach(function(done) {
          Login.updateUser({"id": 99,
                            "nickname": "test",
                            "username": "test@trip.test",
                            "lastname": "Smith",
                            "firstname": "John",
                            "admin": false}, function(_err_) {
                              err = _err_;
                              done();
                            });
        });

        it('should remove the admin role', function() {
          expect(db.hasRole).toHaveBeenCalled();
          expect(db.removeRole).toHaveBeenCalledWith(99, 'Admin', jasmine.any(Function));
          expect(db.addRole).not.toHaveBeenCalled();
        });

      });

      describe('when specifying new admin role as true', function() {

        beforeEach(function(done) {
          Login.updateUser({"id": 99,
                            "nickname": "test",
                            "username": "test@trip.test",
                            "lastname": "Smith",
                            "firstname": "John",
                            "admin": true}, function(_err_) {
                              err = _err_;
                              done();
                            });
        });

        it('should not add the role which it already has', function() {
          expect(db.hasRole).toHaveBeenCalled();
          expect(db.addRole).not.toHaveBeenCalled();
          expect(db.removeRole).not.toHaveBeenCalled();
        });

      });

      describe('when no admin role is specified', function() {

        beforeEach(function(done) {
          Login.updateUser({"id": 99,
                            "nickname": "test",
                            "username": "test@trip.test",
                            "lastname": "Smith",
                            "firstname": "John"}, function(_err_) {
                              done();
                            });
        });

        it('should not modify the role', function() {
          expect(db.hasRole).not.toHaveBeenCalled();
          expect(db.addRole).not.toHaveBeenCalled();
          expect(db.removeRole).not.toHaveBeenCalled();
        });

      });

    });

  });

});
