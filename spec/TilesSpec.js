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

});
