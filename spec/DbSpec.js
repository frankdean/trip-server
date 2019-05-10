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

// Quick way to disable tests
function zdescribe(title, func) {
  if (false) {
    describe(title, function() {
      func();
    });
  }
}

describe('db.js', function() {
  var Db = require('../db.js');
  // var fs = require('fs');

  var err, result;
  var nicknames = ['Fred', 'Tom', 'Albert'];

  it('should convert an array to a SQL array', function() {
    expect(Db.unitTests.convertArrayToSqlArray(nicknames)).toEqual('{"Fred","Tom","Albert"}');
  });

  describe('Tracking info UUID', function() {
    beforeEach(function(done) {
      Db.getTrackingInfo('rubbish that is unlikely to be found',
                             function(_err_, _result_) {
                               err = _err_;
                               result = _result_;
                               done();
                             });
    });

   it('should gracefully handle a failure to find tracking information for a user',
       function() {
         expect(err).toBeTruthy();
         expect(result).toBeUndefined();
       });
  });

  describe('Tiles tests assume the top-level world tile is already cached', function() {
    var alreadyExpired, expires, maxAge;
    alreadyExpired = new Date('2016-01-15T00:00:00');
    expires = new Date('2016-01-15T00:00:00');
    expires.setTime(expires.getTime() + 60 * 24 * 3600000);
    maxAge = 99999;

    describe('tile exists', function() {

      beforeEach(function(done) {
        Db.tileExists(0, 0, 0, 0, maxAge, function(_err_, _result_) {
          err = _err_;
          result = _result_;
          done();
        });
      });

      it('should not raise an error', function() {
        expect(err).toBeFalsy();
      });

      // Disabled test as it requires zoom level zero tile to be in the cache and it may not actually exist
      // it('should find the tile in the cache', function() {
      //   expect(result).toBeTruthy();
      // });

    });

    // Disabled tests from routinely being run as they are making
    // modifications to the database that result in immediate
    // expiration of the top-level world tile, beside ulitimately
    // resulting in hits to the remote site, it also causes confustion
    // during debugging caching of that particular tile.
    zdescribe('Fetch tile', function() {

      describe('Fetch unexpired tile', function() {
        beforeEach(function(done) {
          Db.fetchTile(0, 0, 0, 0, maxAge, function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should not raise an error', function() {
          expect(err).toBeFalsy();
        });

        it('should return the tile from the cache', function() {
          expect(result).toBeTruthy();
        });

        it('should return a buffer containing the image', function() {
          expect(Buffer.isBuffer(result.image)).toBeTruthy();
          // fs.writeFile('/tmp/world.png', result.image, function(err) {
          //   if (err) {
          //     console.error('Error writing tile to file');
          //   }
          // });
        });
      });

      describe('Fetch tile regardless of age', function() {

        beforeEach(function(done) {
          Db.fetchTile(0, 0, 0, 0, null, function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should not raise an error', function() {
          expect(err).toBeFalsy();
        });

        it('should return the tile from the cache', function() {
          expect(result).toBeTruthy();
        });

        it('should return a buffer containing the image', function() {
          expect(Buffer.isBuffer(result.image)).toBeTruthy();
          // fs.writeFile('/tmp/world.png', result.image, function(err) {
          //   if (err) {
          //     console.error('Error writing tile to file');
          //   }
          // });
        });
      });

      describe('Fetch tile older than specified age', function() {

        beforeEach(function(done) {
          // Fetch the tile so we can use the image to do the update
          Db.fetchTile(0, 0, 0, 0, null, function(_err_, tileData) {
            if (_err_) {
              err = _err_;
              done();
            } else {
              // Update the tile with future expiry date
              Db.updateTile(0, 0, 0, 0, expires, tileData.image, function(_err_) {
                err = _err_;
                done();
                // Not a very good test, as the recent update will cause it
                // to be within max days anyway
                Db.fetchTile(0, 0, 0, 0, 1, function(_err_, _result_) {
                  err = _err_;
                  result = _result_;
                  done();
                });
              });
            }
          });
        });

        it('should not raise an error', function() {
          expect(err).toBeFalsy();
        });

      });

    });

    // Disabled tests from routinely being run as they are making
    // modifications to the database that result in immediate
    // expiration of the top-level world tile, beside ulitimately
    // resulting in hits to the remote site, it also causes confustion
    // during debugging caching of that particular tile.
    zdescribe('Save tile', function() {

      beforeEach(function(done) {
        Db.fetchTile(0, 0, 0, 0, maxAge, function(_err_, tileData) {
          if (_err_) {
            err = _err_;
            done();
          } else {
            Db.deleteTile(0, 0, 0, 0, function(_err_) {
              if (_err_) {
                err = _err_;
                done();
              } else {
                Db.saveTile(0, 0, 0, 0, expires, tileData.image, function(_err_) {
                  err = _err_;
                  done();
                });
              }
            });
          }
        });
      });

      it('should not raise an error', function() {
        expect(err).toBeFalsy();
      });

    });

    // Disabled tests from routinely being run as they are making
    // modifications to the database that result in immediate
    // expiration of the top-level world tile, beside ulitimately
    // resulting in hits to the remote site, it also causes confustion
    // during debugging caching of that particular tile.
    zdescribe('Update tile', function() {

      beforeEach(function(done) {
        Db.fetchTile(0, 0, 0, 0, null, function(_err_, tileData) {
          if (_err_) {
            err = _err_;
            done();
          } else {
            Db.updateTile(0, 0, 0, 0, expires, tileData.image, function(_err_) {
              err = _err_;
              done();
            });
          }
        });
      });

      it('should not raise an error', function() {
        expect(err).toBeFalsy();
      });

    });

  });

  describe('Query users', function() {

    describe('Exact match', function() {

      describe('By nickname', function() {

        beforeEach(function(done) {
          Db.getUsers(1, 2, 'user', undefined, 'exact', function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should not raise an error', function() {
          expect(err).toBeFalsy();
        });

        it('should find a user in the cache', function() {
          expect(result).toBeTruthy();
        });
      });

      describe('By email', function() {

        beforeEach(function(done) {
          Db.getUsers(1, 2, undefined, 'admin@trip.test', 'exact', function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should not raise an error', function() {
          expect(err).toBeFalsy();
        });

        it('should find a user in the cache', function() {
          expect(result).toBeTruthy();
        });
      });

      describe('By nickname and email', function() {

        beforeEach(function(done) {
          Db.getUsers(1, 2, 'admin', 'admin@trip.test', 'exact', function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should not raise an error', function() {
          expect(err).toBeFalsy();
        });

        it('should find a user in the cache', function() {
          expect(result).toBeTruthy();
        });
      });

    });

    describe('Partial match', function() {

      describe('By nickname', function() {

        beforeEach(function(done) {
          Db.getUsers(1, 2, 'admin', undefined, 'partial', function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should not raise an error', function() {
          expect(err).toBeFalsy();
        });

        it('should find a user in the cache', function() {
          expect(result).toBeTruthy();
        });
      });

      describe('By email', function() {

        beforeEach(function(done) {
          Db.getUsers(1, 2, undefined, 'admin@trip.test', 'partial', function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should not raise an error', function() {
          expect(err).toBeFalsy();
        });

        it('should find a user in the cache', function() {
          expect(result).toBeTruthy();
        });
      });

      describe('By nickname and email', function() {

        beforeEach(function(done) {
          Db.getUsers(1, 2, 'admin', 'admin@trip.test', 'partial', function(_err_, _result_) {
            err = _err_;
            result = _result_;
            done();
          });
        });

        it('should not raise an error', function() {
          expect(err).toBeFalsy();
        });

        it('should find a user in the cache', function() {
          expect(result).toBeTruthy();
        });
      });

    });

    describe('Count', function() {

      describe('Exact match', function() {

        describe('By nickname', function() {

          beforeEach(function(done) {
            Db.getUserCount('admin', undefined, 'exact', function(_err_, _result_) {
              err = _err_;
              result = _result_;
              done();
            });
          });

         it('should not raise an error', function() {
            expect(err).toBeFalsy();
          });

          it('should find a user in the cache', function() {
            expect(result).toBeTruthy();
          });
        });

        describe('By email', function() {

          beforeEach(function(done) {
            Db.getUserCount(undefined, 'admin@trip.test', 'exact', function(_err_, _result_) {
              err = _err_;
              result = _result_;
              done();
            });
          });

          it('should not raise an error', function() {
            expect(err).toBeFalsy();
          });

          it('should find a user in the cache', function() {
            expect(result).toBeTruthy();
          });
        });

        describe('By nickname and email', function() {

          beforeEach(function(done) {
            Db.getUserCount('admin', 'admin@trip.test', 'exact', function(_err_, _result_) {
              err = _err_;
              result = _result_;
              done();
            });
          });

          it('should not raise an error', function() {
            expect(err).toBeFalsy();
          });

          it('should find a user in the cache', function() {
            expect(result).toBeTruthy();
          });
        });

      });

      describe('Partial match', function() {

        describe('By nickname', function() {

          beforeEach(function(done) {
            Db.getUserCount('admin', undefined, 'partial', function(_err_, _result_) {
              err = _err_;
              result = _result_;
              done();
            });
          });

          it('should not raise an error', function() {
            expect(err).toBeFalsy();
          });

          it('should find a user in the cache', function() {
            expect(result).toBeTruthy();
          });
        });

        describe('By email', function() {

          beforeEach(function(done) {
            Db.getUserCount(undefined, 'admin@trip.test', 'partial', function(_err_, _result_) {
              err = _err_;
              result = _result_;
              done();
            });
          });

          it('should not raise an error', function() {
            expect(err).toBeFalsy();
          });

          it('should find a user in the cache', function() {
            expect(result).toBeTruthy();
          });
        });

        describe('By nickname and email', function() {

          beforeEach(function(done) {
            Db.getUserCount('admin', 'admin@trip.test', 'partial', function(_err_, _result_) {
              err = _err_;
              result = _result_;
              done();
            });
          });

          it('should not raise an error', function() {
            expect(err).toBeFalsy();
          });

          it('should find a user in the cache', function() {
            expect(result).toBeTruthy();
          });
        });

      });

    });

  });

});
