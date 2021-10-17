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

describe('tiles.js', function() {
  var Tiles = require('../tiles.js');
  var db = require('../db.js');
  var config = require('../config.js');

  describe('Tile URL transliteration', function() {
    var url;

    beforeEach(function() {
      url = Tiles.unitTests.transliterateTileUrl('/{z}/{x}/{y}.png', 3, 5, 8);
    });

    it('should transliterate the url', function() {
      expect(url).toEqual('/8/3/5.png');
    });

  });

  describe('Tile URL transliteration', function() {
    var url;

    beforeEach(function() {
      url = Tiles.unitTests.transliterateTileUrl('/trip/rest/tile?z={z}&x={x}&x={y}', 3, 5, 8);
    });

    it('should transliterate the url', function() {
      expect(url).toEqual('/trip/rest/tile?z=8&x=3&x=5');
    });

  });

  describe('Fetching tile validation', function() {
    var err;

    beforeEach(function() {
      spyOn(db, 'tileExists').and.callFake(
        function(id, x, y, z, maxage, callback) {
          callback(null, true);
        });
      spyOn(db, 'fetchTile').and.callFake(
        function(id, x, y, z, maxage, callback) {
          callback(null, {image: {}});
        });
    });

    describe('Positive values', function() {

      beforeEach(function(done) {
        Tiles.fetchTile(0, 0, 0, 0, function(_err_, _tile_) {
          err = _err_;
          done();
        });
      });

      it('should allow zero tile values for x, y and z', function() {
        expect(err).toBeNull();
        if (config.tile.providers === undefined) {
          // These will only be called when a tile provider has been
          // configured, which may not be the case in many test
          // scenarios.
          expect(db.tileExists).not.toHaveBeenCalled();
          expect(db.fetchTile).not.toHaveBeenCalled();
        } else {
          expect(db.tileExists).toHaveBeenCalled();
          expect(db.fetchTile).toHaveBeenCalled();
        }
      });

    });

    describe('Negative values', function() {

      beforeEach(function(done) {
        Tiles.fetchTile(0, 0, -1, 0, function(_err_, _tile_) {
          err = _err_;
          done();
        });
      });

      it('should not allow a negative tile value for y', function() {
        expect(err).not.toBeNull();
        expect(db.tileExists).not.toHaveBeenCalled();
      });

    });

    describe('Non integer values', function() {
      var err;

      describe('string', function() {

        beforeEach(function(done) {
          Tiles.fetchTile(0, 0, 'x', 0, function(_err_, _tile_) {
            err = _err_;
            done();
          });
        });

        it('should not allow a string value for tile y', function() {
          expect(err).not.toBeNull();
          expect(db.tileExists).not.toHaveBeenCalled();
        });

      });

      describe('out of range', function() {

        beforeEach(function(done) {
          Tiles.fetchTile(0, 0, Number.MAX_SAFE_INTEGER + 1, 0, function(_err_, _tile_) {
            err = _err_;
            done();
          });
        });

        it('should not allow values outside the integer range for y', function() {
          expect(err).not.toBeNull();
          expect(db.tileExists).not.toHaveBeenCalled();
        });
      });

    });

  });

});
